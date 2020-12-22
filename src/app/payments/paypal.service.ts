import { OnModuleInit } from '@nestjs/common';
import { Env } from '@shared/utils';
import * as PayPal from 'paypal-rest-sdk';

export class PayPalService implements OnModuleInit {
  public onModuleInit() {
    PayPal.configure({
      client_id: Env('PAYPAL_CLIENT_ID', ''),
      client_secret: Env('PAYPAL_CLIENT_SECRET', ''),
      mode: Env('PAYPAL_MODE', 'sandbox'),
    });
  }

  public async getPayment(paymentId: string) {
    return new Promise<PayPal.PaymentResponse>((resolve, reject) => {
      PayPal.payment.get(paymentId, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }
}
