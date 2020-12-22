import { ChatCacheService } from '@app/chat/chat-cache.service';
import { CONTACTS_MESSAGE } from '@app/constants';
import { Injectable, UseGuards } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { WsMessageException } from '@shared/excepion';
import { WsAuthGuard } from '@shared/guards';
import { LoggerService } from '@shared/services';
import { isNil } from 'ramda';
import { UserContactsService } from './user-contacts.service';
@Injectable()
@WebSocketGateway({ namespace: '/contacts' })
export class ContactsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger: LoggerService = new LoggerService(ContactsGateway.name);

  constructor(
    private readonly userContactsService: UserContactsService,
    private readonly chatCacheService: ChatCacheService,
  ) {}

  @UseGuards(WsAuthGuard)
  public handleConnection(client: SocketIO.Socket) {
    this.logger.log(`${client.id} Connected`);
  }
  public handleDisconnect(client: SocketIO.Socket) {
    this.logger.log(`${client.id} Disconnected`);
  }

  @SubscribeMessage(CONTACTS_MESSAGE.UPLOAD_CONTACT)
  public async uploadContact(
    client: SocketIO.Socket,
    data: { mobileNumber: string; contactName?: string },
  ) {
    try {
      // Add debug info
      this.logger.logDebug('contacts.uploadContact', data);
      if (!data.mobileNumber) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', {
          missing: `You are missing the the 'mobileNumber' of type string`,
        });
      }
      const receiverInfo = await this.chatCacheService.getUserInformationByClientId(client.id);
      if (isNil(receiverInfo)) {
        throw new WsMessageException('CHAT.USER_NOT_FOUND');
      }
      const { users } = await this.userContactsService.addContact(
        { id: receiverInfo.id },
        data.mobileNumber,
        data.contactName || '',
        true,
      );
      return { event: CONTACTS_MESSAGE.UPLOAD_CONTACT, data: { contacts: users } };
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
}
