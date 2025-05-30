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
  user_id: string;

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
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, user => user.payment_sources, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => RecurringPayment, recurringPayment => recurringPayment.payment_source)
  recurringPayments: RecurringPayment[];
}
