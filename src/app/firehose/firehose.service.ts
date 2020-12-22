import { Status } from '@app/user-status/entities';
import { UserContactsService } from '@app/user/user-contacts.service';
import { Injectable } from '@nestjs/common';
import { InjectEventEmitter } from '@shared/decorators';
import { EventEmitter2 } from 'eventemitter2';
import { splitEvery } from 'ramda';
import { FanService } from './fan.service';

@Injectable()
export class FireHoseService {
  private readonly fanoutEvent = 'firehose:fanout';

  private readonly faninEvent = 'firehose:fanin';
  constructor(
    @InjectEventEmitter() private readonly eventEmitter: EventEmitter2,
    private readonly userContactsService: UserContactsService,
    private readonly fanService: FanService,
  ) {
    this.initFirehose();
  }

  public async initFirehose() {
    this.eventEmitter.on(this.fanoutEvent, async (userId, status) => this.fanout(userId, status));

    this.eventEmitter.on(this.faninEvent, async (userId, status) => this.fanin(userId, status));
  }

  public async fanout(userId, status: Status) {
    if (status.isReply && status.type !== 'competition') {
      return; // we don't need replies in timeline
    }
    const userFollowers = await this.userContactsService.getUserFollowers(userId);
    const chunks = splitEvery<string>(500, userFollowers);
    chunks.forEach(async chunk => this.fanService.fanout(status, chunk));
  }
  public async fanin(userId, status: Status) {
    if (status.isReply) {
      return; // we don't need replies in timeline
    }
    const userFollowers = await this.userContactsService.getUserFollowers(userId);
    const chunks = splitEvery<string>(500, userFollowers);
    chunks.forEach(async chunk => this.fanService.fanin(status, chunk));
  }
}
