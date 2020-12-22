import { User } from '@app/user/entities';
import { Document } from 'mongoose';
import { Message } from '../interfaces/message.interface';
import { ChatMessage } from './chat.message';
export interface ConversationMessage extends Message, Document {
  users: string[];
  admins: string[];
  lastMessage?: ChatMessage;
  conversationName?: string;
  conversationIcon?: string;
  usersMetadata?: Array<Partial<User>>;
  isGroupChat: boolean;
  deletedFrom: Array<{ userId: string; ts: Date }>;
  createdAt?: number;
  updatedAt?: number;
}
