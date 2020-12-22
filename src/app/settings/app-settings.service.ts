import { InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNil } from 'ramda';
import { Repository } from 'typeorm';
import { ApplicationSettings } from './entities';

export class ApplicationSettingsService {
  constructor(
    @InjectRepository(ApplicationSettings)
    private readonly appSettings: Repository<ApplicationSettings>,
  ) {}

  public async getCurrentApplicationSettings() {
    return this.appSettings
      .createQueryBuilder()
      .select()
      .limit(1)
      .orderBy('createdAt', 'DESC')
      .getOne();
  }

  public async setCurrentApplicationSettings(appSettings: ApplicationSettings) {
    return this.appSettings.save(appSettings);
  }

  public async setCompetitionVoteSettings(startDay: number, endDay: number) {
    const currentSettings = await this.getCurrentApplicationSettings();
    if (!isNil(currentSettings)) {
      return this.appSettings.update(currentSettings.id, {
        competitionVoteStartDay: startDay as any,
        competitionVoteEndDay: endDay as any,
      });
    } else {
      throw new InternalServerErrorException('No Default Application Settings found');
    }
  }
}
