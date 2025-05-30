import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './User';
import { RecurringPayment } from './RecurringPayment';

export enum PaymentSourceType {
  BANK_ACCOUNT = 'bank_account',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PAYPAL = 'paypal',
  OTHER = 'other'
}

@Entity('payment_sources')
export class PaymentSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: PaymentSourceType,
    default: PaymentSourceType.OTHER
  })
  type: PaymentSourceType;

  @Column()
  identifier: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.paymentSources, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => RecurringPayment, recurringPayment => recurringPayment.paymentSource)
  recurringPayments: RecurringPayment[];
}
