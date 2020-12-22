import { ApiModelProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateMediaDTO {
  @ApiModelProperty()
  @IsString()
  public readonly mediaId: string;
}
