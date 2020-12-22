import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetQuestionsDTO {
  @ApiModelPropertyOptional({
    default: '10',
    maximum: 10,
    minimum: 1,
  })
  @IsString()
  public priority: string = '10';

  @ApiModelProperty()
  @IsString()
  public page: string = '1';

  @ApiModelPropertyOptional({ default: '30' })
  @IsString()
  @IsOptional()
  public limit: string = '30';
}
