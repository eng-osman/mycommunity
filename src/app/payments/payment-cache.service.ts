import { CacheMaker } from '@shared/classes';
import { InjectRedisClient } from '@shared/decorators';
import { LoggerService } from '@shared/services';
import { Redis } from 'ioredis';

export class PaymentCacheService extends CacheMaker {
  private static readonly namespace: string = 'payment';
  private readonly logger = new LoggerService(PaymentCacheService.name);

  constructor(@InjectRedisClient() protected readonly client: Redis) {
    super(client, PaymentCacheService.namespace);
  }

  public async cachePaymentId(id: string): Promise<boolean> {
    const key = this.formatKey(id);
    try {
      await this.client.set(key, id);
      return true;
    } catch (error) {
      this.logger.error(error.message, error);
      return false;
    }
  }
}
