import { MediaModule } from '@app/media/media.module';
import { ApplicationSettings } from '@app/settings/entities';
import { Module } from '@nestjs/common';
import { CompetitionDataController } from './competition-data.controller';
import { CompetitionDataService } from './competition-data.service';
import { StaticFilesController } from './static-files.controller';
import { StaticFilesService } from './static-files.service';

@Module({
  imports: [MediaModule, ApplicationSettings],
  controllers: [StaticFilesController, CompetitionDataController],
  providers: [StaticFilesService, CompetitionDataService],
})
export class StaticDataModule {}
