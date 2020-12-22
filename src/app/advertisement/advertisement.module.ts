import {
  Advertisement,
  AdvertisementCategory,
  AdvertisementStatics,
} from '@app/advertisement/entities';
import { MediaModule } from '@app/media/media.module';
import { UserTransactionsModule } from '@app/user-transactions/user-transactions.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvertisementCacheService } from './advertisement-cache.service';
import { AdvertisementTargetsService } from './advertisement-targets.service';
import { AdvertisementController } from './advertisement.cotroller';
import { AdvertisementService } from './advertisement.service';
import { AdvertisementTargetsSchema } from './schemas/ad-targets.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdvertisementCategory, Advertisement, AdvertisementStatics]),
    MongooseModule.forFeature([
      {
        name: 'AdvertisementTargets',
        schema: AdvertisementTargetsSchema,
        collection: 'ad_targets',
      },
    ]),
    MediaModule,
    UserTransactionsModule,
  ],
  controllers: [AdvertisementController],
  providers: [AdvertisementService, AdvertisementTargetsService, AdvertisementCacheService],
  exports: [AdvertisementTargetsService],
})
export class AdvertisementModule {}
