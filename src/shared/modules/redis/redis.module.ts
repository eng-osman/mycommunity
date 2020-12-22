import { DynamicModule, Global, Module } from '@nestjs/common';

import { createRedisProviders, CreateRedisProvidersConfig } from './redis.providers';

@Global()
@Module({})
export class RedisModule {
  public static forRoot(options: CreateRedisProvidersConfig, token?): DynamicModule {
    const providers = createRedisProviders(options, token);
    return {
      module: RedisModule,
      providers,
      exports: providers,
    };
  }
}
