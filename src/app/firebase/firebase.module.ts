import { NotificationSchema } from '@app/firebase/schemas/notification.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FirebaseServiceProvider } from './firebase-service.provider';
import { NotificationCacheService } from './notifications-cache.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsStoreSchema } from './schemas/notification-store.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'user_notifications', schema: NotificationSchema },
      { name: 'notifications_store', schema: NotificationsStoreSchema },
    ]),
  ],
  providers: [FirebaseServiceProvider, NotificationsService, NotificationCacheService],
  controllers: [NotificationsController],
  exports: [FirebaseServiceProvider, NotificationsService],
})
export class FirebaseModule {}
