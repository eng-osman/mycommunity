import { Status } from '@app/user-status/entities';
import { UserPrivacyService } from '@app/user/privacy/user-privacy.service';
import { Injectable } from '@nestjs/common';
import { TimelineCacheService } from './timeline-cache.service';
@Injectable()
export class CountryTimelineService {
  constructor(
    private readonly timelineCacheService: TimelineCacheService,
    private readonly userPrivacyService: UserPrivacyService,
  ) {}

  public async getMultiCountryTimeline(
    userId: string,
    fromArr: string[],
    sortBy: string,
    timestamp = 0,
    page = 1,
    limit = 20,
    liveVideoOnly = false,
    channelMediaOnly = false,
  ) {
    page = page <= 0 ? 1 : page;
    limit = limit < 0 ? 20 : limit;
    if (fromArr.length === 0 || fromArr[0] === 'all') {
      fromArr = ['EG', 'SA'];
    }
    const statuses = await this.timelineCacheService.getMultiCountryTimeline(
      userId,
      fromArr,
      timestamp,
      page,
      limit,
    );
    const sortedStatuses = statuses.sort(this.sorter(sortBy));
    if (liveVideoOnly) {
      return sortedStatuses.filter(s => s.isLive);
    }
    if (channelMediaOnly) {
      const globalChannelMedia: Status[] = [];
      for (const status of sortedStatuses) {
        if (status.channel) {
          const isBlocked = await this.userPrivacyService.isBlockedChannel(
            userId,
            status.channel.id.toString(),
          );
          if (
            status.type === 'channelMedia' &&
            (status.isPublicGlobal || status.user.isSystem) &&
            !isBlocked
          ) {
            globalChannelMedia.push(status);
          }
        }
      }
      const viewedMedia = globalChannelMedia.filter(s => s.currentUserAction.isView);
      const notViewedMedia = globalChannelMedia.filter(s => !s.currentUserAction.isView);

      return [...notViewedMedia, ...viewedMedia];
    }
    return sortedStatuses;
  }

  private sorter(sortBy: string) {
    switch (sortBy) {
      case 'likes':
        return (statusA: Status, statusB: Status) =>
          statusB.counters.likesCount - statusA.counters.likesCount;
      case 'comments':
        return (statusA: Status, statusB: Status) =>
          statusB.counters.commentCount - statusA.counters.commentCount;
      case 'views':
        return (statusA: Status, statusB: Status) =>
          statusB.counters.viewsCount - statusA.counters.viewsCount;
      case 'date':
        return (statusA: Status, statusB: Status) =>
          statusB.createdAt.getTime() - statusA.createdAt.getTime();
      default:
        return (_statusA: Status, _statusB: Status) => 0;
    }
  }
}
