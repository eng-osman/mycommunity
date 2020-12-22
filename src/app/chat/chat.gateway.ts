import { ChatCacheService } from '@app/chat/chat-cache.service';
import { UserInformation } from '@app/chat/interfaces/user-info.interface';
import { DialUpService } from '@app/cluster/dial-up.service';
import { MessageType } from '@app/cluster/message-type.enum';
import { CHAT_MESSAGE, getServerUID } from '@app/constants';
import { UserPrivacyService } from '@app/user/privacy/user-privacy.service';
import { Injectable, UseGuards, UsePipes } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { InjectEventEmitter } from '@shared/decorators';
import { WsMessageException } from '@shared/excepion';
import { WsAuthGuard } from '@shared/guards';
import { LoggerService } from '@shared/services';
import { getIdFromNamespace } from '@shared/utils';
import { EventEmitter2 } from 'eventemitter2';
import { is, isEmpty, isNil, reject } from 'ramda';
import * as SocketIO from 'socket.io';
import { ChatMessageService } from './chat-message.service';
import { ConversationService } from './conversation.service';
import { FavoriteMessageService } from './favorite-message.service';
import { MessageStatus } from './message-status.enum';
import { ChatMessage, ConversationMessage } from './messages';
import { SocketDataPipe } from './socket-data.pipe';

@Injectable()
@UsePipes(SocketDataPipe)
@WebSocketGateway({ namespace: 'chat' })
export class ChatGateway implements OnGatewayDisconnect, OnGatewayConnection {
  private readonly logger: LoggerService = new LoggerService('ChatGateway');
  constructor(
    private readonly chatMessageService: ChatMessageService,
    private readonly conversationService: ConversationService,
    private readonly favoriteMessageService: FavoriteMessageService,
    private readonly dialUpService: DialUpService,
    private readonly userPrivacyService: UserPrivacyService,
    private readonly chatCacheService: ChatCacheService,
    @InjectEventEmitter() private readonly eventEmitter: EventEmitter2,
  ) {
    this.subscribeToEvents();
  }

  @UseGuards(WsAuthGuard)
  public async handleConnection(client: SocketIO.Socket) {
    try {
      this.logger.log(`${client.id} Connected`);
      const myInfo: any = await this.chatCacheService.getUserMetadata(client.id, true);
      if (!myInfo) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      this.eventEmitter.emit('analytics:addUserOnline', myInfo.id, myInfo.countryCode);
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`Client ${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
      }
    }
  }

  public async handleDisconnect(client: SocketIO.Socket) {
    try {
      this.logger.log(`${client.id} Disconnected`);
      await this.handleIAMActive(client, { iamActive: false, clientId: client.id });
      const myInfo: any = await this.chatCacheService.getUserMetadata(client.id, true);
      if (!myInfo) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      this.eventEmitter.emit('analytics:addUserOffline', myInfo.id, myInfo.countryCode);
    } catch (error) {
      if (error instanceof WsMessageException) {
        // pass
      } else {
        this.logger.error(error, error.stack);
      }
    }
  }

  @SubscribeMessage(CHAT_MESSAGE.CREATE_CONVERSATION)
  public async handleCreateConversation(client: SocketIO.Socket, data: ConversationMessage) {
    try {
      // Add debug info
      this.logger.logDebug('chat.createConversation', data);
      if (!data.users && !Array.isArray(data.users)) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `You are missing the the 'users' array`,
        });
      }
      // Convert the array into set, so removing duplication
      const users = new Set(data.users);
      // and then convert it back to array.
      data.users = Array.from(users);
      if (data.users.length < 2) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `the 'users' array must must be >= 2`,
        });
      }
      if (data._id) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          message: `'_id' is read-only, go away `,
        });
      }
      if (data.users.length >= 3) {
        data.isGroupChat = true;
      }
      const currentUser = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (!currentUser) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }

      const isAllowed = await this.userPrivacyService.checkChatPrivacy(data.users);
      if (!isAllowed) {
        return {
          event: CHAT_MESSAGE.BLOCKED,
          data: { conversationId: null, isAllowed, clientId: client.id, ts: new Date().getTime() },
        } as any;
      }
      data.admins = [currentUser.id.toString()];
      const conversation = await this.conversationService.findOneOrCreate(data);
      const lastMessage = await this.chatMessageService.findConversationLastMessage(
        conversation._id,
      );
      conversation.lastMessage = lastMessage ? lastMessage : undefined;
      conversation.usersMetadata = []; // Bad Idea ?
      if (conversation.users.length === 2) {
        const i = conversation.users.indexOf(currentUser.id.toString());
        if (i > -1) {
          conversation.users.splice(i, 1); // remove me from the users array
        }
      }
      for (const userId of conversation.users) {
        const userMetadata = await this.chatCacheService.getUserMetadata(userId);
        if (!isNil(userMetadata)) {
          conversation.usersMetadata.push(userMetadata);
        }
      }
      const others = conversation.users.map(async id =>
        this.chatCacheService.getUserInformationById(id),
      );
      const update = { conversationId: conversation._id, object: conversation };
      // Send update to other users;
      others.forEach(async user => {
        const userInfo = await user;
        if (isNil(userInfo) || String(userInfo.id) === String(currentUser.id) /* Skip me*/) {
          return;
        }
        await this.sendEventUpdate(
          client,
          currentUser,
          userInfo,
          update,
          CHAT_MESSAGE.CONVERSATION_CREATED,
        );
      });
      return {
        event: CHAT_MESSAGE.CONVERSATION_CREATED,
        data: { ...update, clientId: client.id, ts: new Date().getTime() },
      };
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
      }
      throw error;
    }
  }

  @SubscribeMessage(CHAT_MESSAGE.ADD_CONVERSATION_ADMIN)
  public async handleAddConversationAdmin(client: SocketIO.Socket, data) {
    try {
      // Add debug info
      this.logger.logDebug('chat.addConversationAdmin', data);
      const currentUser = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (!currentUser) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      if (!data.conversationId && !data.userIds && !Array.isArray(data.userIds)) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `You are missing the 'conversationId' or 'userIds'`,
          got: {
            conversationId: data.conversationId,
            userId: data.userIds,
          },
          want: ['conversationId', 'userIds[]'],
        });
      }

      // We should limit it, shouldn't we ?
      if (data.userIds.length > 50) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', { message: 'Too Many Users' });
      }

      const { conversationId, userIds } = data;
      const conversation = await this.conversationService.findConversationById(conversationId);
      if (isNil(conversation)) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          reason: 'There is no conversation with that Id',
        });
      }

      const { users, admins } = conversation;
      if (Array.isArray(admins)) {
        const isAdmin = admins.includes(currentUser.id.toString());
        if (!isAdmin) {
          throw new WsMessageException('CHAT.NOT_CONVERSATION_ADMIN');
        }
      }
      const isAdded = await this.conversationService.addUsersToConversationAdmin(
        conversationId,
        userIds,
      );
      if (Array.isArray(users) && users.length === 2) {
        const i = users.indexOf(currentUser.id.toString());
        if (i > -1) {
          users.splice(i, 1); // remove me from the users array
        }
      }
      const others = users.map(async id => this.chatCacheService.getUserInformationById(id));

      const update = {
        conversationId: data.conversationId,
        addedAdmins: userIds,
        addedAdminsMetadata: [] as Array<unknown>,
        added: isAdded,
      };
      // Send update to other users;
      const promises = others.map(async user => {
        const userInfo = await user;
        if (isNil(userInfo)) {
          return Promise.resolve();
        }
        const usersMetadata: any[] = [];
        for (const userId of userIds) {
          const userMetadata = await this.chatCacheService.getUserMetadata(userId, false, {
            id: userInfo.id,
          });
          if (!isNil(userMetadata)) {
            usersMetadata.push(userMetadata);
          }
        }
        update.addedAdminsMetadata = usersMetadata;
        return this.sendEventUpdate(
          client,
          currentUser,
          userInfo,
          update,
          CHAT_MESSAGE.ADD_CONVERSATION_ADMIN,
        );
      });
      // Run them in concurent !
      // we should do this with all of the above events
      await Promise.all(promises);
      return {
        event: CHAT_MESSAGE.ADD_CONVERSATION_ADMIN,
        data: { ...update, clientId: client.id, ts: new Date().getTime() },
      };
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
      }
      throw error;
    }
  }

  @SubscribeMessage(CHAT_MESSAGE.CLEAR_CONVERSATION)
  public async handleClearConversationMessages(client: SocketIO.Socket, data) {
    try {
      // Add debug info
      this.logger.logDebug('chat.clearConversation', data);
      const currentUser = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (!currentUser) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      if (!data.conversationId && !data.userIds && !Array.isArray(data.userIds)) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `You are missing the 'conversationId'`,
          got: {
            conversationId: data.conversationId,
          },
          want: ['conversationId'],
        });
      }

      const { conversationId } = data;
      const conversation = await this.conversationService.findConversationById(conversationId);
      if (isNil(conversation)) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          reason: 'There is no conversation with that Id',
        });
      }

      const { users, admins } = conversation;
      if (Array.isArray(admins)) {
        const isAdmin = admins.includes(currentUser.id.toString());
        if (!isAdmin) {
          throw new WsMessageException('CHAT.NOT_CONVERSATION_ADMIN');
        }
      }

      await this.chatMessageService.clearConversationMessages(conversation.id);
      if (Array.isArray(users) && users.length === 2) {
        const i = users.indexOf(currentUser.id.toString());
        if (i > -1) {
          users.splice(i, 1); // remove me from the users array
        }
      }

      const others = users.map(async id => this.chatCacheService.getUserInformationById(id));
      const update = {
        conversationId: data.conversationId,
        conversationCleared: true,
        clearedBy: currentUser.id.toString(),
      };

      // Send update to other users;
      const promises = others.map(async user => {
        const userInfo = await user;
        if (isNil(userInfo)) {
          return Promise.resolve();
        }
        await this.sendUpdateConversationRow(client, currentUser, userInfo, conversationId);
        return this.sendEventUpdate(
          client,
          currentUser,
          userInfo,
          update,
          CHAT_MESSAGE.CLEAR_CONVERSATION,
        );
      });
      // Run them in concurent !
      // we should do this with all of the above events
      await Promise.all(promises);
      await this.sendUpdateConversationRow(client, currentUser, currentUser, conversationId);
      return {
        event: CHAT_MESSAGE.CLEAR_CONVERSATION,
        data: { ...update, clientId: client.id, ts: new Date().getTime() },
      };
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
      }
      throw error;
    }
  }

  @SubscribeMessage(CHAT_MESSAGE.LEAVE_CONVERSATION)
  public async handleLeaveConversation(client: SocketIO.Socket, data) {
    try {
      // Add debug info
      this.logger.logDebug('chat.leaveConversation', data);
      const currentUser = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (!currentUser) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      if (!data.conversationId && !data.userIds && !Array.isArray(data.userIds)) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `You are missing the 'conversationId' or 'userIds'`,
          got: {
            conversationId: data.conversationId,
            userIds: data.userIds,
          },
          want: ['conversationId', 'userIds[]'],
        });
      }
      const { conversationId, userIds } = data;
      let conversation = await this.conversationService.findConversationById(conversationId);
      if (isNil(conversation)) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          reason: 'There is no conversation with that Id',
        });
      }
      const { users } = conversation;
      const isRemoved = await this.conversationService.removeUsersFromConversation(
        conversationId,
        userIds,
      );
      if (Array.isArray(users) && users.length === 2) {
        const i = users.indexOf(currentUser.id.toString());
        if (i > -1) {
          users.splice(i, 1); // remove me from the users array
        }
      }
      const others = users.map(async id => this.chatCacheService.getUserInformationById(id));
      const update = {
        conversationId: data.conversationId,
        removedUsers: userIds,
        removed: isRemoved,
        conversation: null,
      };
      conversation = await this.conversationService.findConversationById(conversationId);
      if (isNil(conversation)) {
        // just return
        return;
      }
      const conversationContext = conversation.toObject();
      const lastMessage = await this.chatMessageService.findConversationLastMessage(
        conversation._id,
      );
      conversationContext.lastMessage = lastMessage ? lastMessage : undefined;
      conversationContext.usersMetadata = [];
      // if (conversationContext.users.length === 2) {
      //   const i = conversationContext.users.indexOf(me.id.toString());
      //   if (i > -1) {
      //     conversationContext.users.splice(i, 1); // remove me from the users array
      //   }
      // }
      for (const userId of conversationContext.users) {
        const userMetadata = await this.chatCacheService.getUserMetadata(userId);
        if (!isNil(userMetadata)) {
          conversationContext.usersMetadata.push(userMetadata);
        }
      }
      update.conversation = conversationContext;
      // Send update to other users;
      others.forEach(async user => {
        const userInfo = await user;
        if (isNil(userInfo)) {
          return;
        }
        await this.sendEventUpdate(
          client,
          currentUser,
          userInfo,
          update,
          CHAT_MESSAGE.LEAVE_CONVERSATION,
        );
      });
      // await this.sendUpdateConversationRow(client, currentUser, currentUser, conversationId);
      return {
        event: CHAT_MESSAGE.LEAVE_CONVERSATION,
        data: { ...update, clientId: client.id, ts: new Date().getTime() },
      };
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
      }
      throw error;
    }
  }

  @SubscribeMessage(CHAT_MESSAGE.JOIN_CONVERSATION)
  public async handleJoinConversation(client: SocketIO.Socket, data) {
    try {
      // Add debug info
      this.logger.logDebug('chat.joinConversation', data);
      const currentUser = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (!currentUser) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      if (!data.conversationId && !data.userIds && !Array.isArray(data.userIds)) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `You are missing the 'conversationId' or 'userIds'`,
          got: {
            conversationId: data.conversationId,
            userId: data.userIds,
          },
          want: ['conversationId', 'userIds'],
        });
      }

      // We should limit it, shouldn't we ?
      if (data.userIds.length > 50) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', { message: 'To Many Users' });
      }

      const { conversationId, userIds } = data;
      const isAdded = await this.conversationService.addUsersToConversation(
        conversationId,
        userIds,
      );

      let conversation = await this.conversationService.findConversationById(conversationId);
      if (isNil(conversation)) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          reason: 'There is no conversation with that Id',
        });
      }

      const { users } = conversation;
      if (Array.isArray(users) && users.length === 2) {
        const i = users.indexOf(currentUser.id.toString());
        if (i > -1) {
          users.splice(i, 1); // remove me from the users array
        }
      }
      const others = users.map(async id => this.chatCacheService.getUserInformationById(id));
      const update = {
        conversationId: data.conversationId,
        addedUsers: userIds,
        addedUsersMetadata: [] as Array<unknown>,
        added: isAdded,
        conversation: null,
      };
      conversation = await this.conversationService.findConversationById(conversationId);
      if (isNil(conversation)) {
        // just return
        return;
      }
      const conversationContext = conversation.toObject();
      const lastMessage = await this.chatMessageService.findConversationLastMessage(
        conversation._id,
      );
      conversationContext.lastMessage = lastMessage ? lastMessage : undefined;
      conversationContext.usersMetadata = [];
      // if (conversationContext.users.length === 2) {
      //   const i = conversationContext.users.indexOf(me.id.toString());
      //   if (i > -1) {
      //     conversationContext.users.splice(i, 1); // remove me from the users array
      //   }
      // }
      for (const userId of conversationContext.users) {
        const userMetadata = await this.chatCacheService.getUserMetadata(userId);
        if (!isNil(userMetadata)) {
          conversationContext.usersMetadata.push(userMetadata);
        }
      }
      update.conversation = conversationContext;
      // Send update to other users;
      const promises = others.map(async user => {
        const userInfo = await user;
        if (isNil(userInfo)) {
          return Promise.resolve();
        }
        const usersMetadata: any[] = [];
        for (const userId of userIds) {
          const userMetadata = await this.chatCacheService.getUserMetadata(userId, false, {
            id: userInfo.id,
          });
          if (!isNil(userMetadata)) {
            usersMetadata.push(userMetadata);
          }
        }
        // await this.sendUpdateConversationRow(client, currentUser, userInfo, conversationId);
        return this.sendEventUpdate(
          client,
          currentUser,
          userInfo,
          update,
          CHAT_MESSAGE.JOIN_CONVERSATION,
        );
      });
      // Run them in concurent !
      // we should do this with all of the above events
      await Promise.all(promises);
      // await this.sendUpdateConversationRow(client, currentUser, currentUser, conversationId);
      return {
        event: CHAT_MESSAGE.JOIN_CONVERSATION,
        data: { ...update, clientId: client.id, ts: new Date().getTime() },
      };
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
      }
      throw error;
    }
  }

  @SubscribeMessage(CHAT_MESSAGE.RENAME_CONVERSATION)
  public async handleRenameConversation(client: SocketIO.Socket, data) {
    try {
      // Add debug info
      this.logger.logDebug('chat.renameConversation', data);
      const currentUser = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (!currentUser) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      if (
        !data.conversationId &&
        !data.conversationName &&
        data.conversationId.length > 1 &&
        data.conversationName.length > 1
      ) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `You are missing the 'conversationId' or 'conversationName'`,
          got: {
            conversationId: data.conversationId,
            userId: data.conversationName,
          },
          want: ['conversationId', 'conversationName'],
        });
      }
      const { conversationId, conversationName } = data;
      const conversation = await this.conversationService.renameConversation(
        conversationId,
        conversationName,
      );
      if (isNil(conversation)) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          reason: 'There is no conversation with that Id',
        });
      }

      const { users } = conversation;
      if (Array.isArray(users) && users.length === 2) {
        const i = users.indexOf(currentUser.id.toString());
        if (i > -1) {
          users.splice(i, 1); // remove me from the users array
        }
      }
      const others = users.map(async id => this.chatCacheService.getUserInformationById(id));
      const update = {
        conversationId: data.conversationId,
        conversationName: conversation.conversationName,
        renamedBy: currentUser.id,
      };
      // Send update to other users;
      others.forEach(async user => {
        const userInfo = await user;
        if (isNil(userInfo)) {
          return;
        }
        await this.sendEventUpdate(
          client,
          currentUser,
          userInfo,
          update,
          CHAT_MESSAGE.RENAME_CONVERSATION,
        );
      });
      return {
        event: CHAT_MESSAGE.RENAME_CONVERSATION,
        data: { ...update, clientId: client.id, ts: new Date().getTime() },
      };
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
      }
      throw error;
    }
  }

  @SubscribeMessage(CHAT_MESSAGE.UPDATE_CONVERSATION_ICON)
  public async handleupdateConversationIcon(client: SocketIO.Socket, data) {
    try {
      // Add debug info
      this.logger.logDebug('chat.updateConversationIcon', data);
      const currentUser = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (!currentUser) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      if (!data.conversationId && !data.mediaId && data.conversationId.length > 1) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `You are missing the 'conversationId' or 'mediaId'`,
          got: {
            conversationId: data.conversationId,
            userId: data.mediaId,
          },
          want: ['conversationId', 'mediaId'],
        });
      }
      const { conversationId, mediaId } = data;
      const conversation = await this.conversationService.updateConversationIcon(
        conversationId,
        mediaId,
      );
      if (conversation === null) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          reason: 'There is no conversation with that Id',
        });
      }
      if (conversation === undefined) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          reason: 'There is no media with that Id, it is not found !',
        });
      }

      const { users } = conversation;
      if (Array.isArray(users) && users.length === 2) {
        const i = users.indexOf(currentUser.id.toString());
        if (i > -1) {
          users.splice(i, 1); // remove me from the users array
        }
      }
      const lastMessage = await this.chatMessageService.findConversationLastMessage(
        conversation._id,
      );
      conversation.lastMessage = lastMessage ? lastMessage : undefined;
      conversation.usersMetadata = []; // Bad Idea ?
      if (conversation.users.length === 2) {
        const i = conversation.users.indexOf(currentUser.id.toString());
        if (i > -1) {
          conversation.users.splice(i, 1); // remove me from the users array
        }
      }
      for (const userId of conversation.users) {
        const userMetadata = await this.chatCacheService.getUserMetadata(userId);
        if (!isNil(userMetadata)) {
          conversation.usersMetadata.push(userMetadata);
        }
      }
      const others = users.map(async (id: any) => this.chatCacheService.getUserInformationById(id));
      const update = {
        conversationId: data.conversationId,
        conversationIcon: conversation.conversationIcon,
        changedBy: currentUser.id,
        conversation,
      };
      // Send update to other users;
      others.forEach(async user => {
        const userInfo = await user;
        if (isNil(userInfo)) {
          return;
        }
        await this.sendEventUpdate(
          client,
          currentUser,
          userInfo,
          update,
          CHAT_MESSAGE.UPDATE_CONVERSATION_ICON,
        );
      });
      return {
        event: CHAT_MESSAGE.UPDATE_CONVERSATION_ICON,
        data: { ...update, clientId: client.id, ts: new Date().getTime() },
      };
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
      }
      throw error;
    }
  }

  // TODO(@shekohex): move validation to a seprate private method.
  @SubscribeMessage(CHAT_MESSAGE.SEND_MESSAGE)
  public async handleMessages(client: SocketIO.Socket, data: ChatMessage) {
    try {
      if (data.content.length > 1000) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          message: `very big message content, got ${data.content.length} and limit is 1000`,
        });
      }
      // Add debug info
      this.logger.logDebug('chat.sendMessage', data);
      this.validateData(data);

      const myInfo = await this.chatCacheService.getUserMetadata(client.id, true);
      const me = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (!myInfo || !me) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      const recipients = reject(r => r === me.id.toString(), data.recipients) || []; // remove me
      data.from = myInfo.id;
      await this.validateDataSharedState(data, me);

      data.isFavorite = false;
      const update = {
        type: 'MESSAGE_SENT',
        object: data,
        ts: new Date().getTime(),
        clientId: data.clientId,
      };
      // create a new stats for this array
      data.stats = [
        {
          userId: myInfo.id,
          status: MessageStatus.SEEN,
          deliveredAt: new Date(),
          seenAt: new Date(),
        },
      ];
      // I need to set it as a task to run later, cuz we need to return fast to that user
      let isSaved = false;
      // in case you asked for why i'm using a for loop as a sync loop, cuz if i used async loops
      // it will make a race condition.
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < recipients.length; i++) {
        const to = recipients[i];
        const recipientInfo = await this.chatCacheService.getUserInformationById(to);
        const isAllowed = await this.userPrivacyService.checkChatPrivacy([myInfo.id, to]);
        if (!isAllowed) {
          continue; // skip this user.
        }
        try {
          this.eventEmitter.emitAsync('chat:sendNotification', to, update.object, myInfo);
        } catch {
          // A firebase Problem ?
        }
        if (isNil(recipientInfo)) {
          // reciver offline !
          data.stats.push({ userId: to, status: MessageStatus.NOT_DELIVERED });
          if (!isSaved) {
            update.object = await this.chatMessageService.create(data);
            update.object.local_id = data.local_id;
            isSaved = true;
          }
        } else if (recipientInfo.serverId !== getServerUID()) {
          // reciver online, but connected to another server
          data.stats.push({
            userId: to,
            status: MessageStatus.DELIVERED,
            deliveredAt: new Date(),
          });
          if (data.isShare) {
            data.statusMetadata = await this.eventEmitter.emitAsync(
              'status:getStatusMetadataById',
              data.shareToStatusId,
              recipientInfo.id,
            );
          }
          if (!isSaved) {
            update.object = await this.chatMessageService.create(data);
            update.object.local_id = data.local_id;
            isSaved = true;
          }
          this.sendEventUpdate(
            client,
            me,
            recipientInfo,
            update.object,
            CHAT_MESSAGE.RECEIVE_MESSAGE,
          );
        } else {
          // reciver online , and connected to this server
          data.stats.push({
            userId: to,
            status: MessageStatus.DELIVERED,
            deliveredAt: new Date(),
          });
          if (data.isShare) {
            data.statusMetadata = await this.eventEmitter.emitAsync(
              'status:getStatusMetadataById',
              data.shareToStatusId,
              recipientInfo.id,
            );
          }
          if (!isSaved) {
            update.object = await this.chatMessageService.create(data);
            update.object.local_id = data.local_id;
            isSaved = true;
          }
          client.to(`/chat#${recipientInfo.clientId}`).emit(CHAT_MESSAGE.RECEIVE_MESSAGE, {
            object: update.object,
            ts: new Date().getTime(),
            clientId: data.clientId,
          });
        }
      }
      update.object.local_id = data.local_id;
      this.logger.logDebug(update);
      return { event: CHAT_MESSAGE.RECEIVE_MESSAGE, data: update }; // It's sort of acknowledgement
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(
          `${client.id} : ${error.getError().errorMessage}
          info: ${JSON.stringify(error.getError().info, null, 2)}`,
          error,
        );
      } else {
        this.logger.error(error, error.stack);
      }
      throw error;
    }
  }

  @SubscribeMessage(CHAT_MESSAGE.LIST_CONVERSATIONS)
  public async handleListUserConversations(client: SocketIO.Socket, data: any) {
    try {
      // Add debug info
      this.logger.logDebug('chat.listConversations', data);
      const currentUser = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (!currentUser) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      const userConversations = await this.conversationService.findUserConversations(
        currentUser.id,
        data.page || 0,
        data.limit || 15,
      );
      for (const conversation of userConversations) {
        const lastMessage = await this.chatMessageService.findConversationLastMessage(
          conversation._id,
        );
        conversation.lastMessage = lastMessage ? lastMessage : undefined;
        conversation.usersMetadata = []; // Bad Idea ?
        if (conversation.users.length === 2) {
          const i = conversation.users.indexOf(currentUser.id.toString());
          if (i > -1) {
            conversation.users.splice(i, 1); // remove me from the users array
          }
        }
        for (const userId of conversation.users) {
          const userMetadata = await this.chatCacheService.getUserMetadata(userId, false, {
            id: currentUser.id,
          });
          if (!isNil(userMetadata)) {
            conversation.usersMetadata.push(userMetadata);
          }
        }
      }
      return {
        event: CHAT_MESSAGE.LIST_CONVERSATIONS,
        data: { conversations: userConversations || [] },
      };
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
      }
      throw error;
    }
  }

  @SubscribeMessage(CHAT_MESSAGE.CONVERSATION_MESSAGES)
  public async handleConversationMessages(client: SocketIO.Socket, data: any) {
    try {
      const now = Date.now();
      // Add debug info
      this.logger.logDebug('chat.conversationMessages', data);
      const currentUser = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (!currentUser) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      if (!data.conversationId) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `You are missing the conversationId and page, limit, since are optinal`,
          hint: `'since' must be an ISODate, and the default value is a 7 days ago from now`,
          got: {
            conversationId: data.conversationId,
            page: data.page || 1,
            limit: data.limit || 25,
            since: data.since || new Date(Date.now() - 7 * 24 * 60 * 60),
          },
          want: ['conversationId'],
        });
      }
      const conversation = await this.conversationService.findConversationById(data.conversationId);
      if (isNil(conversation)) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          message: 'There is no conversation with that id',
        });
      }
      if (!conversation.users.includes(currentUser.id.toString())) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          message: 'You are not allowed to view this conversation.',
        });
      }
      const userConversationMessages = await this.chatMessageService.findConversationMessages(
        data.conversationId,
        data.page || 1,
        data.limit || 25,
        data.since || new Date(Date.now() - 7 * 24 * 60 * 60),
      );
      for (const message of userConversationMessages) {
        if (message.isShare) {
          data.statusMetadata = this.eventEmitter.emit(
            'status:getStatusMetadataById',
            message.shareToStatusId,
            currentUser.id,
          );
        }
        message.isFavorite = await this.favoriteMessageService.isFavoriteMessage(
          conversation._id,
          message._id,
          currentUser.id,
        );
      }
      const thisUser = (u: { userId: string; ts: Date }) =>
        u.userId.toString() === currentUser.id.toString();
      const f = conversation.deletedFrom.filter(thisUser);
      if (f.length > 0 && f[0]) {
        const messages = userConversationMessages.filter(m => m.createdAt! >= f[0].ts.getTime());
        return {
          event: CHAT_MESSAGE.CONVERSATION_MESSAGES,
          data: { messages },
        };
      }
      const then = Date.now();
      const t = then - now;
      this.logger.logDebug(`Time = ${t} millisecond`);
      return {
        event: CHAT_MESSAGE.CONVERSATION_MESSAGES,
        data: { messages: userConversationMessages || [] },
      };
    } catch (error) {
      this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      this.logger.error(error, error.stack);
      throw error;
    }
  }

  @SubscribeMessage(CHAT_MESSAGE.LIST_UNDELIVERED_MESSAGES)
  public async handleUnDeliveredMessages(client: SocketIO.Socket, data: any) {
    try {
      // Add debug info
      this.logger.logDebug('chat.listUnDeleveredMessages', data);
      const currentUser = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (!currentUser) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      const undeliveredMessages = await this.chatMessageService.findUnDeliveredMessages(
        currentUser.id,
        data.page || 1,
        data.limit || 20,
      );
      return {
        event: CHAT_MESSAGE.LIST_UNDELIVERED_MESSAGES,
        data: { messages: undeliveredMessages || [] },
      };
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
      }
      throw error;
    }
  }

  @SubscribeMessage(CHAT_MESSAGE.DELETE_MESSAGE)
  public async handleDeleteMessage(
    client: SocketIO.Socket,
    data: { conversationId: string; users: any[]; messageIds: any[] },
  ) {
    try {
      // Add debug info
      this.logger.logDebug('chat.deleteMessage', data);
      const currentUser = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (!currentUser) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      if (
        !data.conversationId ||
        (!data.users && !Array.isArray(data.users)) ||
        (!data.messageIds && !Array.isArray(data.messageIds))
      ) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `You are missing the 'conversationId', 'users' array or 'messageIds' array`,
          got: {
            conversationId: data.conversationId,
            users: data.users,
            messageIds: data.messageIds,
          },
          want: ['conversationId', 'messageIds[]', 'users[]'],
        });
      }
      const toDeleteMessagesIds: string[] = [];
      const messages = await this.chatMessageService.getBulckMessages(
        data.messageIds,
        data.conversationId,
      );
      // after we got the messages
      // we need to filter them to only delete the messages that hasn't been seen yet
      for (const message of messages) {
        const stats = message.stats;
        const isSeenYet = stats.some(m => m.status === MessageStatus.SEEN);
        if (!isSeenYet) {
          toDeleteMessagesIds.push(message.id);
        } else {
          continue;
        }
      }
      // the above code could be this ::
      // but the above code is much clearer.
      //
      // const toBeDeleted = messages
      //   .filter(m => m.stats.some(s => s.status === MessageStatus.SEEN))
      //   .map(m => m.id);

      if (toDeleteMessagesIds.length > 0) {
        await this.chatMessageService.deleteMessages(toDeleteMessagesIds);
      }
      if (Array.isArray(data.users) && data.users.length === 2) {
        const i = data.users.indexOf(currentUser.id.toString());
        if (i > -1) {
          data.users.splice(i, 1); // remove me from the users array
        }
      }
      const others = data.users.map(async id => this.chatCacheService.getUserInformationById(id));
      const update = { conversationId: data.conversationId, deletedMessages: toDeleteMessagesIds };
      // Send update to other users;
      others.forEach(async user => {
        const userInfo = await user;
        if (isNil(userInfo)) {
          return;
        }
        await this.sendEventUpdate(
          client,
          currentUser,
          userInfo,
          update,
          CHAT_MESSAGE.DELETE_MESSAGE,
        );
      });
      return { event: CHAT_MESSAGE.DELETE_MESSAGE, data: update };
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
      }
      throw error;
    }
  }

  @SubscribeMessage(CHAT_MESSAGE.DELETE_MESSAGES_FOR_ME)
  public async handleDeleteMessagesForMe(
    client: SocketIO.Socket,
    data: { conversationId: string },
  ) {
    try {
      // Add debug info
      this.logger.logDebug('chat.deleteMessagesForMe', data);
      const currentUser = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (!currentUser) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      if (!data.conversationId) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `You are missing the 'conversationId'`,
          got: {
            conversationId: data.conversationId,
          },
          want: ['conversationId'],
        });
      }
      const conversation = await this.conversationService.findConversationById(data.conversationId);
      if (isNil(conversation)) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          message: 'There is no conversation with that id',
        });
      }
      conversation.deletedFrom.push({
        userId: currentUser.id.toString(),
        ts: new Date(Date.now()),
      });
      conversation.markModified('deletedFrom');
      await conversation.save();
      return {
        event: CHAT_MESSAGE.DELETE_MESSAGES_FOR_ME,
        data: { message: 'Messages Deleted !' },
      };
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
      }
      throw error;
    }
  }
  // NOTE: Needs Improvments
  @SubscribeMessage(CHAT_MESSAGE.MESSAGE_SEEN)
  public async handleMessageSeen(
    client: SocketIO.Socket,
    data: { conversationId: string; users: any[]; messageIds: any[] },
  ) {
    try {
      const currentUser = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (!currentUser) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      // Add debug info
      this.logger.logDebug('chat.messageSeen', data, currentUser);
      if (
        !data.conversationId ||
        (!data.users && !Array.isArray(data.users)) ||
        (!data.messageIds && !Array.isArray(data.messageIds)) ||
        !data.messageIds.every(id => id.length > 16)
      ) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `You are missing the 'conversationId', 'users' array or 'messageIds' array`,
          got: {
            conversationId: data.conversationId,
            users: data.users,
            messageIds: data.messageIds,
          },
          want: ['conversationId', 'messageIds[]', 'users[]'],
        });
      }
      if (isEmpty(data.messageIds)) {
        return;
      }
      await this.chatMessageService.updateMessageStatus(
        data.messageIds,
        currentUser.id,
        MessageStatus.SEEN,
      );
      if (Array.isArray(data.users) && data.users.length === 2) {
        const i = data.users.indexOf(currentUser.id.toString());
        if (i > -1) {
          data.users.splice(i, 1); // remove me from the users array
        }
      }
      const others = data.users.map(async id => this.chatCacheService.getUserInformationById(id));
      const update = {
        conversationId: data.conversationId,
        messageIds: data.messageIds,
        status: MessageStatus.SEEN,
      };
      // Send update to other users;
      setTimeout(async () => {
        for (const user of others) {
          const userInfo = await user;
          if (isNil(userInfo)) {
            return;
          }
          await this.sendEventUpdate(
            client,
            currentUser,
            userInfo,
            update,
            CHAT_MESSAGE.CONVERSATION_UPDATED,
          );
        }
      }, 0);

      return { event: CHAT_MESSAGE.CONVERSATION_UPDATED, data: update };
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
      }
      throw error;
    }
  }

  @SubscribeMessage(CHAT_MESSAGE.MESSAGE_FAVORITE)
  public async handleFavoriteMessage(client: SocketIO.Socket, data: any) {
    try {
      this.logger.logDebug('chat.messageFavorite', data);
      const currentUser = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (!currentUser) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      if (!data.conversationId || !data.messageId) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `You are missing the 'conversationId' or 'messageId'`,
          got: {
            conversationId: data.conversationId,
            messageId: data.messageId,
          },
          want: ['conversationId', 'messageId'],
        });
      }
      await this.favoriteMessageService.addFavoriteMessage({
        userId: currentUser.id,
        conversationId: data.conversationId,
        messageId: data.messageId,
      });
      return {
        event: CHAT_MESSAGE.MESSAGE_FAVORITE,
        data: { messageAdded: true },
      };
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
      }
      throw error;
    }
  }

  @SubscribeMessage(CHAT_MESSAGE.LIST_FAVORITE_MESSAGES)
  public async handleListFavoriteMessages(client: SocketIO.Socket, data) {
    try {
      this.logger.logDebug('chat.listFavoriteMessages', data);
      const currentUser = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (!currentUser) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      const page = parseInt(data.page) || 1;
      const limit = parseInt(data.limit) || 20;
      const favoriteMessages = await this.favoriteMessageService.getMyFavoriteMessages(
        currentUser.id,
        page,
        limit,
      );

      const resutlMessages: any[] = [];
      for (const { messageId, _id } of favoriteMessages) {
        try {
          const message = await this.chatMessageService.findMessageById(messageId);
          if (message) {
            (message as any).favoriteId = _id;
            resutlMessages.push(message);
          }
        } catch {
          continue;
        }
      }

      return { event: CHAT_MESSAGE.LIST_FAVORITE_MESSAGES, data: { messages: resutlMessages } };
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
      }
      throw error;
    }
  }

  @SubscribeMessage(CHAT_MESSAGE.MESSAGE_REMOVE_FAVORITE)
  public async handleRemoveFavoriteMessage(client: SocketIO.Socket, data) {
    try {
      this.logger.logDebug('chat.messageRemoveFavorite', data);
      const currentUser = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (!currentUser) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      if (!data.favoriteId) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `You are missing the 'favoriteId'`,
          got: {
            favoriteId: data.favoriteId,
          },
          want: ['favoriteId'],
        });
      }
      const result = await this.favoriteMessageService.removeFavoriteMessageById(data.favoriteId);
      return { event: CHAT_MESSAGE.MESSAGE_REMOVE_FAVORITE, data: { messageRemoved: result } };
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
      }
      throw error;
    }
  }

  // NOTE: Needs Improvments
  @SubscribeMessage(CHAT_MESSAGE.KEYBOARD_ACTION)
  public async handleKeyboardAction(
    client: SocketIO.Socket,
    data: {
      conversationId: string;
      users: any[];
      isTyping?: boolean;
      isRecording?: boolean;
      isRemoving?: boolean;
    },
  ) {
    try {
      // Add debug info
      this.logger.logDebug('chat.keyboardAction', data);
      const currentUser = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (!currentUser) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      if (!data.conversationId || (!data.users && !Array.isArray(data.users))) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `You are missing the 'conversationId' or 'users' array`,
          got: {
            conversationId: data.conversationId,
            users: data.users,
            isTyping: data.isTyping,
            isRecording: data.isRecording,
            isRemoving: data.isRemoving,
          },
          want: ['conversationId', 'isTyping?', 'isRecording?', 'isRemoving?', 'users[]'],
        });
      }

      if (data.users.length === 2) {
        const i = data.users.indexOf(currentUser.id.toString());
        if (i > -1) {
          data.users.splice(i, 1); // remove me from the users array
        }
      }

      const others = data.users.map(id => this.chatCacheService.getUserInformationById(id));
      const update = {
        conversationId: data.conversationId,
        userTyping: currentUser.id,
        isTyping: data.hasOwnProperty('isTyping') ? data.isTyping : true,
        isRecording: data.hasOwnProperty('isRecording') ? data.isRecording : false,
        isRemoving: data.hasOwnProperty('isRemoving') ? data.isRemoving : false,
      };
      // Send update to other users;
      const tasks = others.map(async user => {
        const userInfo = await user;
        if (isNil(userInfo)) {
          return;
        }
        return this.sendEventUpdate(
          client,
          currentUser,
          userInfo,
          update,
          CHAT_MESSAGE.KEYBOARD_ACTION,
        );
      });
      // tslint:disable-next-line: no-empty
      Promise.all(tasks).catch(() => {});
      return { event: CHAT_MESSAGE.KEYBOARD_ACTION, data: update };
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
      }
      throw error;
    }
  }

  @SubscribeMessage(CHAT_MESSAGE.IAM_ACTIVE)
  public async handleIAMActive(client: SocketIO.Socket, data) {
    try {
      // Add debug info
      this.logger.logDebug('chat.iamActive', data);
      const currentUser = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (!currentUser) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      if (!is(Boolean, data.iamActive)) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `You are missing the 'iamActive' of type 'boolean',
        and must be of type boolean !!`,
          got: {
            iamActive: data.iamActive,
          },
          want: ['iamActive'],
        });
      }
      const myOnlineFollowers = await this.chatCacheService.getMyFollowers(currentUser.id);
      currentUser.iamActive = data.iamActive || false;
      const tasks = myOnlineFollowers.map(follower =>
        this.sendEventUpdate(client, currentUser, follower, currentUser, CHAT_MESSAGE.IAM_ACTIVE),
      );
      // tslint:disable-next-line: no-empty
      Promise.all(tasks).catch(() => {});
      return {
        event: CHAT_MESSAGE.IAM_ACTIVE,
        data: { clientId: client.id, ts: new Date().getTime(), object: currentUser },
      };
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
      }
      throw error;
    }
  }

  @SubscribeMessage(CHAT_MESSAGE.CHECK_ONLINE_FRIENDS)
  public async handleOnlineFriends(client: SocketIO.Socket) {
    const currentUser = await this.chatCacheService.getUserInformationByClientId(client.id);
    if (!currentUser) {
      throw new WsMessageException('CHAT.USER_NOT_FOUND');
    }
    // TODO: Fix this.
    // const onlineFriends = await this.chatCacheService.getUserOnlineFriends(currentUser.id);
    return { event: CHAT_MESSAGE.CHECK_ONLINE_FRIENDS, data: [] };
  }

  private async sendEventUpdate(
    client: SocketIO.Socket,
    me: UserInformation,
    user: UserInformation,
    update: any,
    event: any,
    self = false,
  ) {
    if (user.serverId !== getServerUID()) {
      await this.dialUpService.dailUp(user.serverId, {
        event,
        data: {
          object: update,
          fromUserId: me.id.toString(),
          toUserId: user.id,
          fromClientId: me.clientId,
          toClientId: user.clientId,
          fromServerId: getServerUID(),
          toServerId: user.serverId,
          ts: new Date().getTime(),
          clientId: me.clientId,
        },
        type: MessageType.MESSAGE_UPDATE,
      });
    } else if (self) {
      const id = getIdFromNamespace(user.clientId);
      this.dialUpService.wsServer.to(`/chat#${id}`).emit(event, {
        object: update,
        ts: new Date().getTime(),
        clientId: me.clientId,
      });
    } else {
      const id = getIdFromNamespace(user.clientId);
      client.to(`/chat#${id}`).emit(event, {
        object: update,
        ts: new Date().getTime(),
        clientId: me.clientId,
      });
    }
  }

  private subscribeToEvents() {
    this.eventEmitter.on(
      'chat:isConversationMember',
      async (conversationId: string, userId: string) => {
        return this.conversationService.isConversationMember(conversationId, userId);
      },
    );
  }

  private async sendUpdateConversationRow(
    client: SocketIO.Socket,
    me: UserInformation,
    other: UserInformation,
    conversationId: string,
  ) {
    const conversation = await this.conversationService.findConversationById(conversationId);
    if (isNil(conversation)) {
      // just return
      return;
    }
    const conversationContext = conversation.toObject();
    const lastMessage = await this.chatMessageService.findConversationLastMessage(conversation._id);
    conversationContext.lastMessage = lastMessage ? lastMessage : undefined;
    conversationContext.usersMetadata = [];
    if (conversationContext.users.length === 2) {
      const i = conversationContext.users.indexOf(me.id.toString());
      if (i > -1) {
        conversationContext.users.splice(i, 1); // remove me from the users array
      }
    }
    for (const userId of conversationContext.users) {
      const userMetadata = await this.chatCacheService.getUserMetadata(userId, false, {
        id: me.id,
      });
      if (!isNil(userMetadata)) {
        conversationContext.usersMetadata.push(userMetadata);
      }
    }
    this.logger.logDebug(
      'Sending Row Conversation Update to user: ',
      other.id,
      'from user: ',
      me.id,
      'with update: ',
      conversationContext,
    );
    await this.sendEventUpdate(
      client,
      me,
      other,
      conversationContext,
      CHAT_MESSAGE.UPDATE_CONVERSATION_ROW,
      true,
    );
  }

  private async validateDataSharedState(data: ChatMessage, me) {
    if (data.isReply && !data.replyToMsgId) {
      throw new WsMessageException('CHAT.BAD_PAYLOAD', {
        message: `if that message is reply, then where is the replyToMsgId ?`,
      });
    }
    if (data.isShare && !data.shareToStatusId) {
      throw new WsMessageException('CHAT.BAD_PAYLOAD', {
        message: `if that message is share, then where is the shareToStatusId ?`,
      });
    }

    if (data.hasLocation && isNil(data.location)) {
      throw new WsMessageException('CHAT.BAD_PAYLOAD', {
        message: `if that message has location, then where is the fuck it is?!`,
      });
    }

    if (data.hasSharedContacts && isNil(data.sharedContacts)) {
      throw new WsMessageException('CHAT.BAD_PAYLOAD', {
        message: `if that message has a shared contacts, then where is the fuck it is?!`,
      });
    }
    if (data.extension && Object.keys(data.extension).length > 10) {
      throw new WsMessageException('CHAT.BAD_PAYLOAD', {
        message: `you can only have at most 10 extension in one message`,
      });
    }

    if (data.hasMentions && isNil(data.mentionIds)) {
      throw new WsMessageException('CHAT.BAD_PAYLOAD', {
        message: `if that message has a mentions, then where is the fuck it is?!`,
      });
    }

    if (data.sharedContacts && !isNil(data.sharedContacts)) {
      for (const contact of data.sharedContacts) {
        try {
          const contactInfo = await this.chatCacheService.getUserMetadataByMobileNumber(
            contact.mobileNumber,
          );
          if (!isNil(contactInfo)) {
            contact.userId = contactInfo.id;
          }
        } catch {
          // user not found, so continue
          contact.userId = undefined;
        }
      }
    }
    if (data.isShare) {
      data.statusMetadata = await this.eventEmitter.emitAsync(
        'status:getStatusMetadataById',
        data.shareToStatusId,
        me.id,
      );
    }
  }
  private validateData(data: ChatMessage) {
    if (
      !data.recipients ||
      !data.conversationId ||
      !Array.isArray(data.recipients) ||
      data.content.length < 1
    ) {
      throw new WsMessageException('CHAT.BAD_PAYLOAD', {
        missing: `You are missing the 'conversationId' or 'recipients'`,
        got: {
          conversationId: data.conversationId,
          recipients: data.recipients,
        },
        want: ['conversationId', 'recipients[]'],
      });
    }
    if (data._id) {
      throw new WsMessageException('CHAT.BAD_PAYLOAD', {
        message: `'_id' is read-only, go away `,
      });
    }

    if (data.recipients.length > 50) {
      throw new WsMessageException('CHAT.BAD_PAYLOAD', {
        message: `'recipients' too many recipients > 50 !`,
      });
    }
  }
}
