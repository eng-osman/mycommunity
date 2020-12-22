import { ApiModelProperty } from '@nestjs/swagger';
import { IsString, Length, ValidateNested } from 'class-validator';
import { Profile, User } from '../entities';

export class CreateUserDTO {
  @IsString()
  @Length(32)
  @ApiModelProperty({
    description: 'the requestId climed at verification process',
    required: true,
  })
  public readonly requestId: string;
  @ApiModelProperty({
    description: 'the photoId uploaded to the server as Base64 encoded',
    required: true,
  })
  @IsString()
  public readonly photoId: string;
  @ApiModelProperty({
    description: 'the user mobile number',
    required: true,
  })
  @IsString()
  @Length(9, 14) // TODO: we should make sure of this.
  public readonly mobileNumber: string;
  @ApiModelProperty({ description: 'User Object', required: true, type: User })
  @ValidateNested()
  public user: User;
  @ApiModelProperty({ description: 'Profile Object', required: true, type: Profile })
  @ValidateNested()
  public profile: Profile;
}
