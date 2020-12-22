import { Global, Module } from '@nestjs/common';
import { LoggerController } from './controllers/logger.controller';
import { I18nService, JWTService, RedisClientService } from './services';
@Global()
@Module({
  controllers: [LoggerController],
  providers: [JWTService, RedisClientService, I18nService],
  exports: [JWTService, RedisClientService, I18nService],
})
export class SharedModule {}
