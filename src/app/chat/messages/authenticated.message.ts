import { Message } from '../interfaces/message.interface';

export interface Authenticated extends Message {
  authenticated: boolean;
  object?: any;
  serverId?: any;
  redirect?: string;
}
