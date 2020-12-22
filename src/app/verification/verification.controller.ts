import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiUseTags } from '@nestjs/swagger';
import { parseArabicNumbers } from '@shared/utils';
import { MobileVerificationStepOne, MobileVerificationStepTwo } from './dto';
import { VerificationService } from './verification.service';
@ApiUseTags('User')
@Controller('user/verify')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}
  @ApiOperation({
    title: 'request a verification code',
  })
  @ApiResponse({
    status: 200,
  })
  @Post('request')
  public async verifyMobile(@Body() body: MobileVerificationStepOne): Promise<any> {
    return this.verificationService.sendVerificationCode(
      parseArabicNumbers(body.mobileNumber),
      body.countryDialCode,
    );
  }

  @ApiOperation({
    title: 'cancel the requested verification requestId',
    deprecated: true,
  })
  @ApiResponse({
    status: 200,
  })
  @Post('request/cancel')
  public async cancelRequestId(): Promise<any> {
    return 'deprecated';
  }

  @ApiOperation({
    title: 'verify the requested verification requestId',
  })
  @ApiResponse({
    status: 200,
  })
  @Post('code')
  public async verifyCode(@Body() body: MobileVerificationStepTwo): Promise<any> {
    return this.verificationService.checkCode(
      body.requestId,
      parseArabicNumbers(body.mobileNumber),
      body.countryDialCode,
      body.code,
    );
  }

  @ApiOperation({
    title: 'resend verification code',
    deprecated: true,
  })
  @ApiResponse({
    status: 200,
  })
  @Post('code/resend')
  public async reSendCode(): Promise<any> {
    return 'deprecated';
  }
}
