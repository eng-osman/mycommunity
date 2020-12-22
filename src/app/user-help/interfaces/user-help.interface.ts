import { Document } from 'mongoose';
import { UserHelpState } from '../enums/user-help-state.enum';

type Longitude = number;
type Latitude = number;

export interface UserHelpModel extends Document {
  ownerId: string;
  location: {
    type: 'Point';
    coordinates: [Longitude, Latitude];
  };
  state: UserHelpState;
  categoryId: string;
  membersCount: number;
  acquiredBy: string | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
