import { ApiModelProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
export class BlockChannelDTO {
  @ApiModelProperty({ description: 'the channel id' })
  @IsString()
  public readonly channelId: string;
}
