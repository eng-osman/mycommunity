import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { LoggerService } from '@shared/services';
import { Model } from 'mongoose';
import { isNil } from 'ramda';
import { FavoriteMessage } from './messages';

@Injectable()
export class FavoriteMessageService {
  private readonly logger: LoggerService = new LoggerService('FavoriteMessageService');
  constructor(
    @InjectModel('favorite_messages') private readonly favoriteMessageModel: Model<FavoriteMessage>,
  ) {}

  public async addFavoriteMessage(
    msg: Pick<FavoriteMessage, 'conversationId' | 'userId' | 'messageId'>,
  ) {
    try {
      const FavoriteMessageEntity = this.favoriteMessageModel;
      const entity = new FavoriteMessageEntity();
      entity.messageId = msg.messageId;
      entity.conversationId = msg.conversationId;
      entity.userId = msg.userId;
      return entity.save();
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async removeFavoriteMessageById(entityId: string) {
    try {
      const result = await this.favoriteMessageModel.findByIdAndRemove(entityId);
      if (isNil(result)) {
        return false;
      } else {
        return true;
      }
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async removeFavoriteMessagesByMessageId(messageId: string) {
    try {
      const result = await this.favoriteMessageModel.remove({ messageId });
      if (isNil(result)) {
        return false;
      } else {
        return true;
      }
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async getMyFavoriteMessages(userId: string, page: number = 1, limit: number = 20) {
    try {
      return this.favoriteMessageModel
        .find({ userId })
        .limit(limit)
        .skip(limit * (page - 1))
        .sort('-createdAt')
        .exec();
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async getConversationFavoriteMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    try {
      return this.favoriteMessageModel
        .find({ userId, conversationId })
        .limit(limit)
        .skip(limit * (page - 1))
        .sort('-createdAt')
        .exec();
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async isFavoriteMessage(conversationId: string, messageId: string, userId: string) {
    try {
      const m = await this.favoriteMessageModel
        .findOne({ userId, conversationId, messageId })
        .exec();
      if (m) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      this.logger.error(error.message, error);
      return false;
    }
  }
}
