import {
  ClipMulterConfig,
  FilesMulterConfig,
  PhotoMulterConfig,
  VideoMulterConfig,
} from '@app/constants';
import {
  Body,
  Controller,
  FileInterceptor,
  FilesInterceptor,
  Get,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiImplicitFile,
  ApiOperation,
  ApiResponse,
  ApiUseTags,
} from '@nestjs/swagger';
import { User } from '@shared/decorators';
import { AuthGuard } from '@shared/guards';
import { ConversationMediaDTO } from './dto/conversation-media.dto';
import { UploadMediaDTO } from './dto/upload-media.dto';
import { UploadVideoDTO } from './dto/upload-video.dto';
import { UserMedia } from './entities';
import { MediaService } from './media.service';
@ApiUseTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}
  @ApiOperation({
    title: 'upload photo as base64',
    description: 'upload a photo as base64 in the request body {image: ""}',
  })
  @ApiResponse({
    status: 200,
    description: 'The uploaded media',
    type: UserMedia,
  })
  @Post('upload/photo/base64')
  public async uploadPhotoBase64(@Body('image') file: string): Promise<UserMedia> {
    return this.mediaService.savePhotoBase64(file);
  }
  @ApiOperation({
    title: 'upload photos',
    description: 'the field name : photos',
  })
  @ApiResponse({
    status: 200,
    description: 'The uploaded media',
    type: Array<UserMedia>(),
  })
  @ApiImplicitFile({
    name: 'photos',
    description: 'the photos to be uploaded',
    required: true,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('upload/photos')
  @UseInterceptors(FilesInterceptor('photos', 5, PhotoMulterConfig))
  public async uploadPhoto(
    @UploadedFiles() files: Express.Multer.File[],
    @User() user,
    @Body() data: UploadMediaDTO,
  ): Promise<UserMedia[]> {
    return this.mediaService.saveCollection(files, user, 'photo', data.conversationId);
  }

  @ApiOperation({
    title: 'upload voice clip',
    description: 'the field name : clip',
  })
  @ApiResponse({
    status: 200,
    description: 'The uploaded media',
    type: Array<UserMedia>(),
  })
  @ApiBearerAuth()
  @ApiImplicitFile({
    name: 'clip',
    description: 'the clip to be uploaded',
    required: true,
  })
  @UseGuards(AuthGuard)
  @Post('upload/clip')
  @UseInterceptors(FileInterceptor('clip', ClipMulterConfig))
  public async uploadClip(
    @UploadedFile() file: Express.Multer.File,
    @User() user,
    @Body() data: UploadMediaDTO,
  ): Promise<UserMedia[]> {
    return this.mediaService.saveCollection([file], user, 'voice', data.conversationId);
  }

  @ApiOperation({
    title: 'upload files',
    description: 'the field name : files',
  })
  @ApiResponse({
    status: 200,
    description: 'The uploaded media',
    type: Array<UserMedia>(),
  })
  @ApiImplicitFile({
    name: 'files',
    description: 'the file to be uploaded',
    required: true,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('upload/files')
  @UseInterceptors(FilesInterceptor('files', 5, FilesMulterConfig))
  public async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @User() user,
    @Body() data: UploadMediaDTO,
  ): Promise<UserMedia[]> {
    return this.mediaService.saveCollection(files, user, 'files', data.conversationId);
  }

  @ApiOperation({
    title: 'upload video',
    description: 'the field name : video',
  })
  @ApiResponse({
    status: 200,
    description: 'The uploaded media',
    type: Array<UserMedia>(),
  })
  @ApiImplicitFile({
    name: 'video',
    description: 'the video to be uploaded',
    required: true,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('upload/video')
  @UseInterceptors(FileInterceptor('video', VideoMulterConfig))
  public async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @User() user,
    @Body() data: UploadVideoDTO,
  ): Promise<UserMedia> {
    return this.mediaService.handleVideo(
      file,
      user,
      data.conversationId,
      data.waitForThumbnail,
      data.duration,
    );
  }

  @ApiOperation({
    title: 'show media by id',
  })
  @ApiResponse({
    status: 200,
    description: 'The requested media',
    type: UserMedia,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('show')
  public async getMedia(@Query('id') id: string): Promise<UserMedia> {
    return this.mediaService.getMedia(id);
  }

  @ApiOperation({
    title: 'get conversation media/docs by conversationid',
  })
  @ApiResponse({
    status: 200,
    description: 'The requested media',
    type: UserMedia,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('conversation-media')
  public async getConversationMedia(
    @User() user,
    @Query() data: ConversationMediaDTO,
  ): Promise<UserMedia[]> {
    return this.mediaService.getConversationMedia(
      data.conversationId,
      user.id,
      data.mediaTypes,
      data.page,
      data.limit,
    );
  }
}
