import { UserMedia } from '@app/media/entities';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectEventEmitter } from '@shared/decorators';
import { LoggerService } from '@shared/services';
import { EventEmitter2 } from 'eventemitter2';
import { Model } from 'mongoose';
import { isNil } from 'ramda';
import { Repository } from 'typeorm';
import { ConversationMessage } from './messages';

@Injectable()
export class ConversationService {
  private readonly logger: LoggerService = new LoggerService(ConversationService.name);
  constructor(
    @InjectModel('conversations') private readonly conversationModel: Model<ConversationMessage>,
    @InjectRepository(UserMedia) private readonly userMediaRepository: Repository<UserMedia>,
    @InjectEventEmitter() private readonly eventEmitter: EventEmitter2,
  ) {
    this.eventEmitter.on(
      'conversation:pingConversations',
      async (conversationId: string, lastMessageId: string) =>
        this.pingLastMessage(conversationId, lastMessageId),
    );
  }

  public async create(conversation: ConversationMessage): Promise<ConversationMessage> {
    try {
      const createdConversation = new this.conversationModel(conversation);
      const saved = await createdConversation.save();
      return saved.toObject();
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }

  public async findConversationById(id: string): Promise<ConversationMessage | null> {
    try {
      return this.conversationModel.findById(id);
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }

  public async findOneOrCreate(conversation: ConversationMessage): Promise<ConversationMessage> {
    try {
      delete conversation.clientId;
      const existConversation = await this.conversationModel
        .findOne({
          $and: [
            { users: { $all: conversation.users } },
            { users: { $size: conversation.users.length } },
          ],
        })
        .lean()
        .exec();
      return existConversation ? existConversation : await this.create(conversation);
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }

  public async isConversationMember(conversationId: string, userId: string) {
    try {
      const conversation = await this.findConversationById(conversationId);
      if (conversation) {
        return conversation.users.includes(userId.toString());
      } else {
        return false;
      }
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }

  public async renameConversation(conversationId: string, newName: string) {
    try {
      return this.conversationModel
        .findByIdAndUpdate(conversationId, { conversationName: newName }, { new: true })
        .exec();
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }

  public async updateConversationIcon(conversationId: string, mediaId: string) {
    try {
      const media = await this.userMediaRepository.findOne(mediaId);
      if (isNil(media)) {
        return undefined;
      }
      return this.conversationModel
        .findByIdAndUpdate(conversationId, { conversationIcon: media.url }, { new: true })
        .lean()
        .exec();
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }

  public async findUserConversations(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<ConversationMessage[]> {
    try {
      return this.conversationModel
        .find({ users: { $in: [userId] } })
        .skip(page * limit)
        .limit(limit)
        .sort('-updatedAt')
        .lean()
        .exec();
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }

  public async addUsersToConversation(conversationId: string, userIds: string[]): Promise<boolean> {
    try {
      await this.conversationModel
        .findOneAndUpdate(
          { _id: conversationId },
          { $addToSet: { users: { $each: userIds } } },
          { new: true },
        )
        .exec();
      return true;
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }

  public async addUsersToConversationAdmin(
    conversationId: string,
    userIds: string[],
  ): Promise<boolean> {
    try {
      await this.conversationModel
        .findOneAndUpdate(
          { _id: conversationId },
          { $addToSet: { admins: { $each: userIds } } },
          { new: true },
        )
        .exec();
      return true;
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }

  public async removeUsersFromConversation(
    conversationId: string,
    userIds: string[],
  ): Promise<boolean> {
    try {
      await this.conversationModel
        .findOneAndUpdate({ _id: conversationId }, { $pullAll: { users: userIds } }, { new: true })
        .exec();
      return true;
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }

  public async pingLastMessage(conversationId: string, lastMessageId: string) {
    try {
      await this.conversationModel.findByIdAndUpdate(conversationId, { lastMessageId }).exec();
      return true;
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
  }
}
