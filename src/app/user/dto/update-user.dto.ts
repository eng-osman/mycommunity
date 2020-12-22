import { ApiModelProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Profile, User } from '../entities';
export class UpdateUserDTO {
  @ApiModelProperty({ description: 'User Object', required: true, type: User })
  @ValidateNested()
  public readonly user: User;
  @ApiModelProperty({ description: 'Profile Object', required: true, type: Profile })
  @ValidateNested()
  public readonly profile: Profile;
}
