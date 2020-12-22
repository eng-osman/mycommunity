import { EmployeeGuard } from '@app/analytics/employee.guard';
import { DeviceTokenDTO } from '@app/user/dto/device-token.dto';
import { UpdateProfilePicDTO } from '@app/user/dto/update-profile-pic.dto';
import { UserStateDTO } from '@app/user/dto/user-state.dto';
import { VerificationService } from '@app/verification/verification.service';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  ParseIntPipe,
  Post,
  Query,
  UnauthorizedException,
  UnprocessableEntityException,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiUseTags } from '@nestjs/swagger';
import { Roles } from '@shared/decorators';
import * as AuthUser from '@shared/decorators/user.decorator';
import { Role } from '@shared/enums';
import { AuthGuard, RolesGuard } from '@shared/guards';
import { UserMetadata } from '@shared/interfaces';
import { LoggerService } from '@shared/services';
import { parseArabicNumbers } from '@shared/utils';
import { isNil } from 'ramda';
import { CreateUserDTO } from './dto/create-user.dto';
import { UserMacAdressDTO } from './dto/mac-adress.dto';
import { UserTokenDTO } from './dto/token-user.dto';
import { UpdateChannelDTO } from './dto/update-channel.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { Profile, User } from './entities';
import { Channel } from './entities/channel.entity';
import { AddUserPrivacy } from './privacy/user-privacy.decorator';
import { UserPrivacyGuard } from './privacy/user-privacy.guard';
import { UserContactsService } from './user-contacts.service';
import { UserService } from './user.service';

@ApiUseTags('User')
@UseGuards(RolesGuard)
@Controller('user')
export class UserController {
  private readonly logger: LoggerService = new LoggerService(UserController.name);
  constructor(
    private readonly userService: UserService,
    private readonly userContactsService: UserContactsService,
    private readonly verificationService: VerificationService,
  ) {}

  /**
   * @deprecated
   * @see analytics
   */
  @ApiOperation({ title: 'List Users', description: 'List All Users', deprecated: true })
  @ApiResponse({ status: 200, description: 'the list of the users', type: Array<User>() })
  @UsePipes(new ParseIntPipe())
  @Get('find/all')
  public async findAll(
    @Query('limit') limit: number,
    @Query('page') page: number,
  ): Promise<User[]> {
    return [{ page, limit } as any];
    // return this.userService.findUsers(limit, page);
  }
  @ApiOperation({ title: 'Find a user by id', description: 'Find a user by id' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'the user object', type: User })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 401, description: 'cuz you are not contacts with each other' })
  @UseGuards(UserPrivacyGuard, AuthGuard)
  @AddUserPrivacy({ scope: 'query', fildName: 'id' })
  @Get('find')
  public async findUserById(
    @AuthUser.User() currentUser,
    @Query('id') id: string,
    @Query('metadata') metadata: boolean,
  ): Promise<User | UserMetadata> {
    const isContactsWithEachOther = await this.userContactsService.checkAuthorityToAccess(
      id,
      currentUser.id,
    );
    if (isContactsWithEachOther) {
      metadata = String(metadata).toLowerCase() === 'true';
      return this.userService.findUserById(id, metadata, false, null, true);
    } else {
      throw new UnauthorizedException('you are not allowed to access that User !');
    }
  }

  @ApiOperation({
    title: 'Find a user by Mobile Number',
    description: 'Find a user by Mobile Number',
  })
  @ApiResponse({ status: 200, description: 'the user object', type: User })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get('find/mobile')
  public async findUserByMobileNumber(
    @Query('number') mobileNumber: string,
    @Query('metadata') metadata: boolean = false,
  ): Promise<User | UserMetadata> {
    metadata = String(metadata).toLowerCase() === 'true';
    const user = await this.userService.findUserByMobileNumber(
      parseArabicNumbers(mobileNumber.trim()),
      metadata,
    );

    if (!isNil(user)) {
      return user;
    } else {
      throw new NotFoundException('User Not Found');
    }
  }
  @ApiOperation({
    title: 'Find users by there ids',
  })
  @UseGuards(EmployeeGuard)
  @ApiBearerAuth()
  @Post('find/users')
  public async findUsersById(@Body('ids') ids: string[]) {
    if (!ids) {
      throw new BadRequestException('Missing ids array in the body');
    }
    return this.userService.findUsersById(ids);
  }

  @ApiOperation({
    title: 'Create New User',
  })
  @ApiResponse({ status: 200, description: 'the created user token', type: Profile })
  @Post('create')
  public async create(@Body() body: CreateUserDTO): Promise<any> {
    try {
      const result = await this.verificationService.verifyRequestId(body.requestId);
      // a hack to bypass sms !;
      // const result = {
      //   isOK: true,
      // };
      if (result.isOK) {
        return this.userService.createUser(body);
      } else {
        return result;
      }
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }
  @ApiOperation({ title: 'Update The user' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'the updated user token', type: { token: 'jwt token' } })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @UseGuards(RolesGuard, AuthGuard)
  @Roles(Role.UPDATE_USER_SELF)
  @Post('update')
  public async update(@AuthUser.User() user, @Body() body: UpdateUserDTO): Promise<User> {
    try {
      return this.userService.updateUser(body, user);
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  @ApiOperation({ title: 'Update The ChannelName' })
  @ApiBearerAuth()
  @UseGuards(RolesGuard, AuthGuard)
  @Roles(Role.UPDATE_USER_SELF)
  @Post('update/channel-name')
  public async updateChannelname(
    @AuthUser.User() user,
    @Body() body: Partial<UpdateUserDTO>,
  ): Promise<User> {
    try {
      return this.userService.updateNickname(body, user);
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  @ApiOperation({ title: 'Update The ChannelName' })
  @ApiBearerAuth()
  @UseGuards(RolesGuard, AuthGuard)
  @Roles(Role.UPDATE_USER_SELF)
  @Post('update/channel')
  public async updateChannel(
    @AuthUser.User() user,
    @Body() body: UpdateChannelDTO,
  ): Promise<Channel> {
    try {
      return this.userService.updateChannel(body, user);
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  @UseGuards(RolesGuard, AuthGuard)
  @Roles(Role.UPDATE_USER_SELF)
  @ApiOperation({ title: 'Get user personal Channel' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'personal channel info returned',
  })
  @ApiResponse({ status: 404, description: 'Prsonal channel not found' })
  @Get('me/channel')
  public async getMyChannel(@AuthUser.User() user): Promise<Channel> {
    return this.userService.getUserChannel(user.id);
  }

  @UseGuards(RolesGuard, AuthGuard)
  @Roles(Role.UPDATE_USER_SELF)
  @ApiOperation({ title: 'Update user Profile Picture' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Profile Photo Updated',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Post('update/profile-pic')
  public async updateProfilePic(
    @AuthUser.User() user,
    @Body() data: UpdateProfilePicDTO,
  ): Promise<User> {
    try {
      return this.userService.updateProfilePic(data.photoId, user);
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  @UseGuards(RolesGuard, AuthGuard)
  @Roles(Role.UPDATE_USER_SELF)
  @ApiOperation({ title: 'Update channel Profile Picture' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Profile Photo Updated',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Post('update/channel-pic')
  public async updateChannelPic(
    @AuthUser.User() user,
    @Body() data: UpdateProfilePicDTO,
  ): Promise<User> {
    try {
      return this.userService.updateChannelPic(data.photoId, user);
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  @ApiOperation({ title: 'Update user token' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'user updated token' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @UseGuards(RolesGuard, AuthGuard)
  @Roles(Role.UPDATE_USER_SELF)
  @Post('token')
  public async reGenrateToken(@Body() body: UserTokenDTO): Promise<any> {
    try {
      const token = await this.userService.reGenrateToken(body.token);
      return {
        token,
        statusCode: 200,
      };
    } catch (error) {
      this.logger.error(error.message, error);
      throw new UnprocessableEntityException('Error While renewing the Token');
    }
  }

  @ApiOperation({ title: 'Update/set User Device Token' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Device Token Updated' })
  @UseGuards(RolesGuard, AuthGuard)
  @Roles(Role.UPDATE_USER_SELF)
  @Post('/update/device-token')
  public async setDeviceToken(@AuthUser.User() user, @Body() body: DeviceTokenDTO): Promise<any> {
    try {
      return this.userService.setDeviceToken(body.deviceToken, user);
    } catch (error) {
      this.logger.error(error.message, error);
      throw new UnprocessableEntityException('Error While renewing Device Token, Try again ?');
    }
  }

  @ApiOperation({ title: 'Update/set User MacAdress' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'MacAdress Updated' })
  @UseGuards(RolesGuard, AuthGuard)
  @Roles(Role.UPDATE_USER_SELF)
  @Post('/update/mac')
  public async setMACAdress(@AuthUser.User() user, @Body() body: UserMacAdressDTO): Promise<any> {
    try {
      return this.userService.setMACAdress(body.macAdress, user);
    } catch (error) {
      this.logger.error(error.message, error);
      throw new UnprocessableEntityException('Error While renewing User MacAdress, Try again ?');
    }
  }

  @ApiOperation({ title: 'Check the current User MacAdress' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'isMatch: boolean' })
  @UseGuards(RolesGuard, AuthGuard)
  @Roles(Role.UPDATE_USER_SELF)
  @Post('/check/mac')
  public async checkMacAdress(@AuthUser.User() user, @Body() body: UserMacAdressDTO): Promise<any> {
    try {
      return this.userService.checkMACAdress(body.macAdress, user);
    } catch (error) {
      this.logger.error(error.message, error);
      throw new UnprocessableEntityException('Error While Checking User MacAdress, Try again ?');
    }
  }

  @ApiOperation({ title: 'Get a list of public users to follow up.' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('/publiclist')
  public async publicUsers(@Query('count') count: string): Promise<any> {
    try {
      let c = parseInt(count) || 10;
      c = c < 0 ? 10 : c;
      return this.userService.getRandomPublicUser(c);
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }
  @ApiOperation({ title: 'Update/set User State [Employee Only]' })
  @ApiBearerAuth()
  @UseGuards(EmployeeGuard)
  @Post('/update/state')
  public async setUserActiveState(@Body() body: UserStateDTO): Promise<any> {
    try {
      return this.userService.setUserActiveState(body);
    } catch (error) {
      this.logger.error(error.message, error);
      throw new UnprocessableEntityException('Error While setting user state, Try again ?');
    }
  }

  @ApiOperation({ title: 'Delete User from the system, by token' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Delete('me/delete')
  public async deleteUser(@AuthUser.User() user): Promise<any> {
    return this.userService.deleteUser(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(EmployeeGuard)
  @Get('/channels/list')
  public async listAllChannels(
    @Query('limit') limit: string,
    @Query('page') page: string,
  ): Promise<any> {
    try {
      const p = parseInt(page) || 1;
      const l = parseInt(limit) || 30;
      return this.userService.listChannels(p, l);
    } catch (error) {
      this.logger.error(error.message, error);
      throw new UnprocessableEntityException('Error While listing channels, try again');
    }
  }
}
