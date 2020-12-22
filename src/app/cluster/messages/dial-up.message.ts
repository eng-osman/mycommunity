import { MessageType } from '../message-type.enum';
import { Packet } from './packet.message';
export interface DialUpMessage {
  event: string;
  data: Packet;
  type: MessageType;
}
