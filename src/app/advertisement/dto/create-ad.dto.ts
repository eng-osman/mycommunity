import { ALLOWED_AGE_RANGE } from '@app/constants';
import { ApiModelProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAdvertisementDTO {
  @ApiModelProperty({ description: 'the advertisement type', in: 'photo, video' })
  @IsString()
  @IsIn(['photo', 'video'])
  public readonly type: 'photo' | 'video';

  @ApiModelProperty()
  @IsArray()
  @ArrayMaxSize(150)
  public readonly categoryIds: string[];

  @ApiModelProperty({
    description: 'the advertisement width',
    maximum: 1000,
    minimum: 100,
  })
  @IsPositive()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @IsPositive()
  @Max(1000)
  @Min(100)
  public readonly width: number;

  @ApiModelProperty({
    description: 'the advertisement Points',
  })
  @IsPositive()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @IsPositive()
  @Min(10)
  public readonly points: number;

  @ApiModelProperty({
    description: 'the advertisement height',
    maximum: 1000,
    minimum: 100,
  })
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @IsPositive()
  @Max(1000)
  @Min(100)
  public readonly height: number;

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

  @ApiModelProperty({ description: 'How many days should this ad appears' })
  @IsPositive()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  public readonly expiresInDays: number;
}
