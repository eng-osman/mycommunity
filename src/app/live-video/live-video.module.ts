import { MediaModule } from '@app/media/media.module';
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/common/http';
import { LiveStreamCacheService } from './live-stream-cache.service';
import { LiveVideoController } from './live-video.controller';
import { LiveVideoService } from './live-video.service';

@Module({
  imports: [HttpModule, MediaModule],
  controllers: [LiveVideoController],
  providers: [LiveVideoService, LiveStreamCacheService],
  exports: [LiveStreamCacheService],
})
export class LiveVideoModule {}
