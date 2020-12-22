import { Schema } from 'mongoose';
import * as timestamp from 'mongoose-timestamp';
import { HelpCategoryModel } from '../interfaces/help-category.interface';

export const HelpCategorySchema = new Schema<HelpCategoryModel>({
  name: { type: String, required: true, index: { unique: false } },
  icon: { type: String, required: true },
  deleted: { type: Boolean, default: false, required: false },
  lang: {
    type: String,
    required: false,
    default: 'ar',
    enum: ['en', 'ar'],
  },
}).plugin(timestamp);
