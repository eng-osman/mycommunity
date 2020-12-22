import { ApiModelProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UserTokenDTO {
  @ApiModelProperty({ description: 'the old user token' })
  @IsString()
  public readonly token: string;
}
