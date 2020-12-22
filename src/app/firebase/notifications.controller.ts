import { EmployeeGuard } from '@app/analytics/employee.guard';
import { StoreNotificationDTO } from '@app/firebase/dto/store-notification.dto';
import { TopicSubscriptionDTO } from '@app/firebase/dto/topic-subscription.dto';
import { UserMentionDTO } from '@app/firebase/dto/user-mention.dto';
import { NotificationsTopics } from '@app/firebase/notifications-topics.enum';
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiUseTags } from '@nestjs/swagger';
import { User } from '@shared/decorators';
import { AuthGuard } from '@shared/guards';
import { LoggerService } from '@shared/services';
import { NotifyDTO } from './dto/notify.dto';
import { NotificationsService } from './notifications.service';

@Controller('/notifications')
@ApiUseTags('Notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  private readonly logger = new LoggerService(NotificationsController.name);
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({
    title: 'Sync Notifications',
    description: 'let user get his all notifications. [LIMITED]',
  })
  @ApiBearerAuth()
  @Get('sync')
  public async syncMyNotifications(@User() user: any, @Query('limit') limit: string) {
    try {
      return await this.notificationsService.getUserNotifications(user.id, limit);
    } catch (error) {
      this.logger.error(error.message, error);
      return [];
    }
  }

  @ApiOperation({
    title: 'Poll Notifications from the server',
    description: 'let user get new notifications from the server with timestamp',
  })
  @ApiBearerAuth()
  @Get('poll')
  public async pollNewNotifications(@User() user: any, @Query('ts') ts: string) {
    try {
      if (!ts) {
        throw new Error('Empty TimeStamp');
      }
      const timestamp = Date.parse(ts) || Date.parse(new Date(parseInt(ts) * 1e3).toUTCString());
      return this.notificationsService.pollNotifications(user.id, timestamp);
    } catch (error) {
      this.logger.error(error.message, error);
      return [];
    }
  }

  @ApiOperation({
    title: 'Store Notifications',
  })
  @ApiBearerAuth()
  @Post('store')
  public async storeNotification(@User() user, @Body() body: StoreNotificationDTO) {
    return this.notificationsService.storeNotification(user, body);
  }

  @ApiOperation({
    title: 'Subscribe To User Or Status',
    description:
      'let user subscribe to a user or a status, so he will get notified when there is an update',
  })
  @ApiBearerAuth()
  @Post('subscribe')
  public async subscribeToTopic(@User() user: any, @Body() body: TopicSubscriptionDTO) {
    try {
      const { type, entityId } = body;
      const topicType: NotificationsTopics = type as any;
      const res = await this.notificationsService.subscribeToTopic([user.id], entityId, topicType);
      if (res) {
        return {
          message: `Subscribed to Entity ${body.entityId} of Type ${body.type}`,
          statusCode: 201,
        };
      }
      return {
        message: `Seems that you are not having a Device Token, please set your device token`,
        statusCode: 400,
      };
    } catch (error) {
      throw new ServiceUnavailableException(
        `Firebase Error, While Subscribing to Entity ${body.entityId} of Type ${body.type}`,
      );
    }
  }

  @ApiOperation({
    title: 'Subscribe (mention) a User to Status',
    description: `let some user mention the other to a status.
      so he will get notified when there is an update`,
    deprecated: true,
  })
  @ApiBearerAuth()
  @Post('mention')
  public async subscribeUserToTopic(@Body() body: UserMentionDTO) {
    try {
      const { statusId, userIds } = body;
      const topicType: NotificationsTopics = NotificationsTopics.STATUS_TOPIC;
      const res = await this.notificationsService.subscribeToTopic(userIds, statusId, topicType);
      if (res) {
        return {
          message: `Subscribed to Entity ${statusId} by Users ${userIds.toString()}`,
          statusCode: 201,
        };
      }
      return {
        message: `Seems that you are not having a Device Token, please set your device token`,
        statusCode: 400,
      };
    } catch (error) {
      throw new ServiceUnavailableException(
        `Firebase Error, While Subscribing to Entity ${
          body.statusId
        } by Users ${body.userIds.toString()}`,
      );
    }
  }

  @ApiOperation({
    title: 'UnSubscribe from User Or Status',
    description: 'stop getting Notifictions about the given user or status',
  })
  @ApiBearerAuth()
  @Post('unsubscribe')
  public async unsubscribeFromTopic(@User() user: any, @Body() body: TopicSubscriptionDTO) {
    try {
      const { type, entityId } = body;
      const topicType: NotificationsTopics = type as any;
      const res = await this.notificationsService.unSubscribeFromTopic(
        [user.id],
        entityId,
        topicType,
      );
      if (res) {
        return {
          message: `unSubscribed to Entity ${body.entityId} of Type ${body.type}`,
          statusCode: 201,
        };
      }
      return {
        message: `Seems that you are not having a Device Token, please set your device token`,
        statusCode: 400,
      };
    } catch (error) {
      throw new ServiceUnavailableException(
        `Firebase Error, While unSubscribing to Entity ${body.entityId} of Type ${body.type}`,
      );
    }
  }

  @ApiOperation({
    title: 'Send Notifications',
    description: 'Send notifications to these users with there ids [Employee Only]',
  })
  @ApiBearerAuth()
  @UseGuards(EmployeeGuard)
  @Post('notify')
  public async sendNotification(@Body() body: NotifyDTO) {
    try {
      return this.notificationsService.sendNotifications(body);
    } catch (error) {
      this.logger.error(error.message, error);
      throw new ServiceUnavailableException(`Firebase Error, While sending notifications`);
    }
  }
}
