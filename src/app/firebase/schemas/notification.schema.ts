import { Schema } from 'mongoose';
import * as timestamp from 'mongoose-timestamp';

export const NotificationSchema = new Schema({
  senderId: { type: String, required: false },
  statusId: { type: String, required: false },
  statusOwner: { type: String, required: false },
  channelId: { type: String, required: false },
  statusType: { type: String, required: false },
  actionType: { type: String, required: false },
  notificationType: { type: String, required: true, index: { unique: false } },
  senderProfilePic: { type: String, required: false },
  userId: { type: String, required: true, index: { unique: false } },
}).plugin(timestamp);
