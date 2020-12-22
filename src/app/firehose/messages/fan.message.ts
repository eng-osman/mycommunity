import { Message } from '@app/chat/interfaces/message.interface';
import { Status } from '@app/user-status/entities';

export interface FanMessage extends Message {
  type: 'FANOUT' | 'FANIN';
  status: Status | any;
}
