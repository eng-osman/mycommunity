import { Status } from '@app/user-status/entities';
import { UserStatusCacheService } from '@app/user-status/user-status-cache.service';
import { UserPrivacy } from '@app/user/privacy/user-privacy.enum';
import { UserPrivacyService } from '@app/user/privacy/user-privacy.service';
import { CacheMaker } from '@shared/classes';
import { InjectEventEmitter, InjectRedisClient } from '@shared/decorators';
import { toTimestamp, zipFlatten } from '@shared/utils';
import { EventEmitter2 } from 'eventemitter2';
import { Redis } from 'ioredis';
import { isEmpty, isNil } from 'ramda';
export class TimelineCacheService extends CacheMaker {
  private static readonly namespace: string = 'timeline';
  constructor(
    @InjectRedisClient() protected readonly client: Redis,
    @InjectEventEmitter() private readonly emitter: EventEmitter2,
    private readonly userStatusCacheService: UserStatusCacheService,
    private readonly userPrivacyService: UserPrivacyService,
  ) {
    super(client, TimelineCacheService.namespace);
    this.subscribeToEvents();
  }

  public async cacheUserTimeline(
    userId: any,
    timeline: Array<{ createdAt: any; id: any }>,
    type: 'all' | 'mediaOnly' | 'channelMedia' = 'all',
  ) {
    const key = this.formatKey(userId, type);
    const formatedTimeline = this.formatTimelineIds(timeline);
    if (!isEmpty(formatedTimeline)) {
      await this.client.zadd(key, ...formatedTimeline);
    }
  }

  public async getUserTimeline(
    userId,
    other,
    page,
    limit = 30,
    type: 'all' | 'mediaOnly' | 'channelMedia' = 'all',
  ) {
    const key = this.formatKey(userId, type);
    page = parseInt(page) || 1;
    const fromOffset = (page - 1) * limit;
    const toOffset = fromOffset + limit;
    const timeline = await this.client.zrevrange(key, fromOffset, toOffset);
    return this.userStatusCacheService.getAll(timeline, other);
  }

  public async getUserTimelineStatusesIds(
    userId,
    limit = 1000,
    withScores = false,
    type: 'all' | 'mediaOnly' | 'channelMedia' = 'all',
  ) {
    const key = this.formatKey(userId, type);
    if (withScores) {
      const timelineScores = (await this.client.zrevrange(key, 0, limit, 'WITHSCORES')) as any[];
      return timelineScores;
    } else {
      return (await this.client.zrevrange(key, 0, limit)) as any[];
    }
  }
  public async updateUserTimeline(
    userId,
    status: Status,
    type: 'all' | 'mediaOnly' | 'channelMedia' = 'all',
  ) {
    if (status.isReply) {
      return;
    }
    const key = this.formatKey(userId, type);
    const formatedStatus = this.formatTimelineIds([status]);
    if (!isEmpty(formatedStatus)) {
      await this.client.zadd(key, ...formatedStatus);
    }
  }
  public async removeStatusFromUserTimeline(
    userId,
    statusId,
    type: 'all' | 'mediaOnly' | 'channelMedia' = 'all',
  ) {
    const key = this.formatKey(userId, type);
    if (!statusId) {
      return;
    }
    await this.client.zrem(key, statusId);
  }

  public async cacheUserStoryTimeline(userId, storyId) {
    const key = this.formatKey(userId, 'story');
    const currentTimeStamp = Date.now();
    await this.client.zadd(key, currentTimeStamp.toString(), storyId);
  }

  public async getUserStoryTimeline(userId) {
    const key = this.formatKey(userId, 'story');
    // Get a date object for the current time
    const d = new Date();

    // Set it to one day ago
    d.setDate(d.getDate() - 1);

    // Zero the hours
    d.setHours(0, 0, 0);

    // Zero the milliseconds
    d.setMilliseconds(0);

    const ts = d.getTime();

    const timeline = await this.client.zrevrangebyscore(key, '+inf', `(${ts}`);
    // TODO: Remove old
    // await this.client.zremrangebyscore(key, '-inf', `(${ts}`);
    if (timeline) {
      return this.userStatusCacheService.getAll(timeline, { id: userId });
    }
    return null;
  }

  // tslint:disable-next-line:variable-name
  public async removeUserStoryTimeline(_userId) {
    // await this.deleteCache(userId + ':story');
  }

  public async buildUserHomeTimeline(userId, homeTimeline: any[]) {
    const key = this.formatKey(userId, 'home');
    if (homeTimeline && !isEmpty(homeTimeline)) {
      await Promise.all([
        this.client.zadd(key, ...homeTimeline.reverse()),
        this.extendExpiration(userId + ':all', '8 weeks'),
      ]);
    }
  }

  public async addToUserHomeTimeline(userId, status) {
    if (status.isReply) {
      return;
    }
    const key = this.formatKey(userId, 'home');
    const formatedStatus = this.formatTimelineIds([status]);
    if (!isEmpty(formatedStatus)) {
      await this.client.zadd(key, ...formatedStatus);
    }
  }

  public async addToCountryTimeline(countryCode, status) {
    if (status.isReply || countryCode === '') {
      return;
    }
    const key = this.formatKey('country', countryCode);
    const allkey = this.formatKey('country', 'all');
    const formatedStatus = this.formatTimelineIds([status]);
    if (!isEmpty(formatedStatus)) {
      await this.client.zadd(key, ...formatedStatus);
      await this.client.zadd(allkey, ...formatedStatus);
    }
  }

  public async getUserHomeTimeline(
    userId: string,
    lastTimeStamp: number,
    page: string | number,
    limit = 20,
  ) {
    const key = this.formatKey(userId, 'home');
    page = parseInt(page.toString()) || 1;
    limit = 20; // fixed limit
    const fromOffset = (page - 1) * limit;
    const timeline = await this.client.zrevrangebyscore(
      key,
      '+inf',
      `(${lastTimeStamp}`,
      'LIMIT',
      fromOffset.toString(),
      limit.toString(),
    ); // we don't need it again
    if (timeline) {
      await this.extendExpiration(userId + ':home', '8 weeks');
    }
    const statuses = await this.getAll(timeline, { id: userId });
    const result = statuses.filter(async s => this.checkFullPrivacy(userId, s));
    return result;
  }

  public async getAll(statusesId: string[], user?: any) {
    return this.userStatusCacheService.getAll(statusesId, user);
  }

  public async getMultiCountryTimeline(
    userId: string,
    countryCodes: string[],
    lastTimeStamp: number,
    page: string | number,
    limit = 20,
  ) {
    const timeline: string[] = [];
    page = parseInt(page.toString()) || 1;
    const fromOffset = (page - 1) * limit;
    const totalLimit = Math.ceil(limit / countryCodes.length);

    for (const code of countryCodes) {
      const key = this.formatKey('country', code);
      const ids = await this.client.zrevrangebyscore(
        key,
        '+inf',
        `(${lastTimeStamp}`,
        'LIMIT',
        fromOffset.toString(),
        totalLimit.toString(),
      );
      if (ids) {
        timeline.push(...ids);
      }
    }
    return this.userStatusCacheService.getAll(timeline, { id: userId });
  }

  public async removeFromHomeTimeline(userId, otherId) {
    const otherTimeline = await this.getUserTimelineStatusesIds(otherId);
    const key = this.formatKey(userId, 'home');
    if (!otherTimeline || otherTimeline.length === 0) {
      return;
    }
    await this.client.zrem(key, ...otherTimeline);
  }

  public async storeTopGlobalMedia(statusId: string): Promise<void> {
    const key = this.formatKey('topGlobalMedia');

    await this.client.zadd(key, '0', statusId.toString());
  }

  public async removeTopGlobalMedia(statusId: string): Promise<void> {
    const key = this.formatKey('topGlobalMedia');
    await this.client.zrem(key, statusId.toString());
  }

  public async incTopGlobalMedia(statusId: string): Promise<void> {
    const key = this.formatKey('topGlobalMedia');
    await this.client.zincrby(key, 1, statusId.toString());
  }

  public async getTopGlobalMedia(): Promise<string | null> {
    const key = this.formatKey('topGlobalMedia');
    const result = await this.client.zrevrangebyscore(key, '+inf', '1', 'LIMIT', '0', '1');
    return result.length > 0 ? result[0] : null;
  }

  public async getTopMediaWithLimit(page = 1, limit = 10) {
    const key = this.formatKey('topGlobalMedia');
    page = parseInt(page.toString()) || 1;
    const fromOffset = (page - 1) * parseInt(limit.toString()) || 0;
    const result = await this.client.zrevrangebyscore(
      key,
      '+inf',
      '0',
      'LIMIT',
      fromOffset.toString(),
      limit.toString(),
    );
    return result;
  }
  public async removeTopGlobalMediaRecord() {
    const key = this.formatKey('topGlobalMedia');
    await this.deleteCache(key);
  }

  private async checkFullPrivacy(userId, s: Status) {
    if (s.isReply && !isNil(s.parent)) {
      const privacy = await this.userPrivacyService.checkPrivacy({ id: userId }, s.parent.user.id);
      return privacy === UserPrivacy.NONE;
    }
    return true;
  }

  private formatTimelineIds(timeline: Array<{ createdAt; id }>) {
    const timestamps = timeline.map(s => toTimestamp(s.createdAt));
    const ids = timeline.map(s => s.id);
    return zipFlatten(timestamps, ids);
  }

  private subscribeToEvents() {
    this.emitter.on('timeline:cache:userTimeline', async (userId, timeline) => {
      await this.cacheUserTimeline(userId, timeline);
    });

    this.emitter.on('timeline:update:userTimeline', async (userId, status) => {
      await this.updateUserTimeline(userId, status);
    });

    this.emitter.on('timeline:remove:userTimeline', async (userId, statusId) => {
      await this.removeStatusFromUserTimeline(userId, statusId);
    });

    this.emitter.on('timeline:cache:userMedia', async (userId, timeline) => {
      await this.cacheUserTimeline(userId, timeline, 'mediaOnly');
    });

    this.emitter.on('timeline:update:userMedia', async (userId, status) => {
      await this.updateUserTimeline(userId, status, 'mediaOnly');
    });

    this.emitter.on('timeline:remove:userMedia', async (userId, statusId) => {
      await this.removeStatusFromUserTimeline(userId, statusId, 'mediaOnly');
    });

    this.emitter.on('timeline:cache:channelMedia', async (userId, timeline) => {
      await this.cacheUserTimeline(userId, timeline, 'channelMedia');
    });

    this.emitter.on('timeline:update:channelMedia', async (userId, status) => {
      await this.updateUserTimeline(userId, status, 'channelMedia');
    });

    this.emitter.on('timeline:remove:channelMedia', async (userId, statusId) => {
      await this.removeStatusFromUserTimeline(userId, statusId, 'channelMedia');
    });

    this.emitter.on('timeline:cache:userStoryTimeline', async (userId, storyId) => {
      await this.cacheUserStoryTimeline(userId, storyId);
    });

    this.emitter.on('timeline:remove:userStoryTimeline', async userId => {
      await this.removeUserStoryTimeline(userId);
    });

    this.emitter.on('timeline:cache:userHomeTimeline', async (userId, homeTimeline, otherId) => {
      if (otherId) {
        const friendTimeline = await this.getUserTimelineStatusesIds(otherId, 50, true);
        await this.buildUserHomeTimeline(userId, friendTimeline);
      } else {
        await this.buildUserHomeTimeline(userId, homeTimeline);
      }
    });

    this.emitter.on('timeline:remove:userHomeTimeline', async (userId, otherId) => {
      await this.removeFromHomeTimeline(userId, otherId);
    });

    this.emitter.on('timeline:add:userHomeTimeline', async (userId, status) => {
      await this.addToUserHomeTimeline(userId, status);
    });

    this.emitter.on('timeline:add:addToCountryTimeline', async (countryCode, status) => {
      await this.addToCountryTimeline(countryCode, status);
    });

    this.emitter.on('timeline:add:storeTopGlobalMedia', async statusId => {
      await this.storeTopGlobalMedia(statusId);
    });

    this.emitter.on('timeline:update:incTopGlobalMedia', async statusId => {
      await this.incTopGlobalMedia(statusId);
    });

    this.emitter.on('timeline:remove:topGlobalMedia', async statusId => {
      await this.removeTopGlobalMedia(statusId);
    });

    this.emitter.on('timeline:remove:topGlobalMediaRecord', async () => {
      await this.removeTopGlobalMediaRecord();
    });

    this.emitter.on('timeline:get:topGlobalMediaRecord', async () => {
      return this.getTopGlobalMedia();
    });

    this.emitter.on('timeline:get:topGlobalMediaWithLimit', async (page, limit) => {
      return this.getTopMediaWithLimit(page, limit);
    });
  }
}
