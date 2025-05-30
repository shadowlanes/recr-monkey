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
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PaymentSource, paymentSource => paymentSource.user)
  paymentSources: PaymentSource[];

  @OneToMany(() => RecurringPayment, recurringPayment => recurringPayment.user)
  recurringPayments: RecurringPayment[];
}
