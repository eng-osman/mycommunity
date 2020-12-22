import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiUseTags } from '@nestjs/swagger';
import { User } from '@shared/decorators';
import { AuthGuard } from '@shared/guards';
import { BlockChannelDTO } from '../dto/block-channel.dto';
import { BlockUserDTO } from '../dto/block-user.dto';
import { UsersPrivacy } from '../entities';
import { UserPrivacyService } from './user-privacy.service';
@ApiUseTags('User')
@UseGuards(AuthGuard)
@Controller('user/me/privacy')
export class UserPrivacyController {
  constructor(private readonly userPrivacyService: UserPrivacyService) {}
  @ApiOperation({
    title: 'get user block list',
  })
  @ApiResponse({
    status: 200,
    description: 'User Block List',
    type: UsersPrivacy,
    isArray: true,
  })
  @ApiBearerAuth()
  @Get('list')
  public async list(@User() me): Promise<UsersPrivacy[]> {
    return this.userPrivacyService.getUserBlockList(me);
  }

  @ApiOperation({
    title: 'get user channel block list',
  })
  @ApiBearerAuth()
  @Get('list/channels')
  public async listChannelBlocklist(
    @User() me,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.userPrivacyService.listBlockedChannels(me.id, page, limit);
  }

  @ApiOperation({
    title: 'block user',
  })
  @ApiResponse({
    status: 200,
    description: 'The Blocked User',
    type: UsersPrivacy,
  })
  @ApiBearerAuth()
  @Post('add')
  public async blockUser(@User() me, @Body() body: BlockUserDTO) {
    return this.userPrivacyService.blockUser(me, body.userId, body.type);
  }

  @ApiOperation({
    title: 'block channel by id',
  })
  @ApiResponse({
    status: 200,
  })
  @ApiBearerAuth()
  @Post('add/channel')
  public async blockChannel(@User() me, @Body() body: BlockChannelDTO) {
    return this.userPrivacyService.blockChannel(me.id, body.channelId);
  }

  @ApiOperation({
    title: 'update user privacy',
  })
  @ApiResponse({
    status: 200,
    description: 'Privacy updated',
  })
  @ApiBearerAuth()
  @Post('update')
  public async update(@User() me, @Body() body: BlockUserDTO) {
    return this.userPrivacyService.updatePrivacyType(me, body.userId, body.type);
  }

  @ApiOperation({
    title: 'remove user privacy',
  })
  @ApiResponse({
    status: 200,
    description: 'Privacy updated',
  })
  @ApiBearerAuth()
  @Delete('remove')
  public async remove(@User() me, @Body('userId') otherId: string) {
    if (!otherId) {
      throw new BadRequestException('Missing other user id, `userId`');
    }
    return this.userPrivacyService.removePrivacy(me, otherId);
  }

  @ApiOperation({
    title: 'remove channel block (unblock)',
  })
  @ApiResponse({
    status: 200,
  })
  @ApiBearerAuth()
  @Delete('remove/channel')
  public async removeChannelBlock(@User() me, @Body() body: BlockChannelDTO) {
    return this.userPrivacyService.unblockChannel(me.id, body.channelId);
  }
}
