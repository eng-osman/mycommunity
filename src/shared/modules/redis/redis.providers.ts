export interface CreateRedisProvidersConfig {
  host: string;
  port: number;
  auth_pass?: string;
  db_index?: number;
}
import { Redis } from 'ioredis';
import * as IORedis from 'ioredis';
import { LoggerService } from '../../services';
import { RedisClientToken } from './redis.constants';

const logger = new LoggerService('RedisModule');

export function createRedisProviders(config: CreateRedisProvidersConfig, token?) {
  const redisProvider = {
    provide: token || RedisClientToken,
    useFactory: async () => {
      try {
        const redisClient: Redis = new IORedis(config.port, config.host, {
          db: config.db_index || 0,
          password: config.auth_pass,
          name: 'Redis101',
          lazyConnect: true,
        });
        // redisClient.on('connect', () => logger.log('Connecting'));
        // redisClient.on('ready', () => logger.log('Connected'));
        redisClient.on('reconnecting', () => logger.log('Reconnecting'));
        redisClient.on('end', () => logger.warn('Ended'));
        redisClient.on('error', e => logger.error(e.message, e));
        return await redisClient;
      } catch (error) {
        logger.error(error.message, error);
        throw error;
      }
    },
  };
  return [redisProvider];
}
