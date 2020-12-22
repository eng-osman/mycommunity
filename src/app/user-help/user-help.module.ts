import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HelpCategorySchema } from './schemas/help-category.schema';
import { UserHelpSchema } from './schemas/user-help.schema';
import { UserHelpController } from './user-help.controller';
import { UserHelpService } from './user-help.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'UserHelp', collection: 'users_help', schema: UserHelpSchema },
      { name: 'HelpCategory', collection: 'help_category', schema: HelpCategorySchema },
    ]),
  ],
  providers: [UserHelpService],
  controllers: [UserHelpController],
  exports: [],
})
export class UserHelpModule {}
