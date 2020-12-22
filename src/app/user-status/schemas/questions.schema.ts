import { Schema } from 'mongoose';
import * as timestamp from 'mongoose-timestamp';
export const QuestionsSchema = new Schema({
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
  priority: { type: Number, required: true, max: 10, min: 0 },
  solved: { type: Boolean, default: false },
}).plugin(timestamp);
QuestionsSchema.index({ location: '2dsphere' });
