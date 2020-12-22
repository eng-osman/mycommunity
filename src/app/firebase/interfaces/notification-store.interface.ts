import { Document } from 'mongoose';

export interface NotificationStoreModel extends Document {
  ownerId: string;
  payload: any;
}
