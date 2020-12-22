import { Message } from '../../chat/interfaces/message.interface';
export interface Packet extends Message {
  object?: Message | Packet;
  fromUserId: string;
  toUserId: string;
  fromClientId: string;
  toClientId: string;
  fromServerId: string;
  toServerId: string;
}
