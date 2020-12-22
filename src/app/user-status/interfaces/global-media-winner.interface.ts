import { Document } from 'mongoose';
export interface GlobalMediaWinner extends Document {
  statusId: string;
  userId: string;
}
