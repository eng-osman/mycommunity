import { User } from '@app/user/entities';
import { UserService } from '@app/user/user.service';
import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectEventEmitter } from '@shared/decorators';
import { LoggerService } from '@shared/services';
import { Env, generateUnique, getMediaDirName, isEmpty, uploadToS3 } from '@shared/utils';
import { EventEmitter2 } from 'eventemitter2';
import * as Ffmpeg from 'fluent-ffmpeg';
import { readFileSync, unlinkSync, writeFileSync } from 'fs';
import { isNil } from 'ramda';
import { In, Repository } from 'typeorm';
import { UserMedia } from './entities';
import { Media } from './media.interface';
@Injectable()
export class MediaService {
  private readonly logger = new LoggerService(MediaService.name);
  constructor(
    @InjectRepository(UserMedia) private readonly userMediaRepository: Repository<UserMedia>,
    @Inject(forwardRef(() => UserService)) private readonly userService: UserService,
    @InjectEventEmitter() private readonly emitter: EventEmitter2,
  ) {}

  /**
   * @deprecated
   */
  public async saveMedia({ size, mimetype, path }: Express.Multer.File): Promise<UserMedia> {
    const file = new UserMedia();
    file.size = size;
    file.mimetype = mimetype;
    file.url = path;
    return this.userMediaRepository.save(file);
  }

  public async saveCollection(
    files: Express.Multer.File[],
    { id },
    type: 'photo' | 'voice' | 'video' | 'files' = 'photo',
    conversationId?: string,
  ): Promise<UserMedia[]> {
    const collection: UserMedia[] = [];
    const user = (await this.userService.findUserById(id)) as User;
    if (isEmpty(files)) {
      throw new BadRequestException('There is no files provided');
    }
    for (const media of files) {
      if (!media) {
        throw new BadRequestException('There is no files provided, sorry!');
      }
      const entity = new UserMedia();
      if (media.size === 0) {
        throw new BadRequestException('Bad File size, try again.');
      }
      const url = await uploadToS3(getMediaDirName(type), media.buffer);
      entity.url = url;
      entity.size = media.size;
      entity.mimetype = media.mimetype;
      entity.user = user;
      entity.type = type;
      entity.conversationId = conversationId || null;
      collection.push(entity);
    }
    return this.userMediaRepository.save(collection);
  }
  // NOTE: THIS IS A BAD DECISION !!!
  /**
   * Save a Base64 Image from a Base64 string.
   * @param fileBase64 the base64 string form the client
   * @param path the optinal path to save the photo at.
   */
  public async savePhotoBase64(fileBase64: string): Promise<UserMedia> {
    // should we add the validation ?
    // if (Base64Regex(fileBase64)) {
    // throw new UnsupportedMediaTypeException('Bad Base64 encoded !');
    // }
    // !FIX ME this may allocate a lot of memory and die !!!
    const imgBuffer = Buffer.from(fileBase64, 'base64');
    if (imgBuffer.byteLength > 8 * 1000 * 1000) {
      return { message: 'File is to big, maxmim size is 5MB' } as any;
    } else {
      const url = await uploadToS3('photos', imgBuffer);
      const photo = new UserMedia();
      photo.size = imgBuffer.byteLength;
      photo.mimetype = 'image/jpeg';
      photo.url = url;
      return this.userMediaRepository.save(photo);
    }
  }

  public async getMediaAll(ids: any[]): Promise<Media[]> {
    const entities = await this.userMediaRepository.findByIds(ids, {
      select: ['id', 'type', 'url', 'thumbnails', 'duration', 'mediaHash'],
      where: { conversationId: null },
    });
    if (isEmpty(entities)) {
      throw new NotFoundException('Media Not Found');
    }

    return entities as Media[];
  }

  public async getConversationMedia(
    conversationId: string,
    userId: string,
    type: 'media' | 'docs',
    page?: any,
    limit?: any,
  ) {
    const [isConversationMember] = (await this.emitter.emitAsync(
      'chat:isConversationMember',
      conversationId,
      userId,
    )) as [boolean];
    if (!isConversationMember) {
      throw new ForbiddenException(
        'conversation not found or maybe you are not member in that conversation',
      );
    }
    page = parseInt(page) ? parseInt(page) : 1;
    limit = parseInt(limit) ? parseInt(limit) : 30;
    const entities = this.userMediaRepository
      .createQueryBuilder()
      .select()
      .where('conversationId = :conversationId AND type IN (:mediaType)', {
        conversationId,
        mediaType: type === 'media' ? ['video', 'photo'] : ['files'],
      })
      .orderBy('createdAt', 'ASC')
      .take(limit)
      .skip((page - 1) * limit)
      .getMany();
    return entities;
  }
  public async getMedia(id: string): Promise<UserMedia> {
    const entity = await this.userMediaRepository.findOne(id);
    if (!entity) {
      throw new NotFoundException('Media Not Found');
    }

    return entity;
  }

  public async getMediaUrlById(id: string): Promise<string> {
    const entity = await this.userMediaRepository.findOne(id, { select: ['url'] });
    if (!entity) {
      throw new NotFoundException('Media Not Found');
    }

    return entity.url;
  }
  public async removeMedia(media: UserMedia) {
    await this.userMediaRepository.delete(media);
  }

  public async saveEntity(entity: UserMedia): Promise<void> {
    try {
      await this.userMediaRepository.save(entity);
    } catch (error) {
      throw error;
    }
  }

  public async updateEntityPath(oldPath: string, newPath: string) {
    try {
      await this.userMediaRepository
        .createQueryBuilder()
        .update({
          url: newPath,
        })
        .where('url = :oldPath', { oldPath })
        .execute();
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }

  public async handleVideo(
    file: Express.Multer.File,
    { id },
    conversationId?: string,
    waitForThumbnail = false,
    duration = '00:00',
  ) {
    const user = (await this.userService.findUserById(id)) as User;
    if (isNil(file)) {
      throw new BadRequestException('There is no files provided');
    }
    if (file.size === 0) {
      throw new BadRequestException('Bad File size, try again.');
    }
    const hash = generateUnique(32);
    const result = await this.createMultiQualityVideo(file.buffer, hash);
    const originalPath = result[0];
    const buffer = readFileSync(originalPath);
    setImmediate(async () => {
      const sdPath = result[1];
      if (!isNil(sdPath)) {
        const buf = readFileSync(sdPath);
        uploadToS3(getMediaDirName('video'), buf, `${hash}_sd`).then(() => {
          setTimeout(() => {
            unlinkSync(sdPath);
          }, 2000);
        });
      }
    });
    const entity = new UserMedia();
    const location = await uploadToS3(getMediaDirName('video'), buffer, `${hash}_hd`);
    entity.size = buffer.byteLength;
    entity.mimetype = 'video/mp4';
    entity.url = location;
    entity.user = user;
    entity.type = 'video';
    entity.duration = duration;
    entity.mediaHash = hash;
    entity.thumbnails = [];
    entity.conversationId = conversationId || null;
    try {
      if (!waitForThumbnail) {
        setImmediate(async () => {
          try {
            this.genrateThumbnailsAndUpdateMedia(location, hash);
          } catch {
            // we don't care xD
          }
        });
      } else {
        entity.thumbnails = await this.genrateThumbnails(location);
      }
      return this.userMediaRepository.save(entity);
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    } finally {
      // delete video files
      // I try to recover from these fucking errors here
      // so please don't judge my code, I'm writting this now with a pistol pointing at my head
      // I have to fix this bug whatever what :'D
      try {
        unlinkSync(result[0]);
      } catch {
        // whatever huh?
      }
    }
  }

  public async getMediaByHash(mediaHashs: string[]) {
    const entities = await this.userMediaRepository.find({
      mediaHash: In(mediaHashs),
      conversationId: null,
    });
    return entities as Media[];
  }

  public async handleLiveVideo(path: string, user: User) {
    const entity = new UserMedia();
    // const thumbnails = await this.genrateThumbnails('/' + relative('/', path));
    const thumbnails = await this.genrateThumbnails(path);
    entity.size = 0;
    entity.mimetype = 'flv';
    entity.url = path;
    entity.user = user;
    entity.type = 'video';
    entity.thumbnails = thumbnails;
    entity.conversationId = null;
    this.logger.log(`Saving Live video at ${path} by User ${user.id}`);

    return this.userMediaRepository.save(entity);
  }

  private async updateMediaThumbnailsByHash(mediaHash: string, thumbnails: string[]) {
    try {
      const entity = await this.userMediaRepository.findOne({ mediaHash });
      if (!isNil(entity)) {
        await this.userMediaRepository.update(entity.id, { thumbnails });
      }
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }

  private async createMultiQualityVideo(
    originalVideo: Buffer,
    hash: string,
  ): Promise<[string, string | null]> {
    return new Promise((resolve, reject) => {
      const originalPath = `${process.cwd()}/${Env('STORAGE_DISK_PATH')}/videos/${hash}_orig.mp4`;
      const sdPath = `${process.cwd()}/${Env('STORAGE_DISK_PATH')}/videos/${hash}_sd.mp4`;
      const hdPath = `${process.cwd()}/${Env('STORAGE_DISK_PATH')}/videos/${hash}_hd.mp4`;
      const output: [string, string | null] = [hdPath, sdPath];
      try {
        writeFileSync(originalPath, originalVideo);
        const orignalCmdVideo = Ffmpeg({ timeout: 60 * 10 })
          .input(originalPath)
          .toFormat('mp4')
          .videoCodec('libx264')
          .outputOptions('-crf', '22')
          .on('error', err => {
            this.logger.error(err.message, err);
            this.logger.error('Error While Creating Videos');
            output[0] = originalPath;
            output[1] = null;
            resolve(output);
          })
          .save(hdPath);
        Ffmpeg({ timeout: 60 * 10 })
          .input(originalPath)
          .toFormat('mp4')
          .videoCodec('libx264')
          .outputOptions('-crf', '25')
          .size('640x360') // 360p
          .on('error', err => {
            this.logger.error(err.message, err);
            this.logger.error('Error While Creating Small Videos');
            output[0] = originalPath;
            output[1] = null;
            resolve(output);
          })
          .save(sdPath);
        orignalCmdVideo.on('end', () => {
          setTimeout(() => {
            unlinkSync(originalPath);
          }, 600e3);
          resolve(output);
        });
      } catch (error) {
        this.logger.error(error.message, error);
        reject(error);
        unlinkSync(originalPath);
      }
    });
  }
  private async genrateThumbnails(path: string) {
    return new Promise<string[]>((resolve, reject) => {
      let fileNames = [];
      Ffmpeg({ timeout: 95 })
        .addInput(path)
        .thumbnails(
          { count: 1, timemarks: ['1%'], filename: '%b_thumbnail_%wx%h.png' },
          `${Env('STORAGE_DISK_PATH')}/thumbnails`,
        )
        .on('error', err => {
          this.logger.error(err.message, err.stack);
          reject(new UnsupportedMediaTypeException('Error While Creating Video Thumbnails'));
        })
        .on('filenames', filenames => {
          fileNames = filenames;
        })
        .on('end', async () => {
          const thumbnails: string[] = [];
          for (const fileName of fileNames) {
            const p = `${process.cwd()}/${Env('STORAGE_DISK_PATH')}/thumbnails/${fileName}`;
            const f = readFileSync(p);
            const url = await uploadToS3('thumbnails', f);
            thumbnails.push(url);
            unlinkSync(p); // delete it.
          }
          resolve(thumbnails);
        });
    });
  }

  private async genrateThumbnailsAndUpdateMedia(mediaLocation: string, mediaHash: string) {
    try {
      const thumbnails = await this.genrateThumbnails(mediaLocation);
      await this.updateMediaThumbnailsByHash(mediaHash, thumbnails);
      // then update the status again.
      this.emitter.emitAsync('status:removeStatusMediaCache', mediaHash);
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }
}
