import { ApiModelProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SetHtmlDTO {
  @ApiModelProperty()
  @IsString()
  public readonly html: string;
}
