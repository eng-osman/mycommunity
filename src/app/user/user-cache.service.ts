import { forwardRef, Inject, NotFoundException } from '@nestjs/common';
import { CacheMaker } from '@shared/classes';
import { InjectRedisClient } from '@shared/decorators';
import { ErrorCode } from '@shared/enums';
import { CacheMetadata, UserMetadata } from '@shared/interfaces';
import { time } from '@shared/utils';
import { Redis } from 'ioredis';
import { isEmpty, isNil } from 'ramda';
import { User } from './entities';
import { UserContactsService } from './user-contacts.service';
export class UserCacheService extends CacheMaker<any> implements CacheMetadata<any> {
  private static readonly namespace: string = 'user';
  constructor(
    @InjectRedisClient() protected readonly client: Redis,
    @Inject(forwardRef(() => UserContactsService))
    private readonly userContactsService: UserContactsService,
  ) {
    super(client, UserCacheService.namespace);
  }
  public async serializeAndCache(object: User, expiration?: string): Promise<boolean> {
    expiration = expiration ? expiration : '4 weeks';
    const key = this.formatKey(object.id);
    const mobileKey = this.formatKey(object.mobileNumber);
    if (!isNil(object.channel)) {
      const ownedChannelKey = this.formatKey(object.id, 'ownedCahnnel');
      await this.client.setex(ownedChannelKey, time(expiration), object.channel.id);
    }
    await this.client.setex(mobileKey, time(expiration), object.id);
    const buffer = await this.encode(object);
    await this.setUserLanguage(object.id, object.profile.language);
    return this.client.setex(key, time(expiration), buffer);
  }

  public async deserializeCached(userId: any): Promise<User | null> {
    const key = this.formatKey(userId);
    const userBuffer = await this.client.getBuffer(key);
    if (userBuffer) {
      return this.decode(userBuffer);
    } else {
      return null;
    }
  }

  public async updateUser(object: User) {
    const key = this.formatKey(object.id);
    const buffer = await this.encode(object);
    return this.client.set(key, buffer);
  }

  public async getUserLanguage(userId: string) {
    try {
      const key = this.formatKey(userId, 'lang');
      const val = await this.client.get(key);
      if (!isNil(val)) {
        return val;
      } else {
        return 'en'; // the default
      }
    } catch {
      return 'en';
    }
  }

  public async setUserLanguage(userId: string, lang: string) {
    const key = this.formatKey(userId, 'lang');
    await this.client.set(key, lang);
  }

  public async findUsersByMobileNumber(mobileNumbers: any[]) {
    const users: any[] = [];
    const pipeline = this.client.pipeline();
    for (const mobileNumber of mobileNumbers) {
      const key = this.formatKey(mobileNumber);
      const userKey = await this.client.get(key);
      if (userKey) {
        const formatedUserKey = this.formatKey(userKey);
        pipeline.getBuffer(formatedUserKey);
      }
    }
    const result = await pipeline.exec();
    // tslint:disable-next-line:variable-name
    for (const [err, user] of result) {
      if (err) {
        // TODO: Handle this error
      }
      if (user) {
        users.push(await this.decode(user));
      }
    }
    return users;
  }
  public async findUsers(userIds: any[]): Promise<User[]> {
    const users: any[] = [];
    if (isNil(userIds) || isEmpty(userIds)) {
      return users;
    }
    const pipeline = this.client.pipeline();
    for (const userId of userIds) {
      const key = this.formatKey(userId);
      pipeline.getBuffer(key);
    }
    const result = await pipeline.exec();
    // tslint:disable-next-line:variable-name
    for (const [err, user] of result) {
      if (err) {
        // TODO: Handle this error
      }
      if (user) {
        try {
          const decoded = await this.decode(user);
          users.push(decoded);
        } catch (error) {
          continue;
        }
      }
    }
    return users;
  }

  public async setDeviceToken(userId, token: string) {
    const userKey = this.formatKey(userId, 'device', 'token');
    await this.client.set(userKey, token);
  }

  public async setUserActiveState(userId, state: boolean) {
    const userKey = this.formatKey(userId, 'state');
    await this.client.set(userKey, state);
  }

  public async getDeviceToken(userIds: any[]): Promise<string[]> {
    const tokens: string[] = [];
    const pipeline = this.client.pipeline();
    for (const userId of userIds) {
      const key = this.formatKey(userId, 'device', 'token');
      pipeline.get(key);
      pipeline.expire(key, time('4 weeks'));
    }
    const result = await pipeline.exec();
    // tslint:disable-next-line:variable-name
    for (const [err, token] of result) {
      if (err) {
        // TODO: Handle this error
      }
      if (token && typeof token === 'string') {
        tokens.push(token);
      }
    }
    return tokens;
  }

  public async getUserActiveState(userId) {
    const userKey = this.formatKey(userId, 'state');
    return this.client.get(userKey);
  }

  public async addPublicUser(userId: string) {
    const publicUsersKey = this.formatKey('public');
    await this.client.sadd(publicUsersKey, userId);
  }

  public async removePublicUser(userId: string) {
    const publicUsersKey = this.formatKey('public');
    await this.client.srem(publicUsersKey, userId);
  }

  public async getRandomPublicUsers(count: number): Promise<string[]> {
    const publicUsersKey = this.formatKey('public');
    const random = await this.client.srandmember(publicUsersKey, count);
    return random;
  }

  // Will make your mind blown :'D
  public async findUser(
    key: any,
    isMobile = false,
    metadata = false,
    relevantTo?,
  ): Promise<User | null> {
    const gKey = this.formatKey(key);
    if (isMobile) {
      const userKey = await this.client.get(gKey);
      if (userKey) {
        const user = await this.client.getBuffer(this.formatKey(userKey));
        if (!isNil(user)) {
          return metadata ? this.extractUserMetadata(await this.decode(user)) : this.decode(user);
        }
        return null;
      } else {
        return null;
      }
    } else {
      const user = await this.client.getBuffer(gKey);
      if (!isNil(user)) {
        try {
          let decoded: User;
          try {
            decoded = await this.decode(user);
          } catch {
            // this must be a mobile number
            const x = await this.findUser(key, true, metadata, relevantTo);
            if (x === null) {
              return null;
            } else {
              decoded = x;
            }
          }
          return metadata
            ? this.extractUserMetadataWithRelevant(decoded, relevantTo)
            : this.decode(user);
        } catch {
          return null;
        }
      } else {
        return null;
      }
    }
  }

  public async getOwnedChannelId(userId: string) {
    const ownedChannelKey = this.formatKey(userId, 'ownedCahnnel');
    return this.client.get(ownedChannelKey);
  }

  public async extractUserMetadataWithRelevant(user: User, relevantTo?): Promise<UserMetadata> {
    if (isNil(user)) {
      throw new NotFoundException('User Metadata Notfound', ErrorCode.USER_NOT_FOUND.toString());
    }

    if (user && isNil(user.profile)) {
      throw new NotFoundException(
        'User Metadata Notfound on UserProfile',
        ErrorCode.USER_NOT_FOUND.toString(),
      );
    } // maybe it is the metadata or a bug !

    if (!user.profile.isActive) {
      throw new NotFoundException(
        'User Deactivated By System',
        ErrorCode.USER_DEACTIVED.toString(),
      );
    }
    const userMetadata = await this.extractUserMetadata(user);
    if (
      !isNil(relevantTo) &&
      !isNil(relevantTo.id) &&
      user.id.toString() !== relevantTo.id.toString()
    ) {
      try {
        const { contactFirstName, contactLastName } = await this.getRelevantContactName(
          relevantTo,
          userMetadata.mobileNumber,
        );
        userMetadata.firstName = contactFirstName;
        userMetadata.lastName = contactLastName;
      } catch {
        // don't update anything.
      }
    }
    return userMetadata;
  }

  public async getRelevantContactName(user, mobileNumber: string) {
    try {
      const contact = await this.userContactsService.getMyContactByMobileNumber(user, mobileNumber);
      const contactNameParts = contact.contactName.split(' ');
      const contactFirstName = contactNameParts[0];
      const contactLastName = contactNameParts.slice(1).join(' ');
      return { contactFirstName, contactLastName };
    } catch (error) {
      // the error here maybe the contact not found, but i'll log it anyway.
      // this.logger.error(error.message, error); // never mind
      throw error;
    }
  }

  public async extractUserMetadata(user: User): Promise<UserMetadata> {
    const {
      mobileNumber,
      profile: {
        firstName,
        lastName,
        profileImage,
        gender,
        country,
        countryCode,
        location,
        description,
        isActive,
      },
      id,
    } = user;
    return {
      id,
      mobileNumber,
      firstName,
      lastName,
      country,
      profileImage,
      gender,
      countryCode,
      isActive,
      location,
      description,
    } as UserMetadata;
  }

  public async addFollowingChannel(userId: string, channelId: string, score = '0') {
    return this.addChannelTo('followingChannels', userId, channelId, score);
  }

  public async removeFollowingChannel(userId: string, channelId: string) {
    return this.removeChannelFrom('followingChannels', userId, channelId);
  }

  public async getFollowingChannelIds(userId: string, page = 1, limit = 10) {
    return this.getChannelsIdsFrom('followingChannels', userId, page, limit);
  }

  public async addFriendsChannel(userId: string, channelId: string, score = '0') {
    return this.addChannelTo('friendsChannels', userId, channelId, score);
  }
  public async removeFriendsChannel(userId: string, channelId: string) {
    return this.removeChannelFrom('friendsChannels', userId, channelId);
  }

  public async getFriendsChannelIds(userId: string, page = 1, limit = 10) {
    return this.getChannelsIdsFrom('friendsChannels', userId, page, limit);
  }

  public async getUserFriendsIds(userId: string, page = 1, limit = 30) {
    const friendsKey = this.formatKey(userId, 'friends');
    const start = (page - 1) * limit;
    const stop = start + limit;
    const friendsIds = await this.client.lrange(friendsKey, start, stop);
    if (!friendsIds) {
      return [];
    } else {
      return friendsIds;
    }
  }

  private async addChannelTo(subType: string, userId: string, channelId: string, score = '0') {
    const key = this.formatKey(userId, subType);
    await this.client.zadd(key, score, channelId);
  }

  private async removeChannelFrom(subType: string, userId: string, channelId: string) {
    const key = this.formatKey(userId, subType);
    await this.client.zrem(key, channelId);
  }

  private async getChannelsIdsFrom(
    subType: string,
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<string[]> {
    const key = this.formatKey(userId, subType);
    const start = (page - 1) * limit;
    const channelIds = await this.client.zrevrangebyscore(
      key,
      '+inf',
      `${0}`,
      'LIMIT',
      start.toString(),
      limit.toString(),
    );
    if (!channelIds) {
      return [];
    } else {
      return channelIds;
    }
  }
}
