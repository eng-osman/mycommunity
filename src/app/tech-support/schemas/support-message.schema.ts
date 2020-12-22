import * as timestamp from 'mongoose-timestamp';

import { Schema } from 'mongoose';
export const SupportMessageSchema = new Schema({
  threadId: { type: String, required: true, index: { unique: true } },
  createdBy: { type: String, required: true, index: { unique: false } },
  solved: { type: Boolean, required: true, default: false },
  msgs: [
    {
      from: { type: String, required: true },
      content: { type: String, required: true },
    },
  ],
}).plugin(timestamp);
