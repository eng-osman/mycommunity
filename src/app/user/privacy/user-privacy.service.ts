import { UserPrivacyCacheService } from '@app/user/privacy/user-privacy-cache.service';
import { UserContactsService } from '@app/user/user-contacts.service';
import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@shared/services';
import { Repository } from 'typeorm';
import { User, UsersPrivacy } from '../entities';
import { Channel } from '../entities/channel.entity';
import { UserService } from '../user.service';
import { UserPrivacy } from './user-privacy.enum';
@Injectable()
export class UserPrivacyService {
  private readonly logger: LoggerService = new LoggerService(UserPrivacyService.name);
  constructor(
    @InjectRepository(UsersPrivacy)
    private readonly userPrivacyRepository: Repository<UsersPrivacy>,
    @Inject(forwardRef(() => UserService)) private readonly userService: UserService,
    @Inject(forwardRef(() => UserContactsService))
    private readonly userContactsService: UserContactsService,
    private readonly userPrivacyCacheService: UserPrivacyCacheService,
  ) {}
  get repository() {
    return this.userPrivacyRepository;
  }

  public async checkPrivacy(me, other): Promise<UserPrivacy> {
    const cachedUserPrivacy1 = await this.userPrivacyCacheService.checkPrivacy(me.id, other);
    const cachedUserPrivacy2 = await this.userPrivacyCacheService.checkPrivacy(other, me.id);
    if (cachedUserPrivacy1 || cachedUserPrivacy2) {
      return Math.max(Number(cachedUserPrivacy1), Number(cachedUserPrivacy2));
    }
    const userPrivacy1 = await this.repository
      .createQueryBuilder('userPrivacy')
      .select()
      .where('userPrivacy.me.id = :me', { me: me.id })
      .andWhere('userPrivacy.other.id = :other', { other })
      .andWhere('userPrivacy.type > :type', { type: UserPrivacy.NONE })
      .getOne();
    const userPrivacy2 = await this.repository
      .createQueryBuilder('userPrivacy')
      .select()
      .where('userPrivacy.other.id = :me', { me: me.id })
      .andWhere('userPrivacy.me.id = :other', { other })
      .andWhere('userPrivacy.type > :type', { type: UserPrivacy.NONE })
      .getOne();
    if (userPrivacy1 || userPrivacy2) {
      // await this.userPrivacyCacheService.updateUsersPrivacy(userPrivacy);
      return Math.max(
        Number(userPrivacy1 ? userPrivacy1.type : 0),
        Number(userPrivacy2 ? userPrivacy2.type : 0),
      );
    }
    return UserPrivacy.NONE;
  }
  public async getUserBlockList(me): Promise<UsersPrivacy[]> {
    const cachedList = await this.userPrivacyCacheService.getBlackList(me.id);
    if (cachedList.length > 0) {
      return this.filterNone(cachedList);
    }
    const list = await this.repository
      .createQueryBuilder('userPrivacy')
      .select()
      .where('userPrivacy.me.id = :me', { me: me.id })
      .leftJoinAndSelect('userPrivacy.me', 'me')
      .leftJoinAndSelect('userPrivacy.other', 'other')
      .andWhere('userPrivacy.type > :type', { type: UserPrivacy.NONE })
      .getMany();
    await this.userPrivacyCacheService.cacheBlackList(list);
    const cached = await this.userPrivacyCacheService.getBlackList(me.id);
    return this.filterNone(cached);
  }

  public async blockUser(me, other, type: any) {
    try {
      // e7na hnl3b ?
      if (me.id.toString() === other) {
        throw new BadRequestException('Are you mad ? You can not block yourself !');
      }
      const hasPrivacy = await this.checkPrivacy(me, other);
      if (hasPrivacy !== UserPrivacy.NONE) {
        return await this.updatePrivacyType(me, other, type);
      }
      const privacy = new UsersPrivacy();
      privacy.me = (await this.userService.findUserById(me.id)) as User;
      privacy.other = (await this.userService.findUserById(other)) as User;
      let blockType = UserPrivacy.NONE;

      switch (type) {
        case 'none':
          blockType = UserPrivacy.NONE;
          break;
        case 'all':
          blockType = UserPrivacy.ALL;
          break;
        case 'chatOnly':
          blockType = UserPrivacy.CHAT_ONLY;
          break;
        case 'profile':
          blockType = UserPrivacy.PROFILE;
          break;
        default:
          blockType = UserPrivacy.NONE;
          break;
      }
      privacy.type = blockType;
      if (blockType === UserPrivacy.PROFILE || blockType === UserPrivacy.ALL) {
        await this.removeFromContacts(privacy.me, privacy.other);
        await this.removeFromContacts(privacy.other, privacy.me);
      }
      const result = await this.repository.save(privacy);
      await this.userPrivacyCacheService.updateUsersPrivacy(result);
      return result;
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async blockChannel(userId: string, channelId: string) {
    await this.userPrivacyCacheService.blockChannel(userId, channelId);
    return { message: 'channel blocked', channelId, statusCode: 200 };
  }

  public async unblockChannel(userId: string, channelId: string) {
    await this.userPrivacyCacheService.unblockChannel(userId, channelId);
    return { message: 'channel unblocked', channelId, statusCode: 200 };
  }

  public async listBlockedChannels(userId: string, page: string, limit: string) {
    const list = await this.userPrivacyCacheService.getBlockedChannels(userId);
    const p = parseInt(page) || 1;
    const l = parseInt(limit) || 20;
    const offsetStart = (p - 1) * l;
    const offsetEnd = offsetStart + l;
    const ids = list.slice(offsetStart, offsetEnd);
    const channels: Channel[] = [];
    for (const id of ids) {
      try {
        const channel = await this.userService.getChannelById(id);
        channels.push(channel);
      } catch {
        continue;
      }
    }
    return channels;
  }

  public async isBlockedChannel(userId: string, channelId: string) {
    return this.userPrivacyCacheService.isBlockedChannel(userId, channelId);
  }
  public async updatePrivacyType(me, other, type: any) {
    const userPrivacy = await this.repository
      .createQueryBuilder('userPrivacy')
      .leftJoinAndSelect('userPrivacy.me', 'me')
      .leftJoinAndSelect('userPrivacy.other', 'other')
      .where('userPrivacy.me.id = :me', { me: me.id })
      .andWhere('userPrivacy.other.id = :other', { other })
      .getOne();
    if (userPrivacy) {
      let blockType = UserPrivacy.NONE;
      switch (type) {
        case 'none':
          blockType = UserPrivacy.NONE;
          break;
        case 'all':
          blockType = UserPrivacy.ALL;
          break;
        case 'chatOnly':
          blockType = UserPrivacy.CHAT_ONLY;
          break;
        case 'profile':
          blockType = UserPrivacy.PROFILE;
          break;
        default:
          blockType = UserPrivacy.NONE;
          break;
      }
      userPrivacy.type = blockType;
      await this.repository.update(userPrivacy.id, userPrivacy);
      await this.userPrivacyCacheService.updateUsersPrivacy(userPrivacy);
      if (blockType === UserPrivacy.NONE) {
        // restore the contact again.
        await this.userContactsService.restoreContact(me, other);
      }
      return { statusCode: 200, message: 'Privacy updated' };
    }
    return { statusCode: 404, message: 'There is no privacy to be updated' };
  }

  public async removePrivacy(me, other) {
    return this.updatePrivacyType(me, other, UserPrivacy.NONE);
  }

  public async checkChatPrivacy(users) {
    const cachedPrivacy = await this.userPrivacyCacheService.checkChatPrivacy(users);
    if (cachedPrivacy !== null) {
      return cachedPrivacy;
    }
    const user1 = await this.userService.repository.findOne(users[0], {
      select: ['id', 'mobileNumber'],
    });
    const user2 = await this.userService.repository.findOne(users[1], {
      select: ['id', 'mobileNumber'],
    });
    if (user1 && user2) {
      const privacy1 = await this.checkPrivacy(user1, user2.id);
      const privacy2 = await this.checkPrivacy(user2, user1.id);
      if (
        privacy1 === UserPrivacy.ALL ||
        privacy1 === UserPrivacy.CHAT_ONLY ||
        privacy2 === UserPrivacy.ALL ||
        privacy2 === UserPrivacy.CHAT_ONLY
      ) {
        return false;
      } else {
        return true;
      }
    } else {
      return false;
    }
  }

  private async removeFromContacts(me, other) {
    const isContact = await this.userContactsService.isContactExist(me, other.mobileNumber);
    if (isContact) {
      await this.userContactsService.removeContact(me, other.mobileNumber);
    }
  }

  private filterNone(list: UsersPrivacy[]): UsersPrivacy[] {
    return list.filter(p => !(p.type === UserPrivacy.NONE || p.type.toString() === 'NONE'));
  }
}
