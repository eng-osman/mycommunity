import { Status } from '@app/user-status/entities';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiUseTags } from '@nestjs/swagger';
import { User } from '@shared/decorators';
import { AuthGuard } from '@shared/guards';
import { CountryTimelineService } from './country-timeline.service';

@ApiUseTags('Timeline')
@UseGuards(AuthGuard)
@Controller('user/country')
export class CountryTimelineController {
  constructor(private readonly countryTimelineService: CountryTimelineService) {}

  @ApiOperation({
    title: 'get timeline from many countries',
  })
  @ApiResponse({
    status: 200,
    description: 'The requested timeline',
    type: Status,
    isArray: true,
  })
  @ApiBearerAuth()
  @Get('timeline')
  public async getTimeline(
    @User() user,
    @Query('lastTime') lastTime: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 1,
    @Query('from') from: string,
    @Query('sortBy') sortBy: string,
    @Query('liveVideoOnly') liveVideoOnly?: string,
    @Query('channelMediaOnly') channelMediaOnly?: string,
    // @Query('statusType') statusType: string,
  ) {
    const timestamp = Date.parse(lastTime) || 0; // prevent NaN !
    const fromArr = from && from.split(',');
    const flag1 = liveVideoOnly !== undefined && liveVideoOnly === 'true';
    const flag2 = channelMediaOnly !== undefined && channelMediaOnly === 'true';
    let sorter = 'date'; // default;
    if (sortBy && ['date', 'likes', 'comments', 'views'].some(val => val === sortBy)) {
      sorter = sortBy;
    }
    return this.countryTimelineService.getMultiCountryTimeline(
      user.id,
      fromArr || [],
      sorter,
      timestamp,
      page,
      limit,
      flag1,
      flag2,
    );
  }
}
