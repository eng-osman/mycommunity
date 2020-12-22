import { MessageStatus } from '@app/chat/message-status.enum';
import { UserMedia } from '@app/media/entities';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectEventEmitter } from '@shared/decorators';
import { LoggerService } from '@shared/services';
import { isEmpty } from '@shared/utils';
import { EventEmitter2 } from 'eventemitter2';
import { Model } from 'mongoose';
import { omit } from 'ramda';
import { Repository } from 'typeorm';
import { ChatMessage } from './messages';
@Injectable()
export class ChatMessageService {
  private readonly logger: LoggerService = new LoggerService('ChatMessageService');
  constructor(
    @InjectModel('chat_messages') private readonly chatMessageModel: Model<ChatMessage>,
    @InjectRepository(UserMedia) private readonly userMediaRepository: Repository<UserMedia>,
    @InjectEventEmitter() private readonly eventEmitter: EventEmitter2,
  ) {
    this.subscribeToEvents();
  }

  public async create(message: ChatMessage): Promise<ChatMessage> {
    try {
      if (message.hasMedia && message.mediaIds && Array.isArray(message.mediaIds)) {
        const mediaUrls = await this.userMediaRepository.findByIds(message.mediaIds);
        if (!isEmpty(mediaUrls)) {
          const selected = mediaUrls.map(v =>
            omit(['user', 'updatedAt', 'mediaHash', 'mimetype'], v),
          );
          message.mediaUrls = selected || [];
          message.mediaType = selected.map(e => e.type);
        }
      }
      const createdMessage = new this.chatMessageModel(message);
      const savedMessage = await createdMessage.save();
      this.eventEmitter.emit(
        'conversation:pingConversations',
        message.conversationId,
        savedMessage._id,
      );
      return savedMessage.toObject({ versionKey: false, flattenMaps: true });
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }

  public async findConversationMessages(
    conversationId: string,
    page: number = 1, // un needed !
    limit: number = 20,
    since?: number,
  ): Promise<ChatMessage[]> {
    try {
      if (page < 1) {
        page = 1;
      }
      const sinceDate = new Date(since || Date.now() - 7 * 24 * 60 * 60);
      return (
        this.chatMessageModel
          .find({ conversationId, createdAt: { $lte: sinceDate } })
          .limit(limit)
          // .skip(limit * (page - 1)) // There is, however, a performance concern when using skip
          .sort('-createdAt')
          .lean()
          .exec()
      );
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }

  public async findConversationLastMessage(conversationId: string): Promise<ChatMessage | null> {
    try {
      return this.chatMessageModel
        .findOne({
          conversationId,
          // createdAt: { $lte: since ? since : Date.now() - 7 * 24 * 60 * 60 },
        })
        .sort('-createdAt')
        .exec();
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }

  public async findMessageById(messageId: string) {
    try {
      return this.chatMessageModel
        .findById(messageId)
        .lean()
        .exec();
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }

  public async updateMessageStatus(messageIds: string[], userId: string, status: MessageStatus) {
    try {
      await this.chatMessageModel.updateMany(
        { _id: { $in: messageIds }, stats: { $elemMatch: { userId: userId.toString() } } },
        { $set: { 'stats.$.status': status, 'stats.$.seenAt': new Date() } },
      );
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }

  public async getBulckMessages(messageIds: string[], conversationId: string) {
    try {
      return this.chatMessageModel.find({ _id: { $in: messageIds }, conversationId }).exec();
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }
  public async deleteMessages(messageIds: string[]) {
    try {
      await this.chatMessageModel.remove({ _id: { $in: messageIds } }).exec();
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }

  public async clearConversationMessages(conversationId: string) {
    try {
      await this.chatMessageModel.remove({ conversationId });
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }

  /**
   * @deprecated we are now using time based to get the un delivered messages
   */
  public async findUnDeliveredMessages(
    userId: string,
    page: number = 1,
    limit: number = 20,
    // tslint:disable-next-line:variable-name
    _since?: number,
  ): Promise<ChatMessage[]> {
    try {
      if (page < 1) {
        page = 1;
      }
      return this.chatMessageModel
        .find({
          // createdAt: { $lte: since ? since : Date.now() - 7 * 24 * 60 * 60 },
          stats: {
            userId,
            status: 0,
          },
        })
        .limit(limit)
        .skip(limit * (page - 1))
        .sort('-createdAt')
        .exec();
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }

  private async updateMessageMedia(oldPath: string, newPath: string) {
    try {
      await this.chatMessageModel
        .updateMany({ 'mediaUrls.url': oldPath }, { $set: { 'mediaUrls.$.url': newPath } })
        .exec();
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }

  private subscribeToEvents() {
    this.eventEmitter.on('chat:updateMessageMedia', async (oldPath, newPath) => {
      await this.updateMessageMedia(oldPath, newPath);
    });
  }
}
