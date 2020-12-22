import { Injectable } from '@nestjs/common';
import { LoggerService } from '@shared/services';
import { Env } from '@shared/utils';
import Nexmo = require('nexmo');
/**
 * @deprecated see {TwilioService}
 */
@Injectable()
export class NexmoService {
  private readonly logger: LoggerService = new LoggerService(NexmoService.name);
  private readonly nexmoClient: Nexmo;
  constructor() {
    const options = { debug: Env('NODE_ENV') === 'dev' };
    this.nexmoClient = new Nexmo(
      { apiKey: Env('NEXMO_API_KEY'), apiSecret: Env('NEXMO_API_SECRET') },
      options,
    );
  }
  public async sendVerificationCode(mobileNumber: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.nexmoClient.verify.request(
        { number: mobileNumber, brand: 'MyCommunity', code_length: 6 },
        (err, result) => {
          if (err) {
            this.logger.error(err.message, err);
            reject(err);
          } else {
            this.logger.log(JSON.stringify(result));
            resolve(result);
          }
        },
      );
    });
  }

  public async checkCode(requestId: string, code: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.nexmoClient.verify.check({ request_id: requestId, code }, (err, result) => {
        if (err) {
          this.logger.error(err.message, err);
          reject(err);
        } else {
          this.logger.log(JSON.stringify(result));
          resolve(result);
        }
      });
    });
  }

  public async reSendCode(requestId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.nexmoClient.verify.control(
        { request_id: requestId, cmd: 'trigger_next_event' },
        (err, result) => {
          if (err) {
            this.logger.error(err.message, err);
            reject(err);
          } else {
            this.logger.log(JSON.stringify(result));
            resolve(result);
          }
        },
      );
    });
  }

  public async cancelRequestId(requestId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.nexmoClient.verify.control({ request_id: requestId, cmd: 'cancel' }, (err, result) => {
        if (err) {
          this.logger.error(err.message, err);
          reject(err);
        } else {
          this.logger.log(JSON.stringify(result));
          resolve(result);
        }
      });
    });
  }
  public async verifyRequestId(requestId: string | string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.nexmoClient.verify.search(requestId, (err, result) => {
        if (err) {
          this.logger.error(err.message, err);
          reject(err);
        } else {
          this.logger.log(JSON.stringify(result));
          resolve(result);
        }
      });
    });
  }
}
