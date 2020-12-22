import { HttpStatus, Injectable } from '@nestjs/common';
import { MessageCodeError } from '@shared/classes';
import { LoggerService } from '@shared/services';
import { standardizeMobileNumber } from '@shared/utils';
import { TwilioService } from './twilio.service';
import { VerificationCacheService } from './verification.cache.service';
const VERIFICATION_TEST_REQUEST_ID = 'dGVzdEFjY291bnQtcmVxdWVzdElkCg==';
@Injectable()
export class VerificationService {
  private readonly logger: LoggerService = new LoggerService(VerificationService.name);
  constructor(
    private readonly twilioService: TwilioService,
    private readonly verificationCacheService: VerificationCacheService,
  ) {}

  public async sendVerificationCode(mobileNumber: any, countryDialCode: string) {
    mobileNumber = standardizeMobileNumber(mobileNumber).replace(countryDialCode, '');
    if (await this.verificationCacheService.isTestNumber(mobileNumber)) {
      const data = {
        requestId: VERIFICATION_TEST_REQUEST_ID,
        mobileNumber,
        seconds_to_expire: Number.MAX_SAFE_INTEGER,
      };
      return { ...data, message: 'Message Sent', statusCode: 200 };
    } else {
      try {
        countryDialCode = countryDialCode.replace('+', '');
        const countryDialCodeInt = parseInt(countryDialCode);
        const result = await this.twilioService.sendVerificationCode(
          mobileNumber,
          countryDialCodeInt,
        );
        if (result.status === HttpStatus.OK) {
          const data = {
            requestId: result.request_id,
            mobileNumber,
            seconds_to_expire: result.seconds_to_expire,
          };
          return { ...data, message: 'Message Sent', statusCode: 200 };
        } else {
          return { error: 'Twilio Error', message: result.message, statusCode: result.status };
        }
      } catch (error) {
        this.logger.error(error.message, error);
        throw new MessageCodeError('APP.TWILIO_ERROR');
      }
    }
  }
  public async checkCode(
    requestId: string,
    mobileNumber: string,
    countryDialCode: string,
    code: any,
  ) {
    mobileNumber = standardizeMobileNumber(mobileNumber).replace(countryDialCode, '');
    if (
      (await this.verificationCacheService.isTestNumber(mobileNumber)) &&
      code === '000000' &&
      requestId === VERIFICATION_TEST_REQUEST_ID
    ) {
      return { requestId, message: 'Verified', statusCode: 200 };
    } else {
      try {
        countryDialCode = countryDialCode.replace('+', '');
        mobileNumber = standardizeMobileNumber(mobileNumber).replace(countryDialCode, '');
        const countryDialCodeInt = parseInt(countryDialCode);
        const result = await this.twilioService.checkCode(mobileNumber, countryDialCodeInt, code);
        if (result.status === HttpStatus.OK) {
          // User verfied, Hoorray !
          return { requestId, message: 'Verified', statusCode: 200 };
        } else {
          return {
            error: 'Verification Error',
            message: result.message,
            statusCode: result.status,
          };
        }
      } catch (error) {
        this.logger.error(error.message, error);
        throw new MessageCodeError('APP.TWILIO_ERROR');
      }
    }
  }

  public async verifyRequestId(requestId: string): Promise<any> {
    try {
      if (requestId === VERIFICATION_TEST_REQUEST_ID) {
        return { requestId, message: `Request Status: verified`, statusCode: 200, isOK: true };
      }
      const result = await this.twilioService.verifyRequestId(requestId);
      if (result.status === 'verified') {
        return {
          requestId,
          message: `Request Status: ${result.status}`,
          statusCode: 200,
          isOK: true,
        };
      } else {
        return {
          requestId,
          message: `Request Status: ${result.status}`,
          statusCode: 5,
          isOK: false,
        };
      }
    } catch (error) {
      this.logger.error(error.message, error);
      throw new MessageCodeError('APP.TWILIO_ERROR');
    }
  }
}
