import { ApiModelProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateChannelDTO {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiModelProperty({ required: false })
  public readonly channelName: string;
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiModelProperty({ required: false })
  public readonly describtion: string;
  @IsBoolean()
  @IsNotEmpty()
  @IsOptional()
  @ApiModelProperty({ required: false })
  public readonly isPublicGlobal: boolean;
}
