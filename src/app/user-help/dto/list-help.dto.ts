import { ApiModelProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class ListHelpDTO {
  @ApiModelProperty({
    description: 'The Current Location Latitude',
  })
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Transform(value => Number(value))
  public readonly lat: number;

  @ApiModelProperty({
    description: 'The Current Location Longitude',
  })
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Transform(value => Number(value))
  public readonly long: number;

  @ApiModelProperty({
    description: 'the max distance in km',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsNumber({
    allowInfinity: false,
    allowNaN: false,
  })
  @IsPositive()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(value => Number(value))
  public readonly km: number = 10;

  @ApiModelProperty({
    minimum: 1,
    maximum: 30,
    default: 200,
  })
  @IsNumber({
    allowInfinity: false,
    allowNaN: false,
  })
  @IsPositive()
  @Min(1)
  @Max(200)
  @IsOptional()
  @Transform(value => Number(value))
  public readonly limit: number = 200;

  @ApiModelProperty({
    minimum: 1,
    default: 1,
  })
  @IsNumber({
    allowInfinity: false,
    allowNaN: false,
  })
  @IsPositive()
  @Min(1)
  @IsOptional()
  @Transform(value => Number(value))
  public readonly page: number = 1;
}
