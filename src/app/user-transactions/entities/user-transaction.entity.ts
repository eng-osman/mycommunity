import { Payment } from '@app/payments/entities';
import { User } from '@app/user/entities';
import { BaseEntity } from '@shared/entities';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';

@Entity('user_transactions')
export class UserTransaction extends BaseEntity {
  @ManyToOne(() => User, user => user.transactions)
  public user: User;

  @OneToOne(() => Payment, payment => payment.transaction, { nullable: true })
  @JoinColumn()
  public payment?: Payment;

  @Column({ type: 'decimal', precision: 16, scale: 2, nullable: false })
  public amount: number;

  @Column({ type: 'int', unsigned: false, nullable: false })
  public points: number;

  @Column({ type: 'text', nullable: true })
  public description?: string;

  @Column({ type: 'int', default: 0 })
  public totalPoints: number;
}
