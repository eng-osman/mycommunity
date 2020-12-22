import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetGlobalMediaDTO {
  @ApiModelProperty()
  @IsString()
  public lat: string;

  @ApiModelProperty()
  @IsString()
  public long: string;

  @ApiModelProperty({ description: 'distance in meters', required: false, default: '10000' })
  @IsString()
  @IsOptional()
  public distance: string;

  @ApiModelProperty({
    description: 'get only the count, without the Statuses',
    required: false,
    default: true,
  })
  @IsString()
  @IsOptional()
  public countOnly: string = 'true';

  @ApiModelProperty()
  @IsString()
  public page: string;

  @ApiModelPropertyOptional({ default: '30' })
  @IsString()
  @IsOptional()
  public limit: string = '30';
}
