import { AdvertisementTargetsService } from '@app/advertisement/advertisement-targets.service';
import { UserGender } from '@app/advertisement/user-gender.enum';
import { NotificationsTopics } from '@app/firebase/notifications-topics.enum';
import { MediaService } from '@app/media/media.service';
import { Status } from '@app/user-status/entities';
import { Profile, User } from '@app/user/entities';
import { UserCacheService } from '@app/user/user-cache.service';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GeoLocation } from '@shared/classes';
import { InjectEventEmitter } from '@shared/decorators';
import { ErrorCode, Role } from '@shared/enums';
import { UserMetadata } from '@shared/interfaces';
import { JWTService, LoggerService } from '@shared/services';
import { extractAge, generateUnique, parseAndValidatePhoneNumber } from '@shared/utils';
import { EventEmitter2 } from 'eventemitter2';
import { isEmpty, isNil } from 'ramda';
import { Equal, Repository } from 'typeorm';
import { ChannelCacheService } from './channel-cache.service';
import { CreateUserDTO } from './dto/create-user.dto';
import { UpdateChannelDTO } from './dto/update-channel.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { Channel } from './entities/channel.entity';
import { FollowRequestStatus } from './follow-request-status.enum';
@Injectable()
export class UserService {
  private readonly logger: LoggerService = new LoggerService(UserService.name);
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Profile) private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Channel) private readonly channelRepository: Repository<Channel>,
    @InjectEventEmitter() private readonly emitter: EventEmitter2,
    private readonly jwtService: JWTService,
    @Inject(forwardRef(() => MediaService)) private readonly mediaService: MediaService,
    @Inject(forwardRef(() => UserCacheService))
    private readonly userCacheService: UserCacheService,
    private readonly channelCacheService: ChannelCacheService,
    private readonly adTargetService: AdvertisementTargetsService,
  ) {}

  get repository() {
    return this.userRepository;
  }

  get profileRepo() {
    return this.profileRepository;
  }

  public async findUsers(limit: number = 20, page: number = 1): Promise<User[]> {
    if (limit <= 50 || page < 1) {
      if (page < 1) {
        page = 1;
      }
      if (limit < 0) {
        limit = 50;
      }
      return this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.profile', 'profile')
        .take(limit)
        .skip((page - 1) * limit)
        .getMany();
    } else {
      throw new BadRequestException(
        'limit should be less than or equal 50',
        ErrorCode.BAD_PAYLOAD.toString(),
      );
    }
  }

  public async findSystemUsers(): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('isSystem=true')
      .getMany();
  }

  public async findUserByMobileNumber(
    mobileNumber: string,
    metadata = false,
    relevantTo?,
  ): Promise<User | UserMetadata | undefined> {
    try {
      const [cachedUser] = await this.userCacheService.findUsersByMobileNumber([mobileNumber]);
      if (!isNil(cachedUser)) {
        if (metadata) {
          return this.extractUserMetadata(cachedUser, relevantTo);
        }
        if (!cachedUser.profile.isActive) {
          throw new NotFoundException(
            'User Deactivated By System',
            ErrorCode.USER_DEACTIVED.toString(),
          );
        }
        return cachedUser;
      }
      const user = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.profile', 'profile')
        .where('user.mobileNumber = :mobileNumber', { mobileNumber })
        .getOne();
      if (!user) {
        return undefined;
      }
      if (!user.profile.isActive) {
        throw new NotFoundException(
          'User Deactivated By System',
          ErrorCode.USER_DEACTIVED.toString(),
        );
      }
      if (metadata) {
        return this.extractUserMetadata(user, relevantTo);
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  public async getUserWithTokenById(userId: string): Promise<{ result: User; token: string }> {
    try {
      const user = await this.findUserById(userId);
      const { email, id, username, roles } = user as User;
      const token = await this.jwtService.signToken({ email, id, username, roles });
      return { result: user as User, token };
    } catch (error) {
      throw error;
    }
  }

  public async getSystemAccountsWithToken(): Promise<Array<{ user: User; token: string }>> {
    const arr: Array<{ user: User; token: string }> = [];
    const systemUsers = await this.findSystemUsers();
    for (const user of systemUsers) {
      const { email, id, username, roles } = user as User;
      const token = await this.jwtService.signToken({
        email,
        id,
        username,
        roles,
      });
      arr.push({ user, token });
    }
    return arr;
  }

  public async findUserById(
    id: string,
    metadata = false,
    skipStateCheck = false,
    relevantTo?: { id: any } | null | undefined,
    withFollowingChannels = false,
  ): Promise<User | UserMetadata> {
    if (!id) {
      throw new BadRequestException('where is the user id ?', ErrorCode.BAD_PAYLOAD.toString());
    }
    const cachedUser = await this.userCacheService.deserializeCached(id);
    const relevant: { id: any } = relevantTo && relevantTo.id ? relevantTo : { id: relevantTo };
    if (!isNil(cachedUser)) {
      if (metadata) {
        return this.extractUserMetadata(cachedUser, relevant);
      }
      if (!cachedUser.profile.isActive && !skipStateCheck) {
        throw new NotFoundException(
          'User Deactivated By the System',
          ErrorCode.USER_DEACTIVED.toString(),
        );
      }
      if (
        !isNil(relevantTo) &&
        !isNil(relevantTo.id) &&
        cachedUser.id.toString() !== relevant.id.toString()
      ) {
        try {
          const { contactFirstName, contactLastName } = await this.getRelevantContactName(
            relevant,
            cachedUser.mobileNumber,
          );
          cachedUser.profile.firstName = contactFirstName;
          cachedUser.profile.lastName = contactLastName;
        } catch {
          // don't update anything.
        }
      }
      this.emitter.emit(
        'analytics:addUserToCountry',
        id,
        cachedUser.profile.countryCode || ((cachedUser as unknown) as UserMetadata).countryCode,
      );
      if (withFollowingChannels) {
        return cachedUser;
      }
      delete cachedUser.followingChannels;
      return cachedUser;
    }
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.channel', 'channel')
      .leftJoinAndSelect('user.followingChannels', 'followingChannels')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) {
      throw new NotFoundException('User Not Found', ErrorCode.USER_NOT_FOUND.toString());
    }

    if (!user.profile.isActive && !skipStateCheck) {
      throw new NotFoundException(
        'User Deactivated By System',
        ErrorCode.USER_DEACTIVED.toString(),
      );
    }

    await this.userCacheService.serializeAndCache(user, '4 weeks');
    await this.channelCacheService.serializeAndCache(user.channel);
    this.subscribeToCountryAccount(user, id);
    this.followSystemUsers(user);
    if (metadata) {
      return this.extractUserMetadata(user, relevantTo);
    }
    if (withFollowingChannels) {
      return user;
    }
    delete user.followingChannels;
    return user;
  }

  public async findUsersById(ids: string[]) {
    if (ids.length > 50) {
      throw new BadRequestException('ALOT OF USERS, LIMIT IS 50');
    }
    const result: unknown[] = [];
    for (const id of ids) {
      try {
        const user = await this.findUserById(id, true);
        result.push(user);
      } catch (error) {
        continue;
      }
    }
    return result;
  }

  public async getUserLanguage(userId: string) {
    return this.userCacheService.getUserLanguage(userId);
  }

  public async reGenrateToken(oldToken: string): Promise<string> {
    try {
      const user = await this.jwtService.verifyToken<User>(oldToken);
      const { email, id, username, roles } = (await this.findUserById(user.id)) as User;
      return await this.jwtService.signToken({ email, id, username, roles });
    } catch (error) {
      throw error;
    }
  }

  public async updateNickname(data: Partial<UpdateUserDTO>, { id }): Promise<any> {
    const currentUser = (await this.findUserById(id)) as User;
    const channel = await this.getUserChannel(id);
    if (!data.profile || !channel) {
      throw new NotFoundException('Data is Empty!');
    }
    const { nickName } = data.profile;
    await this.profileRepository.update(currentUser.profile.id, { nickName });
    await this.channelRepository.update(channel, { channelName: nickName });
    await this.userCacheService.deleteCache(id);
    await this.channelCacheService.deleteCache(channel.id);
    const updatedUser = await this.findUserById(id);
    await this.userCacheService.updateUser(updatedUser as User);
    await this.userCacheService.extendExpiration(id, '4 weeks');
    const updatedChannel = await this.getChannelById(channel.id);
    await this.channelCacheService.serializeAndCache(updatedChannel);
    return { message: 'channelName Updated', statusCode: 201 };
  }

  public async updateChannel(data: Partial<UpdateChannelDTO>, { id }): Promise<any> {
    const currentUser = (await this.findUserById(id)) as User;
    const channel = await this.getUserChannel(currentUser.id, false);
    await this.channelRepository.update(channel.id, data);
    await this.channelCacheService.deleteCache(channel.id);
    const updatedChannel = await this.getChannelById(channel.id);
    await this.channelCacheService.serializeAndCache(updatedChannel);
    return { message: 'channel Updated', statusCode: 201 };
  }

  public async updateUser(data: UpdateUserDTO, { id }): Promise<any> {
    try {
      const currentUser = (await this.findUserById(id)) as User;
      if (id && currentUser.mobileNumber === data.user.mobileNumber) {
        // const { email } = data.user;
        const {
          birthdate,
          country,
          description,
          facebookLink,
          firstName,
          language,
          lastName,
          location,
          countryCode,
          countryDialCode,
          education,
          jobTitle,
          gender,
          nickName,
        } = data.profile;
        // await this.userRepository.update(id, { email });
        await this.profileRepository.update(currentUser.profile.id, {
          birthdate,
          country,
          description,
          facebookLink,
          firstName,
          language,
          lastName,
          location,
          countryCode,
          countryDialCode,
          education,
          jobTitle,
          gender,
          nickName,
        });
        await this.userCacheService.deleteCache(id);
        const updatedUser = await this.findUserById(id);
        await this.userCacheService.updateUser(updatedUser as User);
        await this.userCacheService.extendExpiration(id, '4 weeks');
        this.emitter.emit('analytics:addUserToCountry', id, countryCode);
        const [lat, long] = GeoLocation.from(location).toTubule();
        const userAge = extractAge(birthdate);
        let userGender = UserGender.MALE;
        switch (gender) {
          case 'male':
            userGender = UserGender.MALE;
            break;
          case 'female':
            userGender = UserGender.FEMALE;
            break;
          case 'others':
            userGender = UserGender.OTHERS;
            break;
          default:
            break;
        }
        await this.adTargetService.addOrUpdateTarget(currentUser.id, {
          location: {
            type: 'Point',
            coordinates: [long, lat],
          },
          isActive: true,
          userGender,
          userAge,
        });
        let token;
        {
          // tslint:disable-next-line:no-shadowed-variable
          const { email, id, username, roles, mobileNumber } = updatedUser as User;
          token = await this.jwtService.signToken<User>({
            email,
            id,
            username,
            mobileNumber,
            roles,
          } as any);
        }

        return { message: 'User Updated', token, statusCode: 201 };
      } else {
        throw new UnauthorizedException('Fake User !');
      }
    } catch (error) {
      throw error;
    }
  }

  public async updateProfilePic(photoId: string, { id }): Promise<any> {
    try {
      if (!photoId) {
        throw new BadRequestException('Where is the photoId ? Huh !');
      }

      const photo = await this.mediaService.getMedia(photoId);
      if (isNil(photo)) {
        throw new NotFoundException('Photo Not Found, maybe you forget to upload it ?');
      }
      if (photo.type !== 'photo') {
        throw new UnprocessableEntityException(
          'ProfilePic can only be a photo, not a video or otherthings',
        );
      }
      const { profile } = (await this.findUserById(id)) as User;
      const channel = await this.getUserChannel(id);
      channel.profileImage = photo.url;
      await Promise.all([
        this.profileRepository.update(profile.id, {
          profileImage: photo.url,
        }),
        this.channelRepository.update(channel.id, { profileImage: photo.url }),
        this.channelCacheService.deleteCache(channel.id),
        this.userCacheService.deleteCache(id),
      ]);

      // Maybe we don't need this !
      const updatedUser = await this.findUserById(id);
      await Promise.all([
        this.userCacheService.updateUser(updatedUser as User),
        this.userCacheService.extendExpiration(id, '4 weeks'),
      ]);
      return {
        message: 'Profile Photo Updated',
        statusCode: 201,
      };
    } catch (error) {
      throw error;
    }
  }

  public async updateChannelPic(photoId: string, { id }): Promise<any> {
    try {
      if (!photoId) {
        throw new BadRequestException('Where is the photoId ? Huh !');
      }

      const photo = await this.mediaService.getMedia(photoId);
      if (isNil(photo)) {
        throw new NotFoundException('Photo Not Found, maybe you forget to upload it ?');
      }
      if (photo.type !== 'photo') {
        throw new UnprocessableEntityException(
          "Channle's Photo can only be a photo, not a video or otherthings",
        );
      }
      const channel = await this.getUserChannel(id);
      channel.thumbnail = photo.url;
      await this.channelRepository.update(channel.id, { thumbnail: photo.url });
      await this.channelCacheService.deleteCache(channel.id);
      await this.channelCacheService.serializeAndCache(channel);
      return { message: 'channel Photo Updated', statusCode: 201 };
    } catch (error) {
      throw error;
    }
  }

  public async setUserActiveState({ id, isActive }): Promise<any> {
    if (!id && typeof isActive !== 'boolean') {
      throw new BadRequestException('Where is the Id ? and what about `isActive` ? Huh !');
    }
    const { profile } = (await this.findUserById(id, false, true)) as User;

    await Promise.all([
      this.profileRepository.update(profile.id, {
        isActive,
      }),
      this.userCacheService.deleteCache(id),
    ]);

    const updatedUser = (await this.findUserById(id, false, true)) as User;
    await Promise.all([
      this.userCacheService.updateUser(updatedUser as User),
      this.userCacheService.setUserActiveState(updatedUser.id, isActive),
      this.userCacheService.extendExpiration(id, '4 weeks'),
    ]);
    await this.adTargetService.updateTargetStatus(id, isActive);
    return {
      message: `User ${isActive ? 'Activated' : 'Deactivated'}`,
      statusCode: 201,
    };
  }

  public async setDeviceToken(token: string, { id }) {
    try {
      // Maybe we need to handle if the user have multi-devices
      // so we need to keep traking for all his tokens ?
      // nevermind :'D
      if (!token) {
        throw new BadRequestException('Where is the token ? Huh !');
      }
      const { id: userId } = await this.findUserById(id);
      await Promise.all([
        this.userRepository.update(userId, { deviceToken: token }),
        this.userCacheService.setDeviceToken(userId, token),
      ]);

      return { message: 'Device Token Updated', statusCode: 201 };
    } catch (error) {
      throw error;
    }
  }

  public async setMACAdress(address: string, { id }) {
    if (!address) {
      throw new BadRequestException('Where is the address ? Huh !');
    }
    const { id: userId } = await this.findUserById(id);
    await this.userRepository.update(userId, { macAddress: address });

    return { message: 'MacAdress Updated', statusCode: 201 };
  }

  public async checkMACAdress(address: string, { id }) {
    if (!address) {
      throw new BadRequestException('Where is the address ? Huh !');
    }
    const user = await this.repository.findOne(
      {
        id: Equal(id),
      },
      { select: ['macAddress', 'id'] },
    );
    if (!user) {
      throw new NotFoundException('User Not Found', ErrorCode.USER_NOT_FOUND.toString());
    }
    const { macAddress } = user;
    const isMatch = macAddress.localeCompare(address) === 0;
    return { isMatch };
  }

  public async createUser(data: CreateUserDTO): Promise<any> {
    try {
      if (data.user.id) {
        (data.user.id as any) = undefined;
      }
      if (data.profile.id) {
        (data.profile.id as any) = undefined;
      }
      const channel = new Channel();
      const { profile, user, mobileNumber, photoId } = data;
      this.logger.logDebug(data);
      if (isNil(profile.countryCode) || profile.countryCode === '') {
        profile.countryCode = 'EG';
      }
      const parsedMobileNumber = parseAndValidatePhoneNumber(mobileNumber, profile.countryCode);
      if (isNil(parsedMobileNumber)) {
        throw new BadRequestException('Bad Phone Number (maybe you forgot to add countryCode?)');
      }
      let name: string = data.profile.nickName;
      if (!name || name === '') {
        name = data.profile.firstName + ' ' + data.profile.lastName;
      }
      const profileImage = await this.mediaService.getMedia(photoId);
      if (profileImage.type !== 'photo') {
        throw new UnprocessableEntityException(
          'ProfilePic can only be a photo, not a video or otherthings',
        );
      }
      user.password = generateUnique(32); // NOTE: do we need the password !
      // const passwordHash = await this.crypto.hash(user.password);
      // user.password = passwordHash;
      let [lat, long] = [0, 0];
      try {
        [lat, long] = GeoLocation.from(profile.location).toTubule();
      } catch {
        [lat, long] = [25.7915, 30.698929];
      }
      channel.isPublicGlobal = true;
      channel.profileImage = profileImage.url;
      channel.thumbnail = profileImage.url;
      channel.channelName = name;
      user.username = parsedMobileNumber;
      user.mobileNumber = parsedMobileNumber;
      user.isMobileVerified = true;
      profile.profileImage = profileImage.url;
      profile.isActive = true;
      profile.lastLogin = new Date(); // we don't need this too.
      profile.countryDialCode = data.profile.countryDialCode || '+20';
      profile.countryCode = data.profile.countryCode || 'EG';
      profile.nickName = data.profile.nickName;
      user.roles = [Role.UPDATE_USER_SELF];
      const savedProfile = await this.profileRepository.save(profile);
      const savedChannel = await this.channelRepository.save(channel);
      user.profile = savedProfile;
      user.channel = savedChannel;
      const { email, id, username, roles } = await this.userRepository.save(user);
      // To Force Cache it
      await this.findUserById(id);
      // channel.owner = user; // TODO try this for caching the new Channel !
      // console.log(channel);
      // await this.channelCacheService.serializeAndCache(channel);
      this.emitter.emit('analytics:addUserToCountry', id, data.profile.countryCode);
      this.emitter.emit('analytics:incrHomeGlobalStaticsKey', 'users');
      // make a job to run later..
      setTimeout(async () => {
        Object.defineProperty(user, 'id', { value: id });
        const metadata = await this.userCacheService.extractUserMetadata(user);
        this.emitter.emit(
          'notification:fanoutToTopic',
          user.mobileNumber,
          NotificationsTopics.CONTACT_TOPIC,
          metadata,
        );
        this.emitter.emit('userContacts:assignContactToUser', user.mobileNumber, user.id);
        const userAge = extractAge(savedProfile.birthdate);
        let userGender = UserGender.MALE;
        switch (savedProfile.gender) {
          case 'male':
            userGender = UserGender.MALE;
            break;
          case 'female':
            userGender = UserGender.FEMALE;
            break;
          case 'others':
            userGender = UserGender.OTHERS;
            break;
          default:
            break;
        }
        await this.adTargetService.addOrUpdateTarget(id, {
          location: {
            type: 'Point',
            coordinates: [long, lat],
          },
          isActive: true,
          userAge,
          userGender,
        });
      }, 0);
      const token = await this.jwtService.signToken<User>({
        email,
        id,
        username,
        mobileNumber,
        roles,
      } as any);
      const channelId = channel.id;
      return { token, id, channelId, message: 'User Created', statusCode: 201 };
    } catch (error) {
      this.logger.error(error.message, error);
      if (error.errno === 1062) {
        throw new UnprocessableEntityException(
          'Mobile/User Already Exist.',
          ErrorCode.MOBILE_EXISTS.toString(),
        );
      } else {
        throw error;
      }
    }
  }

  public async getChannelById(channelId: string, withOwner?: boolean) {
    const cachedChannel = await this.channelCacheService.deserializeCached(channelId);
    if (!isNil(cachedChannel)) {
      if (cachedChannel.owner) {
        if (isNil(withOwner) || !withOwner) {
          delete cachedChannel.owner;
        }
        return cachedChannel;
      }
    }
    const channel = await this.channelRepository.findOne(channelId);
    if (isNil(channel)) {
      throw new NotFoundException('channel not found');
    } else {
      channel.thumbnail = channel.thumbnail || '';
      channel.describtion = channel.describtion || '';
      channel.profileImage = channel.profileImage || '';
      channel.followersCount = channel.followersCount || 0;
      const q: any = await this.channelRepository
        .createQueryBuilder('channel')
        .leftJoinAndSelect('channel.owner', 'owner')
        .where('channel.id = :id', { id: channelId })
        .getOne();
      channel.owner = q.owner;
      await this.channelCacheService.serializeAndCache(channel);
      return channel;
    }
  }

  public async getUserChannel(userId: string, withOwner = true) {
    const ownedChannelId = await this.userCacheService.getOwnedChannelId(userId);
    if (!isNil(ownedChannelId)) {
      const cachedChannel = await this.channelCacheService.deserializeCached(ownedChannelId);
      if (!isNil(cachedChannel)) {
        if (!withOwner) {
          delete cachedChannel.owner;
        }
        return cachedChannel;
      }
    }
    let q = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.channel', 'channel');
    if (withOwner) {
      q = q.leftJoinAndSelect('channel.owner', 'channelOwner');
    }
    const user = await q.where('user.id = :id', { id: userId }).getOne();
    if (!isNil(user)) {
      const channel = user.channel;
      await this.channelCacheService.serializeAndCache(channel);
      channel.thumbnail = channel.thumbnail || '';
      channel.describtion = channel.describtion || '';
      channel.profileImage = channel.profileImage || '';
      return channel;
    } else {
      throw new NotFoundException('Cannot find user channel for that user.');
    }
  }

  public async addChannelMedia(status: Status) {
    if (status.type !== 'channelMedia') {
      throw new InternalServerErrorException(
        'Status type must be channelMedia to be added to a channel!',
      );
    }
    const channel = await this.getUserChannel(status.user.id);
    await this.channelRepository
      .createQueryBuilder()
      .relation('channelMedia')
      .of(channel)
      .add(status);
    await this.channelCacheService.updateChannelTimeline(channel.id, status);
    return channel;
  }

  // TODO: use pipeline and cache
  public async fanoutChannelMedia(userId: string, channelId: string, lastupdate: Date) {
    const channelFollowersIds = await this.getChannelFollowersIds(channelId, 1, 100e3);
    const userFriendsIds = await this.userCacheService.getUserFriendsIds(userId, 1, 1000);
    for (const followerId of channelFollowersIds) {
      if (followerId.toString() === userId.toString()) {
        continue;
      }
      await this.userCacheService.addFollowingChannel(
        followerId,
        channelId,
        lastupdate.getTime().toString(),
      );
    }
    for (const friendId of userFriendsIds) {
      if (friendId.toString() === userId.toString()) {
        continue;
      }
      await this.userCacheService.addFriendsChannel(
        friendId,
        channelId,
        lastupdate.getTime().toString(),
      );
    }
  }

  public async removeChannelMedia(status: Status) {
    const channel = await this.getUserChannel(status.user.id);
    await this.channelRepository
      .createQueryBuilder()
      .relation('channelMedia')
      .of(channel)
      .remove(status);
    await this.channelCacheService.removeStatusFromChannelTimeline(channel.id, status.id);
    return channel;
  }

  public async followChannel(user: User, channel: Channel) {
    const channelOwner = ((await this.findUserById(channel.owner.id, false)) as unknown) as User;
    if (channel.isPublicGlobal || channelOwner.isSystem) {
      try {
        await this.channelRepository
          .createQueryBuilder()
          .relation('followers')
          .of(channel)
          .add(user);
        await this.repository
          .createQueryBuilder()
          .relation('followingChannels')
          .of(user)
          .add(channel);
        await this.channelCacheService.addFollower(channel.id, user.id);
        await this.userCacheService.addFollowingChannel(user.id, channel.id);
        await this.channelCacheService.addFollowRequest(
          channel.id,
          user.id,
          FollowRequestStatus.ACCEPTED,
        );
        return true;
      } catch {
        return false;
      }
    } else {
      await this.channelCacheService.addFollowRequest(channel.id, user.id);
      return false;
    }
  }

  public async getChannelFollowersIds(channelId: string, page = 1, limit = 30) {
    const followers = await this.channelCacheService.getFollowersIds(channelId, page, limit);
    if (!isEmpty(followers)) {
      return followers;
    }
    const users = await this.repository
      .createQueryBuilder('user')
      .innerJoin('user.followingChannels', 'followingChannel', 'followingChannel.id in (:...ids)', {
        ids: [channelId],
      })
      .take(limit)
      .skip((page - 1) * limit)
      .getMany();
    const ids: string[] = users.map(u => u.id);
    if (!isEmpty(ids)) {
      await this.channelCacheService.addFollowers(channelId, ids);
    }
    return ids;
  }
  public async getChannelfollowers(channelId: string, page: number, limit: number) {
    const followersIds = await this.getChannelFollowersIds(channelId, page, limit);
    const followersMetadata: UserMetadata[] = [];
    for (const id of followersIds) {
      const metadata: UserMetadata = (await this.findUserById(id)) as UserMetadata;
      followersMetadata.push(metadata);
    }
    return followersMetadata;
  }

  public async getUserFollowingChannels(userId: string, page = 1, limit = 30) {
    const followingChannelsIds = await this.userCacheService.getFollowingChannelIds(
      userId,
      page,
      limit,
    );
    if (!isEmpty(followingChannelsIds)) {
      const followingChannels: any[] = [];
      for (const channelId of followingChannelsIds) {
        try {
          const channel = await this.getChannelById(channelId);
          followingChannels.push(channel);
        } catch {
          continue;
        }
      }
      return followingChannels;
    }
    const user = await this.repository.findOne({
      where: { id: userId },
      relations: ['followingChannels'],
    });
    if (user) {
      const followingChannels = user.followingChannels || [];
      for (const channel of followingChannels) {
        // TODO: use pipeline here
        await this.userCacheService.addFollowingChannel(userId, channel.id);
      }
      return followingChannels;
    }
    return [];
  }

  public async getUserFriendsChannels(userId: string, page = 1, limit = 30) {
    const followingChannelsIds = await this.userCacheService.getFriendsChannelIds(
      userId,
      page,
      limit,
    );
    const followingChannels: any[] = [];
    for (const channelId of followingChannelsIds) {
      try {
        const channel = await this.getChannelById(channelId);
        followingChannels.push(channel);
      } catch {
        continue;
      }
    }
    return followingChannels;
  }

  public async unfollowChannel(user: User, channel: Channel) {
    await this.channelRepository
      .createQueryBuilder()
      .relation('followers')
      .of(channel)
      .remove(user);
    await this.repository
      .createQueryBuilder()
      .relation('followingChannels')
      .of(user)
      .remove(channel);
    await this.channelCacheService.removeFollower(channel.id, user.id);
    await this.userCacheService.removeFollowingChannel(user.id, channel.id);
    if (channel.isPublicGlobal || (channel.owner && channel.owner.isSystem)) {
      return true;
    } else {
      await this.channelCacheService.removeFollowRequest(channel.id, user.id);
      return false;
    }
  }

  public async handleChannelFollowRequest(user: User, channel: Channel, accept: boolean) {
    await this.channelCacheService.removeFollowRequest(channel.id, user.id);
    if (accept) {
      await this.channelRepository
        .createQueryBuilder()
        .relation('followers')
        .of(channel)
        .add(user);
      await this.repository
        .createQueryBuilder()
        .relation('followingChannels')
        .of(user)
        .add(channel);
      await this.channelCacheService.addFollower(channel.id, user.id);
      await this.userCacheService.addFollowingChannel(user.id, channel.id);
    }
  }

  public async getFollowChannelRequests(channelId: string) {
    const ids = await this.channelCacheService.getFollowRequests(channelId);
    const users: UserMetadata[] = [];
    for (const id of ids) {
      try {
        const user = (await this.findUserById(id, true)) as UserMetadata;
        users.push(user);
      } catch {
        continue;
      }
    }
    return users;
  }

  public async getChannelMediaIds(channelId: string, page = 1, limit = 30) {
    const p = parseInt(page.toString());
    const mediaIds = await this.channelCacheService.getChannelTimelineIds(channelId, p, limit);
    if (!isEmpty(mediaIds)) {
      return mediaIds;
    }
    // i think there is a better way to get channel media with limit other than that
    const channel = await this.channelRepository.findOne(channelId, {
      relations: ['channelMedia'],
    });
    if (isNil(channel)) {
      throw new NotFoundException('channel not found!');
    }
    const timeline = channel!.channelMedia!;
    const from = (p - 1) * limit;
    const to = from + limit;
    const timelineSlice = timeline.slice(from, to);
    await this.channelCacheService.cacheChannelTimeline(channelId, timelineSlice);
    const timelineIds = timelineSlice.map(s => s.id);
    return timelineIds;
  }

  public async getFollowingChannelsTimeline(userId: string) {
    const followingChannelsIds = await this.userCacheService.getFollowingChannelIds(userId, 1, 100);
    if (!isEmpty(followingChannelsIds)) {
      const followingChannelsMediaIds: string[] = [];
      for (const channelId of followingChannelsIds) {
        const mediaIds = await this.channelCacheService.getChannelTimelineIds(
          channelId,
          1,
          10,
          true,
        );
        followingChannelsMediaIds.push(...mediaIds);
      }
      return followingChannelsMediaIds;
    }
    const followingChannels = await this.repository
      .createQueryBuilder()
      .take(100)
      .orderBy('createdAt', 'DESC')
      .relation('followingChannels')
      .of(userId)
      .loadMany();
    const channels = followingChannels || [];
    const result: any[] = [];
    for (const channel of channels) {
      await this.userCacheService.addFollowingChannel(userId, channel.id);
      const timeline = await this.channelRepository
        .createQueryBuilder()
        .take(10)
        .orderBy('createdAt', 'DESC')
        .relation('channelMedia')
        .of(channel)
        .loadMany();
      await this.channelCacheService.cacheChannelTimeline(channel.id, timeline);
      const followingChannelsMediaIds = await this.channelCacheService.getChannelTimelineIds(
        channel.id,
        1,
        10,
        true,
      );
      result.push(...followingChannelsMediaIds);
    }
    return result;
  }

  public async listChannels(page = 1, limit = 20) {
    const channels = await this.channelRepository.find({
      take: limit,
      skip: (page - 1) * limit,
      order: { createdAt: 'DESC' },
      relations: ['owner'],
    });
    const channelsWithOwners: unknown[] = [];
    for (const channel of channels) {
      try {
        if (isNil(channel.owner)) {
          continue;
        }
        const owner = await this.findUserById(channel.owner.id, true);
        channel.owner = owner as User;
        channelsWithOwners.push(channel);
      } catch (e) {
        continue;
      }
    }
    return channelsWithOwners;
  }
  public async getChannelFollowingStatus(userId: string, channelId: string) {
    return this.channelCacheService.getFollowRequestStatus(channelId, userId);
  }

  public async extractUserMetadata(user: User, relevantTo?): Promise<UserMetadata> {
    return this.userCacheService.extractUserMetadataWithRelevant(user, relevantTo);
  }

  public async getRelevantContactName(user, mobileNumber: string) {
    return this.userCacheService.getRelevantContactName(user, mobileNumber);
  }

  public async getRandomPublicUser(count: number) {
    const usersIds = await this.userCacheService.getRandomPublicUsers(count);
    const users: UserMetadata[] = [];
    for (const userId of usersIds) {
      try {
        const user = ((await this.findUserById(userId, true)) as unknown) as UserMetadata;
        users.push(user);
      } catch {
        continue;
      }
    }
    return users;
  }

  public async deleteUser(userId: string) {
    const user = ((await this.findUserById(userId, false)) as unknown) as User;
    user.mobileNumber = user.mobileNumber.concat(generateUnique(5));
    user.username = user.username.concat(generateUnique(5));
    user.email = user.email.concat(generateUnique(5));
    user.profile.isActive = false;
    await this.repository.update(user.id, {
      email: user.email,
      username: user.username,
      mobileNumber: user.mobileNumber,
    });
    await this.profileRepo.update(user.profile.id, { isActive: false });
    await this.userCacheService.deleteCache(user.id);
    await this.userCacheService.deleteCache(`${user.id}:contacts`);
    await this.userCacheService.deleteCache(`${user.id}:followers`);
    await this.userCacheService.deleteCache(`${user.id}:device:token`);
    await this.userCacheService.deleteCache(`${user.mobileNumber}`);
    return { message: 'Done, User Deleated !', statusCode: 200 };
  }

  private async getSystemUsers({ page = 1, limit = 30 }: { page?: number; limit?: number } = {}) {
    return this.userRepository.find({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        isSystem: true,
      },
    });
  }

  private async followSystemUsers(user: User) {
    try {
      const systemUsers = await this.getSystemUsers({ page: 1, limit: 200 });
      for (const sysUser of systemUsers) {
        try {
          this.emitter.emit('userContacts:1follow2', sysUser.id, user.id);
          const systemAccountChannel = await this.getUserChannel(sysUser.id, true);
          await this.followChannel(user, systemAccountChannel);
        } catch {
          continue;
        }
      }
    } catch {
      // Haha, that's not important!
    }
  }

  private subscribeToCountryAccount(user: User, id: string) {
    Promise.resolve().then(async () => {
      try {
        this.emitter.emit('analytics:addUserToCountry', id, user.profile.countryCode);
        const countryDialCode = user.profile.countryDialCode;
        if (countryDialCode !== null || countryDialCode !== '') {
          const countryId = countryDialCode.replace('+', '');
          const countryUser = await this.findUserByMobileNumber(countryId, true);
          this.emitter.emit('userContacts:1follow2', countryUser!.id, id);
        }
      } catch {
        // should we care ?
      }
    });
  }
}
