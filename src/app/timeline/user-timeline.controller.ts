import { Status } from '@app/user-status/entities';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiUseTags } from '@nestjs/swagger';
import { User } from '@shared/decorators';
import { AuthGuard } from '@shared/guards';
import { UserTimelineService } from './user-timeline.service';
@ApiUseTags('Timeline')
@UseGuards(AuthGuard)
@Controller('user')
export class UserTimelineController {
  constructor(private readonly userTimelineService: UserTimelineService) {}

  @ApiOperation({
    title: 'get user timeline',
    description: 'list all statuses from user timeline',
  })
  @ApiResponse({
    status: 200,
    description: 'The requested timeline',
    type: Status,
    isArray: true,
  })
  @ApiBearerAuth()
  @Get(':id/timeline')
  public async getTimeline(
    @User() user,
    @Param('id') userId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('mediaOnly') mediaOnly: string,
  ) {
    // for some reason, server reads this as limit + 1
    const limitInt = parseInt(limit) > 20 ? 19 : parseInt(limit) - 1;
    const pageInt = parseInt(page) < 1 ? 1 : parseInt(page);
    const filterMedia = mediaOnly === 'true';
    const reTry = true;
    return this.userTimelineService.getUserTimeline(
      userId,
      user,
      pageInt,
      limitInt,
      reTry,
      filterMedia,
    );
  }

  @ApiOperation({
    title: 'get user sotries at last day',
  })
  @ApiResponse({
    status: 200,
    description: 'The requested user stories',
    type: Status,
    isArray: false,
  })
  @ApiBearerAuth()
  @Get(':id/timeline/story')
  public async getStory(@User() user, @Param('id') userId: string) {
    return this.userTimelineService.getUserStoryTimeline(userId, user);
  }
}
