import { ApiModelProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TechThreadDTO {
  @ApiModelProperty()
  @IsString()
  public readonly message: string;
}
