import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { PaymentSource } from './PaymentSource';
import { RecurringPayment } from './RecurringPayment';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  first_name?: string;

  @Column({ nullable: true })
  last_name?: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => PaymentSource, paymentSource => paymentSource.user)
  payment_sources: PaymentSource[];

  @OneToMany(() => RecurringPayment, recurringPayment => recurringPayment.user)
  recurring_payments: RecurringPayment[];
}
