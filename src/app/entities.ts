import { BaseEntity } from '../shared/entities';
import {
  Advertisement,
  AdvertisementCategory,
  AdvertisementStatics,
} from './advertisement/entities';
import { UserMedia } from './media/entities';
import { Payment } from './payments/entities/payment.entity';
import { ProfileVerification } from './profile-verification/entities';
import { ApplicationSettings } from './settings/entities';
import { Status, StatusActions } from './user-status/entities';
import { UserTransaction } from './user-transactions/entities';
import { Profile, User, UserContacts, UsersPrivacy } from './user/entities';
import { Channel } from './user/entities/channel.entity';
import { FollowRequest } from './user/entities/follow-request.entity';

export const Entities = [
  BaseEntity,
  UserMedia,
  Status,
  StatusActions,
  Profile,
  User,
  UserContacts,
  UsersPrivacy,
  Advertisement,
  AdvertisementStatics,
  AdvertisementCategory,
  UserTransaction,
  ApplicationSettings,
  Payment,
  ProfileVerification,
  FollowRequest,
  Channel,
];
