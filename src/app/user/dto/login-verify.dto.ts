import { ApiModelProperty } from '@nestjs/swagger';
export class LoginVerify {
  @ApiModelProperty({ description: 'the code recived in the message' })
  public code: string;
  @ApiModelProperty({ description: 'the user mobile number' })
  public mobileNumber: string;
  @ApiModelProperty({ description: 'the user mobile number country code' })
  public countryDialCode: string;
  @ApiModelProperty()
  public requestId: string;
}

// tslint:disable-next-line:max-classes-per-file
export class LoginProcess {
  @ApiModelProperty({ description: 'the user mobile number' })
  public mobileNumber: string;
  @ApiModelProperty({ description: 'the user mobile number country code' })
  public countryDialCode: string;
}
