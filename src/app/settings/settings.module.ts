import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationSettingsController } from './app-settings.controller';
import { ApplicationSettingsService } from './app-settings.service';
import { ApplicationSettings } from './entities';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ApplicationSettings])],
  controllers: [ApplicationSettingsController],
  providers: [ApplicationSettingsService],
  exports: [ApplicationSettingsService],
})
export class SettingsModule {}
