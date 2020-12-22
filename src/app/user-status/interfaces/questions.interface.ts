import { Document } from 'mongoose';
export interface Question extends Document {
  statusId: string;
  userId: string;
  location: {
    type?: 'Point' | string;
    coordinates: [number, number];
  };
  priority: number;
  solved: boolean;
  createdAt: Date;
  updatedAt: Date;
}
