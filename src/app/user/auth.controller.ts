import { Body, Controller, Post } from '@nestjs/common';
import { ApiImplicitBody, ApiOperation, ApiResponse, ApiUseTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginProcess, LoginVerify } from './dto/login-verify.dto';
@ApiUseTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @ApiOperation({
    title: 'Login By Mobile Number',
    description: 'let the user login by mobile number',
  })
  @ApiResponse({
    status: 200,
    description: 'the requestId after sending the message',
    type: { message: 'Message Sent', statusCode: 200, requestId: 'adadasd' },
  })
  @ApiImplicitBody({
    type: LoginProcess,
    name: 'LoginProcess',
  })
  @Post('login')
  public async login(
    @Body('mobileNumber') mobileNumber: string,
    @Body('countryDialCode') countryDialCode: string,
  ): Promise<any> {
    return this.authService.loginByMobileNumber(mobileNumber, countryDialCode);
  }
  @ApiImplicitBody({
    type: LoginProcess,
    name: 'LoginProcess',
  })
  @Post('login/mobile')
  public async tokenByMobileNumber(@Body('mobileNumber') mobileNumber: string): Promise<any> {
    if (process.env.NODE_ENV !== 'production') {
      return this.authService.getTokenByMobileNumber(mobileNumber);
    } else {
      return { message: 'endpoint disabled.', statusCode: 200 };
    }
  }

  @ApiOperation({
    title: 'verify Login process',
    description: 'get the token by verifing the login process',
  })
  @ApiResponse({
    status: 200,
    description: 'the user token after verifing the user requestId',
  })
  @ApiImplicitBody({
    type: LoginVerify,
    name: 'LoginVerify',
  })
  @Post('login/verify')
  public async verifyLogin(
    @Body('code') code: string,
    @Body('mobileNumber') mobileNumber: string,
    @Body('countryDialCode') countryDialCode: string,
    @Body('requestId') requestId: string,
  ): Promise<any> {
    return this.authService.verifyLoginByMobileNumber(
      requestId,
      code,
      mobileNumber,
      countryDialCode,
    );
  }
}
