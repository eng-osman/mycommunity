import { Document } from 'mongoose';
import { Message } from '../interfaces/message.interface';

export interface FavoriteMessage extends Message, Document {
  conversationId: string;
  userId: string;
  messageId: string;
}
