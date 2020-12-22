import { LiveStreamCacheService } from '@app/live-video/live-stream-cache.service';
import { MediaService } from '@app/media/media.service';
import { User } from '@app/user/entities';
import { UserPrivacyCacheService } from '@app/user/privacy/user-privacy-cache.service';
import { UserPrivacy } from '@app/user/privacy/user-privacy.enum';
import {
  Injectable,
  NotAcceptableException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/common/http';
import { InjectAgenda, InjectEventEmitter } from '@shared/decorators';
import { JWTService, LoggerService } from '@shared/services';
import { Env, generateUnique, snooze } from '@shared/utils';
import * as Agenda from 'agenda';
import { EventEmitter2 } from 'eventemitter2';
import { isNil } from 'ramda';

@Injectable()
export class LiveVideoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new LoggerService(LiveVideoService.name);
  constructor(
    private readonly liveStreamCacheService: LiveStreamCacheService,
    private readonly jwtService: JWTService,
    private readonly mediaService: MediaService,
    private readonly userPrivacyCacheService: UserPrivacyCacheService,
    private readonly httpService: HttpService,
    @InjectEventEmitter() private readonly emitter: EventEmitter2,
    @InjectAgenda() private readonly agenda: Agenda,
  ) {
    this.subscribeToEvents();
  }

  public async onModuleInit() {
    this.agenda.define('stop-old-streams', async (_, done) => {
      this.stopOldOpenedStreams().then(() => {
        done();
      });
    });
    this.agenda.every('15 seconds', 'stop-old-streams');
    await this.agenda.start();
    await this.subscribeToEvents();
  }

  public async onModuleDestroy() {
    await this.agenda.stop();
  }

  public async reserveChannel({ id }, shouldRecord: boolean) {
    shouldRecord = shouldRecord.toString() === 'true';
    const channelId = generateUnique(32);
    const saved = await this.liveStreamCacheService.makeChannel(channelId, id, shouldRecord);
    if (saved) {
      this.logger.log(`User Id: ${id} Reserved Channel ${channelId}`);
      return {
        channelId,
        shouldRecord,
        statusCode: 201,
      };
    } else {
      throw new ServiceUnavailableException('Failed to Reserve a new channel, try again ?');
    }
  }

  public async startStreaming(channelId: string, token: string) {
    try {
      const user = await this.jwtService.verifyToken<User>(token);
      const isChannelOwner =
        user.id.toString() === (await this.liveStreamCacheService.getChannelOwner(channelId));
      if (!isChannelOwner) {
        throw new UnauthorizedException(
          'Sorry, You are not the channel owner, what about creating your own ?',
        );
      } else {
        const shouldRecord = await this.liveStreamCacheService.checkIfShouldRecord(channelId);
        snooze(300).then(() => {
          if (shouldRecord) {
            this.startRecording(channelId);
          }
        });
        this.logger.log(`Start Streaming On Channel ${channelId} by User ${user.id}`);
        return {
          statusCode: 201,
          channelId,
          status: 'Opened',
        };
      }
    } catch (error) {
      throw error;
    }
  }

  public async stopStreaming(channelId: string, token: string) {
    try {
      const user = await this.jwtService.verifyToken<User>(token);
      const isChannelOwner =
        user.id.toString() === (await this.liveStreamCacheService.getChannelOwner(channelId));
      if (!isChannelOwner) {
        throw new UnauthorizedException(
          'Sorry, You are not the channel owner, what about creating your own ?',
        );
      } else {
        const shouldRecord = await this.liveStreamCacheService.checkIfShouldRecord(channelId);
        await this.liveStreamCacheService.freeChannel(channelId);
        if (shouldRecord) {
          await this.stopRecording(channelId);
        }
        this.logger.log(`Stoped Streaming On Channel ${channelId} by User ${user.id}`);
        return {
          statusCode: 201,
          channelId,
          status: 'Closed',
        };
      }
    } catch (error) {
      throw error;
    }
  }

  public async listenToStream(channelId: string, token: string) {
    try {
      const user = await this.jwtService.verifyToken<User>(token);
      const channelOwnerId = await this.liveStreamCacheService.getChannelOwner(channelId);
      const privacy1 = await this.userPrivacyCacheService.checkPrivacy(channelOwnerId, user.id);
      const privacy2 = await this.userPrivacyCacheService.checkPrivacy(user.id, channelOwnerId);
      if (isNil(privacy1) && isNil(privacy2)) {
        return { statusCode: 200, channelId, status: 'Listen' };
      } else if (
        (privacy1 &&
          (UserPrivacy[privacy1] === UserPrivacy.ALL ||
            UserPrivacy[privacy1] === UserPrivacy.PROFILE)) ||
        (privacy2 &&
          (UserPrivacy[privacy2] === UserPrivacy.ALL ||
            UserPrivacy[privacy2] === UserPrivacy.PROFILE))
      ) {
        throw new NotAcceptableException('You are not allowed to view this channel');
      } else {
        this.logger.log(`Start Listening On Channel ${channelId} by User ${user.id}`);
        return { statusCode: 200, channelId, status: 'Listen' };
      }
    } catch (error) {
      throw error;
    }
  }

  public async updateLiveVideoStatus(body: any) {
    const channelId = body.name;
    const user = await this.jwtService.verifyToken<User>(body.token);
    const path = `http://${Env('RTMP_SERVER_IP')}/watch/v/${channelId}.flv`;
    // btw, it will not block, it just waits to the live-server to make the video
    snooze(750).then(async () => {
      const media = await this.mediaService.handleLiveVideo(path, user);
      this.emitter.emit('status:addLiveVideoFile', channelId, [media]);
      this.logger.log(`Updating Status for Channel ${channelId} with new Video at ${media!.url}`);
    });
  }

  public async pingLiveVideo(channelId: string) {
    await this.liveStreamCacheService.pingChannel(channelId);
  }

  private async startRecording(channelId: string) {
    const appName = Env('RTMP_APP_NAME', 'live');
    const recordName = Env('RTMP_RECORDER_NAME', 'beta');
    const controlUrl = `${Env(
      'RTMP_CONTROL_ENDPOINT',
    )}/record/start?app=${appName}&name=${channelId}&rec=${recordName}`;
    this.logger.log(`Start Recording from Channel ${channelId}`);
    await this.httpService
      .get(controlUrl)
      .subscribe(
        res => this.logger.log(`Starting Record response: ${res.statusText} Body: ${res.data}`),
        err => this.logger.error(`Error While trying To Start Recording: ${err}`, err),
      );
  }

  private async stopRecording(channelId: string) {
    const appName = Env('RTMP_APP_NAME', 'live');
    const recordName = Env('RTMP_RECORDER_NAME', 'beta');
    const controlUrl = `${Env(
      'RTMP_CONTROL_ENDPOINT',
    )}/record/stop?app=${appName}&name=${channelId}&rec=${recordName}`;
    this.logger.log(`Stoping Recording from Channel ${channelId}`);
    await this.httpService
      .get(controlUrl)
      .subscribe(
        res =>
          this.logger.log(
            `Stoping Record response: ${res.statusText} Body: ${res.data || 'Empty Body'}`,
          ),
        err => this.logger.error(`Error While trying To Stop Recording: ${err}`, err),
      );
  }

  private async forceStopChannel(channelId: string) {
    const shouldRecord = await this.liveStreamCacheService.checkIfShouldRecord(channelId);
    await this.liveStreamCacheService.freeChannel(channelId);
    if (shouldRecord) {
      await this.stopRecording(channelId);
    }
    this.logger.log(`Force Stoping Streaming On Channel ${channelId}`);
  }

  private async stopOldOpenedStreams() {
    const oldStreams = await this.liveStreamCacheService.getOldChannels(15e3);
    const liveStreams = oldStreams.filter(async channelId =>
      this.liveStreamCacheService.checkIfChannelExist(channelId),
    );
    liveStreams.forEach(async channelId => this.forceStopChannel(channelId));
    return liveStreams.length;
  }

  private subscribeToEvents() {
    this.emitter.on('live-video:checkIfChannelExist', async channelId => {
      return this.liveStreamCacheService.checkIfChannelExist(channelId);
    });
  }
}
