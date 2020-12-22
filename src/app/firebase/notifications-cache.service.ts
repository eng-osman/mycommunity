import { Injectable } from '@nestjs/common';
import { CacheMaker } from '@shared/classes';
import { InjectRedisClient } from '@shared/decorators';
import { Redis } from 'ioredis';

@Injectable()
export class NotificationCacheService extends CacheMaker {
  private static readonly namespace: string = 'notifications';
  constructor(@InjectRedisClient() protected readonly client: Redis) {
    super(client, NotificationCacheService.namespace);
  }

  public async addTopicSubscribers(topicName: string, subIds: string[]) {
    const key = this.formatKey(topicName);
    if (subIds.length > 0) {
      await this.client.sadd(key, ...subIds);
    }
  }

  public async deleteTopicSubscribers(topicName: string, subIds: string[]) {
    const key = this.formatKey(topicName);
    if (subIds.length > 0) {
      await this.client.srem(key, ...subIds);
    }
  }

  public async getTopicSubscribers(topicName: string, size: number = 500): Promise<string[]> {
    const key = this.formatKey(topicName);
    return this.client.srandmember(key, size);
  }

  public async deleteTopic(topicName: string) {
    const key = this.formatKey(topicName);
    this.client.del(key);
  }
}
