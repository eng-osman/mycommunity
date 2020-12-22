import { Document } from 'mongoose';

export interface UserLogs extends Document {
  userId: string;
  currentMonth?: number;
  currentYear?: number;
  totalPosts?: number;
  totalLikes?: number;
  totalDislikes?: number;
  totalOnlineHours?: number;
  lastSeen: number;
}
