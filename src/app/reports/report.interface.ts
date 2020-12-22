import { Document } from 'mongoose';

export interface Report extends Document {
  reporterId: string;
  entityId: string;
  entityType: string;
  reason: string;
}
