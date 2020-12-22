import { Schema } from 'mongoose';
import * as timestamp from 'mongoose-timestamp';
import { UserHelpModel } from '../interfaces/user-help.interface';

export const UserHelpSchema = new Schema<UserHelpModel>({
  ownerId: { type: String, required: true, index: { unique: false } },
  acquiredBy: { type: String, required: false, index: { unique: false } },
  location: {
    type: {
      type: String,
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [0.0, 0.0],
    },
  },
  categoryId: { type: String },
  membersCount: { type: Number, required: true, min: 1, max: 10 },
  deleted: { type: Boolean, default: false, required: false },
  state: {
    type: String,
    required: false,
    default: 'PENDING',
    enum: ['PENDING', 'ACQUIRED', 'DONE'],
  },
}).plugin(timestamp);
UserHelpSchema.index({ location: '2dsphere' });
