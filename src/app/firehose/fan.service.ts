import { Injectable } from '@nestjs/common';
import { CacheMaker } from '@shared/classes';
import { InjectEventEmitter, InjectRedisClient } from '@shared/decorators';
import { toTimestamp, zipFlatten } from '@shared/utils';
import { EventEmitter2 } from 'eventemitter2';
import { Redis } from 'ioredis';
import { is, isEmpty } from 'ramda';

@Injectable()
export class FanService extends CacheMaker {
  protected static readonly namespace = 'timeline';
  constructor(
    @InjectEventEmitter() private readonly eventEmitter: EventEmitter2,
    @InjectRedisClient() protected readonly client: Redis,
  ) {
    super(client, FanService.namespace);
  }

  public async fanout(status, followersChunk: string[]) {
    const pipeline = this.client.pipeline();
    const formatedStatus = this.formatTimelineIds([status]);
    for (const userId of followersChunk) {
      const key = this.formatKey(userId, 'home');
      if (!isEmpty(formatedStatus)) {
        pipeline.zadd(key, ...formatedStatus);
        pipeline.zremrangebyrank(key, 0, -1000);
        this.eventEmitter.emit('timeline:startFan', userId, status, 'fanout');
      }
    }
    await pipeline.exec();
  }

  public async fanin(status, followersChunk: string[]) {
    const pipeline = this.client.pipeline();
    const formatedStatus = this.formatTimelineIds([status]);
    for (const userId of followersChunk) {
      const key = this.formatKey(userId, 'home');
      if (!isEmpty(formatedStatus)) {
        pipeline.zrem(key, ...formatedStatus);
        pipeline.zremrangebyrank(key, 0, -1000);
        this.eventEmitter.emit('timeline:startFan', userId, status, 'fanin');
      }
    }
    await pipeline.exec();
  }

  private formatTimelineIds(timeline: Array<{ createdAt; id }>) {
    const timestamps = timeline.map(s => {
      if (is(Number, s.createdAt)) {
        return s.createdAt;
      } else {
        return toTimestamp(s.createdAt);
      }
    });
    const ids = timeline.map(s => s.id);
    return zipFlatten(timestamps, ids);
  }
}
