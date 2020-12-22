import { ALLOWED_AGE_RANGE } from '@app/constants';
import { ApiModelProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class UpdateAdvertisementDTO {
  @ApiModelProperty({
    description: 'the advertisement text',
    maxLength: 5000,
    required: false,
  })
  @IsString()
  @MaxLength(5000)
  @IsOptional()
  public readonly text?: string;

  @ApiModelProperty({
    description: 'the advertisement url',
    maxLength: 5000,
    required: false,
  })
  @IsString()
  @MaxLength(5000)
  @IsOptional()
  public readonly url?: string;

  @ApiModelProperty({
    description: 'the advertisement media id, the video or the photo',
    required: false,
  })
  @IsString()
  @IsOptional()
  public readonly mediaId?: string;
  @ApiModelProperty()
  @IsString()
  @MaxLength(150)
  public readonly targetCountry: string;

  @ApiModelProperty()
  @IsString()
  @MaxLength(150)
  public readonly targetLocation: string;

  @ApiModelProperty({
    description: 'The Target Age Range',
    in: ALLOWED_AGE_RANGE.toString(),
  })
  @IsString()
  @MaxLength(5)
  @IsIn(ALLOWED_AGE_RANGE)
  public readonly targetAgeRange: string;

  @ApiModelProperty({ description: 'The Target Geo Range in meters' })
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @IsPositive()
  public readonly targetRange: number;

  @ApiModelProperty({
    description: 'The Target Gender',
    in: ['male', 'female', 'all'].toString(),
  })
  @IsString()
  @IsIn(['male', 'female', 'all'])
  public readonly targetGender: 'male' | 'female' | 'all';
}
