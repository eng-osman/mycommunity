import { ApiModelProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
export class StatusWinnerDTO {
  @ApiModelProperty()
  @IsString()
  public readonly statusId: string;
}
