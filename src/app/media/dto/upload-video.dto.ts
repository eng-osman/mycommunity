import { ApiModelPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { UploadMediaDTO } from './upload-media.dto';

export class UploadVideoDTO extends UploadMediaDTO {
  @IsOptional()
  @IsBoolean()
  @ApiModelPropertyOptional({
    default: false,
    example: false,
    description: 'wait until server generate thumbnails for that video?',
  })
  @Transform(val => val === 'true' || val === '1')
  public readonly waitForThumbnail?: boolean;

  @IsOptional()
  @IsString()
  @ApiModelPropertyOptional({
    default: '00:00',
    example: '00:42',
    description: 'Video Duration from client side in mm:ss time format',
  })
  public readonly duration?: string;
}
