import { Document } from 'mongoose';
import { UserGender } from '../user-gender.enum';
export interface AdvertisementTargets extends Document {
  userId: string;
  isActive?: boolean;
  userGender: UserGender;
  userAge: number;
  location: {
    type?: 'Point' | string;
    coordinates: [number, number];
  };
}
