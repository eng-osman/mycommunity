import { UserInformation } from '@app/chat/interfaces/user-info.interface';
import { Injectable } from '@nestjs/common';
import { InjectRedisClient } from '@shared/decorators';
import { getIdFromNamespace } from '@shared/utils';
import { Redis } from 'ioredis';
import { isNil } from 'ramda';
import { LoggerService } from './logger.service';
@Injectable()
export class RedisClientService {
  private readonly logger: LoggerService = new LoggerService('RedisClientService');
  constructor(@InjectRedisClient() private readonly redis: Redis) {}
  get client(): Redis {
    return this.redis;
  }
  /**
   * @deprecated
   */
  public async getUserInformationByClientId(id: string): Promise<UserInformation | null> {
    const clientID = getIdFromNamespace(id);
    try {
      const userId = await this.redis.get('chat:'.concat(clientID));
      if (!userId) {
        return null;
      }
      const userInfo = (await this.redis.get(userId)) as any;
      return userInfo ? (JSON.parse(userInfo) as UserInformation) : null;
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }
  public async getUserInformationById(id: string): Promise<UserInformation | null> {
    try {
      const userInfo: UserInformation | null = await this.redis.hgetall('chat:'.concat(id));
      if (isNil(userInfo)) {
        return null;
      }
      return userInfo;
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }
  public async cache(key: string, data: any, expire?: number) {
    try {
      await this.redis.setex(key, expire || 0, JSON.stringify(data));
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }
  public async getFromCache(key: string) {
    try {
      const data = (await this.redis.get(key)) as any;
      if (data) {
        return JSON.parse(data);
      }
      return data;
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }
}
