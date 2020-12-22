import { StatusPrivacy } from '@app/user-status/status-privacy.enum';
import { ApiModelProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateGroupChannelDTO {
  @IsString()
  @ApiModelProperty({
    description: 'one of [public, contactsOnly]',
    type: String,
    in: 'public, contactsOnly',
  })
  @IsIn(['public', 'contactsOnly'])
  public privacy: StatusPrivacy;

  @IsString()
  @IsNotEmpty()
  public readonly channelName: string;

  @IsArray()
  @ArrayMaxSize(25)
  public readonly groupChannelMembers: string[];

  public readonly describtion: string;
}
