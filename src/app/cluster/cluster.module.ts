import { RedisConfig } from '@app/config';
import { PUB_REDIS_TOKEN, SUB_REDIS_TOKEN } from '@app/constants';
import { Module } from '@nestjs/common';
import { RedisModule } from '@shared/modules/redis';
import { DialUpService } from './dial-up.service';
@Module({
  imports: [
    RedisModule.forRoot(RedisConfig, PUB_REDIS_TOKEN),
    RedisModule.forRoot(RedisConfig, SUB_REDIS_TOKEN),
  ],
  providers: [DialUpService],
  exports: [DialUpService],
})
export class ClusterModule {}
