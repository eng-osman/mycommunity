import { Document } from 'mongoose';
import { Message } from '../interfaces/message.interface';
import { MessageStatus } from '../message-status.enum';

export interface ChatMessage extends Message, Document {
  conversationId: string;
  recipients: string[];
  from: string;
  content: string;
  hasMedia?: boolean;
  hasLocation?: boolean;
  hasMentions?: boolean;
  hasSharedContacts?: boolean;
  /** local id is internal data from client-side */
  local_id?: string;
  isReply?: boolean;
  isFavorite?: boolean;
  isShare?: boolean;
  replyToMsgId?: string;
  shareToStatusId?: string;
  sharedContacts?: Array<{
    mobileNumber: string;
    name?: string;
    userId?: string;
  }>;
  location?: string;
  statusMetadata?: any;
  mediaType?: string[];
  mediaIds?: string[];
  mentionIds?: string[];
  mediaUrls?: Array<{ url: string; type: string }>;
  stats: Array<{
    userId: string;
    status: MessageStatus;
    deliveredAt?: Date;
    seenAt?: Date;
  }>;
  extension?: Map<string, any>;
  createdAt?: number;
}
