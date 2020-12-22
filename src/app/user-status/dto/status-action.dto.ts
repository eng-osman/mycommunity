import { ApiModelProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class StatusActionDTO {
  @ApiModelProperty()
  @IsString()
  public statusId: string;

  @IsString()
  @ApiModelProperty({ description: 'one of [like, dislike, view]' })
  @IsIn(['like', 'dislike', 'view'])
  public actionType: string;
}
