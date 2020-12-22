import { User } from '@app/user/entities';
import { UserCacheService } from '@app/user/user-cache.service';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CacheMaker } from '@shared/classes';
import { InjectAgenda, InjectEventEmitter, InjectRedisClient } from '@shared/decorators';
import { UserMetadata } from '@shared/interfaces';
import { LoggerService } from '@shared/services';
import { time } from '@shared/utils';
import * as Agenda from 'agenda';
import { EventEmitter2 } from 'eventemitter2';
import { Redis } from 'ioredis';
import { Model } from 'mongoose';
import { isEmpty, isNil } from 'ramda';
import { countriesCodes } from './countries-codes';
import { CountryStatics } from './country-statics.interface';
import { UserLogs } from './interfaces/user-logs.interface';
@Injectable()
export class AnalyticsCacheService extends CacheMaker implements OnModuleInit, OnModuleDestroy {
  private static readonly namespace = 'analytics';
  private readonly countryStatics: Map<string, Partial<CountryStatics>> = new Map();
  private readonly logger = new LoggerService(AnalyticsCacheService.name);
  constructor(
    @InjectRedisClient() protected readonly client: Redis,
    @InjectEventEmitter() private readonly emitter: EventEmitter2,
    @InjectAgenda() private readonly agenda: Agenda,
    @InjectModel('UsersLogs') private readonly userLogsModel: Model<UserLogs>,
    private readonly userCacheService: UserCacheService,
  ) {
    super(client, AnalyticsCacheService.namespace);
    this.loadCountries();
  }

  public async onModuleInit() {
    this.logger.log('Starting Agenda !');
    await (this.agenda as any)._ready;
    this.logger.log('Agenda is Ready !');
    this.agenda.define('clear-posts-counter', async (job, done) => {
      this.clearCountryPostsRecord().then(() => {
        this.logger.log(`Job #${job.attrs._id} for ${job.attrs.name} Completed!`);
        done();
      });
    });
    // every day at midnight at 12:00 AM
    this.agenda.every('24 hours', 'clear-posts-counter');
    await this.agenda.start();
    await this.subscribeToEvents();
  }

  public async onModuleDestroy() {
    await this.agenda.stop();
  }

  public async getCountryStatics(countryCode: string) {
    try {
      const countryStaticsKey = this.formatKey('country', countryCode);
      const countryStatics: CountryStatics = await this.client.hgetall(countryStaticsKey);
      countryStatics.totalUsers = parseInt(countryStatics.totalUsers.toString());
      countryStatics.totalOnline = parseInt(countryStatics.totalOnline.toString());
      countryStatics.posts5 = parseInt(countryStatics.posts5.toString());
      return countryStatics;
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async getCountriesStatics() {
    try {
      const statics: CountryStatics[] = [];
      const pipeline = this.client.pipeline();
      for (const key of this.countryStatics.keys()) {
        const countryStaticsKey = this.formatKey('country', key);
        pipeline.hgetall(countryStaticsKey);
      }
      const result = await pipeline.exec();
      // tslint:disable-next-line:variable-name
      for (const [err, country] of result) {
        if (err) {
          this.logger.warn(err.message);
        }
        if (!isNil(country)) {
          country.totalUsers = parseInt(country.totalUsers);
          country.totalOnline = parseInt(country.totalOnline);
          country.posts5 = parseInt(country.posts5);
          statics.push(country);
        }
      }
      return statics;
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async getCountriesOfficialAccounts() {
    try {
      const res: Array<{ contryCode: string; userId: string }> = [];
      const supportedContries = ['EG', 'SA']; // we can add things latter !
      for (const key of supportedContries) {
        const countryAccountKey = this.formatKey('country', key, 'accountId');
        const countryAccountId = await this.client.get(countryAccountKey);
        if (!isNil(countryAccountId)) {
          const entry = {
            contryCode: key,
            userId: countryAccountId,
          };
          res.push(entry);
        }
      }
      return res;
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }
  public async getCountryUsersWithStatus(
    countryCode: string,
    status: 'online' | 'offline' | 'all' | 'active' = 'all',
    page,
    limit,
  ) {
    if (status === 'active') {
      return this.getDailyActiveUsers(countryCode, page, limit);
    }
    const countryUserStatusKey = this.formatKey('country', countryCode, 'users', status);
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 20;
    const fromOffset = (page - 1) * limit;
    const toOffset = fromOffset + limit;
    const userIds = await this.client.zrange(countryUserStatusKey, fromOffset, toOffset);
    const users = await this.userCacheService.findUsers(userIds);
    return this.extractUserMetadata(users);
  }

  public async getDailyActiveUsers(countryCode: string, page, limit) {
    try {
      const countryActiveUsersKey = this.formatKey('country', countryCode, 'users', 'active');
      page = parseInt(page) || 1;
      limit = parseInt(limit) || 20;
      const fromOffset = (page - 1) * limit;
      const toOffset = fromOffset + limit;
      const userIds = await this.client.zrange(countryActiveUsersKey, fromOffset, toOffset);
      const users = await this.userCacheService.findUsers(userIds);
      return await this.extractUserMetadata(users);
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async getHomeGlobalStatics() {
    try {
      const statics: any[] = [];
      const pipeline = this.client.pipeline();
      for (let currentMonth = 0; currentMonth < 12; currentMonth++) {
        const homeGlobalStaticsKey = this.formatKey('home', 'global', currentMonth.toString());
        pipeline.hgetall(homeGlobalStaticsKey);
      }
      const result = await pipeline.exec();
      // tslint:disable-next-line:variable-name
      for (const [err, monthStatics] of result) {
        if (err) {
          this.logger.warn(err.message);
        }
        if (!isEmpty(monthStatics)) {
          statics.push(monthStatics);
        }
      }
      return statics;
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async getUserStatics(userId: string, year?) {
    try {
      const currentYear = new Date().getUTCFullYear();
      year = parseInt(year) ? parseInt(year) : currentYear;
      return await this.userLogsModel
        .find({ userId, currentYear })
        .select(['-_id', '-__v', '-currentYear'])
        .exec();
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  private async getDailyUserStatusesCount(userId: string): Promise<number> {
    try {
      const key = this.formatKey('user', userId, 'posts');
      const count = await this.client.get(key);
      if (isNil(count)) {
        await this.client.setex(key, time('1 day'), 0);
        return 0;
      }
      return parseInt(count);
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  private async setDailyUserStatusesCount(userId: string, count: number) {
    try {
      const key = this.formatKey('user', userId, 'posts');
      await this.client.set(key, count);
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  private async addDailyActiveUser(userId: string, countryCode: string) {
    try {
      const countryStaticsKey = this.formatKey('country', countryCode);
      const globalStaticsKey = this.formatKey('country', 'global');
      const countryActiveUsersKey = this.formatKey('country', countryCode, 'users', 'active');
      const globalActiveUsersKey = this.formatKey('country', 'global', 'users', 'active');
      const currentTime = Date.now().toString();

      this.client.zadd(countryActiveUsersKey, currentTime, userId).then(async _ => {
        const countryActiveUsersCount = await this.client.zcard(countryActiveUsersKey);
        await this.client.hset(countryStaticsKey, 'posts5', countryActiveUsersCount);
      });

      this.client.zadd(globalActiveUsersKey, currentTime, userId).then(async _ => {
        const globalActiveUsersCount = await this.client.zcard(globalActiveUsersKey);
        await this.client.hset(globalStaticsKey, 'posts5', globalActiveUsersCount);
      });
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  private async isUserOnline(userId: string): Promise<boolean> {
    try {
      const globalOnlineUserKey = this.formatKey('country', 'global', 'users', 'online');
      const isExist = await this.client.zscore(globalOnlineUserKey, userId);
      return Boolean(isExist);
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  private async addUserOnline(userId: string, countryCode: string) {
    try {
      const countryStaticsKey = this.formatKey('country', countryCode);
      const globalStaticsKey = this.formatKey('country', 'global');
      const countryOnlineUsersKey = this.formatKey('country', countryCode, 'users', 'online');
      const globalOnlineUsersKey = this.formatKey('country', 'global', 'users', 'online');
      const globalOfflineUsersKey = this.formatKey('country', 'global', 'users', 'offline');
      const currentTime = Date.now().toString();

      this.client.zadd(countryOnlineUsersKey, currentTime, userId).then(async _ => {
        const countryOnlineUsersCount = await this.client.zcard(countryOnlineUsersKey);
        await this.client.hset(countryStaticsKey, 'totalOnline', countryOnlineUsersCount);
      });

      this.client.zadd(globalOnlineUsersKey, currentTime, userId).then(async _ => {
        const globalOnlineUsersCount = await this.client.zcard(globalOnlineUsersKey);
        await this.client.hset(globalStaticsKey, 'totalOnline', globalOnlineUsersCount);
      });
      await this.saveUserOnlineLogs(userId);
      await this.client.zrem(globalOfflineUsersKey, userId);
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  private async addUserOffline(userId: string, countryCode: string) {
    try {
      const countryStaticsKey = this.formatKey('country', countryCode);
      const globalStaticsKey = this.formatKey('country', 'global');
      const countryOnlineUsersKey = this.formatKey('country', countryCode, 'users', 'online');
      const globalOnlineUsersKey = this.formatKey('country', 'global', 'users', 'online');
      const globalOfflineUsersKey = this.formatKey('country', 'global', 'users', 'offline');
      const currentTime = Date.now().toString();

      this.client.zrem(countryOnlineUsersKey, userId).then(async _ => {
        const countryOnlineUsersCount = await this.client.zcard(countryOnlineUsersKey);
        await this.client.hset(countryStaticsKey, 'totalOnline', countryOnlineUsersCount);
      });

      this.client.zrem(globalOnlineUsersKey, userId).then(async _ => {
        const globalOnlineUsersCount = await this.client.zcard(globalOnlineUsersKey);
        await this.client.hset(globalStaticsKey, 'totalOnline', globalOnlineUsersCount);
      });
      await this.saveUserOfflineLogs(userId);
      await this.client.zadd(globalOfflineUsersKey, currentTime, userId);
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  private async addUserToCountry(userId: string, countryCode: string) {
    try {
      const countryStaticsKey = this.formatKey('country', countryCode);
      const globalStaticsKey = this.formatKey('country', 'global');
      const globalUsersKey = this.formatKey('country', 'global', 'users', 'all');
      const countryUsersKey = this.formatKey('country', countryCode, 'users', 'all');
      const currentTime = Date.now().toString();
      this.client.zadd(countryUsersKey, currentTime, userId).then(async _ => {
        const countryUsersCount = await this.client.zcard(countryUsersKey);
        await this.client.hset(countryStaticsKey, 'totalUsers', countryUsersCount);
      });
      this.client.zadd(globalUsersKey, currentTime, userId).then(async _ => {
        const globalUsersCount = await this.client.zcard(globalUsersKey);
        await this.client.hset(globalStaticsKey, 'totalUsers', globalUsersCount);
      });
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  private async incrHomeGlobalStaticsKey(field: 'likes' | 'posts' | 'users' | 'dislikes') {
    try {
      const currentMonth = new Date().getUTCMonth();
      const homeGlobalStaticsKey = this.formatKey('home', 'global', currentMonth.toString());
      await this.client.hsetnx(homeGlobalStaticsKey, 'currentMonth', currentMonth);
      await this.client.hincrby(homeGlobalStaticsKey, field, 1);
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  private async saveUserOnlineLogs(userId: string) {
    try {
      const currentYear = new Date().getUTCFullYear();
      const currentMonth = new Date().getUTCMonth();
      await this.userLogsModel.findOneAndUpdate(
        { userId, currentMonth, currentYear },
        { lastSeen: Date.now() },
        { upsert: true },
      );
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  private async saveUserOfflineLogs(userId: string) {
    try {
      const currentYear = new Date().getUTCFullYear();
      const currentMonth = new Date().getUTCMonth();
      const doc = await this.userLogsModel.findOne({ userId, currentMonth, currentYear });
      if (!isNil(doc)) {
        const lastSeen = doc.lastSeen;
        const now = Date.now();
        const diff = this.calculateTimeDiffInHours(lastSeen, now);
        await doc.update({ $inc: { totalOnlineHours: Math.abs(diff) } }).exec();
      }
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  private async updateUserStatics(
    userId: string,
    field: 'totalPosts' | 'totalLikes' | 'totalDislikes',
  ) {
    const update = {};
    update[field] = 1;
    try {
      const currentYear = new Date().getUTCFullYear();
      const currentMonth = new Date().getUTCMonth();
      await this.userLogsModel.findOneAndUpdate(
        { userId, currentMonth, currentYear },
        { $inc: { ...update } },
        { upsert: true },
      );
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  private calculateTimeDiffInHours(from: number, to: number) {
    // convert it to hours
    return (to - from) * 2.77778e-7;
  }

  private async clearCountryPostsRecord() {
    try {
      const globalActiveUsersKey = this.formatKey('country', 'global', 'users', 'active');
      const globalActiveUsersCount = await this.client.zcard(globalActiveUsersKey);
      if (globalActiveUsersCount === 0 || isNil(globalActiveUsersCount)) {
        return 'It is already Clear';
      }
      const pipeline = this.client.pipeline();
      const globalStaticsKey = this.formatKey('country', 'global');
      pipeline.hset(globalStaticsKey, 'posts5', 0);
      pipeline.del(globalActiveUsersKey);
      for (const countryCode of this.countryStatics.keys()) {
        const countryStaticsKey = this.formatKey('country', countryCode);
        const countryActiveUsersKey = this.formatKey('country', countryCode, 'users', 'active');
        pipeline.hset(countryStaticsKey, 'posts5', 0);
        pipeline.del(countryActiveUsersKey);
      }
      await pipeline.exec();
      return 'Cleared all Countries Active Users Counters';
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  private async loadCountries() {
    try {
      const data: Array<Partial<CountryStatics>> = countriesCodes;
      const pipeline = this.client.pipeline();
      for (const country of data) {
        const countryStaticsKey = this.formatKey('country', country.code);
        country.totalUsers = 0;
        country.totalOnline = 0;
        country.posts5 = 0;
        this.countryStatics.set(country.code!, country);
        for (const key in country) {
          if (country.hasOwnProperty(key)) {
            const element = country[key];
            pipeline.hsetnx(countryStaticsKey, key, element);
          }
        }
      }
      await pipeline.exec();
      return Promise.resolve(true);
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  private async extractUserMetadata(users: User[]) {
    const result: UserMetadata[] = [];
    for (const user of users) {
      if (isNil(user)) {
        continue;
      }
      const {
        mobileNumber,
        profile: { firstName, lastName, profileImage, gender, country, countryCode, location },
        id,
      } = user;
      const metadata = {
        id,
        mobileNumber,
        firstName,
        lastName,
        country,
        profileImage,
        gender,
        countryCode,
        location,
        online: await this.isUserOnline(id),
      };
      result.push(metadata);
    }
    return result;
  }

  private async subscribeToEvents() {
    this.emitter.on('analytics:getDailyUserStatusesCount', async userId => {
      return this.getDailyUserStatusesCount(userId);
    });

    this.emitter.on('analytics:setDailyUserStatusesCount', async (userId, count) => {
      await this.setDailyUserStatusesCount(userId, count);
    });

    this.emitter.on('analytics:addDailyActiveUser', async (userId, countryCode) => {
      await this.addDailyActiveUser(userId, countryCode);
    });

    this.emitter.on('analytics:addUserOnline', async (userId, countryCode) => {
      await this.addUserOnline(userId, countryCode);
    });

    this.emitter.on('analytics:addUserOffline', async (userId, countryCode) => {
      await this.addUserOffline(userId, countryCode);
    });

    this.emitter.on('analytics:addUserToCountry', async (userId, countryCode) => {
      await this.addUserToCountry(userId, countryCode);
    });

    this.emitter.on('analytics:updateUserStatics', async (userId, field) => {
      await this.updateUserStatics(userId, field);
    });

    this.emitter.on('analytics:incrHomeGlobalStaticsKey', async field => {
      await this.incrHomeGlobalStaticsKey(field);
    });
  }
}
