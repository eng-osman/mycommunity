import { getServerUID } from '@app/constants';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { InjectPubClient, InjectSubClient } from '@shared/decorators';
import { LoggerService } from '@shared/services';
import { RedisClient } from 'redis';
import { MessageType } from './message-type.enum';
import { DialUpMessage } from './messages';

@Injectable()
@WebSocketGateway()
export class DialUpService implements OnModuleInit {
  public static subscribed: boolean = false;
  @WebSocketServer()
  public readonly wsServer: SocketIO.Server;
  private readonly logger: LoggerService = new LoggerService('DialUpService');

  constructor(
    @InjectSubClient() private readonly subscriber: RedisClient,
    @InjectPubClient() private readonly publisher: RedisClient,
  ) {}
  public async onModuleInit() {
    const serverId = getServerUID();
    try {
      await this.subscriber.subscribe(`channel-${serverId}`);
      DialUpService.subscribed = true;
      this.subscriber.on('message', async (channel, message) => {
        this.logger.log(`Got Data From ${channel}`);
        await this.emitEvent(JSON.parse(message) as DialUpMessage);
      });
      this.logger.log(`Server Subscribed to channel-${serverId}`);
    } catch (error) {
      // Do we need to Retring ?
      this.logger.error(`Error While Subscribing to channel-${serverId}, Retring ..`);
    }
  }

  public async dailUp(serverId: string, msg: DialUpMessage) {
    try {
      this.logger.log(`Dailing-Up server ${serverId} from client ${msg.data.fromClientId}`);
      await this.publisher.publish(`channel-${serverId}`, JSON.stringify(msg));
    } catch (error) {
      this.logger.error(`Error While Publishing to channel-${serverId}, Retring ..`);
    }
  }

  private async emitEvent(msg: DialUpMessage) {
    switch (msg.type) {
      case MessageType.MESSAGE_UPDATE:
        await this.emitUpdate(msg, '/chat');
        break;
      case MessageType.TIMELINE_UPDATE:
        await this.emitUpdate(msg, '/timeline');
        break;
      default:
        break;
    }
  }

  private async emitUpdate(msg: DialUpMessage, namespace: string) {
    const { data, event } = msg;
    const { clientId, object, ts } = data;
    await this.wsServer
      .of(namespace)
      .in(`${namespace}#${data.toClientId}`)
      .emit(event, { clientId, object, ts });
  }
}
