import { MediaService } from '@app/media/media.service';
import { User } from '@app/user/entities';
import { UserCacheService } from '@app/user/user-cache.service';
import { UserService } from '@app/user/user.service';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@shared/services';
import { isNil } from 'ramda';
import { Repository } from 'typeorm';
import { ProfileVerificationDTO } from './dto/profile-verification.dto';
import { ProfileVerification } from './entities';
import { VerificationStatus } from './verification-status.enum';
import { VerificationType } from './verification-type.enum';

@Injectable()
export class ProfileVerificationService {
  private readonly logger = new LoggerService(ProfileVerificationService.name);
  constructor(
    @InjectRepository(ProfileVerification)
    private readonly repository: Repository<ProfileVerification>,
    private readonly userService: UserService,
    private readonly userCacheService: UserCacheService,
    private readonly mediaService: MediaService,
  ) {}

  public async createVerificationRequest(
    userId: string,
    { type, mediaId }: ProfileVerificationDTO,
  ) {
    try {
      const user = ((await this.userService.findUserById(userId, false)) as unknown) as User;
      const req = await this.repository
        .createQueryBuilder('req')
        .select()
        .leftJoinAndSelect('req.user', 'user')
        .where('user.id = :userId', { userId })
        .andWhere('req.status IN (:types)', {
          types: [VerificationStatus.PENDING, VerificationStatus.ACCEPTED],
        })
        .getOne();
      if (!isNil(req)) {
        return {
          error: true,
          entity: req,
          message: `You have created a Verification Request, and it's status ${
            req.status
          }, try again later.`,
        };
      } else {
        const r = new ProfileVerification();
        const media = await this.mediaService.getMedia(mediaId);
        r.media = media.url;
        r.user = user;
        r.status = VerificationStatus.PENDING;
        r.type = type === 'company' ? VerificationType.COMPANY : VerificationType.PUBLIC_FIGUARE;
        const saved = await this.repository.save(r);
        return {
          error: false,
          entity: saved,
          message: 'Request Created.',
        };
      }
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async cancelMyVerificationRequest(userId: string, reqId: string) {
    const user = ((await this.userService.findUserById(userId, false)) as unknown) as User;
    const req = await this.repository
      .createQueryBuilder('req')
      .leftJoinAndSelect('req.user', 'user')
      .where('req.id = :reqId', { reqId })
      .getOne();
    if (isNil(req)) {
      throw new NotFoundException('Verification Request Not Found');
    }
    if (!isNil(req) && req.user.id !== user.id) {
      throw new ForbiddenException('You can not cancel this request.');
    }
    req.status = VerificationStatus.CANCELED_BY_USER;
    await this.repository.update(req.id, req);
    return { message: 'Verification Request Has been canceled.' };
  }

  public async cancelVerificationRequest(reqId: string, message: string) {
    const req = await this.repository.findOne(reqId);
    if (isNil(req)) {
      throw new NotFoundException('Verification Request Not Found');
    }
    req.status = VerificationStatus.CANCELED;
    req.message = message || '';
    await this.repository.update(req.id, req);
    return { message: 'Verification Request Has been canceled.' };
  }

  public async acceptVerificationRequest(reqId: string, message: string) {
    const req = await this.repository
      .createQueryBuilder('req')
      .leftJoinAndSelect('req.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('req.id = :reqId', { reqId })
      .getOne();
    if (isNil(req)) {
      throw new NotFoundException('Verification Request Not Found');
    }
    const user = ((await this.userService.findUserById(req.user.id, false)) as unknown) as User;
    req.status = VerificationStatus.ACCEPTED;
    req.message = message || '';
    await this.repository.update(req.id, req);
    user.profile.verified = true;
    await this.userService.profileRepo.update(user.profile.id, user.profile);
    await this.userCacheService.addPublicUser(user.id);
    return { message: 'Verification Request Has been Accepted.' };
  }

  public async getAllRequests(page: string, limit: string, status: string) {
    let p = parseInt(page) || 0;
    p = p < 0 ? 1 : p;
    let l = parseInt(limit) || 20;
    l = l < 0 ? 20 : l;
    const s = VerificationStatus[status.toUpperCase()] || VerificationStatus.PENDING;
    return this.repository
      .createQueryBuilder('req')
      .leftJoinAndSelect('req.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('req.status = :status', { status: s })
      .take(l)
      .skip((p - 1) * l)
      .getMany();
  }

  public async getMyRequests(userId: string, page: string, limit: string) {
    let p = parseInt(page) || 0;
    p = p < 0 ? 1 : p;
    let l = parseInt(limit) || 20;
    l = l < 0 ? 20 : l;
    return this.repository
      .createQueryBuilder('req')
      .leftJoinAndSelect('req.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('user.id = :userId', { userId })
      .take(l)
      .skip((p - 1) * l)
      .getMany();
  }
}
