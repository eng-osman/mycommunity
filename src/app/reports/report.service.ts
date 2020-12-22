import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { isNil } from 'ramda';
import { CreateReportDTO } from './dto/create-report.dto';
import { Report } from './report.interface';

@Injectable()
export class ReportService {
  constructor(@InjectModel('Reports') private readonly reportModel: Model<Report>) {}

  public async createReport(userId: string, data: CreateReportDTO) {
    if (await this.hasPrevReportOnSameEntity(userId, data.entityId, data.entityType)) {
      throw new UnprocessableEntityException('You can not submit the same report twice');
    }
    const r = new this.reportModel();
    r.entityType = data.entityType;
    r.entityId = data.entityId;
    r.reason = data.reason;
    r.reporterId = userId;
    const report = await r.save();
    return {
      message: 'Report created',
      reportId: report.id,
      statusCode: 201,
    };
  }
  public async listAll(page: string, limit: string) {
    const p = parseInt(page) || 1;
    const l = parseInt(limit) || 20;
    return this.reportModel
      .find()
      .limit(l)
      .skip((p - 1) * l)
      .sort('-createdAt')
      .exec();
  }

  public async listAllForUser(userId: string, page: string, limit: string) {
    const p = parseInt(page) || 1;
    const l = parseInt(limit) || 20;
    return this.reportModel
      .find({
        entityId: userId,
        entityType: 'user',
      })
      .limit(l)
      .skip((p - 1) * l)
      .sort('-createdAt')
      .exec();
  }

  public async countReportForEntity(entityId: string, entityType: 'user' | 'status') {
    try {
      const q = await this.reportModel
        .find(
          {
            entityId: entityId.toString(),
            entityType: entityType.toString().toLowerCase(),
          },
          { entityId: 1 },
        )
        .limit(1000)
        .exec();
      return { count: q.length };
    } catch (error) {
      return { count: 0 };
    }
  }

  public async getReportById(reportId: string) {
    const r = await this.reportModel.findById(reportId);
    if (!r) {
      throw new NotFoundException();
    } else {
      return r;
    }
  }
  public async deleteReportById(reportId: string) {
    const r = await this.reportModel.deleteOne({ _id: reportId }).exec();
    if (!r) {
      throw new NotFoundException();
    } else {
      return {
        message: 'Report Deleted',
      };
    }
  }

  private async hasPrevReportOnSameEntity(
    userId: string,
    entityId: string,
    entityType: 'user' | 'status',
  ) {
    try {
      const s = await this.reportModel.findOne({
        reporterId: userId,
        entityId,
        entityType,
      });
      if (!isNil(s)) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }
}
