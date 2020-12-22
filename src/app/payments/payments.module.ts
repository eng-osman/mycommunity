import { UserTransactionsModule } from '@app/user-transactions/user-transactions.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentCacheService } from './payment-cache.service';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PayPalService } from './paypal.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), UserTransactionsModule],
  controllers: [PaymentController],
  providers: [PayPalService, PaymentService, PaymentCacheService],
  exports: [PaymentService],
})
export class PaymentModule {}
