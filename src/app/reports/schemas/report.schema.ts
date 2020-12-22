import { Schema } from 'mongoose';
import * as timestamp from 'mongoose-timestamp';
export const ReportSchema = new Schema({
  reporterId: { type: String, required: true, index: { unique: false } },
  entityId: { type: String, required: true, index: { unique: false } },
  entityType: { type: String, required: true, index: { unique: false } },
  reason: { type: String, required: true, index: { unique: false } },
}).plugin(timestamp);
