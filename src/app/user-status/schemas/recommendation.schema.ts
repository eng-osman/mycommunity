import { Schema } from 'mongoose';
import * as timestamp from 'mongoose-timestamp';
export const RecommendationSchema = new Schema({
  statusId: { type: String, required: true, index: { unique: true } },
  userId: { type: String, required: true, index: { unique: false } },
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
RecommendationSchema.index({ location: '2dsphere' });
