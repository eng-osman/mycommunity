import { Status, StatusActions } from '@app/user-status/entities';
import { AddUserPrivacy } from '@app/user/privacy/user-privacy.decorator';
import { UserPrivacyGuard } from '@app/user/privacy/user-privacy.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiImplicitParam,
  ApiImplicitQuery,
  ApiOperation,
  ApiResponse,
  ApiUseTags,
} from '@nestjs/swagger';
import { User } from '@shared/decorators';
import { AuthGuard } from '@shared/guards';
import { CreateStatusDTO } from './dto/create-status.dto';
import { EditQuestion } from './dto/edit-questions.dto';
import { GetQuestionsDTO } from './dto/get-questions.dto';
import { GetRecommendationDTO } from './dto/get-recommendation.dto';
import { GetGlobalMediaDTO } from './dto/global-media.dto';
import { StatusActionDTO } from './dto/status-action.dto';
import { UserStatusService } from './user-status.service';

@ApiUseTags('Status')
@UseGuards(AuthGuard)
@Controller('user')
export class UserStatusController {
  constructor(private readonly userStatusService: UserStatusService) {}
  @ApiOperation({
    title: 'create new status',
  })
  @ApiResponse({
    status: 201,
    description: 'The Created Status',
    type: Status,
  })
  @ApiBearerAuth()
  @Post('me/status/create')
  public async create(@User() user, @Body() body: CreateStatusDTO) {
    if (
      (body.type === 'media' || body.type === 'story') &&
      (body.mediaIds.length > 1 || body.mediaIds.length < 1)
    ) {
      throw new HttpException(
        { message: `Status of type ${body.type} cannot have more than one video or image!` },
        400,
      );
    }
    return this.userStatusService.createStatus(body, user);
  }

  @ApiOperation({
    title: 'delete status by id',
  })
  @ApiResponse({
    status: 200,
    description: 'Status Deleted',
  })
  @ApiBearerAuth()
  @Delete('me/status/delete')
  public async deleteStatusById(@User() user, @Query('id') id: string) {
    return this.userStatusService.deleteStatusById(user, id, user.isAgent);
  }

  @ApiOperation({
    title: 'get user statuses by id',
    description: 'for user timeline see Timeline section',
    deprecated: true,
  })
  @ApiResponse({
    status: 200,
    description: 'The requested user Statuses',
    type: Status,
    isArray: true,
  })
  @ApiBearerAuth()
  @ApiImplicitParam({ name: 'id', type: String })
  @ApiImplicitQuery({
    name: 'includeReplies',
    type: Boolean,
    description: 'should we include replies when getting user statuses ?',
  })
  @UseGuards(UserPrivacyGuard)
  @AddUserPrivacy({ scope: 'params', fildName: 'id' })
  @Get('show/:id/statuses')
  public async userStatuses(
    @User() user,
    @Query('type') type: 'story' | 'media' | 'status' | 'all' = 'status',
    @Query('limit') limit: number,
    @Query('page') page: number,
    @Query('includeReplies') includeReplies: boolean,
    @Param('id') id,
  ) {
    return this.userStatusService.findUserStatuses(id, type, limit, page, includeReplies, user);
  }

  @ApiOperation({
    title: 'get user actions',
  })
  @ApiResponse({
    status: 200,
    description: 'The requested user Actions',
    type: StatusActions,
    isArray: true,
  })
  @ApiBearerAuth()
  @Get('me/show/actions')
  public async userActions(
    @User() user,
    @Query('type') type: 'like' | 'dislike' | 'view' = 'like',
    @Query('limit') limit: number,
    @Query('page') page: number,
  ) {
    return this.userStatusService.findUserActions(user, type, limit, page);
  }

  @ApiOperation({
    title: 'get status actions',
  })
  @ApiResponse({
    status: 200,
    description: 'The requested status Actions',
    type: StatusActions,
    isArray: true,
  })
  @ApiImplicitParam({ name: 'id', type: String })
  @ApiBearerAuth()
  @Get('view/status/:id/actions')
  public async statusActions(
    @Query('type') type: 'like' | 'dislike' | 'view' = 'like',
    @Query('limit') limit: number,
    @Query('page') page: number,
    @Param('id') id,
  ) {
    return this.userStatusService.findStatusActions(id, type, limit, page);
  }

  @ApiOperation({
    title: 'get status shares',
  })
  @ApiResponse({
    status: 200,
    description: 'The requested status shares',
    type: Status,
    isArray: true,
  })
  @ApiBearerAuth()
  @ApiImplicitParam({ name: 'id', type: String })
  @Get('view/status/:id/shares')
  public async statusShares(
    @Query('limit') limit: number,
    @Query('page') page: number,
    @Param('id') id,
  ) {
    return this.userStatusService.getStatusShares(id, limit, page);
  }

  @ApiOperation({
    title: 'get status replies',
  })
  @ApiResponse({
    status: 200,
    description: 'The requested status replies',
    type: Status,
    isArray: true,
  })
  @ApiBearerAuth()
  @ApiImplicitParam({ name: 'id', type: String })
  @Get('view/status/:id/replies')
  public async statusReplies(
    @User() user,
    @Param('id') id,
    @Query('limit') limit: number,
    @Query('page') page: number,
    @Query('sortByReactions') sortByReactions?: string,
    @Query('includeChilds') includeChilds?: string,
  ) {
    const flag1 = sortByReactions !== undefined && sortByReactions.toString() === 'true';
    const flag2 = includeChilds !== undefined && includeChilds.toString() === 'true';
    return this.userStatusService.getStatusReplies(id, user, limit, page, flag1, flag2);
  }

  @ApiOperation({
    title: 'view status by id',
  })
  @ApiResponse({
    status: 200,
    description: 'The requested status',
    type: Status,
  })
  @ApiBearerAuth()
  @ApiImplicitQuery({ name: 'id', type: String })
  @Get('view/status')
  public async getStatusById(@User() user, @Query('id') id: string) {
    return this.userStatusService.getStatusById(id, user);
  }

  @ApiOperation({
    title: 'make action on status by id',
  })
  @ApiResponse({
    status: 200,
    description: 'The created action',
  })
  @ApiBearerAuth()
  @Post('status/action')
  public async makeAction(@User() user, @Body() body: StatusActionDTO) {
    return this.userStatusService.makeAction(body, user);
  }

  @ApiOperation({
    title: 'get status recommendation',
  })
  @ApiBearerAuth()
  @Get('view/recommendation')
  public async getRecommendation(@User() user, @Query() data: GetRecommendationDTO) {
    const long = parseFloat(data.long) || 0;
    const lat = parseFloat(data.lat) || 0;
    const distance = parseFloat(data.distance) || 10e3; // 10 Km
    const page = parseInt(data.page) || 1;
    const limit = parseInt(data.limit) || 30;
    let minRate = parseFloat(data.minRate) || 1.0;
    let maxRate = parseFloat(data.maxRate) || 5.0;
    if (minRate < 0) {
      minRate = 0.0;
    }
    if (maxRate < 0) {
      maxRate = 5.0;
    }
    return this.userStatusService.getRecommendation(
      user,
      long,
      lat,
      distance,
      maxRate,
      minRate,
      limit,
      page,
    );
  }

  @ApiOperation({
    title: 'get users questions (help)',
  })
  @ApiBearerAuth()
  @Get('view/questions')
  public async getQuestions(@User() user, @Query() data: GetQuestionsDTO) {
    const page = parseInt(data.page) || 1;
    const limit = parseInt(data.limit) || 30;
    const priority = parseFloat(data.priority) || 10;
    return this.userStatusService.getQuestions({
      user,
      priority,
      limit,
      page,
      myQuestionsOnly: false,
    });
  }

  @ApiOperation({
    title: 'get personal users questions (help)',
  })
  @ApiBearerAuth()
  @Get('view/me/questions')
  public async getPersonalQuestions(@User() user, @Query() data: GetQuestionsDTO) {
    const page = parseInt(data.page) || 1;
    const limit = parseInt(data.limit) || 30;
    const priority = parseFloat(data.priority) || 10;
    return this.userStatusService.getQuestions({
      user,
      priority,
      limit,
      page,
      myQuestionsOnly: true,
    });
  }

  @ApiOperation({
    title: 'Edit question by {id}',
  })
  @ApiBearerAuth()
  @Post('edit/:id/questions')
  public async editQuestion(@User() user, @Param('id') id, @Body() data: EditQuestion) {
    return this.userStatusService.editQuestion(user, id, data);
  }

  @ApiOperation({
    title: 'get global media around some location',
  })
  @ApiBearerAuth()
  @Get('view/global-media')
  public async getGlobalMedia(@User() user, @Query() data: GetGlobalMediaDTO) {
    const long = parseFloat(data.long) || 0;
    const lat = parseFloat(data.lat) || 0;
    const distance = parseFloat(data.distance) || 10e3; // 10 Km
    const page = parseInt(data.page) || 1;
    const limit = parseInt(data.limit) || 30;
    const countOnly = data.countOnly === 'false' ? false : true;
    return this.userStatusService.getGlobalMedia(user, long, lat, distance, page, limit, countOnly);
  }

  @ApiOperation({
    title: 'get channel media by keyword',
  })
  @ApiBearerAuth()
  @Get('search/channel-media')
  public async searchChannelMedia(@User() user, @Query('q') q: string) {
    return this.userStatusService.getChannelsByKeyword(user, q);
  }
}
