import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class EditQuestion {
  @ApiModelPropertyOptional({
    default: '10',
    maximum: 10,
    minimum: 1,
  })
  @IsString()
  @IsOptional()
  @IsIn(['1', '10'])
  public priority: '1' | '10';

  @ApiModelProperty()
  @IsBoolean()
  public solved: boolean;
}
