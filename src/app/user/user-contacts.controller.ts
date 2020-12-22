import { UserContacts } from '@app/user/entities';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiImplicitBody,
  ApiOperation,
  ApiResponse,
  ApiUseTags,
} from '@nestjs/swagger';
import { User } from '@shared/decorators';
import { AuthGuard } from '@shared/guards';
import { parseArabicNumbers } from '@shared/utils';
import { FollowRequestDTO } from './dto/follow-request.dto';
import { HandleChannelFollowRequestDTO } from './dto/handle-follow-request.dto';
import { UploadContactsDTO, UserContactsInformation } from './dto/upload-contacts.dto';
import { UserContactsService } from './user-contacts.service';
@ApiUseTags('Contacts')
@UseGuards(AuthGuard)
@Controller('user')
export class UserContactsController {
  constructor(private readonly userContactsService: UserContactsService) {}
  @ApiOperation({
    title: 'upload user contacts',
    description: 'let the user upload his contacts',
  })
  @ApiResponse({
    status: 200,
    description: 'Contacts Saved',
  })
  @ApiBearerAuth()
  @Post('contacts/upload')
  public async upload(
    @User() user,
    @Body() contacts: UploadContactsDTO,
    @Query('shouldReturnUsers') shouldReturnUsers?: boolean,
  ): Promise<any> {
    const flag = shouldReturnUsers && shouldReturnUsers.toString() === 'true';
    return this.userContactsService.uploadContacts(user, contacts, flag);
  }
  @ApiOperation({
    title: 'add new contact',
    description: 'let the user upload new contact to his contacts list',
  })
  @ApiResponse({
    status: 200,
    description: 'Contacts Saved',
  })
  @ApiImplicitBody({ type: UserContactsInformation, name: 'contact' })
  @ApiBearerAuth()
  @Post('contacts/add')
  public async add(
    @User() user,
    @Body('mobileNumber') mobileNumber: string,
    @Body('contactName') contactName: string,
    @Query('shouldReturnUser') shouldReturnUser?: boolean,
  ): Promise<any> {
    if (!mobileNumber) {
      throw new BadRequestException('Contact MobileNumber Cannot be empty !');
    }
    const flag = shouldReturnUser && shouldReturnUser.toString() === 'true';
    return this.userContactsService.addContact(
      user,
      parseArabicNumbers(mobileNumber),
      contactName,
      flag,
    );
  }

  @ApiOperation({
    title: 'remove contact',
    description: 'let the user remove contact from his contacts list',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact Removed',
  })
  @ApiImplicitBody({ type: UserContactsInformation, name: 'contact' })
  @ApiBearerAuth()
  @Delete('contacts/remove')
  public async remove(@User() user, @Body('mobileNumber') mobileNumber: string): Promise<any> {
    if (!mobileNumber) {
      throw new BadRequestException('Contact MobileNumber Cannot be empty !');
    }
    return this.userContactsService.removeContact(user, parseArabicNumbers(mobileNumber));
  }

  @ApiOperation({
    title: 'update contact',
    description: 'let the user update contact from his contacts list',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact Updated',
  })
  @ApiResponse({ status: 404, description: 'Contact Not Found' })
  @ApiBearerAuth()
  @ApiImplicitBody({ type: UserContactsInformation, name: 'contact' })
  @Post('contacts/update')
  public async update(
    @User() user,
    @Body('mobileNumber') mobileNumber: string,
    @Body('contactName') contactName: string,
  ): Promise<any> {
    if (!mobileNumber) {
      throw new BadRequestException('Contact MobileNumber Cannot be empty !');
    }
    return this.userContactsService.updateContact(user, parseArabicNumbers(mobileNumber), {
      contactName,
    });
  }

  @ApiOperation({
    title: 'favourite contact',
    description: 'let the user favourite contact from his contacts list',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact Favourited',
  })
  @ApiImplicitBody({ type: UserContactsInformation, name: 'contact' })
  @ApiResponse({ status: 404, description: 'Contact Not Found' })
  @ApiBearerAuth()
  @Post('contacts/favourite')
  public async favourite(@User() user, @Body('mobileNumber') mobileNumber: string): Promise<any> {
    if (!mobileNumber) {
      throw new BadRequestException('Contact MobileNumber Cannot be empty !');
    }
    return this.userContactsService.favouriteContact(user, parseArabicNumbers(mobileNumber));
  }

  @ApiOperation({
    title: 'unfavourite contact',
    description: 'let the user unfavourite contact from his contacts list',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact UnFavourited',
  })
  @ApiImplicitBody({ type: UserContactsInformation, name: 'contact' })
  @ApiResponse({ status: 404, description: 'Contact Not Found' })
  @ApiBearerAuth()
  @Post('contacts/unfavourite')
  public async unfavourite(@User() user, @Body('mobileNumber') mobileNumber: string): Promise<any> {
    if (!mobileNumber) {
      throw new BadRequestException('Contact MobileNumber Cannot be empty !');
    }
    return this.userContactsService.unfavouriteContact(user, parseArabicNumbers(mobileNumber));
  }

  @ApiOperation({
    title: 'list user contacts',
    description: 'let the user get his contacts list',
  })
  @ApiResponse({
    status: 200,
    description: 'User Contacts',
    type: UserContacts,
    isArray: true,
  })
  @ApiResponse({ status: 404, description: 'Contact Not Found' })
  @ApiBearerAuth()
  @Get('contacts/list')
  public async list(@User() user, @Query('countOnly') countOnly: string): Promise<any> {
    const count: boolean = countOnly === 'true' ? true : false;
    return this.userContactsService.listContacts(user, count);
  }

  @ApiOperation({
    title: 'list user friends',
    description: 'let the user get his friends list, contacts that only has a users',
  })
  @ApiResponse({
    status: 200,
    description: 'User Friends',
    type: UserContacts,
    isArray: true,
  })
  @ApiResponse({ status: 404, description: 'Contacts Not Found' })
  @ApiBearerAuth()
  @Get('friends/list')
  public async friends(
    @User() user,
    @Query('favouritedOnly') favouritedOnly: boolean,
  ): Promise<any> {
    favouritedOnly = (favouritedOnly as any) === 'true';
    return this.userContactsService.getUserFriends(user, favouritedOnly);
  }

  @ApiOperation({
    title: 'list my following requests',
  })
  @ApiBearerAuth()
  @Get('follow/requests/list')
  public async followRequests(
    @User() user,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ): Promise<any> {
    return this.userContactsService.getMyFollowRequests(user.id, page, limit);
  }

  @ApiOperation({
    title: 'accept a following request',
  })
  @ApiBearerAuth()
  @Post('follow/request/:id/accept')
  public async acceptfollowRequest(@User() user, @Param('id') id: string): Promise<any> {
    return this.userContactsService.changeFollowRequestStatus(user.id, id, 'accept');
  }

  @ApiOperation({
    title: 'cancel a following request',
  })
  @ApiBearerAuth()
  @Post('follow/request/:id/cancel')
  public async cancelfollowRequest(@User() user, @Param('id') id: string): Promise<any> {
    return this.userContactsService.changeFollowRequestStatus(user.id, id, 'cancel');
  }

  @ApiOperation({
    title: 'create a following request',
  })
  @ApiBearerAuth()
  @Post('follow/requests/send')
  public async createAfollowRequest(@User() user, @Body() data: FollowRequestDTO): Promise<any> {
    return this.userContactsService.sendFollowRequest(user.id, data.userId);
  }

  @ApiOperation({
    title: 'follow channel',
  })
  @ApiBearerAuth()
  @Post('channel/:channelId/follow')
  public async followChannelOwner(@User() user: any, @Param('channelId') channelId: string) {
    return this.userContactsService.followChannel(user.id, channelId);
  }

  @ApiOperation({
    title: 'follow channel',
  })
  @ApiBearerAuth()
  @Post('channel/:channelId/follow-request')
  public async handleChannelFollowRequest(
    @User() user: any,
    @Param('channelId') channelId: string,
    @Body() data: HandleChannelFollowRequestDTO,
  ) {
    return this.userContactsService.handleChannelFollowRequest(
      user.id,
      data.userId,
      channelId,
      data.accept,
    );
  }

  @ApiOperation({
    title: 'unfollow channel',
  })
  @ApiBearerAuth()
  @Delete('channel/:channelId/unfollow')
  public async unFollowChannelOwner(@User() user: any, @Param('channelId') channelId: string) {
    return this.userContactsService.unFollowChannel(user.id, channelId);
  }

  @ApiOperation({
    title: 'show the pending follow requests of channel ',
  })
  @ApiBearerAuth()
  @Get('channel/:channelId/follow-requests')
  public async getFollowChannelrequest(@Param('channelId') channelId: string) {
    return this.userContactsService.getFollowChannelRequest(channelId);
  }

  @ApiOperation({
    title: 'get user following channels',
  })
  @ApiBearerAuth()
  @Get('channel/followingChannels')
  public async getUserFollowingChannels(@User() user: any) {
    return this.userContactsService.getUserFollowingChannels(user.id);
  }

  @ApiOperation({
    title: 'get channel followers',
  })
  @ApiBearerAuth()
  @Get('channel/:channelId/show-followers')
  public async getChannelFollowers(
    @Param('channelId') channelId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.userContactsService.getfollowingChannels(channelId, page, limit);
  }

  @ApiOperation({
    title: 'get channel followers',
  })
  @ApiBearerAuth()
  @Get('channel/:channelId/following-status')
  public async getChannelFollowingStatus(@User() user: any, @Param('channelId') channelId: string) {
    return this.userContactsService.getChannelFollowingStatus(user.id, channelId);
  }
}
