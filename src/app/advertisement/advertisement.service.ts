import { ALLOWED_AGE_RANGE } from '@app/constants';
import { MediaService } from '@app/media/media.service';
import { ApplicationSettingsService } from '@app/settings/app-settings.service';
import { UserTransactionService } from '@app/user-transactions/user-transaction.service';
import { User } from '@app/user/entities';
import { UserService } from '@app/user/user.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GeoLocation } from '@shared/classes';
import { ErrorCode } from '@shared/enums';
import { LoggerService } from '@shared/services';
import { extractAge, generateUnique, getAgeRange, parseRange } from '@shared/utils';
import { isEmpty, isNil, omit, pick } from 'ramda';
import { Repository } from 'typeorm';
import { AdvertisementCacheService } from './advertisement-cache.service';
import { AdvertisementTargetsService } from './advertisement-targets.service';
import { CreateAdvertisementCategoryDTO } from './dto/create-ad-category.dto';
import { CreateAdvertisementDTO } from './dto/create-ad.dto';
import { UpdateAdvertisementDTO } from './dto/update-ad.dto';
import {
  Advertisement,
  AdvertisementCategory,
  AdvertisementProperties,
  AdvertisementStatics,
} from './entities';
import { StaticsAction } from './statics-action.enum';

@Injectable()
export class AdvertisementService {
  private readonly logger = new LoggerService(AdvertisementService.name);
  constructor(
    @InjectRepository(Advertisement) private readonly adRepository: Repository<Advertisement>,
    @InjectRepository(AdvertisementStatics)
    private readonly adStaticsRepository: Repository<AdvertisementStatics>,
    @InjectRepository(AdvertisementCategory)
    private readonly adCategoryRepository: Repository<AdvertisementCategory>,
    private readonly mediaService: MediaService,
    private readonly adTargetsService: AdvertisementTargetsService,
    private readonly adCacheService: AdvertisementCacheService,
    private readonly userService: UserService,
    private readonly userTransactionService: UserTransactionService,
    private readonly appSettingsService: ApplicationSettingsService,
  ) {}

  public async getAdvertisments(page: number, limit = 30, forUserId?: string, activeOnly = false) {
    if (limit <= 50 || page < 1) {
      if (page < 1) {
        page = 1;
      }
      if (limit < 0) {
        limit = 50;
      }
      const q = this.adRepository
        .createQueryBuilder('ad')
        .select()
        .leftJoinAndSelect('ad.categories', 'adCategorie', 'adCategorie.isDeleted = :deleted', {
          deleted: false,
        })
        .leftJoinAndSelect('ad.statics', 'adStatics')
        .leftJoinAndSelect('ad.owner', 'owner')
        .leftJoinAndSelect('owner.profile', 'ownerProfile', 'ownerProfile.isActive = :active', {
          active: true,
        });
      if (activeOnly && forUserId) {
        q.where('owner.id = :userId', { userId: forUserId }).andWhere('ad.isActive = :isActive', {
          isActive: true,
        });
      } else if (activeOnly) {
        q.where('ad.isActive = :isActive', { isActive: true });
      } else if (forUserId) {
        q.where('owner.id = :userId', { userId: forUserId });
      }
      return q
        .take(limit)
        .skip((page - 1) * limit)
        .getMany();
    } else {
      throw new BadRequestException('limit should be less than or equal 50');
    }
  }

  public async createAdvertisment(userId: string, ad: CreateAdvertisementDTO) {
    try {
      const { categoryIds, mediaId, height, width, url, text, type, expiresInDays, points } = ad;
      const { targetAgeRange, targetCountry, targetGender, targetLocation, targetRange } = ad;
      const userPoints = await this.userTransactionService.getUserCurrentPoints(userId);
      const advertisement = new Advertisement();
      if (userPoints > 0 && userPoints >= points) {
        advertisement.points = points;
      } else {
        throw new UnprocessableEntityException(
          'You do not have enough points to create that ad',
          ErrorCode.NO_ENOUGH_POINTS.toString(),
        );
      }
      if (mediaId && (type === 'photo' || type === 'video')) {
        const mediaUrl = await this.mediaService.getMediaUrlById(mediaId);
        advertisement.mediaUrl = mediaUrl;
      }

      if (!isEmpty(categoryIds)) {
        // We could use CategoryIds directly, but what makes us sure that all of them is ok ?
        const categories = await this.adCategoryRepository.findByIds(categoryIds, {
          select: ['id'],
        });
        advertisement.categories = categories;
      }

      // Create Ad Props.
      const advertisementProps = new AdvertisementProperties();
      const [lat, long] = GeoLocation.from(targetLocation).toTubule();
      const [from, to] = parseRange(targetAgeRange);
      advertisementProps.targetCountry = targetCountry;
      advertisementProps.targetGender = targetGender;
      advertisementProps.targetLocation = { lat, long };
      advertisementProps.targetGeoRange = targetRange;
      advertisementProps.targetAgeRangeFrom = from;
      advertisementProps.targetAgeRangeTo = to;

      advertisement.properties = advertisementProps;
      advertisement.text = text;
      advertisement.url = url;
      advertisement.type = type;
      advertisement.expiresInDays = expiresInDays;
      advertisement.size = { height, width };
      advertisement.slug = generateUnique(8);
      // Save Ad
      const savedAd = await this.adRepository.save(advertisement);

      const ammout = await this.userTransactionService.calculateamountFromPoints(points);
      await this.userTransactionService.createTransaction(
        userId,
        -1 * ammout,
        -1 * points,
        `Created Advertisment #${savedAd.id}`,
      );
      // Create Statics
      const adStatics: AdvertisementStatics[] = [];
      for (const range of ALLOWED_AGE_RANGE) {
        const [rangeFrom, rangeTo] = parseRange(range);
        const statics = new AdvertisementStatics();
        statics.advertisement = savedAd;
        statics.ageRangeFrom = rangeFrom;
        statics.ageRangeTo = rangeTo;
        adStatics.push(statics);
      }
      const savedStatics = await this.adStaticsRepository.save(adStatics);
      // Link Statics
      await this.adRepository
        .createQueryBuilder()
        .relation('statics')
        .of(savedAd)
        .add(savedStatics);
      // Link the Ad Owner
      await this.adRepository
        .createQueryBuilder()
        .relation('owner')
        .of(savedAd)
        .set(userId);
      return savedAd;
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async updateAdvertisment(userId: string, id: string, data: UpdateAdvertisementDTO) {
    const { targetAgeRange, targetCountry, targetGender, targetLocation, targetRange } = data;
    const ad = await this.adRepository
      .createQueryBuilder('ad')
      .select()
      .leftJoinAndSelect('ad.owner', 'owner')
      .where('ad.id = :id', { id })
      .andWhere('ad.isActive = :isActive', { isActive: true })
      .getOne();
    if (isNil(ad)) {
      throw new NotFoundException(
        `Advertisement with id: ${id} maybe not be found or it's already inactive.
        or maybe has been expired !`,
      );
    }
    if (ad.owner.id !== userId) {
      throw new UnauthorizedException('You cant update this Ad !');
    }
    if (data.mediaId) {
      const mediaUrl = await this.mediaService.getMediaUrlById(data.mediaId);
      ad.mediaUrl = mediaUrl;
    }
    const [lat, long] = GeoLocation.from(targetLocation).toTubule();
    const [from, to] = parseRange(targetAgeRange);
    ad.properties.targetCountry = targetCountry;
    ad.properties.targetGender = targetGender;
    ad.properties.targetLocation = { lat, long };
    ad.properties.targetGeoRange = targetRange;
    ad.properties.targetAgeRangeFrom = from;
    ad.properties.targetAgeRangeTo = to;
    ad.text = data.text;
    ad.url = data.url;
    await this.adRepository.update(ad.id, ad);
    return {
      message: 'Adverstisment Updated !',
      statusCode: 201,
    };
  }
  public async changeAdStatusById(id: string, status: boolean) {
    const ad = await this.adRepository
      .createQueryBuilder()
      .select()
      .where('id = :id', { id })
      .andWhere('isActive = :isActive', { isActive: !status })
      .getOne();
    if (ad !== undefined) {
      ad.expiresAt = new Date(new Date().getTime() + ad.expiresInDays * 8.64e7);
      ad.isActive = status;
      await this.adRepository.update(ad.id, ad);
      // Send ad only if it's active.

      // i know that staus is boolean and i can just use
      // `if (status) {...}`
      // but that way makes it more readable.
      if (status === true) {
        const adTargets = await this.adTargetsService.getAdvertisementTargets(ad.properties);
        const targetIds = adTargets.map(t => t.userId);
        await this.adCacheService.saveAdvertisementTargets(id, targetIds);
      }
      return {
        message: `Advertisement with id: ${id} has been ${status ? 'Activated' : 'Deactivated'}.`,
        status: 201,
      };
    } else {
      throw new NotFoundException(
        `Advertisement with id: ${id} maybe not be found or it's already ${
          status ? 'active' : 'inactive'
        }, or maybe has been expired !`,
      );
    }
  }

  public async createAdvertismentCategory({ name, description }: CreateAdvertisementCategoryDTO) {
    try {
      const category = new AdvertisementCategory();
      category.slug = generateUnique(8);
      category.name = name;
      category.description = description;
      return this.adCategoryRepository.save(category);
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async removeAdvertismentCategory(categoryId: string) {
    const category = await this.adCategoryRepository
      .createQueryBuilder()
      .select('id')
      .where('id = :categoryId', { categoryId })
      .getOne();
    if (!isNil(category)) {
      category.isDeleted = true;
      await this.adCategoryRepository.update(category.id, category);
      return { message: `Category with id: ${categoryId} has been deleted`, status: 201 };
    } else {
      throw new NotFoundException(`Category with id: ${categoryId} not found`);
    }
  }

  public async updateAdvertismentStatics(
    userId: string,
    adId: string,
    staticsAction: StaticsAction,
  ) {
    const user = (await this.userService.findUserById(userId)) as User;
    const {
      targetAgeRangeFrom,
      targetAgeRangeTo,
      targetCountry,
      targetGender,
    } = this.getTargetProperties(user);
    const adStatics = await this.adStaticsRepository
      .createQueryBuilder('statics')
      .leftJoinAndSelect('statics.advertisement', 'ad')
      .where('ad.id = :adId', { adId })
      .andWhere('ad.isActive = :active', { active: true })
      .andWhere('statics.ageRangeFrom = :targetAgeRangeFrom', { targetAgeRangeFrom })
      .andWhere('statics.ageRangeTo = :targetAgeRangeTo', { targetAgeRangeTo })
      .getOne();
    const result: { message: string; eventCallback?: string; status: number } = {
      message: 'Action!',
      status: 201,
    };
    if (!isNil(adStatics)) {
      const advertisement = adStatics.advertisement;
      const settings = await this.appSettingsService.getCurrentApplicationSettings();
      // Check for points.
      if (advertisement.points <= 0) {
        // Disable advertisement
        throw new UnprocessableEntityException(
          'The ad has been disabled by the system, no enough points',
          ErrorCode.NO_ENOUGH_POINTS.toString(),
        );
      }
      switch (staticsAction) {
        case StaticsAction.AD_CLICK:
          this.checkActionPoints(advertisement.points, settings!.clickPrice);
          adStatics.clicks += 1;
          result.message = 'Clicked!';
          advertisement.points -= settings!.clickPrice;
          break;
        case StaticsAction.AD_NEGATIVE_VIEW:
          this.checkActionPoints(advertisement.points, 0);
          adStatics.negativeViews += 1;
          result.message = '-View!';
          advertisement.points -= 0; // ???!
          break;
        case StaticsAction.AD_POSITIVE_VIEW:
          this.checkActionPoints(advertisement.points, settings!.viewPrice);
          adStatics.positiveViews += 1;
          result.message = '+View!';
          advertisement.points -= settings!.viewPrice;
          break;
      }
      if (adStatics.countries && !adStatics.countries.includes(targetCountry)) {
        adStatics.countries.push(targetCountry);
      }
      if (targetGender === 'male') {
        adStatics.males += 1;
      } else if (targetGender === 'female') {
        adStatics.females += 1;
      } else {
        // others !!
        adStatics.males += 1;
        adStatics.females += 1;
      }
      await this.adStaticsRepository.update(adStatics.id, adStatics);
      await this.adRepository.update(advertisement.id, advertisement);
      return result;
    } else {
      throw new NotFoundException(
        `Advertisement with id: ${adId} maybe not be found or has been deactivated`,
        ErrorCode.AD_DEACTIVATED.toString(),
      );
    }
  }

  public async getAdvertismentStatics(adId: string) {
    const statics = await this.adStaticsRepository
      .createQueryBuilder('statics')
      .leftJoinAndSelect('statics.advertisement', 'ad')
      .where('ad.id = :adId', { adId })
      .andWhere('ad.isActive = :active', { active: true })
      .getMany();
    if (!isEmpty(statics)) {
      // transform the data
      const staticsResponse = statics.map(s => omit(['advertisement', 'id', 'createdAt'], s));
      return { advertisement: statics[0].advertisement, statics: staticsResponse };
    } else {
      throw new NotFoundException(
        `Advertisement with id: ${adId} maybe not be found or has been deactivated`,
      );
    }
  }

  public getTargetProperties(target: User) {
    const userAge = extractAge(target.profile.birthdate);
    const [targetAgeRangeFrom, targetAgeRangeTo] = getAgeRange(userAge, ALLOWED_AGE_RANGE);
    if (targetAgeRangeFrom < 0 || targetAgeRangeTo < 0) {
      throw new UnprocessableEntityException('Current User age range is not supported.');
    }
    const targetCountry = target.profile.country;
    const targetGender = target.profile.gender;
    return {
      targetAgeRangeFrom,
      targetAgeRangeTo,
      targetCountry,
      targetGender,
    };
  }

  public async getTargetRandomAdvertisements(targetId: string, count = 30, page = 1) {
    const adIds = await this.adCacheService.getTargetRandomAdvertisementIds(targetId, count);
    const ads = await this.adRepository
      .createQueryBuilder()
      .select()
      .whereInIds(adIds)
      .andWhere('isActive = :isActive', { isActive: true })
      .skip((page - 1) * count)
      .getMany();
    const result = ads.map(ad =>
      pick(['type', 'size', 'mediaUrl', 'text', 'slug', 'isActive', 'expiresAt', 'id'], ad),
    );
    return result;
  }

  public checkActionPoints(adPoints: number, actionPoint: number) {
    if (adPoints >= actionPoint) {
      return true;
    } else {
      throw new UnprocessableEntityException(
        'The ad has been disabled by the system, no enough points',
        ErrorCode.NO_ENOUGH_POINTS.toString(),
      );
    }
  }
}
