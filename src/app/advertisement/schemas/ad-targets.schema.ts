import { Schema } from 'mongoose';
import * as timestamp from 'mongoose-timestamp';

export const AdvertisementTargetsSchema = new Schema({
  userId: { type: String, required: true, index: { unique: true } },
  isActive: { type: Boolean, required: false, default: false },
  userAge: { type: Number, required: false, default: 18 },
  userGender: { type: Number, required: false, default: 0, index: true },
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
}).plugin(timestamp);
AdvertisementTargetsSchema.index({ location: '2dsphere' });
