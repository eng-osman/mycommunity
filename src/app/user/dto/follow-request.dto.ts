import { ApiModelProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
export class FollowRequestDTO {
  @ApiModelProperty({ description: 'the user id' })
  @IsString()
  public readonly userId: string;
}
