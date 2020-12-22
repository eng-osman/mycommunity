import { AUTH_MESSAGE, EXCEPTION_EVENT, getServerUID } from '@app/constants';
import { Injectable } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from '@nestjs/websockets';
import { WsMessageException } from '@shared/excepion';
import { LoggerService } from '@shared/services';
import { ChatAuthService } from './chat-auth.service';
import { Authenticate, Authenticated } from './messages';
@Injectable()
@WebSocketGateway({ namespace: '/auth' })
export class ChatAuthGateway implements OnGatewayDisconnect, OnGatewayConnection {
  private readonly logger: LoggerService = new LoggerService('ChatAuthGateway');
  constructor(private readonly chatAuthService: ChatAuthService) {}

  public async handleConnection(client: SocketIO.Socket) {
    this.logger.log(`${client.id} Connected`);
    await setTimeout(async () => {
      try {
        const isExist = await this.chatAuthService.checkUser(client.id);
        if (!isExist && !client.disconnected) {
          client
            .to(client.id)
            .emit(EXCEPTION_EVENT, new WsMessageException('CHAT.UNAUTHORIZED').getError());
          this.logger.warn(`${client.id} Disconnected, Unauthorized`);
          await this.chatAuthService.removeUser(client.id);
          client.disconnect();
        }
      } catch (error) {
        client.disconnect();
        this.logger.error(error.message, error); // Report the error !
      }
    }, 5 * 1000);
  }

  public handleDisconnect(client: SocketIO.Client) {
    this.chatAuthService
      .removeUser(client.id)
      .then(() => {
        this.logger.log(`${client.id} Disconnected`);
      })
      .catch(err => {
        this.logger.error(err.message, err);
      });
  }

  @SubscribeMessage(AUTH_MESSAGE.AUTHENTICATE)
  public async authenticate(
    client: SocketIO.Socket,
    data: Authenticate,
  ): Promise<WsResponse<Authenticated>> {
    try {
      if (!data.token) {
        throw new WsMessageException('CHAT.BAD_PAYLOAD', { missing: `You are missing the token` });
      }
      const result = await this.chatAuthService.authUser(data.token, client.id);
      if (result.isOK) {
        this.logger.log(`${client.id} Authanicated`);
        return {
          event: AUTH_MESSAGE.AUTHENTICATED,
          data: {
            authenticated: true,
            redirect: '/chat',
            object: result,
            serverId: getServerUID(),
            clientId: client.id,
            ts: new Date().getTime(),
          },
        };
      } else {
        setTimeout(async () => {
          await client.disconnect();
        }, 1000);
        return {
          event: AUTH_MESSAGE.AUTHENTICATED,
          data: {
            authenticated: false,
            clientId: client.id,
            ts: new Date().getTime(),
          },
        };
      }
    } catch (error) {
      if (error instanceof WsMessageException) {
        this.logger.error(`${client.id} : ${error.getError().errorMessage}`, error);
      } else {
        this.logger.error(error, error.stack);
      }
      throw error;
    }
  }
}
