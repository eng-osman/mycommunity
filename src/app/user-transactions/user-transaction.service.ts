import { ApplicationSettingsService } from '@app/settings/app-settings.service';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@shared/services';
import { isEmpty, isNil, omit } from 'ramda';
import { Repository } from 'typeorm';
import { UserTransaction } from './entities';

@Injectable()
export class UserTransactionService {
  private readonly logger = new LoggerService(UserTransactionService.name);
  constructor(
    @InjectRepository(UserTransaction)
    private readonly userTransactionRepository: Repository<UserTransaction>,
    private readonly appSettingsService: ApplicationSettingsService,
  ) {}

  public async createTransaction(
    userId: string,
    amount: number,
    points: number,
    description?: string,
  ) {
    const transaction = new UserTransaction();
    transaction.amount = amount;
    transaction.points = points;
    transaction.description = description;
    const currentTotalPoints = await this.getUserCurrentPoints(userId);
    transaction.totalPoints = currentTotalPoints + transaction.points;
    const savedTransaction = await this.userTransactionRepository.save(transaction);
    await this.userTransactionRepository
      .createQueryBuilder()
      .relation('user')
      .of(savedTransaction)
      .set(userId);
    return savedTransaction;
  }

  public async getTransactionById(id: string) {
    return this.userTransactionRepository.findOne(id);
  }

  public async getUserCurrentPoints(userId: string): Promise<number> {
    const entity = await this.userTransactionRepository
      .createQueryBuilder('transaction')
      .select()
      .leftJoinAndSelect('transaction.user', 'user', 'user.id = :id', { id: userId })
      .orderBy('transaction.createdAt', 'DESC')
      .take(1)
      .getOne();
    return entity ? entity.totalPoints : 0;
  }

  public async calculatePointsFormAmmout(amount: number): Promise<number> {
    const settings = await this.appSettingsService.getCurrentApplicationSettings();
    if (!isNil(settings)) {
      const pointsFactor = settings.pointsFactor;
      const points = Math.ceil(pointsFactor * amount);
      return points;
    } else {
      this.logger.error('App Settings Not Configuerd.');
      throw new InternalServerErrorException('App Settings Not Configuerd.');
    }
  }

  public async calculateamountFromPoints(points: number): Promise<number> {
    const settings = await this.appSettingsService.getCurrentApplicationSettings();
    if (!isNil(settings)) {
      const pointsFactor = settings.pointsFactor;
      const amount = Math.floor(points / pointsFactor);
      return amount;
    } else {
      this.logger.error('App Settings Not Configuerd.');
      throw new InternalServerErrorException('App Settings Not Configuerd.');
    }
  }

  public async getUserTransactions(userId: string, page: number, limit: number = 30) {
    const result = await this.userTransactionRepository
      .createQueryBuilder('transaction')
      .select()
      .leftJoinAndSelect('transaction.user', 'user', 'user.id = :id', { id: userId })
      .orderBy('transaction.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    if (!isEmpty(result)) {
      const transactions = result.map(t => omit(['user'], t));
      return {
        user: result[0].user,
        transactions,
      };
    } else {
      return {
        user: null,
        transactions: [],
      };
    }
  }
}
