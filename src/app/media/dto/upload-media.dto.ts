import { ApiModelPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class UploadMediaDTO {
  @IsString()
  @IsOptional()
  @IsMongoId()
  @ApiModelPropertyOptional({
    default: null,
    format: 'hex-encoded representation of a MongoDB ObjectId',
    example: '507f191e810c19729de860ea',
  })
  public readonly conversationId?: string;
}
