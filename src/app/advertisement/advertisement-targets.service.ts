import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { LoggerService } from '@shared/services';
import { Document, Model } from 'mongoose';
import { Omit } from 'ramda';
import { AdvertisementProperties } from './entities';
import { AdvertisementTargets } from './interfaces/ad-targets.interface';
import { UserGender } from './user-gender.enum';

@Injectable()
export class AdvertisementTargetsService {
  private readonly logger = new LoggerService(AdvertisementTargetsService.name);
  constructor(
    @InjectModel('AdvertisementTargets')
    private readonly adTargetsModel: Model<AdvertisementTargets>,
  ) {}

  public async addOrUpdateTarget(
    targetId: string,
    data: Omit<Omit<AdvertisementTargets, 'userId'>, keyof Document>,
  ) {
    await this.adTargetsModel
      .updateOne(
        {
          userId: targetId,
        },
        data,
        { upsert: true },
      )
      .exec();
  }

  public async updateTargetStatus(targetId: string, status: boolean) {
    try {
      await this.adTargetsModel.findOneAndUpdate(targetId, { isActive: status }).exec();
    } catch (error) {
      this.logger.error(error.message, error);
      throw new NotFoundException('Error While Updating User status', 'TARGET_UPDATE_ERROR');
    }
  }

  public async getAdvertisementTargets({
    targetLocation,
    targetGeoRange,
    targetAgeRangeFrom,
    targetAgeRangeTo,
    targetGender,
  }: AdvertisementProperties): Promise<Array<{ userId: string }>> {
    try {
      const query: any = {
        userAge: { $gte: targetAgeRangeFrom, $lte: targetAgeRangeTo },
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [targetLocation.long, targetLocation.lat],
            },
            $maxDistance: targetGeoRange,
          },
        },
      };

      if (targetGender !== 'all') {
        let userGender = UserGender.MALE;
        switch (targetGender) {
          case 'male':
            userGender = UserGender.MALE;
            break;
          case 'female':
            userGender = UserGender.FEMALE;
            break;
        }
        query.userGender = userGender;
      }
      const matched = await this.adTargetsModel
        .find(query, { userId: 1, _id: 0 })
        .limit(100_000)
        .lean()
        .exec();
      return matched;
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }
}
