import { AdvertisementModule } from '@app/advertisement/advertisement.module';
import { ChatModule } from '@app/chat/chat.module';
import { MediaModule } from '@app/media/media.module';
import { UserPrivacyCacheService } from '@app/user/privacy/user-privacy-cache.service';
import { UserCacheService } from '@app/user/user-cache.service';
import { UserContactsCacheService } from '@app/user/user-contacts-cache.service';
import { VerificationModule } from '@app/verification/verification.module';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ChannelCacheService } from './channel-cache.service';
import { ContactsGateway } from './contacts.gateway';
import { Profile, User, UserContacts, UsersPrivacy } from './entities';
import { Channel } from './entities/channel.entity';
import { FollowRequest } from './entities/follow-request.entity';
import { UserPrivacyController } from './privacy/user-privacy.controller';
import { UserPrivacyService } from './privacy/user-privacy.service';
import { UserContactsController } from './user-contacts.controller';
import { UserContactsService } from './user-contacts.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Global()
@Module({
  imports: [
    MediaModule,
    VerificationModule,
    AdvertisementModule,
    ChatModule,
    TypeOrmModule.forFeature([User, Profile, UserContacts, UsersPrivacy, FollowRequest, Channel]),
  ],
  providers: [
    UserService,
    AuthService,
    UserContactsService,
    UserPrivacyService,
    UserCacheService,
    UserContactsCacheService,
    UserPrivacyCacheService,
    ChannelCacheService,
    ContactsGateway,
  ],
  controllers: [UserController, AuthController, UserContactsController, UserPrivacyController],
  exports: [
    UserService,
    UserContactsService,
    UserPrivacyService,
    UserCacheService,
    UserContactsCacheService,
    ChannelCacheService,
    UserPrivacyCacheService,
    MediaModule,
  ],
})
export class UserModule {}
