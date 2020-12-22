import { UserStatusModule } from '@app/user-status/user-status.module';
import { Module } from '@nestjs/common';
import { CountryTimelineController } from './country-timeline.controller';
import { CountryTimelineService } from './country-timeline.service';
import { HomeTimelineController } from './home-timeline.controller';
import { HomeTimelineService } from './home-timeline.service';
import { TimelineCacheService } from './timeline-cache.service';
import { UserTimelineController } from './user-timeline.controller';
import { UserTimelineService } from './user-timeline.service';
@Module({
  imports: [UserStatusModule],
  providers: [
    HomeTimelineService,
    UserTimelineService,
    CountryTimelineService,
    TimelineCacheService,
  ],
  controllers: [HomeTimelineController, CountryTimelineController, UserTimelineController],
  exports: [TimelineCacheService],
})
export class TimelineModule {}
