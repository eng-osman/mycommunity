import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ReportSchema } from './schemas/report.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Reports', schema: ReportSchema, collection: 'users_reports' },
    ]),
  ],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
