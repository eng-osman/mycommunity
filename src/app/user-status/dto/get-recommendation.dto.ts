import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetRecommendationDTO {
  @ApiModelProperty()
  @IsString()
  public lat: string;

  @ApiModelProperty()
  @IsString()
  public long: string;

  @ApiModelProperty({ description: 'distance in meters', required: false })
  @IsString()
  @IsOptional()
  public distance: string;

  @ApiModelPropertyOptional({ default: '5.0', maximum: 5.0 })
  @IsString()
  @IsOptional()
  public maxRate: string = '5.0';

  @ApiModelPropertyOptional({ default: '1.0', minimum: 0.0 })
  @IsString()
  @IsOptional()
  public minRate: string = '1.0';

  @ApiModelProperty()
  @IsString()
  public page: string;

  @ApiModelPropertyOptional({ default: '30' })
  @IsString()
  @IsOptional()
  public limit: string = '30';
}
