import { UserService } from '@app/user/user.service';
import { forwardRef, Inject } from '@nestjs/common';
import { CacheMaker } from '@shared/classes';
import { InjectRedisClient } from '@shared/decorators';
import { isEmpty } from '@shared/utils';
import { Redis } from 'ioredis';
import { isNil } from 'ramda';
import { User, UserContacts } from './entities';
export class UserContactsCacheService extends CacheMaker<User> {
  private static readonly namespace: string = 'user';
  constructor(
    @InjectRedisClient() protected readonly client: Redis,
    @Inject(forwardRef(() => UserService)) private readonly userService: UserService,
  ) {
    super(client, UserContactsCacheService.namespace);
  }

  public async serializeAndCache(
    user: User,
    contacts: UserContacts[],
    expiration?: string,
  ): Promise<void> {
    expiration = expiration ? expiration : '8 weeks';
    const key = this.formatKey(user.id, 'contacts');
    const friendsKey = this.formatKey(user.id, 'friends');
    const friendsChannelsKey = this.formatKey(user.id, 'friendsChannels');
    const pipeline = this.client.pipeline();
    for (const { isFavourite, mobileNumber, contactName, isUser, userId } of contacts) {
      const data = { isFavourite, contactName, isUser, userId };
      if (isUser) {
        const userKey = this.formatKey(userId, 'followers');
        pipeline.sadd(userKey, user.id);
        const isContact = await this.isContactExist(userId, user.mobileNumber);
        if (isContact) {
          pipeline.lpush(friendsKey, userId);
        }
        try {
          if (userId!.toString() !== user.id.toString()) {
            const channel = await this.userService.getUserChannel(userId!, false);
            pipeline.zadd(friendsChannelsKey, '0', channel.id);
          }
        } catch {
          continue;
        }
      }
      pipeline.hset(key, mobileNumber, JSON.stringify(data));
    }
    await pipeline.exec();
  }
  public async addOrUpadateContact(
    userKey,
    { contactName, isFavourite, mobileNumber, isUser, userId }: UserContacts,
  ) {
    const key = this.formatKey(userKey, 'contacts');
    const data = { isFavourite, contactName, isUser, userId };
    await this.client.hset(key, mobileNumber, JSON.stringify(data));
  }

  public async getUserFriends(userId: any, favourited = false): Promise<UserContacts[]> {
    const contacts = await this.getUserContacts(userId);
    let friends: any[] = [];
    if (favourited) {
      friends = contacts.filter(contact => contact.isUser && contact.isFavourite);
    } else {
      friends = contacts.filter(contact => contact.isUser);
    }
    return friends;
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

  public async getUserFollowers(userId: any): Promise<string[]> {
    const userKey = this.formatKey(userId, 'followers');
    const followers = await this.client.smembers(userKey);
    // await this.client.expire(userKey, time('4 weeks'));
    if (!followers) {
      return [];
    } else {
      return followers;
    }
  }

  public async cacheUserFollowers(userId: any, followers: any[]) {
    const userKey = this.formatKey(userId, 'followers');
    const followersIds = followers.map(f => f.user.id);
    if (!isEmpty(followersIds)) {
      followersIds.push(userId);
      await this.client.sadd(userKey, ...followersIds);
    }
  }

  public async addUserFollower(userId: string, followerId: string) {
    const userKey = this.formatKey(userId, 'followers');
    await this.client.sadd(userKey, followerId);
  }

  public async removeFromUserFollowers(userId: any, followerId) {
    const userKey = this.formatKey(userId, 'followers');
    await this.client.srem(userKey, followerId);
  }
  public async getUserContacts(userId: any): Promise<any[]> {
    const contacts: any[] = [];
    const key = this.formatKey(userId, 'contacts');
    const cachedContacts = await this.client.hgetall(key);
    for (const [mobileNumber, data] of Object.entries(cachedContacts)) {
      const metadata = JSON.parse(data as any);
      if (isNil(metadata.isFavourite)) {
        metadata.isFavourite = false;
      } // BUG
      try {
        const u = await this.userService.findUserByMobileNumber(mobileNumber, true);
        const contactUser = { user: u, mobileNumber, isUser: true, userId: u!.id, ...metadata };
        if (mobileNumber !== 'null') {
          contacts.push(contactUser);
        }
      } catch {
        const contactUser = {
          ...metadata,
          user: undefined,
          mobileNumber,
          isUser: false,
          userId: null,
        };
        if (mobileNumber !== 'null') {
          contacts.push(contactUser);
        }
      }
    }
    return contacts;
  }
  public async getUserContactsCount(userId: any): Promise<number> {
    const key = this.formatKey(userId, 'contacts');
    const cachedContactsCount = await this.client.hlen(key);
    return cachedContactsCount;
  }
  public async isContactExist(userId, mobileNumber: any): Promise<boolean> {
    const key = this.formatKey(userId, 'contacts');
    return Boolean(await this.client.hexists(key, mobileNumber));
  }

  public async getMyContactByMobileNumber(userId, mobileNumber: string) {
    const key = this.formatKey(userId, 'contacts');
    const cachedContact = await this.client.hget(key, mobileNumber);
    if (!isNil(cachedContact)) {
      const metadata = JSON.parse(cachedContact);
      if (isNil(metadata.isFavourite)) {
        metadata.isFavourite = false;
      }
      return { ...metadata, mobileNumber };
    }
  }
  public async removeFromUserContacts(userId, contactMobileNumber): Promise<void> {
    const key = this.formatKey(userId, 'contacts');
    const friendsKey = this.formatKey(userId, 'friends');
    const contact = await this.getMyContactByMobileNumber(userId, contactMobileNumber);
    await this.client.hdel(key, contactMobileNumber);
    await this.client.lrem(friendsKey, 1, contact.userId);
  }
}
