import { AdvertisementModule } from '@app/advertisement/advertisement.module';
import { AnalyticsModule } from '@app/analytics/analytics.module';
import { ChatModule } from '@app/chat/chat.module';
import { FirebaseModule } from '@app/firebase';
import { FireHoseModule } from '@app/firehose/firehose.module';
import { LiveVideoModule } from '@app/live-video/live-video.module';
import { PaymentModule } from '@app/payments/payments.module';
import { ProfileVerificationModule } from '@app/profile-verification/profile-verification.module';
import { ReportModule } from '@app/reports/report.module';
import { SettingsModule } from '@app/settings/settings.module';
import { StaticDataModule } from '@app/static-files/static-files.module';
import { TechSupportModule } from '@app/tech-support/tech-support.module';
import { TimelineModule } from '@app/timeline/timeline.module';
import { UserHelpModule } from '@app/user-help/user-help.module';
import { UserStatusModule } from '@app/user-status/user-status.module';
import { UserTransactionsModule } from '@app/user-transactions/user-transactions.module';
import { UserModule } from '@app/user/user.module';
import { HelmetMiddleware } from '@nest-middlewares/helmet';
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeoutMiddleware } from '@shared/middlewares/timeout.middleware';
import { AgendaModule } from '@shared/modules/agenda';
import { EventEmitterModule } from '@shared/modules/event-emitter';
import { RedisModule } from '@shared/modules/redis';
import { SharedModule } from '@shared/shared.module';

import {
  AgendaConfig,
  EventEmitterConfig,
  MongooseConfig,
  MongoseURL,
  RedisConfig,
  TypeORMCofig,
} from './config';

@Module({
  imports: [
    TypeOrmModule.forRoot(TypeORMCofig),
    MongooseModule.forRoot(MongoseURL, MongooseConfig),
    RedisModule.forRoot(RedisConfig),
    EventEmitterModule.forRoot(EventEmitterConfig),
    AgendaModule.forRoot(AgendaConfig),
    SharedModule,
    UserModule,
    FirebaseModule,
    UserStatusModule,
    ChatModule,
    TimelineModule,
    FireHoseModule,
    LiveVideoModule,
    AnalyticsModule,
    AdvertisementModule,
    UserTransactionsModule,
    SettingsModule,
    PaymentModule,
    ProfileVerificationModule,
    TechSupportModule,
    ReportModule,
    StaticDataModule,
    UserHelpModule,
  ],
  exports: [SharedModule],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void | MiddlewareConsumer {
    HelmetMiddleware.configure({ hidePoweredBy: true });
    consumer.apply(TimeoutMiddleware, HelmetMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}
