import { NotificationsTopics } from '@app/firebase/notifications-topics.enum';
import { User, UserContacts } from '@app/user/entities';
import { UserPrivacy } from '@app/user/privacy/user-privacy.enum';
import { UserPrivacyService } from '@app/user/privacy/user-privacy.service';
import { UserCacheService } from '@app/user/user-cache.service';
import { UserContactsCacheService } from '@app/user/user-contacts-cache.service';
import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectEventEmitter } from '@shared/decorators';
import { UserMetadata } from '@shared/interfaces';
import { LoggerService } from '@shared/services';
import { parseArabicNumbers, standardizeMobileNumber } from '@shared/utils';
import { EventEmitter2 } from 'eventemitter2';
import { isEmpty, isNil } from 'ramda';
import { Repository } from 'typeorm';
import { UploadContactsDTO } from './dto/upload-contacts.dto';
import { Channel } from './entities/channel.entity';
import { FollowRequest } from './entities/follow-request.entity';
import { FollowRequestStatus } from './follow-request-status.enum';
import { UserService } from './user.service';

@Injectable()
export class UserContactsService {
  private readonly logger: LoggerService = new LoggerService(UserContactsService.name);

  constructor(
    @InjectRepository(UserContacts)
    private readonly userContactsRepository: Repository<UserContacts>,
    @InjectRepository(Channel)
    @InjectRepository(FollowRequest)
    private readonly followRequestRepository: Repository<FollowRequest>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => UserPrivacyService))
    private readonly userPrivacyService: UserPrivacyService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => UserContactsCacheService))
    private readonly userContactsCacheService: UserContactsCacheService,
    @Inject(forwardRef(() => UserCacheService))
    private readonly userCacheService: UserCacheService,
    @InjectEventEmitter() private readonly eventEmitter: EventEmitter2,
  ) {
    this.subscribeToEvents();
  }

  public async uploadContacts({ id }, { data }: UploadContactsDTO, shouldReturnUsers = false) {
    try {
      const owner = await this.userRepository.findOne(id);
      if (isNil(owner)) {
        throw new UnprocessableEntityException(
          'The Owner Of this contacts (you!) is not found, are you using a fake token ? Huh !',
        );
      }

      const newContacts: UserContacts[] = [];
      const oldContacts: UserContacts[] = [];
      this.logger.logDebug(`got ${data.length} contacts`);
      for (const contact of data) {
        if (isNil(contact.mobileNumber)) {
          continue;
        }
        this.logger.logDebug('Before: ', contact.mobileNumber);
        const mobileNumber = standardizeMobileNumber(parseArabicNumbers(contact.mobileNumber));
        this.logger.logDebug('After: ', contact.mobileNumber);
        const isOldContact = await this.isContactExist({ id }, mobileNumber);
        if (isOldContact) {
          // ok, its an old contact, let's get it.
          try {
            const oldContact = await this.getMyContactByMobileNumber({ id }, mobileNumber);
            if (oldContact.contactName !== contact.contactName) {
              // ok, update the name.
              await this.updateContact({ id }, mobileNumber, { contactName: contact.contactName });
            }
            this.eventEmitter.emit(
              'notification:subscribeToTopic',
              [id],
              mobileNumber,
              NotificationsTopics.CONTACT_TOPIC,
            );
            if (oldContact.isUser) {
              (oldContact.user as unknown) = ((await this.userService.findUserById(
                oldContact.userId!,
                true,
                false,
                { id },
              )) as unknown) as UserMetadata;
            }
            oldContacts.push(oldContact);
          } catch {
            continue;
          }
        } else {
          // it is new contact, so let's create and save it.
          const c = new UserContacts();
          c.mobileNumber = mobileNumber;
          c.contactName = contact.contactName;
          c.user = owner;
          c.userId = null;
          const user = await this.userRepository.findOne({
            where: { mobileNumber },
          });
          if (user) {
            const userPrivacy = await this.calculateUserPrivacy({ id }, user.id);
            if (userPrivacy !== UserPrivacy.NONE) {
              continue;
            }
            this.eventEmitter.emit(
              'notification:subscribeToTopic',
              [id],
              contact.mobileNumber,
              NotificationsTopics.CONTACT_TOPIC,
            );
            c.isUser = true;
            c.userId = user.id;
          }
          this.eventEmitter.emit(
            'notification:subscribeToTopic',
            [id],
            c.userId,
            NotificationsTopics.USER_TOPIC,
          );
          this.eventEmitter.emit('timeline:cache:userHomeTimeline', id, undefined, c.userId);
          newContacts.push(c);
        }
      }
      if (newContacts.length > 0) {
        await this.userContactsRepository.save(newContacts);
        await this.userContactsCacheService.serializeAndCache(owner, newContacts, '8 weeks');
      }
      const result: { message: string; statusCode: number; users?: UserContacts[] } = {
        message: 'Contacts Saved',
        statusCode: 200,
      };
      if (shouldReturnUsers) {
        const contactsUsers = newContacts.concat(oldContacts);
        for (const cu of contactsUsers) {
          if (cu.isUser) {
            try {
              (cu.user as unknown) = ((await this.userService.findUserById(
                cu.userId!,
                true,
                false,
                {
                  id,
                },
              )) as unknown) as UserMetadata;
            } catch {
              // user not found !
              cu.isUser = false;
              cu.userId = null;
              continue;
            }
          }
        }
        result.users = contactsUsers;
        this.logger.logDebug(`Uploaded Contacts Count: ${result.users.length}`);
      }
      this.logger.logDebug(`Saved Contacts:`, { new: newContacts.length, old: oldContacts.length });
      return result;
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async addContact(
    { id },
    mobileNumber: string,
    contactName: string,
    shouldReturnUser = false,
  ): Promise<any> {
    return this.uploadContacts({ id }, { data: [{ mobileNumber, contactName }] }, shouldReturnUser);
  }

  public async removeContact({ id }, mobileNumber: string): Promise<any> {
    try {
      const contact = await this.userContactsRepository
        .createQueryBuilder('contact')
        .innerJoinAndSelect('contact.user', 'user')
        .where('contact.mobileNumber = :mobileNumber', { mobileNumber })
        .andWhere('user.id = :id', { id })
        .getOne();
      if (isNil(contact)) {
        throw new NotFoundException('Contact Not Found');
      }
      await Promise.all([
        this.userContactsRepository.update(contact.id, { isBlocked: true }),
        this.userContactsCacheService.removeFromUserContacts(
          contact.user!.id,
          contact.mobileNumber,
        ),
      ]);
      this.eventEmitter.emit(
        'notification:unSubscribeFromTopic',
        [id],
        contact.mobileNumber,
        NotificationsTopics.CONTACT_TOPIC,
      );
      if (contact.userId) {
        await this.userContactsCacheService.removeFromUserFollowers(contact.userId, id);
        this.eventEmitter.emit(
          'notification:unSubscribeFromTopic',
          [id],
          contact.userId,
          NotificationsTopics.USER_TOPIC,
        );
        this.eventEmitter.emit(
          'notification:unSubscribeFromTopic',
          [id],
          contact.mobileNumber,
          NotificationsTopics.USER_TOPIC,
        );
      }
      this.eventEmitter.emit('timeline:remove:userHomeTimeline', id, contact.userId);
      return {
        message: `Contact ${Boolean(contact) ? 'Removed' : 'Not Found'}`,
        statusCode: Boolean(contact) ? 200 : 404,
      };
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async restoreContact({ id }, contactUserId: any): Promise<any> {
    const contact = await this.userContactsRepository
      .createQueryBuilder('contact')
      .select()
      .where('contact.user.id = :id', { id })
      .andWhere('contact.isBlocked = :isBlocked', { isBlocked: true })
      .andWhere('contact.userId = :contactUserId', { contactUserId })
      .getOne();
    if (isNil(contact)) {
      throw new NotFoundException('Contact Not Found, thus cannot be resotred ??');
    }
    // remove the last artifact
    await this.userContactsRepository.delete(contact.id);
    // nani ??
    await this.addContact({ id }, contact.mobileNumber, contact.contactName, false);
    return true;
  }
  public async updateContact(
    { id },
    mobileNumber: string,
    data: Partial<UserContacts>,
  ): Promise<any> {
    try {
      const contact = await this.userContactsRepository
        .createQueryBuilder('contact')
        .select()
        .where('contact.user.id = :id', { id })
        .andWhere('contact.isBlocked = :isBlocked', { isBlocked: false })
        .andWhere('contact.mobileNumber = :mobileNumber', { mobileNumber })
        .getOne();
      if (isNil(contact)) {
        throw new NotFoundException('Contact Not Found');
      }
      await this.userContactsRepository.update(contact.id, data);
      const updatedContact = await this.userContactsRepository.findOne(contact.id);
      await this.userContactsCacheService.addOrUpadateContact(id, updatedContact!);
      return { message: 'Contact Updated', statusCode: 200, contact };
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async favouriteContact({ id }, mobileNumber: string): Promise<any> {
    try {
      await this.updateContact({ id }, mobileNumber, { isFavourite: true });
      return { message: 'Contact Favourited', statusCode: 200 };
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async unfavouriteContact({ id }, mobileNumber: string): Promise<any> {
    try {
      await this.updateContact({ id }, mobileNumber, { isFavourite: false });
      return { message: 'Contact Unfavourited', statusCode: 200 };
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async listContacts({ id }, countOnly: boolean = false): Promise<UserContacts[] | number> {
    const cachedContactsCount = await this.userContactsCacheService.getUserContactsCount(id);
    if (cachedContactsCount > 0) {
      if (countOnly) {
        return cachedContactsCount;
      }
      const cachedContacts = await this.userContactsCacheService.getUserContacts(id);
      return cachedContacts;
    }
    if (countOnly) {
      const contactsCount: any[] = await this.userContactsRepository
        .createQueryBuilder('contacts')
        .select('DISTINCT(contacts.mobileNumber)')
        .where('contacts.user.id = :id', { id })
        .andWhere('contacts.mobileNumber != "null"')
        .andWhere('contact.isBlocked = :isBlocked', { isBlocked: false })
        .getRawMany(); // TODO: Needs opt.
      // tslint:disable-next-line: max-line-length
      // there is no RawCount(), so we need to get one attribute at least then get the length of th array
      return contactsCount.length;
    }
    const contacts: any[] = await this.userContactsRepository
      .createQueryBuilder('contact')
      .select('DISTINCT(contact.mobileNumber), isFavourite, contactName, isUser, userId')
      .where('contact.user.id = :id', { id })
      .andWhere('contact.mobileNumber != "null"')
      .andWhere('contact.isBlocked = :isBlocked', { isBlocked: false })
      .getRawMany();

    await this.userContactsCacheService.serializeAndCache({ id } as any, contacts, '4 weeks');
    return contacts;
  }

  public async getUserFriends({ id }, favouritedOnly: boolean = false) {
    const cachedFriends = await this.userContactsCacheService.getUserFriends(id, favouritedOnly);
    if (cachedFriends.length > 0) {
      return cachedFriends;
    }
    const q = this.userContactsRepository
      .createQueryBuilder('contact')
      .where('contact.user.id = :id', { id })
      .andWhere('contact.isBlocked = :isBlocked', { isBlocked: false })
      .andWhere('contact.isUser = :isUser', { isUser: true });
    const friends = await q.getMany();
    for (const friend of friends) {
      const cachedUser = await this.userCacheService.findUser(friend.userId);
      if (cachedUser) {
        if (!cachedUser.profile.isActive) {
          continue;
        }
        friend.user = cachedUser;
      } else {
        const user = await this.userRepository
          .createQueryBuilder('user')
          .select()
          .where('user.id = :friendUserId', { friendUserId: friend.userId })
          .leftJoinAndSelect('user.profile', 'profile')
          .getOne();
        if (user && !user.profile.isActive) {
          continue;
        }
        if (user) {
          friend.user = user;
        }
        await this.userCacheService.serializeAndCache(user!, '4 weeks');
      }
    }
    if (favouritedOnly) {
      return friends.filter(contact => contact.isFavourite);
    }
    return friends;
  }

  public async sendFollowRequest(fromUserId: string, toUserId: string) {
    const me = await this.userRepository.findOne(fromUserId);
    const other = await this.userRepository.findOne(toUserId);
    if (!isNil(me) && !isNil(other)) {
      const userPrivacy = await this.calculateUserPrivacy(me, other.id);
      if (userPrivacy !== UserPrivacy.NONE) {
        throw new ForbiddenException('You cannot Follow This User.');
      }
      const hasPreviousRequest = await this.hasPreviousFollowRequest(me, other);
      if (hasPreviousRequest !== FollowRequestStatus.NONE) {
        return {
          message: 'You have a previus follow request with that user.',
          error: true,
        };
      }
      const f = new FollowRequest();
      f.me = me;
      f.other = other;
      f.status = FollowRequestStatus.PENDING;
      const saved = await this.followRequestRepository.save(f);
      return saved;
    } else {
      throw new NotFoundException('User Not found.');
    }
  }

  public async getMyFollowRequests(userId: string, page: string, limit: string) {
    let p = parseInt(page) || 0;
    p = p < 0 ? 1 : p;
    let l = parseInt(limit) || 20;
    l = l < 0 ? 20 : l;
    const followRequests = await this.followRequestRepository
      .createQueryBuilder('followRequest')
      .select()
      .leftJoinAndSelect('followRequest.me', 'me')
      .leftJoinAndSelect('me.profile', 'meProfile')
      .where('followRequest.other.id = :userId', { userId })
      .andWhere('followRequest.status = :status', { status: FollowRequestStatus.PENDING })
      .take(l)
      .skip((p - 1) * l)
      .getMany();
    return followRequests;
  }

  public async changeFollowRequestStatus(userId: string, requestId: string, status: string) {
    let s: FollowRequestStatus;
    switch (status) {
      case 'accept':
        s = FollowRequestStatus.ACCEPTED;
        break;
      case 'cancel':
        s = FollowRequestStatus.CANCELED;
        break;
      default:
        s = FollowRequestStatus.ACCEPTED;
        break;
    }
    const request = await this.followRequestRepository
      .createQueryBuilder('followRequest')
      .select()
      .leftJoinAndSelect('followRequest.me', 'me')
      .where('followRequest.id = :requestId', { requestId })
      .andWhere('followRequest.other.id = :userId', { userId })
      .andWhere('followRequest.status = :status', { status: FollowRequestStatus.PENDING })
      .getOne();
    if (!isNil(request)) {
      request.status = s;
      if (s === FollowRequestStatus.ACCEPTED) {
        await this.userContactsCacheService.cacheUserFollowers(userId, [{ user: request.me }]);
      }
      await this.followRequestRepository.update(request.id, request);
      return {
        message: `Request Updated with status ${status}`,
      };
    } else {
      throw new NotFoundException('Follow Request Not found');
    }
  }

  public async getUserFollowers(id) {
    const cachedFollowers = await this.userContactsCacheService.getUserFollowers(id);
    if (cachedFollowers.length > 0) {
      return cachedFollowers;
    }
    const followers = await this.userContactsRepository
      .createQueryBuilder('contact')
      .select()
      .where('contact.isUser = :isUser', { isUser: true })
      .andWhere('contact.userId = :id', { id })
      .leftJoinAndSelect('contact.user', 'owner')
      .getMany();
    await this.userContactsCacheService.cacheUserFollowers(id, followers);
    return followers.map(f => f.user!.id.toString());
  }

  public async getMyContactByMobileNumber(
    { id }: { id: string },
    mobileNumber: string,
  ): Promise<UserContacts> {
    const cachedContact = await this.userContactsCacheService.getMyContactByMobileNumber(
      id,
      mobileNumber,
    );
    if (!isNil(cachedContact)) {
      return cachedContact as UserContacts;
    } else {
      const contact = await this.userContactsRepository
        .createQueryBuilder('contact')
        .select()
        .where('contact.user.id = :id', { id })
        .andWhere('contact.mobileNumber = :mobileNumber', { mobileNumber })
        .getOne();
      if (!isNil(contact)) {
        return contact;
      } else {
        throw new NotFoundException('Contact Not Found');
      }
    }
  }

  public async isContactExist({ id }: { id: string }, mobileNumber: string): Promise<boolean> {
    const isExist = await this.userContactsCacheService.isContactExist(id, mobileNumber);
    if (isExist) {
      return true;
    }
    const contact = await this.userContactsRepository
      .createQueryBuilder('contact')
      .select()
      .where('contact.user.id = :id', { id })
      .andWhere('contact.mobileNumber = :mobileNumber', { mobileNumber })
      .getOne();
    if (isNil(contact)) {
      return false;
    }
    return true;
  }

  public async checkAuthorityToAccess(wantToAccessId: string, me: string) {
    const currentUser = await this.userService.findUserById(me, true);
    const otherUser = await this.userService.findUserById(wantToAccessId, true);
    const cond1: boolean = await this.isContactExist(otherUser, currentUser.mobileNumber);
    const cond2: boolean = await this.isContactExist(currentUser, otherUser.mobileNumber);
    return (cond1 && cond2) || otherUser.id.toString() === currentUser.id.toString();
  }

  public async calculateUserPrivacy(me: { id: any }, otherId: any) {
    return this.userPrivacyService.checkPrivacy(me, otherId);
  }

  public async followChannel(userId: string, channelId: string) {
    const user = (await this.userService.findUserById(userId, false)) as User;
    const channel = await this.userService.getUserChannel(channelId, true);
    const result = await this.userService.followChannel(user, channel);
    return { message: 'Done :D', statusCode: 200, result };
  }

  public async getChannelFollowingStatus(userId: string, channelId: string) {
    const status = await this.userService.getChannelFollowingStatus(userId, channelId);
    return { followingStatus: status };
  }
  public async getfollowingChannels(channelId: string, page: string, limit: string) {
    let p = parseInt(page) || 0;
    p = p <= 0 ? 1 : p;
    let l = parseInt(limit) || 20;
    l = l <= 0 ? 20 : l;
    return this.userService.getChannelfollowers(channelId, p, l);
  }

  public async getUserFollowingChannels(userId: string) {
    return this.userService.getUserFollowingChannels(userId);
  }

  public async unFollowChannel(userId: string, channelId: string) {
    const user = (await this.userService.findUserById(userId, false)) as User;
    const channel = await this.userService.getUserChannel(channelId);
    const result = await this.userService.unfollowChannel(user, channel);
    return { message: 'Done :D', statusCode: 200, result };
  }

  public async handleChannelFollowRequest(
    ownerId: string,
    userId: string,
    channelId: string,
    accept: boolean,
  ) {
    const owner = (await this.userService.findUserById(ownerId, false)) as User;
    const user = (await this.userService.findUserById(userId, false)) as User;
    const channel = await this.userService.getUserChannel(channelId);
    if (channel.owner.id.toString() === owner.id.toString()) {
      try {
        await this.userService.handleChannelFollowRequest(user, channel, accept);
        return { message: 'Done :D', statusCode: 200, result: accept };
      } catch {
        return { message: 'Done :D', statusCode: 200, result: !accept };
      }
    } else {
      throw new ForbiddenException('huh ?');
    }
  }
  public async getFollowChannelRequest(channelId: string) {
    return this.userService.getFollowChannelRequests(channelId);
  }

  public async assignContactToUser(
    contactMobileNumber: string,
    contactUserId: string,
  ): Promise<void> {
    try {
      const contacts = await this.userContactsRepository
        .createQueryBuilder('contact')
        .select()
        .leftJoinAndSelect('contact.user', 'owner')
        .where('contact.mobileNumber = :mobileNumber', { mobileNumber: contactMobileNumber })
        .getMany();
      if (isEmpty(contacts)) {
        return;
      }
      await this.userContactsRepository
        .createQueryBuilder()
        .update()
        .set({
          isUser: true,
          userId: contactUserId,
        })
        .where('mobileNumber = :mobileNumber', { mobileNumber: contactMobileNumber })
        .execute();
      for (const contact of contacts) {
        contact.isUser = true;
        contact.userId = contactUserId;
        await this.userContactsCacheService.addOrUpadateContact(contact.user.id, contact);
        this.eventEmitter.emit(
          'notification:subscribeToTopic',
          [contact.user.id],
          contactUserId,
          NotificationsTopics.USER_TOPIC,
        );
        await this.userContactsCacheService.addUserFollower(contact.userId, contact.user.id);
      }
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }

  public async hasPreviousFollowRequest(me: User, other: User) {
    const followRequest1 = await this.followRequestRepository
      .createQueryBuilder('followRequest')
      .select()
      .where('followRequest.me.id = :me', { me: me.id })
      .andWhere('followRequest.other.id = :other', { other: other.id })
      .andWhere('followRequest.status > :status', { status: FollowRequestStatus.NONE })
      .getOne();
    const followRequest2 = await this.followRequestRepository
      .createQueryBuilder('followRequest')
      .select()
      .where('followRequest.other.id = :me', { me: me.id })
      .andWhere('followRequest.me.id = :other', { other: other.id })
      .andWhere('followRequest.status > :status', { status: FollowRequestStatus.NONE })
      .getOne();
    if (followRequest1 || followRequest2) {
      return Math.max(
        Number(followRequest1 ? followRequest1.status : 0),
        Number(followRequest2 ? followRequest2.status : 0),
      );
    }
    return FollowRequestStatus.NONE;
  }

  private subscribeToEvents() {
    this.eventEmitter.on(
      'userContacts:assignContactToUser',
      async (contactMobileNumber: string, contactUserId: string) => {
        try {
          await this.assignContactToUser(contactMobileNumber, contactUserId);
        } catch {
          /// Sh.....
        }
      },
    );

    this.eventEmitter.on('userContacts:1follow2', async (contactOneId, contactTwoId) => {
      try {
        await this.userContactsCacheService.addUserFollower(contactOneId, contactTwoId);
        this.eventEmitter.emit(
          'timeline:cache:userHomeTimeline',
          contactOneId,
          undefined,
          contactTwoId,
        );
      } catch {
        // i don't care.
      }
    });
  }
}
