import { ApiModelProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateProfilePicDTO {
  @ApiModelProperty({ description: 'the media id' })
  @IsString()
  public readonly photoId: string;
}
