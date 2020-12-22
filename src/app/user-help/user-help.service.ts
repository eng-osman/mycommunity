import { UserService } from '@app/user/user.service';
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserMetadata } from '@shared/interfaces';
import { Model } from 'mongoose';
import { pick } from 'ramda';
import { CreateHelpDTO } from './dto/create-help.dto';
import { ListHelpDTO } from './dto/list-help.dto';
import { UpdateHelpDTO } from './dto/update-help.dto';
import { UserHelpState } from './enums/user-help-state.enum';
import { HelpCategoryModel } from './interfaces/help-category.interface';
import { UserHelpModel } from './interfaces/user-help.interface';

@Injectable()
export class UserHelpService {
  constructor(
    @InjectModel('UserHelp')
    private readonly userHelpModel: Model<UserHelpModel>,
    @InjectModel('HelpCategory')
    private readonly helpCategoryModel: Model<HelpCategoryModel>,
    private readonly userService: UserService,
  ) {}

  public async myCurrentMonthHelp(user: any) {
    return this.currentMonthHelp(user.id);
  }

  public async create(user: any, data: CreateHelpDTO) {
    // Check if we can create the help
    const isExist = await this.currentMonthHelp(user.id);
    if (isExist) {
      throw new UnprocessableEntityException('You already created a help for this month');
    }
    const categoryExist = await this.helpCategoryModel.exists({
      _id: data.categoryId,
    });

    if (!categoryExist) {
      throw new NotFoundException('Category dose not exist in the database');
    }
    const model = new this.userHelpModel();
    model.location = {
      type: 'Point',
      coordinates: [data.long, data.lat],
    };
    model.ownerId = user.id;
    model.state = UserHelpState.PENDING;
    model.membersCount = data.membersCount;
    model.categoryId = data.categoryId;
    const saved = await model.save();
    return { message: 'Help Created', id: saved.id, status: 201 };
  }

  public async update(user: any, data: UpdateHelpDTO) {
    const currentMonthHelp = await this.currentMonthHelp(user.id);
    if (currentMonthHelp && currentMonthHelp.deleted === false) {
      if (
        currentMonthHelp.state === UserHelpState.ACQUIRED ||
        currentMonthHelp.state === UserHelpState.DONE
      ) {
        throw new UnprocessableEntityException(
          'the current state of the help is ACQUIRED/Done so it is not updated',
        );
      }
      await this.userHelpModel
        .updateOne({ _id: currentMonthHelp._id }, { membersCount: data.membersCount })
        .exec();
      return { message: 'Updated OK!', status: 200 };
    } else {
      throw new NotFoundException('You dont have any help created this month or maybe deleted!');
    }
  }

  public async delete(user: any) {
    const currentMonthHelp = await this.currentMonthHelp(user.id);
    if (currentMonthHelp) {
      if (currentMonthHelp.state === UserHelpState.ACQUIRED) {
        throw new UnprocessableEntityException(
          'the current state of the help is ACQUIRED so it is not deleted',
        );
      }
      await this.userHelpModel.updateOne({ _id: currentMonthHelp.id }, { deleted: true }).exec();
      return { message: 'Deleted OK!', status: 200 };
    } else {
      throw new NotFoundException('You dont have any help created this month!');
    }
  }

  public async helpNearLocation(user: any, args: ListHelpDTO, lang: string) {
    const query: any = {
      state: UserHelpState.PENDING,
      deleted: false,
      ownerId: {
        $ne: user.id,
      },
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [args.long, args.lat] },
          $maxDistance: args.km * 1000,
        },
      },
    };
    const queryResult = await this.userHelpModel
      .find(query)
      .skip((args.page - 1) * args.limit)
      .limit(parseInt(args.limit.toString()))
      .exec();
    const result: Array<{
      id: string;
      userId: string;
      lat: number;
      long: number;
      membersCount: number;
      mobileNumber: string;
      category: Pick<HelpCategoryModel, 'id' | 'name' | 'icon'>;
    }> = [];

    for (const e of queryResult) {
      try {
        const userMetadata = ((await this.userService.findUserById(
          e.ownerId,
          true,
        )) as unknown) as UserMetadata;
        const category = await this.getCategory(e.categoryId, lang);
        if (!category) {
          continue;
        }
        result.push({
          id: e.id,
          userId: userMetadata.id,
          lat: e.location.coordinates[1],
          long: e.location.coordinates[0],
          membersCount: e.membersCount,
          mobileNumber: userMetadata.mobileNumber,
          category: pick(['id', 'name', 'icon'], category),
        });
      } catch {
        continue;
      }
    }
    return result;
  }

  public async acquire(user: any, helpId: string) {
    const updated = await this.userHelpModel.findOneAndUpdate(
      { _id: helpId, deleted: false, state: UserHelpState.PENDING, ownerId: { $ne: user.id } },
      { state: UserHelpState.ACQUIRED, acquiredBy: user.id },
      { new: true },
    );
    if (!updated) {
      throw new NotFoundException(
        'this help cannot be acquired maybe it is deleted or acquired by someone else',
      );
    }
    return { message: 'Acquired OK!', status: 200 };
  }

  public async confirm(user: any, helpId: string) {
    const updated = await this.userHelpModel.findOneAndUpdate(
      { _id: helpId, deleted: false, state: UserHelpState.ACQUIRED, acquiredBy: user.id },
      { state: UserHelpState.DONE },
      { new: true },
    );
    if (!updated) {
      throw new NotFoundException(
        'this help cannot be confirmed maybe it is deleted or acquired by someone else',
      );
    }
    return { message: 'Confirmed OK!', status: 200 };
  }

  public async getCategory(id: string, lang: string) {
    return this.helpCategoryModel.findOne({ _id: id, lang }).exec();
  }

  public async listCategories(lang: string) {
    const categories = await this.helpCategoryModel.find({ lang });
    return categories;
  }

  private async currentMonthHelp(userId: string): Promise<UserHelpModel | null> {
    const startOfTheMonth = new Date();
    startOfTheMonth.setUTCDate(1);
    startOfTheMonth.setUTCHours(0, 0, 0, 0);
    const endOfTheMonth = new Date();
    endOfTheMonth.setUTCDate(30);
    endOfTheMonth.setUTCHours(0, 0, 0, 0);
    const currentMonthHelp = await this.userHelpModel
      .findOne({
        ownerId: userId,
        createdAt: {
          $gte: startOfTheMonth,
          $lt: endOfTheMonth,
        },
      })
      .lean();
    if (currentMonthHelp) {
      currentMonthHelp.category = await this.getCategory(currentMonthHelp.categoryId, 'ar');
    }
    return currentMonthHelp;
  }
}
