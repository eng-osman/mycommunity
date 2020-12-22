import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiUseTags } from '@nestjs/swagger';
import { User } from '@shared/decorators';
import { AuthGuard } from '@shared/guards';
import { Response } from 'express';
import { isNil } from 'ramda';
import { UpdateMediaDTO } from './dto/update-media.dto';
import { StaticFilesType } from './static-files-type.enum';
import { StaticFilesService } from './static-files.service';

@ApiUseTags('StaticFiles')
@Controller('static')
export class StaticFilesController {
  private static readonly allowedUsers: ReadonlyArray<string> = ['1', '13', '109', '96'];
  constructor(private readonly staticFilesService: StaticFilesService) {}

  @ApiOperation({
    title: 'Get Recent Uploaded Video',
  })
  @Get('video')
  public async getRecentUploadedVideo(@Res() res: Response) {
    const result = await this.staticFilesService.getRecentUploadedMedia(StaticFilesType.Video);
    if (isNil(result)) {
      throw new NotFoundException('Please Upload at least one media to use this route!');
    }
    res.redirect(`../../../${result}`);
  }

  @ApiOperation({
    title: 'Get Recent Uploaded Image',
  })
  @Get('image')
  public async getRecentUploadedImage(@Res() res: Response) {
    const result = await this.staticFilesService.getRecentUploadedMedia(StaticFilesType.Image);
    if (isNil(result)) {
      throw new NotFoundException('Please Upload at least one media to use this route!');
    }
    res.redirect(`../../../${result}`);
  }

  @ApiOperation({
    title: 'Update Static Video',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('video')
  public async updateVideo(@User() user, @Body() body: UpdateMediaDTO) {
    if (!StaticFilesController.allowedUsers.includes(user.id.toString())) {
      throw new ForbiddenException('You cannot update the media, sorry :(');
    }
    return this.staticFilesService.updateMedia(body.mediaId, StaticFilesType.Video);
  }
  @ApiOperation({
    title: 'Update Static Image',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('image')
  public async updateImage(@User() user, @Body() body: UpdateMediaDTO) {
    if (!StaticFilesController.allowedUsers.includes(user.id.toString())) {
      throw new ForbiddenException('You cannot update the media, sorry :(');
    }
    return this.staticFilesService.updateMedia(body.mediaId, StaticFilesType.Image);
  }
}
