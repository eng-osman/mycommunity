import { ApiModelProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class MobileVerificationStepOne {
  @IsString()
  @Length(9, 15) // TODO: we should make sure of this.
  @ApiModelProperty()
  public readonly mobileNumber: string;

  @IsString()
  @IsNotEmpty()
  @ApiModelProperty()
  public readonly countryDialCode: string;
}
// tslint:disable-next-line:max-classes-per-file
export class MobileVerificationStepTwo extends MobileVerificationStepOne {
  @IsString()
  @ApiModelProperty()
  public readonly requestId: string;

  @IsString()
  @Length(6)
  @ApiModelProperty()
  public readonly code: any;
}
