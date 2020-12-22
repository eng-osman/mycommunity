import { Document } from 'mongoose';

export interface SupportMessage extends Document {
  threadId: string;
  createdBy: string;
  msgs: MessageStructrue[];
  solved: boolean;
}

interface MessageStructrue {
  from: string;
  content: string;
}
