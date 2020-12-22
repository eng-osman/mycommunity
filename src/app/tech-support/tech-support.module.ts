import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SupportMessageSchema } from './schemas/support-message.schema';
import { TechSupportController } from './tech-support.controller';
import { TechSupportService } from './tech-support.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'SupportMessage',
        schema: SupportMessageSchema,
        collection: 'tech_support_msgs',
      },
    ]),
  ],
  controllers: [TechSupportController],
  providers: [TechSupportService],
})
export class TechSupportModule {}
