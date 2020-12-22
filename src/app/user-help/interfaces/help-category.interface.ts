import { Document } from 'mongoose';

export interface HelpCategoryModel extends Document {
  name: string;
  icon: string;
  lang: 'en' | 'ar';
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
