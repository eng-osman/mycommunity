import { ApiModelProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { StaticsAction } from '../statics-action.enum';
export class PerformAdvertisementActionDTO {
  @ApiModelProperty({ enum: StaticsAction, description: 'the action type' })
  @IsEnum(StaticsAction)
  public readonly actionType: StaticsAction;
}
