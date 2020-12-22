import { Schema } from 'mongoose';
import * as timestamp from 'mongoose-timestamp';
export const FavoriteMessageSchema = new Schema({
  conversationId: { type: String, required: true, index: { unique: false } },
  userId: { type: String, required: true, index: { unique: false } },
  messageId: { type: String, required: true, index: { unique: false } },
}).plugin(timestamp);
