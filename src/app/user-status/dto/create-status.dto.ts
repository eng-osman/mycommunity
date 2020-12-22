import { ApiModelProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { StatusPrivacy } from '../status-privacy.enum';

export class CreateStatusDTO {
  @ApiModelProperty({
    description: 'Status Text',
    default: 'New Status Text',
  })
  @MaxLength(1500)
  @IsString()
  public text: string;

  @ApiModelProperty({ default: false })
  @IsBoolean()
  public isReply: boolean;

  @ApiModelProperty({ default: false })
  @IsBoolean()
  public isShare: boolean;

  @ApiModelProperty({ default: false })
  @IsBoolean()
  public isLive: boolean;

  @ApiModelProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  public isPublicGlobal: boolean;

  @ApiModelProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  public hideOriginalStatusOwner: boolean;

  @ApiModelProperty({ default: false })
  @IsBoolean()
  public isGeoEnabled: boolean;

  @ApiModelProperty({ default: false })
  @IsBoolean()
  public hasPrivacy: boolean;

  @ValidateIf((status: CreateStatusDTO) => status.isReply && !status.isShare)
  @IsString()
  @ApiModelProperty({ default: '0' })
  public inReplyToStatusId: string;

  @IsString()
  @IsOptional()
  @ApiModelProperty({
    default: '0',
    description: "if this status should be in another user's timeline",
  })
  public withUserId: string;

  @ValidateIf((status: CreateStatusDTO) => status.isLive && !status.isReply)
  @IsString()
  @ApiModelProperty({ example: '1234567890abcdef123456789' })
  public channelId: string;

  @ValidateIf((status: CreateStatusDTO) => status.type === 'rate')
  @IsNumber({
    allowNaN: false,
    allowInfinity: false,
  })
  @Min(0)
  @Max(5.0)
  @ApiModelProperty({ example: 4.9 })
  public stars: number;

  @ValidateIf((status: CreateStatusDTO) => status.type === 'rate')
  @IsString()
  @ApiModelProperty({ example: 'My Place Name' })
  public locationName: string;

  @ValidateIf((status: CreateStatusDTO) => status.isShare && !status.isReply)
  @IsString()
  @ApiModelProperty({ default: '0' })
  public shareToStatusId: string;

  @ValidateIf((status: CreateStatusDTO) => status.isGeoEnabled || status.isPublicGlobal)
  @IsString()
  @ApiModelProperty({ example: '29.123,30.1234' })
  public coordinates: string;

  @ApiModelProperty({ default: false })
  @IsBoolean()
  public hasMedia: boolean;

  @ValidateIf(
    (status: CreateStatusDTO) =>
      status.hasMedia ||
      status.type === 'media' ||
      status.type === 'story' ||
      status.type === 'rate' ||
      status.type === 'channelMedia' ||
      status.type === 'competition',
  )
  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @ApiModelProperty({ isArray: true, default: [], maxLength: 5 })
  public mediaIds: string[];

  @ApiModelProperty({
    required: false,
    default: [],
    isArray: true,
    maxLength: 25,
  })
  @IsArray()
  @ArrayMaxSize(25)
  @ArrayUnique()
  @IsOptional()
  public mentions: string[] = [];

  @ValidateIf((status: CreateStatusDTO) => status.hasMedia)
  @IsString()
  @IsIn(['video', 'voice', 'photo'])
  @ApiModelProperty({
    description: 'the uploaded media type',
    in: 'video, photo, voice',
  })
  public mediaType: string;

  @ValidateIf((status: CreateStatusDTO) => status.hasPrivacy)
  @IsString()
  @ApiModelProperty({
    description: 'one of [public, contactsOnly, onlyMe]',
    type: String,
    in: 'public, contactsOnly, onlyMe',
  })
  @IsIn(['public', 'onlyMe', 'contactsOnly'])
  public privacy: StatusPrivacy;

  @ValidateIf((status: CreateStatusDTO) => !status.isReply || !status.isShare)
  @ApiModelProperty({
    description: 'one of [rate, status, media, story, channelMedia, help, competition]',
    in: 'rate, status, media, story, channelMedia, help, competition',
  })
  @IsIn(['story', 'media', 'status', 'rate', 'channelMedia', 'help', 'competition'])
  @IsString()
  public type: 'story' | 'media' | 'status' | 'rate' | 'channelMedia' | 'help' | 'competition';

  @IsString()
  @IsOptional()
  public readonly local_id: string;

  @ApiModelProperty({
    description: 'one of [1, 10]',
    required: false,
  })
  @Transform(v => Number(v))
  @IsNumber({
    allowNaN: false,
    allowInfinity: false,
  })
  @IsIn([1, 10])
  @ValidateIf((status: CreateStatusDTO) => status.type === 'help')
  public readonly priority: number;

  @IsArray()
  @ArrayMaxSize(25)
  @IsOptional()
  public readonly contactsToshow?: string[];
}
