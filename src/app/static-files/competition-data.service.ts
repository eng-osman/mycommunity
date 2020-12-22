import { ApplicationSettingsService } from '@app/settings/app-settings.service';
import { Injectable } from '@nestjs/common';
import { InjectEventEmitter } from '@shared/decorators';
import { EventEmitter2 } from 'eventemitter2';
import { isNil } from 'ramda';
import { Status } from '@app/user-status/entities';


@Injectable()
export class CompetitionDataService {
  constructor(
    private readonly applicationSettings: ApplicationSettingsService,
    @InjectEventEmitter() private readonly emitter: EventEmitter2,
  ) {}
  public async getTOS() {
    const applicationSettings = await this.applicationSettings.getCurrentApplicationSettings();
    if (!isNil(applicationSettings)) {
      const html = applicationSettings.competitionTOS;
      return { html };
    } else {
      return { html: '' };
    }
  }

  public async getPrizes() {
    const applicationSettings = await this.applicationSettings.getCurrentApplicationSettings();
    if (!isNil(applicationSettings)) {
      const html = applicationSettings.competitionPrizes;
      return { html };
    } else {
      return { html: '' };
    }
  }

  public async getWinners(user: any, page = 1, limit = 10) {
    const [winners]: any[] = await this.emitter.emitAsync(
      'status:getTopGlobalMediaWinners',
      user,
      page,
      limit,
    );
    return winners;
  }

  public async getTodaysTopStatuses(user: any, page = 1, limit = 10, sorter : string) {
    const [top] = await this.emitter.emitAsync(
      'status:getTodaysTopGlobalMediaWithLimit',
      user,
      page,
      limit,
    );

    const sortedStatuses = top.sort(this.sorter(sorter));

    return sortedStatuses
  }

  public async setTOS(tos: string) {
    const applicationSettings = await this.applicationSettings.getCurrentApplicationSettings();
    if (!isNil(applicationSettings)) {
      applicationSettings.competitionTOS = tos;
      await this.applicationSettings.setCurrentApplicationSettings(applicationSettings);
      return { message: 'All Set.' };
    } else {
      return { message: 'There is Nathing to set in database!' };
    }
  }

  public async setPrizes(prizes: string) {
    const applicationSettings = await this.applicationSettings.getCurrentApplicationSettings();
    if (!isNil(applicationSettings)) {
      applicationSettings.competitionPrizes = prizes;
      await this.applicationSettings.setCurrentApplicationSettings(applicationSettings);
      return { message: 'All Set.' };
    } else {
      return { message: 'There is Nathing to set in database!' };
    }
  }

  public async setTodaysWinner(statusId: string) {
    this.emitter.emit('status:sendTopMediaNotification', statusId);
    return { message: `Set the Top Status for today is ${statusId}` };
  }

  private sorter(sortBy: string) {
    switch (sortBy) {
      case 'likes':
        return (statusA: Status, statusB: Status) =>
          statusB.counters.likesCount - statusA.counters.likesCount;
      case 'comments':
        return (statusA: Status, statusB: Status) =>
          statusB.counters.commentCount - statusA.counters.commentCount;
      case 'views':
        return (statusA: Status, statusB: Status) =>
          statusB.counters.viewsCount - statusA.counters.viewsCount;
      case 'date':
        return (statusA: Status, statusB: Status) =>
          statusB.createdAt.getTime() - statusA.createdAt.getTime();
      default:
        return (_statusA: Status, _statusB: Status) => 0;
    }
  }
}
