import { ApiModelProperty } from '@nestjs/swagger';
import { IsArray, IsDefined, IsString, ValidateNested } from 'class-validator';

export class UserContactsInformation {
  @ApiModelProperty({
    description: 'the contact mobile number, must be in the full format i.e. `20xxxxxxxxx`',
  })
  @IsDefined()
  @IsString()
  public readonly mobileNumber: string;
  @ApiModelProperty({
    description: 'the contact name',
  })
  @IsString()
  public contactName: string;
}
// tslint:disable-next-line:max-classes-per-file
export class UploadContactsDTO {
  @ApiModelProperty({
    description: 'the user contacts',
    isArray: true,
    type: UserContactsInformation,
  })
  @IsArray({ always: true })
  @ValidateNested({ each: true })
  public data: UserContactsInformation[];
}
