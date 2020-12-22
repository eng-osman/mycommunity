import { ReflectMetadata } from '@nestjs/common';
import { Role } from '../enums';

export const Roles = (...roles: Role[]) => ReflectMetadata('roles', roles);
