import { UserStatusCacheService } from '@app/user-status/user-status-cache.service';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Status, StatusActions } from './entities';
import { GlobalMediaWinnerSchema } from './schemas/global-media-winner.schema';
import { GlobalMediaSchema } from './schemas/global-media.schema';
import { QuestionsSchema } from './schemas/questions.schema';
import { RecommendationSchema } from './schemas/recommendation.schema';
import { UserStatusController } from './user-status.controller';
import { UserStatusService } from './user-status.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Status, StatusActions]),
    MongooseModule.forFeature([
      {
        name: 'Question',
        schema: QuestionsSchema,
        collection: 'status_question',
      },
      {
        name: 'Recommendation',
        schema: RecommendationSchema,
        collection: 'status_recommendation',
      },
      {
        name: 'GlobalMedia',
        schema: GlobalMediaSchema,
        collection: 'status_global_media',
      },
      {
        name: 'GlobalMediaWinner',
        schema: GlobalMediaWinnerSchema,
        collection: 'status_global_media_winner',
      },
    ]),
  ],
  controllers: [UserStatusController],
  providers: [UserStatusService, UserStatusCacheService],
  exports: [UserStatusService, UserStatusCacheService],
})
export class UserStatusModule {}
