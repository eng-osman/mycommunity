import { ChatCacheService } from '@app/chat/chat-cache.service';
import { DialUpService } from '@app/cluster/dial-up.service';
import { MessageType } from '@app/cluster/message-type.enum';
import { getServerUID, TIMELINE_MESSAGE } from '@app/constants';
import { Status } from '@app/user-status/entities';
import { InternalServerErrorException } from '@nestjs/common';
import { Injectable, UseGuards } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from '@nestjs/websockets';
import { InjectEventEmitter } from '@shared/decorators';
import { WsMessageException } from '@shared/excepion';
import { WsAuthGuard } from '@shared/guards';
import { LoggerService } from '@shared/services';
import { EventEmitter2 } from 'eventemitter2';
import { isNil } from 'ramda';
import { FanCacheService } from './fan-cache.service';
import { FanActionMessage } from './messages/fan-action.message';

@Injectable()
@WebSocketGateway({ namespace: 'timeline' })
export class FireHoseGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger: LoggerService = new LoggerService('FireHoseGateway');

  private readonly fanEvent = 'timeline:startFan';
  private readonly fanActionEvent = 'timeline:startFanAction';
  private readonly stopFanAction = 'timeline:stopFanAction';
  private readonly sendToLiveVideoSubscribers = 'timeline:sendToLiveVideoSubscribers';
  constructor(
    private readonly chatCacheService: ChatCacheService,
    private readonly dialUpService: DialUpService,
    private readonly fanCacheService: FanCacheService,
    @InjectEventEmitter() private readonly eventEmitter: EventEmitter2,
  ) {
    this.initFireHose();
  }
  @UseGuards(WsAuthGuard)
  public handleConnection(client: SocketIO.Socket) {
    this.logger.log(`${client.id} Connected`);
  }
  public handleDisconnect(client: SocketIO.Socket) {
    this.logger.log(`${client.id} Disconnected`);
  }

  public async initFireHose() {
    this.eventEmitter.on(this.fanEvent, async (friendId, status, type) => {
      await this.handleFanService(friendId, status, type);
    });
    this.eventEmitter.on(this.fanActionEvent, async (statusId, data) => {
      await this.fanOutStatusActions(statusId, data);
    });

    this.eventEmitter.on(this.stopFanAction, async statusId => {
      await this.stopFanoutActions(statusId);
    });

    this.eventEmitter.on(this.sendToLiveVideoSubscribers, async (statusId, videoUrl) => {
      this.fanOutToLiveVideoSubscriber(statusId, videoUrl);
    });
  }

  public async stopFanoutActions(statusId: string) {
    await this.fanCacheService.removeStatus(statusId);
  }

  public async handleFanService(friendId, status: Status, type: 'fanin' | 'fanout') {
    try {
      const receiverInfo = await this.chatCacheService.getUserInformationById(friendId);
      // i don't know why we ndeed this ?
      const userInfo = await this.chatCacheService.getUserMetadata(status.user.id);
      // ok he is offline, then there is nothing to do here
      if (isNil(receiverInfo)) {
        return;
      }
      const data = {
        clientId: receiverInfo.clientId,
        object: { status, userInfo } as any,
        ts: Math.round(new Date().getTime() / 1000),
      };
      let event = TIMELINE_MESSAGE.FANOUT_STATUS;
      if (type === 'fanin') {
        event = TIMELINE_MESSAGE.FANIN_STATUS;
      }
      if (!isNil(receiverInfo) && receiverInfo.serverId !== getServerUID()) {
        // reciver online, but connected to another server
        // lets push the message to his timeline
        await this.dialUpService.dailUp(receiverInfo.serverId, {
          event,
          data: {
            fromUserId: status.user.id,
            toUserId: friendId,
            fromClientId: data.clientId,
            toClientId: receiverInfo.clientId,
            fromServerId: getServerUID(),
            toServerId: receiverInfo.serverId,
            ...data,
          },
          type: MessageType.TIMELINE_UPDATE,
        });
        this.logger.logDebug(`sending timeline.fanoutStatus to user ${receiverInfo.id}`);
        return;
      } else {
        // reciver online , and connected to this server
        await this.dialUpService.wsServer
          .of('/timeline')
          .in(`/timeline#${receiverInfo.clientId}`)
          .emit(event, data);
        this.logger.logDebug(`sending timeline.fanoutStatus to user ${receiverInfo.id}`);
        return;
      }
    } catch (error) {
      this.logger.error(error, error.stack);
      throw new InternalServerErrorException('CAN NOT FANOUT MESSAGE TO THE USERS');
    }
  }

  public async fanOutStatusActions(statusId: string, actionData: FanActionMessage) {
    try {
      const subscribers = await this.fanCacheService.getStatusSubscribers(statusId);
      for (const subscriberId of subscribers) {
        const receiverInfo = await this.chatCacheService.getUserInformationById(subscriberId);
        if (isNil(receiverInfo)) {
          continue;
        }
        actionData.statusId = statusId;
        const event = TIMELINE_MESSAGE.FANOUT_STATUS_ACTIONS;
        const data = {
          clientId: receiverInfo.clientId,
          object: actionData as any,
          ts: Math.round(new Date().getTime() / 1000),
        };

        if (receiverInfo.serverId !== getServerUID()) {
          // reciver online, but connected to another server
          await this.dialUpService.dailUp(receiverInfo.serverId, {
            event,
            data: {
              fromUserId: 'SYSTEM',
              toUserId: subscriberId,
              fromClientId: data.clientId,
              toClientId: receiverInfo.clientId,
              fromServerId: getServerUID(),
              toServerId: receiverInfo.serverId,
              ...data,
            },
            type: MessageType.TIMELINE_UPDATE,
          });
          return;
        } else {
          // reciver online , and connected to this server
          await this.dialUpService.wsServer
            .of('/timeline')
            .in(`/timeline#${receiverInfo.clientId}`)
            .emit(event, data);
          this.logger.logDebug(`Fanout to Status Subscribers ${statusId}`, actionData);
          return;
        }
      }
    } catch (error) {
      this.logger.error(error, error.stack);
      throw new InternalServerErrorException('CAN NOT FANOUT ACTION MESSAGE TO THE USERS');
    }
  }

  public async fanOutToLiveVideoSubscriber(statusId: string, videoUrl: string) {
    try {
      const subscribers = await this.fanCacheService.getLiveVideoSubscriber(statusId);
      for (const subscriberId of subscribers) {
        const receiverInfo = await this.chatCacheService.getUserInformationById(subscriberId);
        if (isNil(receiverInfo)) {
          continue;
        }
        const event = TIMELINE_MESSAGE.FANOUT_TO_LIVE_VIDEO;
        const data = {
          clientId: receiverInfo.clientId,
          object: {
            statusId,
            videoUrl,
          } as any,
          ts: Math.round(new Date().getTime() / 1000),
        };

        if (receiverInfo.serverId !== getServerUID()) {
          // reciver online, but connected to another server
          await this.dialUpService.dailUp(receiverInfo.serverId, {
            event,
            data: {
              fromUserId: 'SYSTEM',
              toUserId: subscriberId,
              fromClientId: data.clientId,
              toClientId: receiverInfo.clientId,
              fromServerId: getServerUID(),
              toServerId: receiverInfo.serverId,
              ...data,
            },
            type: MessageType.TIMELINE_UPDATE,
          });
          this.logger.logDebug(`Fanout to Live Video Subscribers ${statusId}`, subscriberId);
          return;
        } else {
          // reciver online , and connected to this server
          await this.dialUpService.wsServer
            .of('/timeline')
            .in(`/timeline#${receiverInfo.clientId}`)
            .emit(event, data);
          this.logger.logDebug(`Fanout to Live Video Subscribers ${statusId}`, subscriberId);
          return;
        }
      }
    } catch (error) {
      this.logger.error(error, error.stack);
      throw new InternalServerErrorException('CAN NOT FANOUT ACTION MESSAGE TO THE USERS');
    }
  }

  @SubscribeMessage(TIMELINE_MESSAGE.SUBSCRIBE_TO_STATUS)
  public async subscribeToStatus(client: SocketIO.Socket, data: { statusId?: string }) {
    try {
      // Add debug info
      this.logger.logDebug('timeline.subscribeToStatus', data);
      if (!data.statusId) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `You are missing the the 'statusId' of type string`,
        });
      }
      const receiverInfo = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (isNil(receiverInfo)) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      await this.fanCacheService.addStatusSubscriber(data.statusId, receiverInfo.id);
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
        throw error;
      }
    }
  }

  @SubscribeMessage(TIMELINE_MESSAGE.UNSUBSCRIBE_TO_STATUS)
  public async unsubscribeToStatus(client: SocketIO.Socket, data: { statusId: string }) {
    try {
      // Add debug info
      this.logger.logDebug('timeline.unsubscribeToStatus', data);
      if (!data.statusId) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `You are missing the the 'statusId' of type string`,
        });
      }
      const receiverInfo = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (isNil(receiverInfo)) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      await this.fanCacheService.removeStatusSubscriber(data.statusId, receiverInfo.id);
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
        throw error;
      }
    }
  }

  @SubscribeMessage(TIMELINE_MESSAGE.CHECK_LIVE_VIDEO_STATUS)
  public async checkLiveVideoStatus(client: SocketIO.Socket, data: { statusId: string }) {
    try {
      // Add debug info
      this.logger.logDebug('timeline.checkLiveVideoStatus', data);
      if (!data.statusId) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `You are missing the the 'statusId' of type string`,
        });
      }
      const receiverInfo = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (isNil(receiverInfo)) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      const [status] = (await this.eventEmitter.emitAsync(
        'status:getStatusChannelId',
        data.statusId,
        receiverInfo.id,
      )) as [Status | null];
      if (status) {
        const [channelStatus] = (await this.eventEmitter.emitAsync(
          'live-video:checkIfChannelExist',
          status.liveVideoChannelId,
        )) as [boolean | null];
        let res: any = {
          isLive: channelStatus || false,
          channelId: status.liveVideoChannelId,
          isOK: true,
          statusId: status.id,
        };
        if (channelStatus !== null && channelStatus === false && status.liveVideoChannelId) {
          res = {
            ...res,
            media: status.media,
            hadMedia: status.hasMedia,
          };
        }
        return {
          event: TIMELINE_MESSAGE.CHECK_LIVE_VIDEO_STATUS,
          data: { object: res, clientId: client.id, ts: new Date().getTime() },
        };
      }
      return {
        event: TIMELINE_MESSAGE.CHECK_LIVE_VIDEO_STATUS,
        data: {
          object: {
            isOK: false,
            isLive: false,
            statusId: data.statusId,
          },
          clientId: client.id,
          ts: new Date().getTime(),
        },
      };
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
        throw error;
      } else {
        this.logger.error(error, error.stack);
        throw error;
      }
    }
  }

  @SubscribeMessage(TIMELINE_MESSAGE.FANOUT_STATUS)
  public async handleSubscribeToTimeline(client: SocketIO.Socket, data): Promise<WsResponse<any>> {
    try {
      // Add debug info
      this.logger.logDebug('timeline.fanoutStatus', data);
      const receiverInfo = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (isNil(receiverInfo)) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      this.logger.logDebug({
        info: `User ${receiverInfo.id} subscribed to timeline.`,
        receivedData: data,
        receiverInfo,
      });
      return {
        event: TIMELINE_MESSAGE.FANOUT_STATUS,
        data: {
          connected: true,
          message: `You the user ${receiverInfo.id} subscribed to timeline successfully`,
        },
      };
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
        throw error;
      } else {
        this.logger.error(error, error.stack);
        throw error;
      }
    }
  }

  @SubscribeMessage(TIMELINE_MESSAGE.SUBSCRIBE_TO_LIVE_VIDEO)
  public async handleSubscribeToLiveVideo(client: SocketIO.Socket, data) {
    try {
      // Add debug info
      this.logger.logDebug('timeline.subscribeToLiveVideo', data);
      if (!data.statusId) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `You are missing the the 'statusId' of type string`,
        });
      }
      const receiverInfo = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (isNil(receiverInfo)) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      await this.fanCacheService.addLiveVideoSubscriber(data.statusId, receiverInfo.id);
      this.logger.logDebug({
        info: `User ${receiverInfo.id} subscribed to live video ${data.statusId}.`,
        receivedData: data,
        receiverInfo,
      });
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
        throw error;
      }
    }
  }
}
