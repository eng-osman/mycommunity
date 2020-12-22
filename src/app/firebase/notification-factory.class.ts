import { ChatMessage } from '@app/chat/messages';
import { NotificationType } from '@app/firebase/notification-type.enum';
import { NotificationsTopics } from '@app/firebase/notifications-topics.enum';
import { Status } from '@app/user-status/entities';
import { StatusAction } from '@app/user-status/status-actions.enum';
import { User } from '@app/user/entities';
import { UserMetadata } from '@shared/interfaces';
import { messaging } from 'firebase-admin';
export class NotificaitonFactory {
  public buildNotification(
    title = 'Yo!!',
    body = 'You may have new notifications, tap for more information',
  ): (token: string) => messaging.Message {
    const notification = {
      body,
      title,
    };
    return token => ({
      android: { notification, priority: 'high' },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: {
          aps: { alert: notification, contentAvailable: true, badge: 1, sound: 'default' },
        },
      },
      token,
    });
  }

  public buildChatNotification(
    message: ChatMessage,
    sender: UserMetadata,
    token: string,
  ): messaging.Message {
    const data = {
      type: String(NotificationType.CHAT_MESSAGE),
      hasMedia: String(message.hasMedia),
      content: String(message.content.substr(0, 100).concat('...')),
      senderId: String(message.from),
      icon: String(sender.profileImage),
      title: String(sender.firstName + ' ' + sender.lastName),
      senderMobileNumber: String(sender.mobileNumber),
      conversationId: String(message.conversationId),
    };
    const notification = {
      body: String(message.content.substr(0, 100).concat('...')),
      title: String(sender.firstName + ' ' + sender.lastName),
    };
    return {
      data,
      notification,
      android: { priority: 'high', data, notification },
      apns: {
        // tslint:disable-next-line:object-literal-key-quotes
        headers: { 'apns-priority': '10' },
        payload: {
          aps: {
            alert: { title: data.title, body: data.content },
            contentAvailable: true,
            sound: 'default',
            badge: 0,
          },
        },
      },
      token,
    };
  }

  public buildStatusNotification(status: Status, sender: User): any {
    if (status.isLive) {
      return this.buildLiveVideoNotification(status, sender);
    }
    const data = {
      statusId: String(status.id),
      type: String(NotificationType.CONTACT_NEW_STATUS),
      statusOwner: String(status.user.id),
      body: String(status.text.substr(0, 100).concat('...')),
      title: String(sender.profile.firstName + ' ' + sender.profile.lastName),
      icon: String(sender.profile.profileImage),
      hasMedia: String(status.hasMedia),
      senderMobileNumber: String(sender.mobileNumber),
      statusType: String(status.type),
    };
    return {
      android: { priority: 'high', data },
      apns: {
        // tslint:disable-next-line:object-literal-key-quotes
        headers: { 'apns-priority': '10' },
        payload: { aps: { alert: { title: data.title, body: data.body }, priority: 'high' } },
      },
      data,
    };
  }

  public buildLiveVideoNotification(status: Status, sender: User): any {
    const data = {
      statusId: String(status.id),
      type: String(NotificationType.CONTACT_LIVE_VIDEO),
      hasMedia: String(status.hasMedia),
      statusOwner: String(status.user.id),
      body: String(status.text.substr(0, 100).concat('...')),
      title: String(sender.profile.firstName + ' ' + sender.profile.lastName),
      icon: String(sender.profile.profileImage),
      channelId: String(status.liveVideoChannelId),
      senderMobileNumber: String(sender.mobileNumber),
      statusType: String(status.type),
    };
    return {
      android: { priority: 'high', data },
      apns: {
        // tslint:disable-next-line:object-literal-key-quotes
        headers: { 'apns-priority': '10' },
        payload: { aps: { alert: { title: data.title, body: data.body }, priority: 'high' } },
      },
      data,
    };
  }

  public buildStatusActionNotification(
    status: Status,
    sender: User,
    actionType: StatusAction,
  ): any {
    let type: NotificationType;
    switch (actionType) {
      case StatusAction.LIKE:
        type = NotificationType.STATUS_LIKE;
        break;
      case StatusAction.DISLIKE:
        type = NotificationType.STATUS_DISLIKE;
        break;
      case StatusAction.REPLY:
        type = NotificationType.STATUS_REPLY;
        break;
      case StatusAction.SHARE:
        type = NotificationType.STATUS_SHARE;
        break;
      case StatusAction.COMMENT_REPLY:
        type = NotificationType.COMMENT_REPLY;
        break;
      default:
        type = NotificationType.STATUS_LIKE;
        break;
    }
    const data = {
      statusId: String(status.id),
      type: String(type),
      body: String(status.text.substr(0, 100).concat('...')),
      actionType: String(actionType),
      hasMedia: String(status.hasMedia),
      title: String(sender.profile.firstName + ' ' + sender.profile.lastName),
      icon: String(sender.profile.profileImage),
      senderId: String(sender.id),
      statusOwner: String(status.user.id),
      senderMobileNumber: String(sender.mobileNumber),
      statusType: String(status.type),
    };
    return {
      android: { priority: 'high', data },
      apns: {
        // tslint:disable-next-line:object-literal-key-quotes
        headers: { 'apns-priority': '10' },
        payload: { aps: { alert: { title: data.title, body: data.body }, priority: 'high' } },
      },
      data,
    };
  }

  public buildNewUserNotification(sender: UserMetadata): any {
    const data = {
      type: String(NotificationType.CONTACT_NEW_REG),
      icon: String(sender.profileImage),
      senderId: String(sender.id),
      senderMobileNumber: String(sender.mobileNumber),
      title: String(sender.firstName + ' ' + sender.lastName),
    };
    return {
      data,
      android: { priority: 'high', data },
      apns: {
        // tslint:disable-next-line:object-literal-key-quotes
        headers: { 'apns-priority': '10' },
        payload: {
          aps: { alert: { title: data.title, body: data.senderMobileNumber }, priority: 'high' },
        },
      },
    };
  }

  public buildTopGlobalMediaNotification(userId: string, statusId: string): any {
    const data = {
      type: String(NotificationType.TOP_GLOBAL_MEDIA),
      senderId: String(userId),
      statusId: String(statusId),
      title: 'Global Top Media',
    };
    const notification = {
      body: `Status Id: ${statusId} and User Id: ${userId}`,
      title: 'Global Top Media',
    };
    return {
      data,
      notification,
      android: { priority: 'high', data, notification },
      apns: {
        // tslint:disable-next-line:object-literal-key-quotes
        headers: { 'apns-priority': '10' },
        payload: { aps: { alert: { title: data.title, body: String(userId) }, priority: 'high' } },
      },
    };
  }

  public formatTopicName(topicType: NotificationsTopics, topicName: string) {
    return `topics:${topicType}:${topicName}`;
  }
}
