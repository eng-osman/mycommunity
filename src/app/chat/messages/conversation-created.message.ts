import { Message } from '../interfaces/message.interface';

export interface ConversationCreated extends Message {
  conversationId: string;
  conversationName?: string;
  conversationIcon?: string;
  object?: any;
  createdAt?: number;
}
