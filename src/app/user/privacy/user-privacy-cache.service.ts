import { UsersPrivacy } from '@app/user/entities';
import { UserPrivacy } from '@app/user/privacy/user-privacy.enum';
import { UserCacheService } from '@app/user/user-cache.service';
import { forwardRef, Inject } from '@nestjs/common';
import { CacheMaker } from '@shared/classes';
import { InjectRedisClient } from '@shared/decorators';
import { time } from '@shared/utils';
import { Redis } from 'ioredis';
export class UserPrivacyCacheService extends CacheMaker {
  private static readonly namespace: string = 'privacy';
  constructor(
    @InjectRedisClient() protected readonly client: Redis,
    @Inject(forwardRef(() => UserCacheService))
    private readonly userCacheService: UserCacheService,
  ) {
    super(client, UserPrivacyCacheService.namespace);
  }
  public async cacheBlackList(blackList: UsersPrivacy[]) {
    const pipeline = this.client.pipeline();
    for (const {
      me: { id: myId },
      other: { id: otherId },
      type,
    } of blackList) {
      const key = this.formatKey(myId);
      pipeline.hset(key, otherId, type);
    }
    await pipeline.exec();
  }
  public async updateUsersPrivacy({
    me: { id: myId },
    other: { id: otherId },
    type,
  }: UsersPrivacy) {
    const key = this.formatKey(myId);
    await this.client.expire(key, time('4 weeks'));
    return this.client.hset(key, otherId, type);
  }

  public async blockChannel(userId: string, channelId: string) {
    const key = this.formatKey(userId, 'blockedChannels');
    await this.client.sadd(key, channelId);
  }

  public async unblockChannel(userId: string, channelId: string) {
    const key = this.formatKey(userId, 'blockedChannels');
    await this.client.srem(key, channelId);
  }

  public async getBlockedChannels(userId: string): Promise<string[]> {
    const key = this.formatKey(userId, 'blockedChannels');
    return this.client.smembers(key);
  }

  public async isBlockedChannel(userId: string, channelId: string): Promise<boolean> {
    const key = this.formatKey(userId, 'blockedChannels');
    const result = await this.client.sismember(key, channelId);
    return Boolean(result);
  }
  public async getBlackList(id) {
    const list: any[] = [];
    const key = this.formatKey(id);
    const cached = await this.client.hgetall(key);
    for (const [userId, type] of Object.entries(cached)) {
      const user = await this.userCacheService.findUser(userId, false, true);
      const record = { other: user, type: UserPrivacy[type as string] };
      if (user) {
        list.push(record);
      }
    }
    return list;
  }

  public async checkPrivacy(userId, otherId) {
    const key = this.formatKey(userId);
    const privacy = await this.client.hget(key, otherId);
    return privacy ? privacy : null;
  }

  public async checkChatPrivacy(users: any[]): Promise<boolean | null> {
    const user1Key = this.formatKey(users[0]);
    const user2Key = this.formatKey(users[1]);
    const privacy1 = await this.client.hget(user1Key, users[1]);
    const privacy2 = await this.client.hget(user2Key, users[0]);
    if (privacy1 === null && privacy2 === null) {
      return null;
    }
    if (
      privacy1 &&
      privacy2 &&
      (UserPrivacy[privacy1] === UserPrivacy.ALL ||
        UserPrivacy[privacy2] === UserPrivacy.ALL ||
        UserPrivacy[privacy1] === UserPrivacy.CHAT_ONLY ||
        UserPrivacy[privacy2] === UserPrivacy.CHAT_ONLY)
    ) {
      return false;
    } else {
      return true;
    }
  }
}
