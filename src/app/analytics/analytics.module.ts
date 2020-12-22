import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsCacheService } from './analytics-cache.service';
import { AnalyticsController } from './analytics.controller';
import { UsersLogsSchema } from './schemas/users-logs.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'UsersLogs', schema: UsersLogsSchema, collection: 'users_logs' },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsCacheService],
})
export class AnalyticsModule {}
