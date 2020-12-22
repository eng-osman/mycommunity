import { ApiModelProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { UserPrivacy } from '../privacy/user-privacy.enum';
export class BlockUserDTO {
  @ApiModelProperty({ description: 'the user id' })
  @IsString()
  public readonly userId: string;
  @IsString()
  @IsIn(['none', 'all', 'profile', 'chatOnly'])
  @ApiModelProperty({
    description: 'the block type, one of [none, all, profile, chatOnly]',
  })
  public readonly type: UserPrivacy;
}
