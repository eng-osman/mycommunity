import { CacheMaker } from '@shared/classes';
import { InjectRedisClient } from '@shared/decorators';
import { Redis } from 'ioredis';

export class FanCacheService extends CacheMaker {
  private static readonly namespace = 'firehose';
  constructor(@InjectRedisClient() protected readonly client: Redis) {
    super(client, FanCacheService.namespace);
  }

  public async addStatusSubscriber(statusId: string, subscriberId: string) {
    const key = this.formatKey('status', statusId, 'subscribers');
    await this.client.sadd(key, subscriberId);
  }

  public async removeStatusSubscriber(statusId: string, subscriberId: string) {
    const key = this.formatKey('status', statusId, 'subscribers');
    await this.client.srem(key, subscriberId);
  }

  public async getStatusSubscribers(statusId: string): Promise<string[]> {
    const key = this.formatKey('status', statusId, 'subscribers');
    return this.client.smembers(key);
  }

  public async removeStatus(statusId: string) {
    const key = this.formatKey('status', statusId, 'subscribers');
    await this.deleteCache(key);
  }

  public async addLiveVideoSubscriber(statusId: string, subscriberId: string) {
    const key = this.formatKey('live', statusId, 'subscribers');
    await this.client.sadd(key, subscriberId);
  }

  public async getLiveVideoSubscriber(statusId: string): Promise<string[]> {
    const key = this.formatKey('live', statusId, 'subscribers');
    return this.client.smembers(key);
  }
}
