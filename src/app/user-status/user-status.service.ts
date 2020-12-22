import { NotificationsTopics } from '@app/firebase/notifications-topics.enum';
import { FanActionMessage } from '@app/firehose/messages/fan-action.message';
import { UserMedia } from '@app/media/entities';
import { MediaService } from '@app/media/media.service';
import { ApplicationSettingsService } from '@app/settings/app-settings.service';
import { UserStatusCacheService } from '@app/user-status/user-status-cache.service';
import { User } from '@app/user/entities';
import { UserContactsService } from '@app/user/user-contacts.service';
import { UserService } from '@app/user/user.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { GeoLocation } from '@shared/classes';
import { InjectAgenda, InjectEventEmitter } from '@shared/decorators';
import { UserMetadata } from '@shared/interfaces';
import { LoggerService } from '@shared/services';
import * as Agenda from 'agenda';
import { EventEmitter2 } from 'eventemitter2';
import { Model } from 'mongoose';
import { isNil, omit, pick } from 'ramda';
import { In, Repository } from 'typeorm';
import { CreateStatusDTO } from './dto/create-status.dto';
import { StatusActionDTO } from './dto/status-action.dto';
import { Status, StatusActions } from './entities';
import { GlobalMediaWinner } from './interfaces/global-media-winner.interface';
import { GlobalMedia } from './interfaces/global-media.interface';
import { Question } from './interfaces/questions.interface';
import { Recommendation } from './interfaces/recommendation.interface';
import { StatusAction } from './status-actions.enum';
import { StatusPrivacy } from './status-privacy.enum';

@Injectable()
export class UserStatusService implements OnModuleInit {
  private readonly logger: LoggerService = new LoggerService(UserStatusService.name);

  constructor(
    @InjectRepository(Status) private readonly statusRepository: Repository<Status>,
    @InjectRepository(StatusActions)
    private readonly statusActionsRepository: Repository<StatusActions>,
    @InjectModel('Recommendation') private readonly recommendationStatus: Model<Recommendation>,
    @InjectModel('GlobalMedia') private readonly globalMedia: Model<GlobalMedia>,
    @InjectModel('Question') private readonly questions: Model<Question>,
    @InjectModel('GlobalMediaWinner') private readonly globalMediaWinner: Model<GlobalMediaWinner>,
    @InjectAgenda() private readonly agenda: Agenda,
    private readonly userService: UserService,
    private readonly mediaService: MediaService,
    private readonly userContactsService: UserContactsService,
    private readonly userStatusCacheService: UserStatusCacheService,
    private readonly appSettingsService: ApplicationSettingsService,
    @InjectEventEmitter() private readonly emitter: EventEmitter2,
  ) {}

  public async onModuleInit() {
    this.logger.log('Starting Agenda !');
    await (this.agenda as any)._ready;
    this.logger.log('Agenda is Ready !');
    this.agenda.define('double-actions', async (job, done) => {
      this.doubleActions().then(() => {
        this.logger.log(`Job #${job.attrs._id} for ${job.attrs.name} Completed!`);
        done();
      });
    });
    this.agenda.every('12 hours', 'double-actions');
    await this.agenda.start();
    this.subscribeToEvents();
  }

  get repository() {
    return this.statusRepository;
  }

  //#region GET
  /**
   * @deprecated
   * @see timeline
   * What a f****n bad code !
   */
  public async findUserStatuses(
    id,
    type: 'story' | 'media' | 'status' | 'all' = 'status',
    limit: number = 20,
    page: number = 1,
    includeReplies = false,
    user,
  ): Promise<Status[]> {
    if (limit <= 50) {
      page = page <= 0 ? 1 : page;
      const q = this.statusRepository
        .createQueryBuilder('status')
        .select()
        .where('status.user.id = :id', { id });
      if (type === 'all') {
        q.andWhere('status.type <> :type', { type: 'story' });
      } else if (type === 'story') {
        q.andWhere('status.createdAt > (NOW() - INTERVAL 24 HOUR)');
      } else {
        q.andWhere('status.type = :type', { type });
      }
      q.andWhere('status.isReply = :includeReplies', { includeReplies })
        .andWhere('status.deleted = :isStatusDeleted', { isStatusDeleted: false })
        .leftJoinAndSelect(
          'status.parent',
          'statusParent',
          'statusParent.deleted = :isStatusDeleted',
          { isStatusDeleted: false },
        )
        .leftJoinAndSelect(
          'statusParent.parent',
          'statusChildParent',
          'statusChildParent.deleted = :isStatusDeleted',
          { isStatusDeleted: false },
        )
        .leftJoinAndSelect('status.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect(
          'status.originalStatus',
          'originalStatus',
          'originalStatus.deleted = :isStatusDeleted',
          { isStatusDeleted: false },
        )
        .leftJoinAndSelect('originalStatus.user', 'originalStatusUser')
        .leftJoinAndSelect('originalStatusUser.profile', 'originalStatusUserprofile')
        .orderBy('status.createdAt', 'DESC');

      if (user.id !== id) {
        q.andWhere('status.privacy = :privacy', { privacy: StatusPrivacy.PUBLIC });
      }
      return q
        .take(limit)
        .skip((page - 1) * limit)
        .getMany();
    } else {
      throw new BadRequestException('limit should be less than or equal 50');
    }
  }

  public async buildUserTimeline(userId) {
    const timeline = await this.repository
      .createQueryBuilder('status')
      .select()
      .where('status.user.id = :userId', { userId })
      .andWhere('status.isReply = :isReply', { isReply: false })
      .andWhere('status.deleted = :isStatusDeleted', { isStatusDeleted: false })
      .orderBy('createdAt', 'DESC')
      .getMany();

    const mediaOnly = timeline.filter(s => s.type === 'media');
    const all = timeline.filter(
      s => s.type !== 'media' && s.type !== 'story' && s.type !== 'channelMedia',
    );
    const channelMedia = timeline.filter(s => s.type === 'channelMedia');
    this.emitter.emit('timeline:cache:userTimeline', userId, all);
    this.emitter.emit('timeline:cache:userMedia', userId, mediaOnly);
    this.emitter.emit('timeline:cache:channelMedia', userId, channelMedia);
  }

  public async findUserActions(
    { id },
    type: 'like' | 'dislike' | 'view' = 'like',
    limit: number = 20,
    page: number = 1,
  ) {
    if (limit <= 50) {
      page = page <= 0 ? 1 : page;
      const actionType = StatusAction[type.toLocaleUpperCase()];
      const results = await this.statusActionsRepository
        .createQueryBuilder('action')
        .leftJoinAndSelect('action.status', 'status')
        .where('action.user.id = :id', { id })
        .andWhere('action.type = :type', { type: actionType })
        .andWhere('status.deleted = :isStatusDeleted', {
          isStatusDeleted: false,
        })
        .take(limit)
        .skip((page - 1) * limit)
        .getMany();
      const actions: Array<Partial<StatusActions>> = [];
      for (const result of results) {
        const action = omit(['status'], result);
        action.statusId = result.status.id;
        actions.push(action);
      }
      return actions;
    } else {
      throw new BadRequestException('limit should be less than or equal 50');
    }
  }

  public async findStatusActions(
    id,
    type: 'like' | 'dislike' | 'view' = 'like',
    limit: number = 20,
    page: number = 1,
  ) {
    if (limit <= 50) {
      page = page <= 0 ? 1 : page;
      const actionType = StatusAction[type.toLocaleUpperCase()] || StatusAction.LIKE;
      const result = await this.statusActionsRepository
        .createQueryBuilder('action')
        .leftJoinAndSelect('action.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('action.status', 'status')
        .where('action.status.id = :id', { id })
        .andWhere('action.type = :type', { type: actionType })
        .andWhere('status.deleted = :isStatusDeleted', { isStatusDeleted: false })
        .take(limit)
        .skip((page - 1) * limit)
        .getMany();
      const usersActions = result.map(a => [a.user.id as string, a.type] as [string, StatusAction]);
      await this.userStatusCacheService.cacheUsersActions(id, usersActions);
      const actions = result.map(r => omit(['status'], r));
      return actions;
    } else {
      throw new BadRequestException('limit should be less than or equal 50');
    }
  }

  public async createStatus(status: CreateStatusDTO, user: { id: string }) {
    const owner = (await this.userService.findUserById(user.id)) as User;
    await this.validateStatus(status, owner);
    const s = new Status();
    s.media = [];
    s.hasMedia = status.hasMedia;
    s.type = status.type;
    s.isPublicGlobal = status.isPublicGlobal || false;
    s.local_id = status.local_id;
    s.hideOriginalStatusOwner = status.hideOriginalStatusOwner || false;
    if (status.hasMedia) {
      s.media = await this.mediaService.getMediaAll(status.mediaIds);
      s.mediaHashs = s.media.map(m => m.mediaHash);
    }

    if (status.hasPrivacy) {
      s.hasPrivacy = true;
      s.privacy = status.privacy;
    }

    if (status.isGeoEnabled) {
      s.coordinates = status.coordinates;
      s.locationName = status.locationName;
    }

    // handle rate type
    if (status.type === 'rate') {
      s.stars = parseFloat(status.stars.toFixed(2));
      s.coordinates = status.coordinates;
      s.locationName = status.locationName;
    }
    // Handle Share Status
    if (status.isShare) {
      s.originalStatus = await this.handleShare(status, user);
      s.hasMedia = false;
      s.isShare = true;
      s.media = [];
      s.type = 'status';
    }

    // Handle Reply in status
    if (status.isReply) {
      s.parent = await this.handleReplies(status, user);
      s.isReply = true;
    }
    // Handle Mentions
    if (status.mentions && Array.isArray(status.mentions)) {
      s.mentions = await this.handleMentions(status);
    } else {
      s.mentions = [];
    }
    // Handle Live Video
    if (status.isLive) {
      s.isLive = true;
      s.liveVideoChannelId = status.channelId;
      s.media = [];
      s.type = 'status';
      s.isReply = false;
    }
    s.text = status.text;
    s.contactsToshow = status.contactsToshow;
    try {
      s.user = owner;
      const saved = await this.statusRepository.save(s);
      (saved as any).local_id = status.local_id;
      if (saved.type === 'channelMedia') {
        const channel = await this.userService.addChannelMedia(saved);
        saved.channel = channel;
      }
      await this.statusRepository.save(saved);
      Promise.all([
        this.updateUserTimeline(saved),
        this.updateUserHomeTimeline(saved),
        this.sendNotificationsToFollowers(saved),
        this.updateCountryTimeline(saved),
        this.emitter.emit(
          'notification:subscribeToTopic',
          [saved.user.id],
          saved.id,
          NotificationsTopics.STATUS_TOPIC,
        ),
      ]);

      if (saved.mentions && Array.isArray(saved.mentions)) {
        this.emitter.emit(
          'notification:subscribeToTopic',
          saved.mentions,
          saved.id,
          NotificationsTopics.STATUS_TOPIC,
        );
      }

      const fullStatus = await this.getStatusById(saved.id, saved.user);
      (fullStatus as any).local_id = status.local_id;
      if (!saved.isReply) {
        await this.handleAnalytics(s.user);
      }
      if (saved.isReply) {
        await this.userStatusCacheService.addReplyToStatus(saved.parent.id, saved.id);
        const statusParent = await this.getStatusById(saved.parent.id, saved.user);
        const repliesCount = statusParent.counters.commentCount;
        const fanEvent: FanActionMessage = {
          isCommentOrReply: true,
          entity: fullStatus,
          count: parseInt(repliesCount as any) + 1,
          actionType: StatusAction.REPLY,
        };
        this.emitter.emit('timeline:startFanAction', saved.parent.id, fanEvent);
      }
      if (saved.type === 'rate') {
        await this.handleRecommendation(saved);
      }

      if (saved.isPublicGlobal) {
        await this.handleGlobalMedia(saved);
      }

      if (saved.type === 'help') {
        await this.handleQuestions(saved, status.priority);
      }

      if (saved.type === 'competition' && status.isPublicGlobal) {
        await this.handleCompetitionMedia(saved);
      }

      if (!isNil(saved.withUserId)) {
        await this.addToAnotherUserTimeline(saved);
      }
      if (fullStatus.isShare) {
        fullStatus.originalStatus = await this.getStatusById(
          fullStatus.originalStatus.id,
          saved.user,
        );
      }
      await this.fanoutStatus(fullStatus);
      const result = pick(['createdAt', 'id', 'media', 'mentions'], fullStatus);
      (result as any).local_id = status.local_id;
      return result;
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }
  //#endregion

  public async getStatusById(id: string, user, skipCache = false, skipPrivacyCheck = false) {
    if (!id) {
      throw new BadRequestException('Where is the Status Id ?');
    }
    try {
      // Check the cached version first
      if (!skipCache) {
        const [cachedStatus] = await this.userStatusCacheService.getAll([id], user);
        if (cachedStatus) {
          const isDeleted = this.checkAvailability(cachedStatus);
          if (isDeleted) {
            // i think if we deleted it, it will fallback to the database
            // and it will just take time to find it was delete, so why ?!
            // await this.userStatusCacheService.deleteCache(id);
            throw new NotFoundException('Status Not Found, Maybe it has been removed?');
          }
          const isUserAllowed = await this.calculateStatusPrivacy(cachedStatus, user);
          if (isUserAllowed) {
            return cachedStatus;
          } else {
            throw new ForbiddenException('you are not allowed to view this status');
          }
        }
      }
      // OH MY !
      const status = await this.repository
        .createQueryBuilder('status')
        .where('status.id = :id', { id })
        .andWhere('status.deleted = :isStatusDeleted', { isStatusDeleted: false })
        .leftJoinAndSelect('status.replies', 'replies')
        .leftJoinAndSelect('status.parent', 'statusParent')
        .leftJoinAndSelect('statusParent.parent', 'statusChildParent')
        .leftJoinAndSelect('status.user', 'user')
        .leftJoinAndSelect('status.channel', 'channel', 'status.type = :statusType', {
          statusType: 'channelMedia',
        })
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('status.originalStatus', 'originalStatus')
        .leftJoinAndSelect('originalStatus.user', 'originalStatusUser')
        .leftJoinAndSelect('originalStatusUser.profile', 'originalStatusUserprofile')
        .getOne();
      if (!status || this.checkAvailability(status)) {
        throw new NotFoundException('Status Not Found, Maybe it has been removed?');
      }
      await this.userStatusCacheService.serializeAndCache([status], '4 weeks');
      const isAllowed = skipPrivacyCheck ? true : await this.calculateStatusPrivacy(status, user);
      if (isAllowed) {
        const [cachedStatus] = await this.userStatusCacheService.getAll([id], user);
        if (!cachedStatus) {
          throw new NotFoundException('The Owner of this Status is deactivated');
        }
        return cachedStatus;
      } else {
        throw new ForbiddenException('you are not allowed to view this status');
      }
    } catch (error) {
      throw error;
    }
  }

  //#region Actions

  public async getStatusShares(statusId: string, limit: number = 20, page: number = 1) {
    try {
      page = page <= 0 ? 1 : page;
      limit = limit > 50 ? 50 : limit;
      return await this.statusRepository
        .createQueryBuilder('status')
        .innerJoinAndSelect(
          'status.originalStatus',
          'originalStatus',
          'originalStatus.id = :statusId',
          {
            statusId,
          },
        )
        .leftJoinAndSelect('status.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('originalStatus.user', 'originalStatusUser')
        .leftJoinAndSelect('originalStatusUser.profile', 'originalStatusUserProfile')
        .where('status.deleted = :isDeleted', { isDeleted: false })
        .andWhere('originalStatus.deleted = :deleted', { deleted: false })
        .take(limit)
        .skip((page - 1) * limit)
        .orderBy('status.counters.likesCount', 'DESC')
        .getMany();
    } catch (error) {
      throw error;
    }
  }

  public async getStatusReplies(
    statusId: string,
    user,
    limit: number = 30,
    page: number = 1,
    sortByReactions = false,
    includeChilds = false,
  ) {
    page = parseInt(page as any) < 0 ? 1 : parseInt(page as any);
    limit = parseInt(limit as any) > 50 ? 50 : parseInt(limit as any);
    try {
      const cachedReplies = await this.userStatusCacheService.buildStatusReplies(
        statusId,
        user,
        page,
        limit,
      );
      const filtered = await this.filterStatusReplies(cachedReplies);
      const buildReplies = () => {
        if (sortByReactions) {
          const sorted = filtered.sort((a, b) => {
            const s =
              b.counters.likesCount +
              b.counters.dislikesCount -
              (a.counters.likesCount + a.counters.dislikesCount);
            return s;
          });
          return sorted;
        } else {
          return filtered;
        }
      };

      const replies = buildReplies();
      const buildReplyChilds = () =>
        Promise.all(
          replies.map(async r => {
            const childs = await this.getStatusReplies(r.id, user, 10, 1, false, false);
            r.replies = childs.map(c => {
              delete c.parent;
              delete c.channel;
              return c;
            });
            return r;
          }),
        );

      if (includeChilds) {
        return buildReplyChilds();
      } else {
        return replies;
      }
      // const replies = await this.statusRepository
      //   .createQueryBuilder('status')
      //   .leftJoinAndSelect('status.parent', 'parent')
      //   .where('parent.id = :statusId', { statusId })
      //   .andWhere('parent.deleted = :deleted', { deleted: false })
      //   .andWhere('status.deleted = :deleted', { deleted: false })
      //   .take(limit)
      //   .skip((page - 1) * limit)
      //   .getMany();
    } catch (error) {
      throw error;
    }
  }

  public async makeAction({ actionType, statusId }: StatusActionDTO, { id }) {
    const status = await this.getStatusById(statusId, { id });
    const user = (await this.userService.findUserById(id)) as User;
    if (user.isSystem) {
      return {
        statusCode: 200,
        message: 'you are a system account, so no actions',
      };
    }
    const newActionType: StatusAction = StatusAction[actionType.toUpperCase()];
    const action = new StatusActions();
    action.status = status;
    action.user = user;
    const [oldAction, viewAction] = await this.checkUserActionInStatus(statusId, id);
    if (!isNil(viewAction)) {
      // That User has viewed that status before, let's return now !
      // no, wait, we need to check for the new action first !
      if (newActionType === StatusAction.VIEW) {
        // Aha, we can return now !
        return {
          statusCode: 200,
          message: 'Viewed Before !',
        };
      }
    } else {
      // ok this maybe a new view or something else
      // first we need to check if that user is the owner of that status
      // and the new action is a view
      if (newActionType === StatusAction.VIEW && status.user.id.toString() === user.id.toString()) {
        // yes, it's his status, return !
        return {
          statusCode: 200,
          message: 'Viewed Before (Your Status) !',
        };
      } else {
        // ok, it's a new view !
        action.type = StatusAction.VIEW;
      }
    }

    if (!isNil(oldAction)) {
      // That User has an old action that maybe a LIKE or DISLIKE
      // anyway, we need to delete that action.
      await this.deleteUserAction(status, user, oldAction);
      if (oldAction.type === newActionType) {
        // and until here, we don't have to do anything else.
        return { message: 'Action Deleted', statusCode: 200 };
      } else {
        // oh, maybe the user changed his mind.
        // and we since we already deleted the old, so let's create the new one.
        action.type = newActionType;
      }
    } else {
      // it's seems that it is a new action here
      action.type = newActionType;
    }

    const fanEvent: FanActionMessage = {
      actionType: action.type,
      count: 0,
      isCommentOrReply: false,
    };
    switch (action.type) {
      case StatusAction.LIKE:
        if (status.counters.likesCount < 0) {
          status.counters.likesCount = 0;
        }
        status.counters.likesCount++;
        fanEvent.count = status.counters.likesCount;
        const p: Array<Promise<unknown>> = [
          this.userStatusCacheService.updateCounters(status.id, 'likesCount', '+'),
          this.emitter.emitAsync('analytics:incrHomeGlobalStaticsKey', 'likes'),
          this.emitter.emitAsync('analytics:updateUserStatics', user.id, 'totalLikes'),
        ];
        if (status.isPublicGlobal) {
          p.push(this.emitter.emitAsync('timeline:update:incTopGlobalMedia', status.id));
        }
        await Promise.all(p);
        break;
      case StatusAction.DISLIKE:
        if (status.counters.dislikesCount < 0) {
          status.counters.dislikesCount = 0;
        }
        status.counters.dislikesCount++;
        fanEvent.count = status.counters.dislikesCount;
        await Promise.all([
          this.userStatusCacheService.updateCounters(status.id, 'dislikesCount', '+'),
          this.emitter.emit('analytics:incrHomeGlobalStaticsKey', 'dislikes'),
          this.emitter.emit('analytics:updateUserStatics', user.id, 'totalDislikes'),
        ]);
        break;
      case StatusAction.VIEW:
        if (status.counters.viewsCount < 0) {
          status.counters.viewsCount = 0;
        }
        status.counters.viewsCount++;
        fanEvent.count = status.counters.viewsCount;
        await this.userStatusCacheService.updateCounters(status.id, 'viewsCount', '+');
        break;
      default:
        // No !?
        break;
    }
    await this.repository.update(status.id, {
      counters: {
        likesCount: status.counters.likesCount,
        sharedCount: status.counters.sharedCount,
        dislikesCount: status.counters.dislikesCount,
        viewsCount: status.counters.viewsCount,
        commentCount: status.counters.sharedCount,
      },
    });
    await this.statusActionsRepository.save(action);
    // FIRE Notification To That Status Topic
    // and Make the user subscribe to it's topic
    if (action.type !== StatusAction.VIEW) {
      Promise.all([
        this.emitter.emit('timeline:startFanAction', statusId, fanEvent),
        this.emitter.emit(
          'notification:fanoutToTopic',
          status.id,
          NotificationsTopics.STATUS_TOPIC,
          { status, user, action: action.type },
        ),
        // Don't subscribe when you make that actions
        // this.emitter.emit(
        //   'notification:subscribeToTopic',
        //   [user.id],
        //   status.id,
        //   NotificationsTopics.STATUS_TOPIC,
        // ),
        // this.emitter.emit(
        //   'notification:subscribeToTopic',
        //   [user.id],
        //   'global',
        //   NotificationsTopics.TOP_GLOBAL_MEDIA_TOPIC,
        // ),
      ]);
    }
    await this.userStatusCacheService.cacheUsersActions(statusId, [[user.id, action.type]]);
    return { message: 'Action Created', statusCode: 200, type: actionType };
  }

  public async deleteUserAction(status: Status, user, action: StatusActions) {
    if (action) {
      await this.statusActionsRepository.delete(action.id);
    } else {
      await this.statusActionsRepository
        .createQueryBuilder('action')
        .leftJoinAndSelect('action.status', 'status', 'status.id = :statusId', {
          statusId: status.id,
        })
        .leftJoinAndSelect('action.user', 'user', 'user.id = :userId', { userId: user.id })
        .delete()
        .execute();
    }

    const fanEvent: FanActionMessage = {
      actionType: action.type,
      count: 0,
      isCommentOrReply: false,
    };
    switch (action.type) {
      case StatusAction.LIKE:
        status.counters.likesCount--;
        if (status.counters.likesCount < 0) {
          status.counters.likesCount = 0;
        }
        fanEvent.count = status.counters.likesCount;
        await this.userStatusCacheService.updateCounters(status.id, 'likesCount', '-');
        break;
      case StatusAction.DISLIKE:
        status.counters.dislikesCount--;
        if (status.counters.dislikesCount < 0) {
          status.counters.dislikesCount = 0;
        }
        fanEvent.count = status.counters.dislikesCount;
        await this.userStatusCacheService.updateCounters(status.id, 'dislikesCount', '-');
        break;
      case StatusAction.VIEW:
        break;
    }
    await this.repository.update(status.id, {
      counters: {
        likesCount: status.counters.likesCount,
        sharedCount: status.counters.sharedCount,
        dislikesCount: status.counters.dislikesCount,
        viewsCount: status.counters.viewsCount,
        commentCount: status.counters.sharedCount,
      },
    });
    this.emitter.emit('timeline:startFanAction', status.id, fanEvent);
    await this.userStatusCacheService.removeUserAction(status.id, user.id);
  }

  public async checkUserActionInStatus(statusId: string, userId: string) {
    //            Like, Dislike, or Null    View or Null
    const result: [StatusActions | null, StatusActions | null] = [null, null];
    try {
      const actions = await this.statusActionsRepository
        .createQueryBuilder('action')
        .select()
        .where('action.status.id = :statusId', { statusId })
        .andWhere('action.user.id = :userId', { userId })
        .take(2)
        .getMany();
      for (const action of actions) {
        if (action.type === StatusAction.VIEW) {
          result[1] = action;
        } else {
          result[0] = action;
        }
      }
      return result;
    } catch (error) {
      this.logger.error(error.message, error);
      return result;
    }
  }
  //#endregion

  public async getRecommendation(
    user,
    long: number,
    lat: number,
    distance: number,
    maxRate: number = 5,
    minRate: number = 1,
    limit: number = 20,
    page: number = 1,
  ) {
    page = page <= 0 ? 1 : page;
    limit = limit > 50 ? 50 : limit;
    const query: any = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [long, lat],
          },
          $maxDistance: distance,
        },
      },
    };
    const matched: [{ userId: string; statusId: string }] = await this.recommendationStatus
      .find(query, { statusId: 1, _id: 0 })
      .limit(limit)
      .skip((page - 1) * limit)
      .sort('-createdAt')
      .lean()
      .exec();
    const result: Array<{
      stars: number;
      id: string;
      locationName: string;
      coordinates: string;
      media;
      text: string;
    }> = [];
    for (const { statusId } of matched) {
      try {
        const status = await this.getStatusById(statusId, user);
        result.push({
          stars: status.stars,
          id: status.id,
          locationName: status.locationName,
          coordinates: status.coordinates,
          media: status.media,
          text: status.text,
        });
      } catch {
        continue;
      }
    }
    const filteredResult = result.filter(s => s.stars <= maxRate && s.stars >= minRate);
    return filteredResult;
  }

  public async getGlobalMedia(
    user,
    long: number,
    lat: number,
    distance: number,
    page: number = 1,
    limit: number = 30,
    countOnly = true,
  ) {
    const query: any = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [long, lat],
          },
          $maxDistance: distance,
        },
      },
    };
    try {
      if (countOnly) {
        const count = await this.globalMedia.count(query).exec();
        return {
          count,
        };
      } else {
        const matched: [{ userId: string; statusId: string }] = await this.recommendationStatus
          .find(query, { statusId: 1, _id: 0 })
          .limit(limit)
          .skip((page - 1) * limit)
          .sort('-createdAt')
          .lean()
          .exec();
        const result: unknown[] = [];
        for (const { statusId } of matched) {
          try {
            const status = await this.getStatusById(statusId, user);
            result.push(status);
          } catch {
            continue;
          }
        }
        return result;
      }
    } catch (error) {
      this.logger.error(error.message, error);
      throw new InternalServerErrorException('Error While Getting Global Media!');
    }
  }

  public async getQuestions({
    user,
    priority,
    limit = 30,
    page = 1,
    myQuestionsOnly,
  }: {
    user;
    priority: number;
    limit: number;
    page: number;
    myQuestionsOnly: boolean;
  }) {
    try {
      const deadline = new Date();
      const q: any = {
        priority,
        solved: false,
        createdAt: {
          $gte: deadline,
        },
      };
      if (myQuestionsOnly) {
        q.userId = user.id.toString();
      } else {
        q.userId = { $ne: user.id.toString() };
      }
      if (priority === 10) {
        deadline.setMinutes(deadline.getMinutes() - 30);
      } else {
        deadline.setMinutes(deadline.getMinutes() - 24 * 60);
      }
      const matched: [
        { statusId: string; userId: string; priority: number; solved: boolean; createdAt }
      ] = await this.questions
        .find(q, { _id: 0 })
        .limit(limit)
        .skip((page - 1) * limit)
        .sort('-createdAt')
        .lean()
        .exec();
      const result: any[] = [];
      for (const status of matched) {
        try {
          const { id, text, currentUserAction, counters } = await this.getStatusById(
            status.statusId,
            user,
          );
          delete currentUserAction.isLike;
          delete currentUserAction.isDislike;
          delete counters.dislikesCount;
          delete counters.likesCount;
          const solved = status.solved;
          const notFromatedcreatedAt = status.createdAt;
          const createdAt = notFromatedcreatedAt.toISOString().slice(0, 19);
          result.push({ id, text, currentUserAction, counters, priority, solved, createdAt });
        } catch {
          continue;
        }
      }
      const viewedQuestion = result.filter(s => s.currentUserAction.isView);
      const notViewedQuestions = result.filter(s => !s.currentUserAction.isView);
      const sortedQuestions = [...notViewedQuestions, ...viewedQuestion];
      return sortedQuestions;
    } catch (error) {
      this.logger.error(error.message, error);
      throw new InternalServerErrorException('Error While Getting Questions!');
    }
  }

  public async getChannelsByKeyword(user, q: string) {
    const keyword = q.toLowerCase().trim();
    if (keyword === '') {
      return [];
    }
    const matched = await this.repository
      .createQueryBuilder('status')
      .leftJoinAndSelect('status.channel', 'channel')
      .where('status.type = :t', { t: 'channelMedia' })
      .andWhere('LOWER(status.text) LIKE :q', { q: `%${keyword}%` })
      .orWhere('LOWER(channel.channelName) LIKE :q', { q: `%${keyword}%` })
      .orWhere('LOWER(channel.describtion) LIKE :q', { q: `%${keyword}%` })
      .take(30)
      .orderBy('status.id', 'DESC')
      .getMany();
    const ids = matched.map(s => s.id);
    const statuses = await this.userStatusCacheService.getAll(ids, user);
    return statuses;
  }

  public async editQuestion(user, statusId: string, data) {
    const pickedItems = pick(['priority', 'solved'], data);
    const updated = await this.questions.update(
      { userId: user.id.toString(), statusId },
      { $set: pickedItems },
    );
    if (updated.n === 1) {
      return { status: 200, message: 'question updated successfully' };
    } else {
      throw new NotFoundException('question not found!');
    }
  }

  public async getTopGlobalMediaWinners(user: any, page = 1, limit = 30) {
    try {
      const top = await this.globalMediaWinner
        .find()
        .limit(limit)
        .skip((page - 1) * limit)
        .sort('-createdAt')
        .exec();
      const statusIds = top.map(t => t.statusId);
      const statuses = await this.userStatusCacheService.getAll(statusIds, user);
      return statuses;
    } catch (error) {
      this.logger.error(error.message, error);
      throw new InternalServerErrorException('Error While Getting Top Global Media!');
    }
  }

  public async getTodaysTopGlobalMedia(user: any, page = 1, limit = 10) {
    try {
      const [statusIds] = await this.emitter.emitAsync(
        'timeline:get:topGlobalMediaWithLimit',
        page,
        limit,
      );
      const statuses = await this.userStatusCacheService.getAll(statusIds, user);
      return statuses;
    } catch (error) {
      this.logger.error(error.message, error);
      throw new InternalServerErrorException('Error While Getting Top Global Media!');
    }
  }

  public async deleteStatusById(user: { id: any }, statusId: string, byEmployee = false) {
    try {
      if (!statusId) {
        throw new BadRequestException('Where is status Id ?');
      }
      const status = await this.repository
        .createQueryBuilder('status')
        .select()
        .where('status.id = :statusId', { statusId })
        .leftJoinAndSelect('status.parent', 'statusParent', 'statusParent.deleted = :deleted', {
          deleted: false,
        })
        .leftJoinAndSelect('status.originalStatus', 'originalStatus')
        .leftJoinAndSelect('status.user', 'user')
        .getOne();
      if (!status) {
        throw new NotFoundException('Status Not Found');
      }

      // a7na hnst3bt ?
      if (status.user.id === user.id || byEmployee) {
        const { parent, originalStatus } = status;
        if (!isNil(parent)) {
          parent.counters.commentCount--;
          if (originalStatus.counters.commentCount < 0) {
            originalStatus.counters.commentCount = 0;
          }
          await Promise.all([
            this.repository.update(parent.id, parent),
            this.userStatusCacheService.updateCounters(parent.id, 'commentCount', '-'),
            this.userStatusCacheService.removeReplyFromStatus(parent.id, status.id),
            this.emitter.emit(
              'notification:unSubscribeFromTopic',
              [user.id],
              parent.id,
              NotificationsTopics.STATUS_TOPIC,
            ),
          ]);
        }
        if (!isNil(originalStatus)) {
          originalStatus.counters.sharedCount--;
          if (originalStatus.counters.sharedCount < 0) {
            originalStatus.counters.sharedCount = 0;
          }
          await Promise.all([
            this.repository.update(originalStatus.id, originalStatus),
            this.userStatusCacheService.updateCounters(originalStatus.id, 'sharedCount', '-'),
            this.emitter.emit(
              'notification:unSubscribeFromTopic',
              [user.id],
              originalStatus.id,
              NotificationsTopics.STATUS_TOPIC,
            ),
          ]);
        }
        // Run in parallel |= =|
        await Promise.all([
          this.repository.update(status.id, { deleted: true }),
          this.userStatusCacheService.deleteCache(status.id),
          this.emitter.emit(
            'notification:unSubscribeFromTopic',
            [user.id],
            status.id,
            NotificationsTopics.STATUS_TOPIC,
          ),
          this.emitter.emit('timeline:stopFanAction', status.id),
        ]);
        if (!status.isReply || !status.isShare || status.type !== 'story') {
          await Promise.all([
            this.emitter.emitAsync('timeline:remove:userTimeline', status.user.id, status.id),
            this.emitter.emitAsync('timeline:remove:userMedia', status.user.id, status.id),
            this.emitter.emitAsync('timeline:remove:channelMedia', status.user.id, status.id),
            this.emitter.emit('firehose:fanin', status.user.id, status),
            this.emitter.emit('timeline:remove:topGlobalMedia', status.id),
          ]);
        } else if (status.type === 'story') {
          await this.emitter.emitAsync('timeline:remove:userStoryTimeline', status.user.id);
        }
      } else {
        throw new ForbiddenException('You can not delete this status !');
      }
      return { statusCode: 200, message: 'Status Deleted' };
    } catch (error) {
      throw error;
    }
  }

  private async validateStatus(status: CreateStatusDTO, user: User) {
    if (
      (status.type === 'story' ||
        status.type === 'media' ||
        status.type === 'rate' ||
        status.type === 'channelMedia' ||
        status.type === 'competition') &&
      (!status.hasMedia || !(status.mediaIds && status.mediaIds.length > 0))
    ) {
      throw new BadRequestException(`The status of type ${status.type} must have media`);
    }
    if ((status.isReply && status.isShare) || (status.isReply && status.isLive)) {
      throw new BadRequestException(
        'The status can be a only have one state of share, reply or live at time',
      );
    }
    if (status.isReply && status.type === 'rate') {
      throw new BadRequestException(
        'The status cannot be a type of rate and reply in the same time',
      );
    }
    if (status.isReply && status.type === 'help') {
      throw new BadRequestException(
        'The status cannot be a type of help and reply in the same time',
      );
    }
    if ((status.isShare || status.isReply || status.withUserId) && user.isSystem) {
      throw new BadRequestException('System users can not do this, sorry!');
    }
  }

  private async handleReplies(status: CreateStatusDTO, user: { id: string }) {
    const parent = await this.repository.findOne(status.inReplyToStatusId, {
      relations: ['parent', 'user'],
    });
    const sender = (await this.userService.findUserById(user.id)) as User;
    if (!parent || (parent && parent.deleted)) {
      throw new NotFoundException('Parent Node Not Found');
    }
    if (parent.parent && parent.parent.isReply) {
      throw new UnprocessableEntityException('Replies Cannot have a Reply !');
    }
    const isAllowed = await this.calculateStatusPrivacy(parent, user);
    if (!isAllowed) {
      throw new ForbiddenException('you are not allowed to reply on this status');
    }
    const action = parent.isReply ? StatusAction.COMMENT_REPLY : StatusAction.REPLY;

    parent.counters.commentCount++;
    await Promise.all([
      this.userStatusCacheService.updateCounters(parent.id, 'commentCount', '+'),
      this.repository.update(parent.id, parent),
      this.emitter.emit('notification:fanoutToTopic', parent.id, NotificationsTopics.STATUS_TOPIC, {
        status: parent,
        user: sender,
        action,
      }),
      // this.emitter.emit(
      //   'notification:subscribeToTopic',
      //   [user.id],
      //   parent.id,
      //   NotificationsTopics.STATUS_TOPIC,
      // ),
    ]);
    return parent;
  }

  private async handleShare(status: CreateStatusDTO, user: { id: string }) {
    const childStatus = await this.repository.findOne(status.shareToStatusId, {
      relations: ['parent', 'user'],
    });
    if (!childStatus || (childStatus && childStatus.deleted)) {
      throw new NotFoundException('Shared Node Not Found');
    }
    const sender = await this.userService.findUserById(user.id);
    // Are you kidding ?!
    if (childStatus.isReply) {
      throw new BadRequestException('What? Replies Cannot be Shared !');
    }
    const isAllowed = await this.calculateStatusPrivacy(childStatus, user);
    if (!isAllowed) {
      throw new ForbiddenException('you are not allowed to share this status');
    }
    childStatus.counters.sharedCount++;
    await Promise.all([
      this.userStatusCacheService.updateCounters(childStatus.id, 'sharedCount', '+'),
      this.repository.update(childStatus.id, childStatus),
      this.emitter.emit(
        'notification:fanoutToTopic',
        childStatus.id,
        NotificationsTopics.STATUS_TOPIC,
        { status: childStatus, user: sender, action: StatusAction.SHARE },
      ),
    ]);
    return childStatus;
  }

  private async handleMentions(status: CreateStatusDTO) {
    let statusId: string;
    if (status.isReply) {
      // Get the parent
      const parent = await this.repository.findOne(status.inReplyToStatusId, {
        relations: ['parent', 'user'],
      });

      if (!parent || (parent && parent.deleted)) {
        throw new NotFoundException('Parent Node Not Found');
      }
      statusId = parent.id; // the top most parent
      // check if parent is also a reply (comment) so we need the main status of
      if (parent.parent && parent.parent.isReply) {
        statusId = parent.parent.id; // the top most parent
      }
      this.emitter.emit(
        'notification:subscribeToTopic',
        status.mentions,
        statusId,
        NotificationsTopics.STATUS_TOPIC,
      );
    } else {
      // this the original status
      // so we will not emit any event
      // we will handle that after creation.
    }
    return status.mentions;
  }

  private async handleRecommendation(status: Status) {
    try {
      const [lat, long] = GeoLocation.from(status.coordinates).toTubule();
      const model = new this.recommendationStatus();
      model.userId = status.user.id;
      model.statusId = status.id;
      model.location = {
        type: 'Point',
        coordinates: [long, lat],
      };
      await model.save();
    } catch (error) {
      this.logger.error(error.message, error);
      throw new InternalServerErrorException(
        `Error While Saving Recommendation to database check your location: ${status.coordinates}`,
      );
    }
  }

  private async handleGlobalMedia(status: Status) {
    let [lat, long] = [0, 0];
    try {
      [lat, long] = GeoLocation.from(status.coordinates).toTubule();
    } catch {
      throw new BadRequestException(
        `Bad GeoLocation :(
          got: ${status.coordinates}, but want "lat,long"`,
      );
    }
    try {
      const model = new this.globalMedia();
      model.userId = status.user.id;
      model.statusId = status.id;
      model.location = {
        type: 'Point',
        coordinates: [long, lat],
      };
      await model.save();
    } catch (error) {
      this.logger.error(error.message, error);
      throw new InternalServerErrorException('Error While Saving Global Media to database');
    }
  }

  private async handleQuestions(status: Status, priority: number) {
    try {
      const model = new this.questions();
      model.userId = status.user.id;
      model.statusId = status.id;
      model.priority = priority;
      await model.save();
    } catch (error) {
      this.logger.error(error.message, error);
      throw new InternalServerErrorException('Error While Saving Question to database');
    }
  }

  private async handleCompetitionMedia(status: Status) {
    try {
      const settings = await this.appSettingsService.getCurrentApplicationSettings();
      if (isNil(settings)) {
        return;
      }      
      const { competitionVoteStartDay, competitionVoteEndDay } = settings;
      const currentDay = new Date().getUTCDay();
      if (currentDay >= competitionVoteStartDay && currentDay <= competitionVoteEndDay) {
        // Save it into the top list;
        await this.emitter.emitAsync('timeline:add:storeTopGlobalMedia', status.id);
      } else {
        // throw error or return ?
        return;
      }
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }
  
  private async calculateStatusPrivacy(status: Status, user) {
    if (status.user.id === user.id) {
      return true;
    } else if (status.privacy === StatusPrivacy.PUBLIC) {
      return true;
    } else if (status.privacy === StatusPrivacy.CONTACTS_ONLY) {
      const isContact = await this.userContactsService.isContactExist(
        { id: status.user.id },
        user.mobileNumber,
      );
      if (isContact) {
        return true;
      }
    }
    return false;
  }

  private async filterStatusReplies(replies: Status[]) {
    return replies.filter(reply => !reply.deleted);
  }

  private checkAvailability(status: Status) {
    return (
      (status && status.deleted) ||
      (status.parent && status.parent.deleted) ||
      (status.parent && status.parent.parent && status.parent.parent.deleted)
    );
  }

  private async updateUserTimeline(status: Status) {
    if (status.isReply || status.type === 'help') {
      return;
    }
    // Add any user uploaded photos and videos to media
    if (
      status.type === 'status' &&
      status.hasMedia &&
      status.media[0] &&
      (status.media[0].type === 'photo' || status.media[0].type === 'video')
    ) {
      this.emitter.emit('timeline:update:userMedia', status.user.id, status);
    }
    if (status.type !== 'story' && status.type !== 'media' && status.type !== 'channelMedia' && status.type !== 'competition' ) {
      this.emitter.emit('timeline:update:userTimeline', status.user.id, status);
    } else if (status.type === 'media') {
      this.emitter.emit('timeline:update:userMedia', status.user.id, status);
    } else if (status.type === 'channelMedia') {
      this.emitter.emit('timeline:update:channelMedia', status.user.id, status);
    } else if (status.type === 'story') {
      this.emitter.emit('timeline:cache:userStoryTimeline', status.user.id, status.id);
    }
  }

  private async addToAnotherUserTimeline(status: Status) {
    if (
      !status.isReply &&
      status.type !== 'story' &&
      status.type !== 'media' &&
      typeof status.withUserId === 'string' // is this useless !
    ) {
      const user = (await this.userService.findUserById(status.withUserId, true)) as UserMetadata;
      this.emitter.emit('timeline:cache:userTimeline', user.id, status);
    }
  }

  private async updateUserHomeTimeline(status: Status) {
    const isCompetition = status.type === 'competition';
    const isCompetitionReply = isCompetition && status.isReply;
    const isReply = status.isReply && status.parent && status.parent.isReply;
    if (isCompetitionReply) {
      this.emitter.emit('timeline:add:userHomeTimeline', status.user.id, status);
      return;
    }
    if (
      !isReply &&
      status.type !== 'story' &&
      status.type !== 'media' &&
      status.type !== 'channelMedia' &&
      status.type !== 'help'
    ) {
      this.emitter.emit('timeline:add:userHomeTimeline', status.user.id, status);
    }
  }

  private async updateCountryTimeline(status: Status) {
    const hasType = Array.isArray(status.media) && status.media[0];
    let mediaType = 'photo';
    if (hasType) {
      mediaType = hasType.type;
    } else {
      return;
    }
    const isReply = status.isReply && status.parent && status.parent.isReply;
    const isShare = status.isShare;
    const isPublicGlobal =
      status.type === 'channelMedia' &&
      status.isPublicGlobal &&
      (status.channel.isPublicGlobal || status.user.isSystem);
    const isMedia = mediaType === 'photo' || mediaType === 'video';
    if (!isReply && !isShare && isPublicGlobal && isMedia) {
      this.emitter.emit(
        'timeline:add:addToCountryTimeline',
        status.user.profile.countryCode,
        status,
      );
    }
  }

  private async getStatusWithChannelId(statusId: string, userId: string) {
    try {
      const status = await this.getStatusById(statusId, { id: userId });
      const channelId = status.liveVideoChannelId;
      return channelId ? status : null;
    } catch {
      // We don't care about this error;
      return null;
    }
  }

  private async handleAnalytics(user: User) {
    const [userDailyPostsCount] = (await this.emitter.emitAsync(
      'analytics:getDailyUserStatusesCount',
      user.id,
    )) as number[];
    this.emitter.emit('analytics:setDailyUserStatusesCount', user.id, userDailyPostsCount + 1);
    if (userDailyPostsCount + 1 >= 5) {
      this.emitter.emit('analytics:addDailyActiveUser', user.id, user.profile.countryCode);
    }
    this.emitter.emit('analytics:incrHomeGlobalStaticsKey', 'posts');
    this.emitter.emit('analytics:updateUserStatics', user.id, 'totalPosts');
    return true;
  }

  private async fanoutStatus(status: Status) {
    const isReply = status.isReply && status.parent && status.parent.isReply;
    if (
      !isReply &&
      status.type !== 'story' &&
      status.type !== 'media' &&
      status.type !== 'help' &&
      status.type !== 'channelMedia'
    ) {
      this.emitter.emit('firehose:fanout', status.user.id, status);
    }

    if (!isReply && status.type === 'channelMedia') {
      setTimeout(async () => {
        await this.userService.fanoutChannelMedia(
          status.user.id,
          status.channel.id,
          status.createdAt,
        );
      }, 5);
    }
  }

  private async sendNotificationsToFollowers(status: Status) {
    const isShareOrReply = status.isReply || status.isShare;
    const isStoryMediaOrLive = status.type === 'story' || status.isLive;
    if (!isShareOrReply && isStoryMediaOrLive) {
      this.emitter.emit(
        'notification:fanoutToTopic',
        status.user.id,
        NotificationsTopics.USER_TOPIC,
        { status, user: status.user },
      );
    }
  }

  private async sendTopGlobalMediaNotification(topGlobalMediaId: string) {
    try {
      this.logger.log(`Sending Today's Tob Global Media Notification`);
      // get this status info.
      const [topGlobalMedia] = await this.userStatusCacheService.getAll([topGlobalMediaId]);
      if (isNil(topGlobalMedia)) {
        this.logger.warn(`Can not find Top Global Media with id ${topGlobalMediaId}`);
        return;
      }
      // Save it to the database.
      const m = new this.globalMediaWinner();
      m.statusId = topGlobalMedia.id;
      m.userId = topGlobalMedia.user.id;
      await m.save();
      // send notification to the topGlobalMedia topic.
      this.emitter.emit(
        'notification:fanoutToTopic',
        'global',
        NotificationsTopics.TOP_GLOBAL_MEDIA_TOPIC,
        { statusId: topGlobalMedia.id, userId: topGlobalMedia.user.id },
      );
      // delete the record.
      this.emitter.emit('timeline:remove:topGlobalMediaRecord');
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }

  private async addLiveVideoToStatus(channelId: string, media: UserMedia[]) {
    try {
      const status = await this.statusRepository
        .createQueryBuilder('status')
        .select()
        .leftJoinAndSelect('status.user', 'user')
        .where('status.channelId = :channelId', { channelId })
        .getOne();
      if (isNil(status)) {
        this.logger.error(`Cannot find Status with channelId = ${channelId}, did you created it ?`);
        return;
      }
      status.media = media;
      status.hasMedia = true;
      status.isLive = true;
      status.type = 'status';
      this.statusRepository.update(status.id, status).then(async () => {
        // Delete the old cache, so the next time it will get rebuild
        await this.userStatusCacheService.deleteCache(status.id);
        this.logger.log(`Updated Status ${status.id} by new Live Data for ChannelId: ${channelId}`);
        // Recreate the cache
        await this.getStatusById(status.id, status.user, true);
        this.emitter.emit('timeline:sendToLiveVideoSubscribers', status.id, status.media[0].url);
      });
    } catch (error) {
      throw error;
    }
  }

  private async removeStatusMediaCache(mediaHash: string) {
    const status = await this.repository.findOne({ mediaHashs: In([mediaHash]) });
    if (!isNil(status)) {
      this.logger.log(
        `Removing Old Media Cache For Status ${status.id}, with mediaHash: ${mediaHash}`,
      );
      try {
        // update media
        const mediaIds = status.media.map(m => m.id || '');
        status.media = await this.mediaService.getMediaAll(mediaIds);
        this.repository
          .update(status.id, status)
          .then(async () => {
            // then clear the cache
            await this.userStatusCacheService.deleteCache(status.id);
            this.logger.log(`Removed Old Media Cache For Status ${status.id}, Nice`);
            // bring it back, so that the timeline can get it.
            await this.getStatusById(status.id, status.user, true, true);
          })
          .catch(err => {
            this.logger.error(err.message, err);
          });
      } catch (error) {
        this.logger.error(error.message, error);
      }
    }
  }

  private async doubleActions() {
    try {
      await this.userStatusCacheService.doubleActions();
    } catch (e) {
      this.logger.error(e.message, e);
    }
  }
  private subscribeToEvents() {
    this.emitter.on('status:addLiveVideoFile', async (channelId, media) => {
      await this.addLiveVideoToStatus(channelId, media);
    });

    this.emitter.on('status:getStatusWithChannelId', async (statusId, userId) => {
      return this.getStatusWithChannelId(statusId, userId);
    });

    this.emitter.on('status:removeStatusMediaCache', async mediaHash => {
      await this.removeStatusMediaCache(mediaHash);
    });

    this.emitter.on('status:sendTopMediaNotification', async statusId => {
      await this.sendTopGlobalMediaNotification(statusId);
    });

    this.emitter.on('status:getStatusMetadataById', async (statusId, userId) => {
      try {
        const s = await this.getStatusById(statusId, { id: userId });
        // const metadata = pick(['id', 'text', 'hasMedia'], s);
        return s;
      } catch {
        return null;
      }
    });

    this.emitter.on('status:getTopGlobalMediaWinners', async (user, page, limit) => {
      return this.getTopGlobalMediaWinners(user, page, limit);
    });

    this.emitter.on('status:getTodaysTopGlobalMediaWithLimit', async (user, page, limit) => {
      return this.getTodaysTopGlobalMedia(user, page, limit);
    });
  }
}
