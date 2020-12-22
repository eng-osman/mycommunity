import { ChatMessage } from '@app/chat/messages';
import { StoreNotificationDTO } from '@app/firebase/dto/store-notification.dto';
import { NotificationModel } from '@app/firebase/interfaces/notification-model.interface';
import { NotificationMessage } from '@app/firebase/notification/notification.message';
import { NotificationsTopics } from '@app/firebase/notifications-topics.enum';
import { User } from '@app/user/entities';
import { UserCacheService } from '@app/user/user-cache.service';
import { UserService } from '@app/user/user.service';
import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectEventEmitter } from '@shared/decorators';
import { UserMetadata } from '@shared/interfaces';
import { I18nService, LoggerService } from '@shared/services';
import { EventEmitter2 } from 'eventemitter2';
import { Model } from 'mongoose';
import { isEmpty } from 'ramda';
import { NotifyDTO } from './dto/notify.dto';
import { FirebaseServiceProvider } from './firebase-service.provider';
import { NotificationStoreModel } from './interfaces/notification-store.interface';
import { NotificaitonFactory } from './notification-factory.class';
import { NotificationCacheService } from './notifications-cache.service';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly notificationFactory = new NotificaitonFactory();
  private readonly logger = new LoggerService(NotificationsService.name);
  constructor(
    private readonly userCacheService: UserCacheService,
    private readonly userService: UserService,
    private readonly i18nService: I18nService,
    private readonly firebaseServiceProvider: FirebaseServiceProvider,
    private readonly notificationCacheService: NotificationCacheService,
    @InjectEventEmitter() private readonly eventEmitter: EventEmitter2,
    @InjectModel('user_notifications') private readonly notificationModel: Model<NotificationModel>,
    @InjectModel('notifications_store')
    private readonly notificationsStoreModel: Model<NotificationStoreModel>,
  ) {}

  public onModuleInit() {
    this.eventEmitter.on(
      'chat:sendNotification',
      async (userId, message: ChatMessage, userMetadata: UserMetadata) => {
        await this.sendChatNotification(userId, message, userMetadata);
      },
    );

    this.eventEmitter.on(
      'notification:subscribeToTopic',
      async (userIds: any[], topicName: string, topicType: NotificationsTopics) => {
        await this.subscribeToTopic(userIds, topicName, topicType);
      },
    );

    this.eventEmitter.on(
      'notification:unSubscribeFromTopic',
      async (userIds: any[], topicName: string, topicType: NotificationsTopics) => {
        await this.unSubscribeFromTopic(userIds, topicName, topicType);
      },
    );

    this.eventEmitter.on(
      'notification:fanoutToTopic',
      async (topicName: string, topicType: NotificationsTopics, payload: any) => {
        await this.fanoutToTopic(topicName, topicType, payload);
      },
    );
  }

  public async sendChatNotification(userId: any, message: ChatMessage, userMetadata: UserMetadata) {
    const [token] = await this.userCacheService.getDeviceToken([userId]);
    if (!token) {
      return;
    }
    const payload = this.notificationFactory.buildChatNotification(message, userMetadata, token);
    try {
      const result = await this.firebaseServiceProvider.messaging.send(payload);
      this.logger.log(`

    +------------------------------------------
    | Notification #${result}
    | Type: Chat
    | Method: \`sendChatNotification\`
    | Topic:  Null
    | Payload:  ${JSON.stringify(payload)
      .substr(0, 110)
      .concat('...')}
    +------------------------------------------

    `);
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }

  public async subscribeToTopic(userIds: any[], topicName: string, topicType: NotificationsTopics) {
    const formatedTopicName = this.notificationFactory.formatTopicName(topicType, topicName);
    this.logger.log(`

    +------------------------------------------
    | Subscribe To Topic ${formatedTopicName}
    | Type: Subscription
    | Method: \`subscribeToTopic\`
    | Topic:  Null
    | To Users:  ${userIds.slice(0, 5).join(',')}...
    +------------------------------------------

    `);
    await this.notificationCacheService.addTopicSubscribers(formatedTopicName, userIds);
    return true;
  }

  public async unSubscribeFromTopic(
    userIds: any[],
    topicName: string,
    topicType: NotificationsTopics,
  ) {
    const formatedTopicName = this.notificationFactory.formatTopicName(topicType, topicName);
    await this.notificationCacheService.deleteTopicSubscribers(formatedTopicName, userIds);
    return true;
  }

  public async fanoutToTopic(topicName: string, topicType: NotificationsTopics, data: any) {
    const formatedTopicName = this.notificationFactory.formatTopicName(topicType, topicName);
    const subIds = await this.notificationCacheService.getTopicSubscribers(formatedTopicName);
    let payload = null;
    switch (topicType) {
      case NotificationsTopics.STATUS_TOPIC:
        const statusPayload = this.notificationFactory.buildStatusActionNotification(
          data.status,
          data.user,
          data.action,
        );
        payload = statusPayload;
        break;
      case NotificationsTopics.USER_TOPIC:
        const userPayload = this.notificationFactory.buildStatusNotification(
          data.status,
          data.user,
        );
        payload = userPayload;
        break;
      case NotificationsTopics.CONVERSATION_TOPIC:
        // TODO: Implement CONVERSATION_TOPIC
        break;
      case NotificationsTopics.CONTACT_TOPIC:
        const p = this.notificationFactory.buildNewUserNotification(data);
        payload = p;
        break;
      case NotificationsTopics.TOP_GLOBAL_MEDIA_TOPIC:
        payload = this.notificationFactory.buildTopGlobalMediaNotification(
          data.userId,
          data.statusId,
        );
        break;
      default:
        break;
    }
    const objs: any[] = [];
    for (const ownerId of subIds) {
      objs.push({ ownerId, payload });
    }
    await this.notificationsStoreModel.insertMany(objs, { ordered: false });
    const tasks = subIds.map(userId => this.userService.getUserLanguage(userId));
    const locales = await Promise.all(tasks);
    const groupByLoacles: Map<string, string[]> = new Map();
    for (let i = 0; i <= subIds.length; i++) {
      const locale = locales[i] || 'en';
      const userId = subIds[i];
      if (groupByLoacles.has(locale)) {
        const v = groupByLoacles.get(locale);
        v!.push(userId);
      } else {
        groupByLoacles.set(locale, [userId]);
      }
    }
    for (const [locale, userIds] of groupByLoacles) {
      const tokens = await this.userCacheService.getDeviceToken(userIds);
      if (!isEmpty(tokens)) {
        this.i18nService.setLocale(locale);
        const messages = tokens.map(
          this.notificationFactory.buildNotification('Yo!!', this.i18nService.translate('WAKEUP')),
        );
        const res = await this.firebaseServiceProvider.messaging.sendAll(messages);
        this.logger.log(`

    +------------------------------------------
    | Notifications Sent
    | Success Count: ${res.successCount}
    | Failure Count: ${res.failureCount}
    | Locale: ${locale}
    | Topic:  ${topicName}
    | Payload:  ${JSON.stringify(payload)
      .substr(0, 160)
      .concat('...')}
    +------------------------------------------

    `);
      }
    }
  }

  public async sendNotifications(data: NotifyDTO) {
    const tokens = await this.userCacheService.getDeviceToken(data.userIds);
    if (!isEmpty(tokens)) {
      const messages = tokens.map(
        this.notificationFactory.buildNotification(data.title, data.body),
      );
      const res = await this.firebaseServiceProvider.messaging.sendAll(messages);
      this.logger.log(`

    +------------------------------------------
    | Notifications Sent (Admin Panel)
    | Success Count: ${res.successCount}
    | Failure Count: ${res.failureCount}
    +------------------------------------------

    `);
      return {
        successCount: res.successCount,
        failureCount: res.failureCount,
        totalCount: tokens.length,
      };
    } else {
      return { successCount: 0, failureCount: 0, totalCount: 0 };
    }
  }

  public async sendNewStatusNotification(topicName: string, payload: NotificationMessage) {
    payload.topic = topicName;
    const result = await this.firebaseServiceProvider.messaging.send(payload);
    this.logger.log(`

    +------------------------------------------
    | Notification #${result}
    | Type: Status
    | Method: \`sendNewStatusNotification\`
    | Topic:  ${topicName}
    | Payload:  ${JSON.stringify(payload)
      .substr(0, 110)
      .concat('...')}
    +------------------------------------------

    `);
  }

  public async sendStatusActionNotification(topicName: string, payload: NotificationMessage) {
    payload.topic = topicName;
    const result = await this.firebaseServiceProvider.messaging.send(payload);
    this.logger.log(`

    +------------------------------------------
    | Notification #${result}
    | Type: Action
    | Method: \`sendStatusActionNotification\`
    | Topic:  ${topicName}
    | Payload:  ${JSON.stringify(payload)
      .substr(0, 110)
      .concat('...')}
    +------------------------------------------

    `);
  }

  public async sendNewUserNotification(topicName: string, payload: NotificationMessage) {
    payload.topic = topicName;
    const result = await this.firebaseServiceProvider.messaging.send(payload);
    this.logger.log(`

    +------------------------------------------
    | Notification #${result}
    | Type: User (New Contact)
    | Method: \`sendNewUserNotification\`
    | Topic:  ${topicName}
    | Payload:  ${JSON.stringify(payload)
      .substr(0, 110)
      .concat('...')}
    +------------------------------------------

    `);
  }

  public async sendTopGlobalMediaNotification(topicName: string, payload: NotificationMessage) {
    payload.topic = topicName;
    const result = await this.firebaseServiceProvider.messaging.send(payload);
    this.logger.log(`

    +------------------------------------------
    | Notification #${result}
    | Type: Status
    | Method: \`sendTopGlobalMediaNotification\`
    | Topic:  ${topicName}
    | Payload:  ${JSON.stringify(payload)
      .substr(0, 110)
      .concat('...')}
    +------------------------------------------

    `);
  }

  public async getUserNotifications(userId: string, limit: string) {
    const models = await this.notificationModel
      .find({ userId })
      .sort('-createdAt')
      .limit(parseInt(limit) || 100)
      .lean()
      .exec();
    const arr: any = [];
    for (const model of models) {
      try {
        const sender = (await this.userService.findUserById(model.senderId!)) as User;
        model.fullName = sender.profile.firstName + sender.profile.lastName;
        arr.push(model);
      } catch (error) {
        continue;
      }
    }
    return arr;
  }

  public async pollNotifications(userId: string, ts: number) {
    const sinceDate = new Date(ts - 5e3);
    if (!sinceDate.getTime()) {
      throw new BadRequestException('Invalid Date !');
    }
    const notifications: any[] = await this.notificationsStoreModel
      .find({
        ownerId: userId.toString(),
        createdAt: {
          $gte: sinceDate,
        },
      })
      .select(['payload.data', 'createdAt'])
      .sort('-id')
      .lean()
      .exec();
    const data = notifications.map(e => ({
      id: e._id,
      createdAt: e.createdAt,
      ...e.payload.data,
    }));
    return data;
  }

  public async storeNotification(user: any, payload: StoreNotificationDTO) {
    try {
      payload.userId = user.id;
      const notification = new this.notificationModel(payload);
      return await notification.save();
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }
}
