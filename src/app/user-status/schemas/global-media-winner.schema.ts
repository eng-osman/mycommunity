import { Schema } from 'mongoose';
import * as timestamp from 'mongoose-timestamp';
export const GlobalMediaWinnerSchema = new Schema({
  statusId: { type: String, required: true, index: { unique: true } },
  userId: { type: String, required: true, index: { unique: false } },
}).plugin(timestamp);
