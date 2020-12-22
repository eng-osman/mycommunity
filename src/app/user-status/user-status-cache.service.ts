import { Status } from '@app/user-status/entities';
import { UserService } from '@app/user/user.service';
import { CacheMaker } from '@shared/classes';
import { InjectRedisClient } from '@shared/decorators';
import { CacheMetadata, UserMetadata } from '@shared/interfaces';
import { time } from '@shared/utils';
import { Redis } from 'ioredis';
import { isNil, zip } from 'ramda';
import { Counters } from './entities/counters.entity';
import { StatusAction } from './status-actions.enum';
export class UserStatusCacheService extends CacheMaker implements CacheMetadata<any> {
  private static readonly namespace: string = 'status';
  constructor(
    @InjectRedisClient() protected readonly client: Redis,
    private readonly userService: UserService,
  ) {
    super(client, UserStatusCacheService.namespace);
  }

  public async serializeAndCache(objects: Status[], expiration?: string): Promise<boolean> {
    expiration = expiration ? expiration : '4 weeks';
    const pipeline = this.client.pipeline();
    for (const { updatedAt, user, replies, originalStatus, parent, counters, ...data } of objects) {
      const key = this.formatKey(data.id);
      const countersKey = this.formatKey(data.id, 'counters');
      pipeline.hmset(countersKey, counters);
      pipeline.expire(countersKey, time(expiration));
      // tslint:disable-next-line:no-string-literal
      data['userId'] = user.id;
      if (!isNil(data.channel)) {
        // tslint:disable-next-line:no-string-literal
        data['channelId'] = data.channel.id;
        delete data.channel;
      }
      if (replies && replies.length > 0) {
        const repliesKey = this.formatKey(data.id, 'replies');
        const statusRepliesIds = replies.map(s => s.id);
        pipeline.lpush(repliesKey, ...statusRepliesIds);
      }
      if (data.isShare) {
        // tslint:disable-next-line:no-string-literal
        data['originalStatusId'] = originalStatus.id;
      }
      if (data.isReply) {
        // tslint:disable-next-line:no-string-literal
        data['parentStatusId'] = parent.id;
      }
      if (data.hasMedia && isNil(data.media)) {
        data.media = [];
      }
      const buffer = await this.encode(data);
      pipeline.setex(key, time(expiration), buffer);
    }
    return pipeline.exec();
  }

  public async getAll(statusIds: any[], user?): Promise<Status[]> {
    if (!statusIds) {
      return [];
    }
    const statuses: any[] = [];
    const pipeline = this.client.pipeline();
    for (const statusId of statusIds) {
      const key = this.formatKey(statusId);
      pipeline.getBuffer(key);
    }
    const result = await pipeline.exec();
    // tslint:disable-next-line:variable-name
    for (const [err, rowStatus] of result) {
      if (err) {
        // TODO: Handle this error
      }
      if (rowStatus) {
        const status = await this.decode(rowStatus);
        if (status.isReply) {
          [status.parent] = await this.buildStatusParent(status.parentStatusId, user);
        } else {
          status.parent = null;
        }
        // only get one level deep
        if (status.isShare) {
          [status.originalStatus] = await this.buildOriginalStatusOf(status.originalStatusId, user);
          if (!isNil(status.originalStatus) && status.originalStatus.isShare) {
            // get only one level deep
            status.isShare = false;
            status.originalStatus = null;
            status.originalStatusId = null;
          }
          if (status.hideOriginalStatusOwner) {
            status.originalStatus.user = undefined; // hide the user
            status.originalStatus.userId = undefined; // and it's id
          }
        } else {
          status.originalStatus = null;
        }

        if (!isNil(status.channelId)) {
          status.channel = await this.userService.getChannelById(status.channelId, false);
        }
        // status.replies = await this.buildStatusReplies(status.id);
        status.counters = await this.buildStatusCounters(status.id);
        try {
          status.user = (await this.userService.findUserById(
            status.userId,
            true,
            false,
            user,
          )) as UserMetadata;
        } catch {
          continue;
        }
        await this.extendExpiration(status.id, '4 weeks');
        if (status.mentions) {
          const mentions: Array<{ id: string; fullName: string }> = [];
          for (const m of status.mentions) {
            // thats a bug, if that status already been converted, so go on.
            if (m.id || m.fullName) {
              continue;
            }
            try {
              const currentUser = (await this.userService.findUserById(m, true)) as UserMetadata;
              const fullName = currentUser.firstName + ' ' + currentUser.lastName;
              mentions.push({ id: currentUser.id, fullName });
            } catch (error) {
              continue;
            }
          }
          status.mentions = mentions;
        }
        if (status.hasMedia && isNil(status.media)) {
          status.media = [];
        }
        if (user) {
          status.currentUserAction = {};
          const [myAction, viewAction] = await this.getUserAction(status.id, user);
          status.currentUserAction.isView = viewAction === 'VIEW';
          status.currentUserAction.isLike = myAction === 'LIKE';
          status.currentUserAction.isDislike = myAction === 'DISLIKE';
        }
        if (!isNil(status.stars)) {
          status.stars = parseFloat(status.stars.toFixed(2));
        }
        // TODO: Remove this once IOS/Android deprcate it
        status.hasChild = false; // for historical reasons xD
        statuses.push(status);
      }
    }
    return statuses;
  }

  public async deserializeCached(statusId: string): Promise<Status | null> {
    const key = this.formatKey(statusId);
    const statusBuffer = await this.client.getBuffer(key);
    if (statusBuffer) {
      const status = await this.decode(statusBuffer);
      status.id = statusId;
      return status;
    } else {
      return null;
    }
  }

  public async addReplyToStatus(statusId, replyId, expiration = '4 weeks') {
    const repliesKey = this.formatKey(statusId, 'replies');
    await Promise.all([
      this.client.lpush(repliesKey, replyId),
      this.extendExpiration(statusId + ':replies', expiration),
    ]);
  }

  public async removeReplyFromStatus(statusId, replyId, expiration = '4 weeks') {
    const repliesKey = this.formatKey(statusId, 'replies');
    await Promise.all([
      this.client.lrem(repliesKey, 0, replyId),
      this.extendExpiration(statusId + ':replies', expiration),
    ]);
  }

  public async updateCounters(statusId, counterType: keyof Counters, op: '+' | '-') {
    const countersKey = this.formatKey(statusId, 'counters');
    const isExist = await this.client.hexists(countersKey, counterType);
    if (isExist === 0) {
      return;
    }
    const oldValue = await this.client.hget(countersKey, counterType);
    if (op === '+') {
      await this.client.hincrby(countersKey, counterType, 1);
    } else {
      if (oldValue && parseInt(oldValue) === 0) {
        return;
      }
      await this.client.hincrby(countersKey, counterType, -1);
    }
  }

  public async buildStatusReplies(statusId, user, page = 1, limit = 30, expiration = '4 weeks') {
    const repliesKey = this.formatKey(statusId, 'replies');
    const startOffset = (page - 1) * limit;
    const stopOffset = startOffset + limit;
    const repliesIds = await this.client.lrange(repliesKey, startOffset, stopOffset);
    if (repliesIds) {
      await this.extendExpiration(statusId + ':replies', expiration);
      return this.getAll(repliesIds, user);
    }
    return [];
  }

  public async cacheUsersActions(statusId: string, usersActions: Array<[string, StatusAction]>) {
    const actionKey = this.formatKey(statusId, 'actions');
    const pipeline = this.client.pipeline();
    for (const [userId, actionType] of usersActions) {
      if (actionType === StatusAction.VIEW) {
        const viewsKey = this.formatKey(statusId, 'actions', 'views');
        pipeline.hmset(viewsKey, userId, actionType);
      } else {
        pipeline.hmset(actionKey, userId, actionType);
      }
    }
    await pipeline.exec();
  }

  public async removeUserAction(statusId: string, userId: string) {
    const actionKey = this.formatKey(statusId, 'actions');
    await this.client.hdel(actionKey, userId);
  }

  public async buildStatusCounters(statusId, expiration = '4 weeks') {
    const countersKey = this.formatKey(statusId, 'counters');
    const counters = await this.client.hgetall(countersKey);
    if (!counters || counters === {}) {
      return { likesCount: 0, dislikesCount: 0, commentCount: 0, viewsCount: 1 };
    }
    await this.extendExpiration(statusId + ':counters', expiration);
    return counters;
  }

  public async doubleActions(type: 'status' | 'channelMedia' = 'channelMedia') {
    const keys = await this.client.keys('status:*');
    const statuses: any[] = [];
    const pipeline = this.client.pipeline();
    for (const key of keys) {
      pipeline.getBuffer(key);
    }
    const result = await pipeline.exec();
    for (const [err, rowStatus] of result) {
      if (err) {
        continue;
      }
      const status = await this.decode(rowStatus);
      statuses.push(status);
    }
    const ids: string[] = [];
    for (const status of statuses) {
      if (status.hasMedia && status.type === type) {
        ids.push(status.id);
      }
    }
    const pipeline2 = this.client.pipeline();
    for (const id of ids) {
      pipeline2.hgetall(`status:${id}:counters`);
    }
    const result2: Array<[any, any]> = await pipeline2.exec();

    const pipeline3 = this.client.pipeline();

    for (const [[err, counters], id] of zip(result2, ids)) {
      if (err || !counters) {
        continue;
      }
      const upperLimit = 20;
      const lowerLimit = 2;
      const incrBy = Math.floor(Math.random() * upperLimit) + lowerLimit;
      pipeline3.hset(
        `status:${id}:counters`,
        'likesCount',
        +counters.likesCount + incrBy || incrBy,
      );
      pipeline3.hset(
        `status:${id}:counters`,
        'viewsCount',
        +counters.viewsCount + incrBy || incrBy,
      );
    }
    await pipeline3.exec();
  }

  public async getUserAction(statusId: string, user): Promise<Array<string | null>> {
    const actionKey = this.formatKey(statusId, 'actions');
    const actionType = await this.client.hget(actionKey, user.id);
    const viewsKey = this.formatKey(statusId, 'actions', 'views');
    const view = await this.client.hget(viewsKey, user.id);
    const result: Array<string | null> = [null, null];
    if (!isNil(actionType)) {
      result[0] = StatusAction[actionType];
    }
    if (!isNil(view)) {
      result[1] = StatusAction[view];
    }
    return result;
  }

  private async buildOriginalStatusOf(statusId, user, expiration = '4 weeks') {
    await this.extendExpiration(statusId, expiration);
    return this.getAll([statusId], user);
  }

  private async buildStatusParent(statusId, user, expiration = '4 weeks') {
    await this.extendExpiration(statusId, expiration);
    return this.getAll([statusId], user);
  }
}
