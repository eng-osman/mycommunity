import { Schema } from 'mongoose';
import * as timestamp from 'mongoose-timestamp';
export const ConversationSchema = new Schema({
  users: [String],
  admins: [String],
  conversationName: { type: String, default: '' },
  conversationIcon: { type: String, default: '' },
  lastMessageId: String,
  isGroupChat: { type: Boolean, default: false },
  deletedFrom: { type: [{ ts: Date, userId: String }], required: false, default: [] },
}).plugin(timestamp);
ConversationSchema.path('users').validate(
  (value: any[]) => value.length && value.length >= 2,
  `Users array cannot be Empty !, got length of < 2`,
  'Array',
);
