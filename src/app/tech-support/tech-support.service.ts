import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { LoggerService } from '@shared/services';
import { generateUnique } from '@shared/utils';
import { Model } from 'mongoose';
import { SupportMessage } from './interfaces/support-message.interface';

@Injectable()
export class TechSupportService {
  private readonly logger = new LoggerService(TechSupportService.name);

  constructor(
    @InjectModel('SupportMessage') private readonly supportMessageModel: Model<SupportMessage>,
  ) {}

  public async createSupportMessage(userId: string, message: string) {
    try {
      const msg: Partial<SupportMessage> = {
        threadId: generateUnique(8),
        createdBy: userId,
        msgs: [
          {
            from: userId,
            content: message,
          },
        ],
        solved: false,
      };
      const e = await this.supportMessageModel.create(msg);
      return e;
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async replyToSupportMessage(threadId: string, userId: string, message: string) {
    try {
      const thread = await this.supportMessageModel
        .findOneAndUpdate(
          { threadId, solved: false },
          { $push: { msgs: { from: userId, content: message } } },
          { new: true },
        )
        .exec();
      if (!thread) {
        throw new NotFoundException('Thread Not Found or maybe closed');
      } else {
        return {
          message: `Message Added to the thread`,
        };
      }
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async getThreadInfo(threadId: string) {
    const thread = await this.supportMessageModel.findOne({ threadId });
    if (!thread) {
      throw new NotFoundException('Thread Not Found');
    } else {
      return thread;
    }
  }

  public async getAllThreads(page: string, limit: string, solvedOnly = false) {
    let p = parseInt(page) || 0;
    p = p < 0 ? 1 : p;
    let l = parseInt(limit) || 20;
    l = l < 0 ? 20 : l;
    return this.supportMessageModel
      .find({ solved: solvedOnly })
      .limit(l)
      .skip((p - 1) * l)
      .lean()
      .exec();
  }

  public async getAllThreadsForUser(userId: string, page: string, limit: string) {
    let p = parseInt(page) || 0;
    p = p < 0 ? 1 : p;
    let l = parseInt(limit) || 20;
    l = l < 0 ? 20 : l;
    return this.supportMessageModel
      .find({ createdBy: userId })
      .limit(l)
      .skip((p - 1) * l)
      .lean()
      .exec();
  }

  public async closeThread(threadId: string) {
    try {
      const thread = await this.supportMessageModel
        .findOneAndUpdate({ threadId, solved: false }, { solved: true }, { new: true })
        .exec();
      if (!thread) {
        throw new NotFoundException('Thread Not Found or maybe closed');
      } else {
        return { message: `Thread Closed` };
      }
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }
}
