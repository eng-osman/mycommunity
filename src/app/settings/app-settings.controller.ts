import { Controller, Get, InternalServerErrorException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiUseTags } from '@nestjs/swagger';
import { AuthGuard } from '@shared/guards';
import { dayNumToStr } from '@shared/utils';
import { isNil } from 'ramda';
import { ApplicationSettingsService } from './app-settings.service';
@ApiUseTags('ApplicationSettings')
@Controller('settings')
export class ApplicationSettingsController {
  constructor(private readonly appSettingsService: ApplicationSettingsService) {}
  @ApiOperation({
    title: 'Get Competition Settings',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('competition')
  public async getCompetitionVoteSettings() {
    const currentSettings = await this.appSettingsService.getCurrentApplicationSettings();
    if (!isNil(currentSettings)) {
      const { competitionVoteEndDay, competitionVoteStartDay } = currentSettings;
      return {
        competitionVoteStartDay: dayNumToStr(competitionVoteStartDay),
        competitionVoteEndDay: dayNumToStr(competitionVoteEndDay),
      };
    }
    throw new InternalServerErrorException('App Settings not set!');
  }
}
