import { MediaModule } from '@app/media/media.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileVerification } from './entities';
import { ProfileVerificationController } from './profile-verification.controller';
import { ProfileVerificationService } from './profile-verification.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProfileVerification]), MediaModule],
  controllers: [ProfileVerificationController],
  providers: [ProfileVerificationService],
  exports: [ProfileVerificationService],
})
export class ProfileVerificationModule {}
