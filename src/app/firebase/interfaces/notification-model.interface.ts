import { Document } from 'mongoose';

export interface NotificationModel extends Document {
  senderId?: string;
  statusId?: string;
  statusOwner?: string;
  channelId?: string;
  statusType?: string;
  actionType?: string;
  notificationType: string;
  senderProfilePic?: string;
  userId: string;
}
