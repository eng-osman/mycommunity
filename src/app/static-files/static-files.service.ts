import { MediaService } from '@app/media/media.service';
import { Injectable } from '@nestjs/common';
import { InjectRedisClient } from '@shared/decorators';
import { Redis } from 'ioredis';
import { StaticFilesType } from './static-files-type.enum';

@Injectable()
export class StaticFilesService {
  private static readonly staticImageRedisKey = 'static:recent:image';
  private static readonly staticVideoRedisKey = 'static:recent:video';
  constructor(
    private readonly mediaService: MediaService,
    @InjectRedisClient() private readonly client: Redis,
  ) {}

  public async updateMedia(mediaId: string, mediaType: StaticFilesType) {
    const media = await this.mediaService.getMedia(mediaId);
    const pipeline = this.client.pipeline();
    switch (mediaType) {
      case StaticFilesType.Video:
        await pipeline
          .hset(StaticFilesService.staticVideoRedisKey, 'mediaId', media.id)
          .hset(StaticFilesService.staticVideoRedisKey, 'mediaUrl', media.url)
          .exec();
        break;
      case StaticFilesType.Image:
        await pipeline
          .hset(StaticFilesService.staticImageRedisKey, 'mediaId', media.id)
          .hset(StaticFilesService.staticImageRedisKey, 'mediaUrl', media.url)
          .exec();
        break;
    }
    return {
      message: `Media Updated with ${mediaId}`,
      statusCode: 201,
    };
  }
  public async getRecentUploadedMedia(mediaType: StaticFilesType) {
    let mediaUrl: string | null;
    switch (mediaType) {
      case StaticFilesType.Video:
        mediaUrl = await this.client.hget(StaticFilesService.staticVideoRedisKey, 'mediaUrl');
        break;
      case StaticFilesType.Image:
        mediaUrl = await this.client.hget(StaticFilesService.staticImageRedisKey, 'mediaUrl');
        break;
      default:
        mediaUrl = null;
        break;
    }
    return mediaUrl;
  }
}
