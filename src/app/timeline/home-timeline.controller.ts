import { Status } from '@app/user-status/entities';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiUseTags } from '@nestjs/swagger';
import { User } from '@shared/decorators';
import { AuthGuard } from '@shared/guards';
import { HomeTimelineService } from './home-timeline.service';
@ApiUseTags('Timeline')
@UseGuards(AuthGuard)
@Controller('user/home')
export class HomeTimelineController {
  constructor(private readonly homeTimelineService: HomeTimelineService) {}

  @ApiOperation({
    title: 'get your home timeline',
    description: 'get your contacts and friends statuses',
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
    @Query('liveVideoOnly') liveVideoOnly?: string,
  ) {
    const timestamp = Date.parse(lastTime) || 0; // prevent NaN !
    const flag = liveVideoOnly !== undefined && liveVideoOnly === 'true';
    return this.homeTimelineService.getUserHomeTimeline(user, timestamp, page, flag);
  }

  @ApiBearerAuth()
  @Get('channels')
  public async getChannelsTimeline(
    @User() user,
    @Query('subType') subType: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('mediaLimitPerChannel') mediaLimitPerChannel: string,
  ) {
    let subTypeValue: 'followingChannels' | 'friendsChannels' | 'all' = 'all'; // default;
    if (subType && ['followingChannels', 'friendsChannels', 'all'].some(val => val === subType)) {
      subTypeValue = subType;
    }
    let p = parseInt(page) || 1;
    p = p <= 0 ? 1 : p;
    let l = parseInt(limit) || 20;
    l = l <= 0 ? 20 : l;
    let ll = parseInt(mediaLimitPerChannel) || 10;
    ll = ll <= 0 ? 10 : ll;
    return this.homeTimelineService.getChannelsTimeline(user, subTypeValue, p, l, ll);
  }

  @ApiBearerAuth()
  @Get('me/channel')
  // privacy
  public async getMyChannel(@User() user, @Query('page') page: number = 0) {
    return this.homeTimelineService.getMyChannel(user, page);
  }

  @ApiOperation({ title: 'Get Channel By ID' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'channel info returned',
  })
  @ApiResponse({ status: 404, description: 'channel not found' })
  @Get(':id/channel')
  public async getChannelById(@Param('id') channelId: string, @Query('page') page: number = 0) {
    return this.homeTimelineService.getMyChannel(channelId, page);
  }

  @ApiOperation({
    title: 'get your home stories',
    description: 'get your contacts and friends last stories',
  })
  @ApiResponse({
    status: 200,
    description: 'The requested stories',
    type: Status,
    isArray: true,
  })
  @ApiBearerAuth()
  @Get('stories')
  public async getStories(@User() user, @Query('limit') limit: number = 30) {
    return this.homeTimelineService.getUserHomeStatusTimeline(user, limit);
  }

  @ApiOperation({
    title: 'get current top global media id',
  })
  @ApiBearerAuth()
  @Get('/top-global-media-id')
  public async getTopGlobalMediaId() {
    return this.homeTimelineService.getTopGlobalMediaId();
  }
}
