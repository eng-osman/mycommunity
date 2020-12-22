import { HttpModule, Module } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { VerificationCacheService } from './verification.cache.service';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';

@Module({
  imports: [HttpModule],
  controllers: [VerificationController],
  providers: [VerificationService, TwilioService, VerificationCacheService],
  exports: [VerificationService],
})
export class VerificationModule {}
