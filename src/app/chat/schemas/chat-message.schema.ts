import { Schema } from 'mongoose';
import * as timestamp from 'mongoose-timestamp';
export const ChatMessageSchema = new Schema({
  conversationId: { type: String, required: true, index: { unique: false } },
  replyToMsgId: { type: String, required: false, index: { unique: false } },
  shareToStatusId: { type: String, required: false, index: { unique: false } },
  location: { type: String, required: false },
  from: { type: String, required: true, index: { unique: false } },
  recipients: { type: [String], required: true, maxlength: 50 },
  content: { type: String, required: true, maxlength: 1000 },
  hasMedia: { type: Boolean, required: false, default: false },
  hasLocation: { type: Boolean, required: false, default: false },
  hasMentions: { type: Boolean, required: false, default: false },
  hasSharedContacts: { type: Boolean, required: false, default: false },
  isReply: { type: Boolean, required: false, default: false },
  isShare: { type: Boolean, required: false, default: false },
  mediaType: { type: [String], required: false, default: [] },
  mediaIds: { type: [String], required: false, default: [] },
  mentionIds: { type: [String], required: false, default: [], maxlength: 50 },
  mediaUrls: { type: Array, required: false, default: [] },
  stats: {
    type: [{ status: Number, userId: String, deliveredAt: Date, seenAt: Date }],
    required: false,
    default: [],
  },
  extension: {
    type: Map,
    of: Schema.Types.Mixed,
    required: false,
    default: undefined,
  },
  sharedContacts: {
    type: [
      {
        mobileNumber: String,
        userId: { type: String, required: false },
        name: { type: String, required: false },
      },
    ],
    required: false,
    default: [],
    maxlength: 10,
  },
}).plugin(timestamp);
