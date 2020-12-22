import { ApiModelProperty } from '@nestjs/swagger';
import { IsMongoId, IsNumber, IsPositive, Max, Min } from 'class-validator';
export class CreateHelpDTO {
  @ApiModelProperty({
    description: 'The Current Location Latitude',
  })
  @IsNumber({ allowInfinity: false, allowNaN: false })
  public readonly lat: number;

  @ApiModelProperty({
    description: 'The Current Location Longitude',
  })
  @IsNumber({ allowInfinity: false, allowNaN: false })
  public readonly long: number;

  @ApiModelProperty({
    description: 'The Number of members that needs help',
    maximum: 10,
    minimum: 1,
  })
  @IsNumber({
    allowInfinity: false,
    allowNaN: false,
  })
  @IsPositive()
  @Min(1)
  @Max(10)
  public readonly membersCount: number;

  @ApiModelProperty({
    description: 'the category of the help',
  })
  @IsMongoId()
  public readonly categoryId: string;
}
