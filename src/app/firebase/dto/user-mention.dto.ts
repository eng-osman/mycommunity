import { ApiModelProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, IsArray, IsString } from 'class-validator';
export class UserMentionDTO {
  @ApiModelProperty({ description: 'userIds that will be mentioned on statusId' })
  @IsString()
  @IsArray()
  @ArrayMaxSize(25)
  @ArrayNotEmpty()
  @ArrayUnique()
  public readonly userIds: string[];
  @ApiModelProperty({ description: 'statusId, could be also a comment or a reply' })
  @IsString()
  public readonly statusId: string;
}
