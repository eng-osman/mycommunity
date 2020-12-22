import { UserTransactionService } from '@app/user-transactions/user-transaction.service';
import {
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@shared/services';
import { PayPalError } from 'paypal-rest-sdk';
import { isNil } from 'ramda';
import { Repository } from 'typeorm';
import { VerifyPaymentDTO } from './dto/verify-payment.dto';
import { Payment } from './entities/payment.entity';
import { PaymentCacheService } from './payment-cache.service';
import { PaymentState } from './payment-state.enum';
import { PayPalService } from './paypal.service';

@Injectable()
export class PaymentService {
  private readonly logger = new LoggerService(PaymentService.name);
  constructor(
    @InjectRepository(Payment) private readonly paymentsRepository: Repository<Payment>,
    private readonly userTransactionService: UserTransactionService,
    private readonly paypalService: PayPalService,
    private readonly paymentCacheService: PaymentCacheService,
  ) {}
  public async createPayment(transactionId: string, entity: Payment) {
    const savedTransaction = await this.userTransactionService.getTransactionById(transactionId);
    if (!savedTransaction) {
      throw new InternalServerErrorException('Error While Getting User Transaction.');
    }
    entity.transaction = savedTransaction;
    const savedPayment = await this.paymentsRepository.save(entity);
    return savedPayment;
  }

  public async getPaymentByPayPalPaymentId(paypalPaymentId: string) {
    return this.paymentsRepository.findOne({ paypalPaymentId });
  }

  public async verifyPayment(userId: string, { paymentId, clientPayment }: VerifyPaymentDTO) {
    let everythingOk = false;
    // cahce that, we just need to make sure that we don't have any problems.
    const isCached = await this.paymentCacheService.cachePaymentId(paymentId);
    if (!isCached) {
      this.logger.warn(`Error While Caching Paymend: ${paymentId}`);
      throw new InternalServerErrorException('Error While Caching Paymend, Try agian.');
    }
    const isPaymentExist = await this.getPaymentByPayPalPaymentId(paymentId);
    if (isPaymentExist) {
      throw new UnprocessableEntityException('Payment already been verified.');
    }
    try {
      const serverPayment = await this.paypalService.getPayment(paymentId);
      if (isNil(serverPayment)) {
        this.logger.error('Error While Getting Server Payment Copy from PayPal.');
        throw new InternalServerErrorException('Error With PayPal Service.');
      }
      if (serverPayment.state !== PaymentState.APPROVED) {
        throw new UnprocessableEntityException(
          `Payment has not been approved yet. Status is ${serverPayment.state}`,
        );
      }
      const clientLastTransaction = clientPayment.transactions[0];
      const serverLastTransaction = serverPayment.transactions[0];
      if (clientLastTransaction.amount.total !== serverLastTransaction.amount.total) {
        throw new UnprocessableEntityException('Payment amount does not match order.');
      }
      if (clientLastTransaction.amount.currency !== serverLastTransaction.amount.currency) {
        throw new UnprocessableEntityException('Payment currency does not match order.');
      }
      const relatedResources: any = serverLastTransaction.related_resources;
      if (relatedResources[0].sale.state !== 'completed') {
        throw new UnprocessableEntityException('Sale not completed');
      }
      // I think we now are safe ?
      const amount = parseFloat(serverLastTransaction.amount.total);
      const points = await this.userTransactionService.calculatePointsFormAmmout(amount);
      const transaction = await this.userTransactionService.createTransaction(
        userId,
        amount,
        points,
        serverLastTransaction.description,
      );
      const payment = new Payment();
      payment.currency = serverLastTransaction.amount.currency;
      payment.paypalPaymentId = paymentId;
      payment.state = PaymentState.APPROVED;
      const savedPayment = await this.createPayment(transaction.id, payment);
      everythingOk = true;
      return savedPayment;
    } catch (error) {
      const err: PayPalError = error;
      this.logger.error(err.message, err);
      throw error;
    } finally {
      if (everythingOk) {
        // Do we need that ?
        await this.paymentCacheService.deleteCache(paymentId);
      }
    }
  }
}
