import { ApiModelProperty } from '@nestjs/swagger';
import { IsMongoId, IsNumberString, IsString } from 'class-validator';

export class ConversationMediaDTO {
  @IsString()
  @IsMongoId()
  @ApiModelProperty({
    format: 'hex-encoded representation of a MongoDB ObjectId',
    example: '507f191e810c19729de860ea',
  })
  public readonly conversationId: string;

  @IsString()
  @ApiModelProperty({ in: 'media, docs', example: 'media' })
  public readonly mediaTypes: 'media' | 'docs';

  @IsNumberString()
  @ApiModelProperty()
  public readonly page: number;
  @IsNumberString()
  @ApiModelProperty({ maximum: 50 })
  public readonly limit: number;
}
