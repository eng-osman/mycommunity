import { ApiModelProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ChangeAdvertisementStatusDTO {
  @ApiModelProperty({ description: 'the new Advertisement status' })
  @IsBoolean()
  public readonly status: boolean;
}
