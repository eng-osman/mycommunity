import { UserTransaction } from '@app/user-transactions/entities';
import { BaseEntity } from '@shared/entities';
import { Column, Entity, OneToOne } from 'typeorm';
import { PaymentState } from '../payment-state.enum';
@Entity('payments')
export class Payment extends BaseEntity {
  @OneToOne(() => UserTransaction, transaction => transaction.payment)
  public transaction: UserTransaction;

  @Column({ type: 'varchar', length: 32, unique: true, primary: true })
  public paypalPaymentId: string;

  @Column({ type: 'enum', enum: PaymentState })
  public state: PaymentState;

  @Column({ type: 'varchar', length: 5, default: 'USD' })
  public currency: string = 'USD';
}
