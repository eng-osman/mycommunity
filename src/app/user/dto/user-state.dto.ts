import { ApiModelProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

export class UserStateDTO {
  @ApiModelProperty({ description: 'the user id' })
  @IsString()
  public readonly id: string;
  @ApiModelProperty({ description: 'the user state' })
  @IsBoolean()
  public readonly isActive: boolean;
}
