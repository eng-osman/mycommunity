import { Status } from '@app/user-status/entities';
import { CacheMaker } from '@shared/classes';
import { InjectRedisClient } from '@shared/decorators';
import { CacheMetadata } from '@shared/interfaces';
import { time, toTimestamp, zipFlatten } from '@shared/utils';
import { Redis } from 'ioredis';
import { isEmpty, isNil } from 'ramda';
import { Channel } from './entities/channel.entity';
import { FollowRequestStatus } from './follow-request-status.enum';

export class ChannelCacheService extends CacheMaker<Channel> implements CacheMetadata<Channel> {
  private static readonly namespace: string = 'channel';
  constructor(@InjectRedisClient() protected readonly client: Redis) {
    super(client, ChannelCacheService.namespace);
  }
  public async serializeAndCache(
    object: Channel,
    expiration?: string | undefined,
  ): Promise<boolean> {
    expiration = expiration ? expiration : '4 weeks';
    const key = this.formatKey(object.id);
    // delete object.owner;
    const buffer = await this.encode(object);
    return this.client.setex(key, time(expiration), buffer);
  }

  public async deserializeCached(id: string): Promise<Channel | null> {
    const key = this.formatKey(id);
    await this.extendExpiration(key, '1 weeks');
    const buff = await this.client.getBuffer(key);
    if (!isNil(buff)) {
      const channel = await this.decode(buff);
      channel.thumbnail = channel.thumbnail || '';
      channel.describtion = channel.describtion || '';
      channel.profileImage = channel.profileImage || '';
      channel.followersCount = channel.followersCount || 0;
      return channel;
    } else {
      return null;
    }
  }

  public async addFollowRequest(
    channelId: string,
    userId: string,
    status = FollowRequestStatus.PENDING,
  ) {
    const channelKey = this.formatKey(channelId, 'followRequest');
    await this.client.hset(channelKey, userId, status);
  }

  public async removeFollowRequest(channelId: string, userId: string) {
    const channelKey = this.formatKey(channelId, 'followRequest');
    await this.client.hdel(channelKey, userId);
  }

  public async getFollowRequests(channelId: string): Promise<string[]> {
    const channelKey = this.formatKey(channelId, 'followRequest');
    const requests = await this.client.hkeys(channelKey);
    if (!requests) {
      return [];
    } else {
      return requests;
    }
  }

  public async getFollowRequestStatus(channelId: string, userId: string) {
    const channelKey = this.formatKey(channelId, 'followRequest');
    const status = await this.client.hget(channelKey, userId);
    if (status) {
      const statusInt = parseInt(status);
      return statusInt;
    } else {
      return FollowRequestStatus.NONE;
    }
  }

  public async addFollower(channelId: string, userId: string) {
    const channelKey = this.formatKey(channelId, 'followers');
    await this.client.lpush(channelKey, userId);
  }

  public async addFollowers(channelId: string, userIds: string[]) {
    const channelKey = this.formatKey(channelId, 'followers');
    await this.client.lpush(channelKey, ...userIds);
  }

  public async removeFollower(channelId: string, userId: string) {
    const channelKey = this.formatKey(channelId, 'followers');
    await this.client.lrem(channelKey, 1, userId);
  }

  public async getFollowersIds(channelId: string, page = 1, limit = 20): Promise<string[]> {
    const channelKey = this.formatKey(channelId, 'followers');
    const start = (page - 1) * limit;
    const stop = start + limit;
    const followers = await this.client.lrange(channelKey, start, stop);
    if (!followers) {
      return [];
    } else {
      return followers;
    }
  }

  public async cacheChannelTimeline(channelId: any, timeline: Array<{ createdAt: any; id: any }>) {
    const key = this.formatKey(channelId, 'timeline');
    const formatedTimeline = this.formatTimelineIds(timeline);
    if (!isEmpty(formatedTimeline)) {
      await this.client.zadd(key, ...formatedTimeline);
    }
  }

  public async updateChannelTimeline(channelId: string, status: Status) {
    if (status.isReply) {
      return;
    }
    const key = this.formatKey(channelId, 'timeline');
    const formatedStatus = this.formatTimelineIds([status]);
    if (!isEmpty(formatedStatus)) {
      await this.client.zadd(key, ...formatedStatus);
    }
  }

  public async removeStatusFromChannelTimeline(channelId: string, statusId: string) {
    const key = this.formatKey(channelId, 'timeline');
    if (!statusId) {
      return;
    }
    await this.client.zrem(key, statusId);
  }

  public async getChannelTimelineIds(channelId: string, page = 1, limit = 30, withScores = false) {
    const key = this.formatKey(channelId, 'timeline');
    const fromOffset = (page - 1) * limit;
    const toOffset = fromOffset + limit;
    if (withScores) {
      const timelineScores = (await this.client.zrevrange(
        key,
        fromOffset,
        toOffset,
        'WITHSCORES',
      )) as any[];
      return timelineScores;
    } else {
      return (await this.client.zrevrange(key, fromOffset, toOffset)) as any[];
    }
  }

  private formatTimelineIds(timeline: Array<{ createdAt; id }>) {
    const timestamps = timeline.map(s => toTimestamp(s.createdAt));
    const ids = timeline.map(s => s.id);
    return zipFlatten(timestamps, ids);
  }
}
