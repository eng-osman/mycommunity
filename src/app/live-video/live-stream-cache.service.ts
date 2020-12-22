import { NotFoundException } from '@nestjs/common';
import { CacheMaker } from '@shared/classes';
import { InjectRedisClient } from '@shared/decorators';
import { Redis } from 'ioredis';
import { isNil } from 'ramda';

export class LiveStreamCacheService extends CacheMaker {
  protected static readonly namespace = 'liveStream';
  constructor(@InjectRedisClient() protected readonly client: Redis) {
    super(client, LiveStreamCacheService.namespace);
  }
  public async makeChannel(channelId: string, userId: string, shouldRecord: boolean) {
    const key = this.formatKey('now');
    if (shouldRecord) {
      const recKey = this.formatKey(channelId, 'rec');
      await this.client.set(recKey, 1);
    }
    const saved = await this.client.hset(key, channelId, userId);
    return Boolean(saved);
  }

  public async getChannelOwner(channelId: string) {
    const key = this.formatKey('now');
    const userId = await this.client.hget(key, channelId);
    if (isNil(userId)) {
      throw new NotFoundException('Channel Not Found');
    } else {
      return userId;
    }
  }

  public async checkIfChannelExist(channelId: string) {
    try {
      if (!channelId) {
        return null;
      }
      const owner = await this.getChannelOwner(channelId);
      if (owner) {
        return true;
      } else {
        return false;
      }
    } catch {
      return false;
    }
  }

  public async freeChannel(channelId: string) {
    const key = this.formatKey('now');
    const recKey = this.formatKey(channelId, 'rec');
    await this.client.del(recKey);
    const saved = await this.client.hdel(key, channelId);
    await this.removeOldChannel(channelId);
    return Boolean(saved);
  }

  public async checkIfShouldRecord(channelId: string) {
    const key = this.formatKey(channelId, 'rec');
    const shouldRecord = await this.client.get(key);
    return Boolean(shouldRecord);
  }

  public async pingChannel(channelId: string) {
    const time = new Date().getTime();
    const key = this.formatKey('ping');
    await this.client.zadd(key, time.toString(), channelId);
  }

  public async getOldChannels(timeLimitms: number): Promise<string[]> {
    const t = new Date().getTime() - timeLimitms;
    const key = this.formatKey('ping');
    return this.client.zrangebyscore(key, '0', t.toString());
  }

  public async removeOldChannel(channelId: string) {
    const key = this.formatKey('ping');
    await this.client.zrem(key, channelId);
  }
}
