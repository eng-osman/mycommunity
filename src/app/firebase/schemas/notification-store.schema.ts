import { Schema } from 'mongoose';

export const NotificationsStoreSchema = new Schema(
  {
    ownerId: { type: String, required: true, index: { unique: false } },
    payload: Schema.Types.Mixed,
  },
  { timestamps: true },
);
