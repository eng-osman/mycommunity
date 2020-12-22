import { HttpService, HttpStatus, Injectable } from '@nestjs/common';
import { LoggerService } from '@shared/services';
import { Env } from '@shared/utils';
import {
  TwilioCheckVerificationCodeRequest,
  TwilioCheckVerificationCodeResponse,
  TwilioSendVerificationCodeRequest,
  TwilioSendVerificationCodeResponse,
  TwilioStatusVerificationCodeRequest,
  TwilioStatusVerificationCodeResponse,
} from './twilio-schema.interface';

@Injectable()
export class TwilioService {
  private static readonly BASE_ENDPOINT =
    'https://api.authy.com/protected/json/phones/verification';
  private static readonly API_KEY = Env('TWILIO_API_KEY');
  private readonly logger: LoggerService = new LoggerService(TwilioService.name);
  constructor(private readonly httpService: HttpService) {}

  public async sendVerificationCode(mobileNumber: string, countryCode: number) {
    try {
      const res = await this.httpService
        .post<TwilioSendVerificationCodeResponse>(
          '/start',
          {
            country_code: countryCode,
            phone_number: mobileNumber,
            code_length: 6,
            via: 'sms',
            locale: 'en',
          } as TwilioSendVerificationCodeRequest,
          {
            baseURL: TwilioService.BASE_ENDPOINT,
            headers: {
              'X-Authy-API-Key': TwilioService.API_KEY,
            },
          },
        )
        .toPromise();
      this.logger.logDebug('Twilio', res.statusText, res.data);
      if (res.status === HttpStatus.OK && res.data.success) {
        return {
          status: HttpStatus.OK,
          message: res.data.message,
          request_id: res.data.uuid,
          seconds_to_expire: res.data.seconds_to_expire,
        };
      } else {
        this.logger.error(`Twilio Error: ${JSON.stringify(res.data, null, 2)}`);
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Twilio Error, Contact Support ! [Send Verification Code]',
          request_id: '',
          seconds_to_expire: 0,
        };
      }
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async checkCode(mobileNumber: string, countryCode: number, code: string) {
    try {
      const res = await this.httpService
        .get<TwilioCheckVerificationCodeResponse>('/check', {
          params: {
            country_code: countryCode,
            phone_number: mobileNumber,
            verification_code: code,
          } as TwilioCheckVerificationCodeRequest,
          baseURL: TwilioService.BASE_ENDPOINT,
          headers: {
            'X-Authy-API-Key': TwilioService.API_KEY,
          },
        })
        .toPromise();

      this.logger.logDebug('Twilio', res.statusText, res.data);
      if (res.status === HttpStatus.OK && res.data.success) {
        return {
          status: HttpStatus.OK,
          message: res.data.message,
          success: true,
        };
      } else {
        this.logger.error(`Twilio Error: ${JSON.stringify(res.data, null, 2)}`);
        return {
          status: HttpStatus.UNAUTHORIZED,
          message: res.data.message,
          success: false,
        };
      }
    } catch (error) {
      this.logger.error(error.message, error);
      return {
        status: HttpStatus.UNAUTHORIZED,
        message: 'Verification code is incorrect',
        success: false,
      };
    }
  }

  public async verifyRequestId(requestId: string) {
    try {
      const res = await this.httpService
        .get<TwilioStatusVerificationCodeResponse>('/status', {
          params: {
            uuid: requestId,
          } as TwilioStatusVerificationCodeRequest,
          baseURL: TwilioService.BASE_ENDPOINT,
          headers: {
            'X-Authy-API-Key': TwilioService.API_KEY,
          },
        })
        .toPromise();

      this.logger.logDebug('Twilio', res.statusText, res.data);
      if (res.status === HttpStatus.OK) {
        return res.data;
      } else {
        this.logger.error(`Twilio Error: ${JSON.stringify(res.data, null, 2)}`);
        return {
          status: 'notfound',
          message: 'Twilio Error, Contact Support ! [Check Verification Code]',
          success: false,
        } as TwilioStatusVerificationCodeResponse;
      }
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }
}
