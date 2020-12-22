import { Inject } from '@nestjs/common';

import { PUB_REDIS_TOKEN, SUB_REDIS_TOKEN } from '@app/constants';
import { RedisClientToken } from './../modules/redis/redis.constants';

export const InjectRedisClient = () => Inject(RedisClientToken);
export const InjectPubClient = () => Inject(PUB_REDIS_TOKEN);
export const InjectSubClient = () => Inject(SUB_REDIS_TOKEN);
