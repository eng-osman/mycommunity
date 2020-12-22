import { Injectable } from '@nestjs/common';
import { CacheMaker } from '@shared/classes';
import { InjectRedisClient } from '@shared/decorators';
import { LoggerService } from '@shared/services';
import { Redis } from 'ioredis';

@Injectable()
export class AdvertisementCacheService extends CacheMaker {
  private static readonly namespace = 'ads';
  private readonly logger = new LoggerService(AdvertisementCacheService.name);
  constructor(@InjectRedisClient() protected readonly client: Redis) {
    super(client, AdvertisementCacheService.namespace);
  }

  public async saveAdvertisementTargets(adId: string, targets: string[]) {
    try {
      const pipeline = this.client.pipeline();
      const adKey = this.formatKey(adId, 'targetCount');
      for (const target of targets) {
        const targetKey = this.formatKey('target', target);
        pipeline.sadd(targetKey, adId);
      }
      pipeline.set(adKey, targets.length);
      await pipeline.exec();
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async getTargetRandomAdvertisementIds(targetId: string, count = 30): Promise<string[]> {
    const targetKey = this.formatKey('target', targetId);
    return this.client.srandmember(targetKey, count);
  }
}
