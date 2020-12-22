import { UserInformation } from '@app/chat/interfaces/user-info.interface';
import { UserContacts } from '@app/user/entities';
import { UserCacheService } from '@app/user/user-cache.service';
import { UserContactsCacheService } from '@app/user/user-contacts-cache.service';
import { CacheMaker } from '@shared/classes';
import { InjectRedisClient } from '@shared/decorators';
import { getIdFromNamespace, time } from '@shared/utils';
import { Redis } from 'ioredis';
import { isEmpty, isNil, splitEvery } from 'ramda';
export class ChatCacheService extends CacheMaker {
  private static readonly namespace: string = 'chat';
  constructor(
    @InjectRedisClient() protected readonly client: Redis,
    private readonly userCacheService: UserCacheService,
    private readonly userContactsCacheService: UserContactsCacheService,
  ) {
    super(client, ChatCacheService.namespace);
  }
  public async cacheUserInformation(
    user: UserInformation,
    clientId,
    expiration: string,
  ): Promise<any> {
    expiration = expiration ? expiration : '4h';
    const key = this.formatKey(user.id);
    const clientKey = this.formatKey('client', clientId);
    return Promise.all([
      this.client.setex(clientKey, time(expiration), user.id),
      this.client.expire(key, time(expiration)),
      this.client.hmset(key, user),
    ]);
  }
  public async getUserInformationById(id: any): Promise<UserInformation | null> {
    const key = this.formatKey(id);
    const userInformation: UserInformation = await this.client.hgetall(key);
    if (isEmpty(userInformation)) {
      return null;
    }
    await this.client.expire(key, time('4h'));
    return userInformation;
  }
  public async getUserInformationByClientId(id: any): Promise<UserInformation | null> {
    const clientID = getIdFromNamespace(id);
    const clientKey = this.formatKey('client', clientID);
    const userId = await this.client.get(clientKey);
    if (userId) {
      return this.getUserInformationById(userId);
    } else {
      return null;
    }
  }
  public async checkIfUserExist(clientId: any): Promise<any> {
    const clientKey = this.formatKey('client', clientId);
    await this.client.expire(clientKey, time('4h'));
    return this.client.exists(clientKey);
  }

  public async kickUser(id: any) {
    const clientKey = this.formatKey('client', id);
    const userId = await this.client.get(clientKey);
    if (userId) {
      const userKey = await this.formatKey(userId);
      await this.client.del(userKey, clientKey);
    }
  }

  public async getUserMetadata(id: any, isClientId = false, reliventTo?) {
    if (isClientId) {
      const clientID = getIdFromNamespace(id);
      const userId = await this.client.get(this.formatKey('client', clientID));
      return this.userCacheService.findUser(userId, false, true);
    }
    return this.userCacheService.findUser(id, false, true, reliventTo);
  }

  public async getUserMetadataByMobileNumber(mobileNumber: string, reliventTo?) {
    return this.userCacheService.findUser(mobileNumber, true, true, reliventTo);
  }

  // TODO: fix this
  public async getUserOnlineFriends(id: any, isClientId = false) {
    let userId;
    const usersOnline: UserContacts[] = [];
    if (isClientId) {
      const clientID = getIdFromNamespace(id);
      userId = await this.client.get(this.formatKey('client', clientID));
    } else {
      userId = id;
    }
    const userFriends = await this.userContactsCacheService.getUserFriends(userId);
    for (const friend of userFriends) {
      if (isNil(friend.userId)) {
        continue;
      }
      const userKey = await this.formatKey(friend.userId);
      const isOnline = await this.client.exists(userKey);
      if (isOnline) {
        usersOnline.push(friend);
      }
    }
    return usersOnline;
  }

  public async getMyFollowers(id: any, isClientId = false) {
    let userId;
    if (isClientId) {
      const clientID = getIdFromNamespace(id);
      userId = await this.client.get(this.formatKey('client', clientID));
    } else {
      userId = id;
    }
    const userFollowers = await this.userContactsCacheService.getUserFollowers(userId);
    const chunks = splitEvery<string>(500, userFollowers);
    return this.normalizeUsers(chunks);
  }

  public async normalizeUsers(chunks: string[][]): Promise<UserInformation[]> {
    const usersOnline: UserInformation[] = [];
    for (const chunk of chunks) {
      for (const followerId of chunk) {
        const key = this.formatKey(followerId);
        const isOnline = await this.client.exists(key);
        if (isOnline) {
          const follower = await this.getUserInformationById(followerId);
          if (!isNil(follower)) {
            usersOnline.push(follower);
          }
        }
      }
    }
    return usersOnline;
  }
}
