import { ReflectMetadata } from '@nestjs/common';

export const AddUserPrivacy = (data: { scope: 'body' | 'query' | 'params'; fildName: string }) =>
  ReflectMetadata('privacy', data);
