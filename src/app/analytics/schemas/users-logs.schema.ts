import { Schema } from 'mongoose';
export const UsersLogsSchema = new Schema({
  userId: { type: String, required: true, index: { unique: false } },
  currentMonth: { type: Number, required: false, default: new Date().getUTCMonth() },
  currentYear: {
    type: Number,
    required: false,
    default: new Date().getUTCFullYear(),
  },
  totalPosts: { type: Number, required: false, default: 0 },
  totalLikes: { type: Number, required: false, default: 0 },
  totalDislikes: { type: Number, required: false, default: 0 },
  totalOnlineHours: { type: Number, required: false, default: 0 },
  lastSeen: { type: Number, required: false, default: Date.now() },
});
