import { Message } from '../interfaces/message.interface';

export interface Authenticate extends Message {
  token: string;
}
