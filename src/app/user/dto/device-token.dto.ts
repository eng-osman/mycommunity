import { ApiModelProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DeviceTokenDTO {
  @ApiModelProperty({ description: 'the new device token' })
  @IsString()
  public readonly deviceToken: string;
}
