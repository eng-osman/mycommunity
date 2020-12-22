import { Document } from 'mongoose';
export interface GlobalMedia extends Document {
  statusId: string;
  userId: string;
  location: {
    type?: 'Point' | string;
    coordinates: [number, number];
  };
}
