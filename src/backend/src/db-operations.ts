import { pool } from './database';
import { PaymentSource, RecurringPayment } from './types';

// Payment Sources Database Operations
export class PaymentSourcesDB {
  static async getAll(userId: string): Promise<PaymentSource[]> {
    const query = `
      SELECT id, user_id, name, type, identifier, created_at
      FROM payment_sources
      WHERE user_id = $1
      ORDER BY name
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }

  static async create(userId: string, data: Omit<PaymentSource, 'id' | 'user_id' | 'created_at'>): Promise<PaymentSource> {
    const query = `
      INSERT INTO payment_sources (user_id, name, type, identifier)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, name, type, identifier, created_at
    `;
    const { rows } = await pool.query(query, [userId, data.name, data.type, data.identifier]);
    return rows[0];
  }

  static async update(id: string, userId: string, data: Partial<Pick<PaymentSource, 'name' | 'type' | 'identifier'>>): Promise<PaymentSource | null> {
    const query = `
      UPDATE payment_sources
      SET name = $1, type = $2, identifier = $3
      WHERE id = $4 AND user_id = $5
      RETURNING id, user_id, name, type, identifier, created_at
    `;
    const { rows } = await pool.query(query, [data.name, data.type, data.identifier, id, userId]);
    return rows[0] || null;
  }

  static async delete(id: string, userId: string): Promise<boolean> {
    const query = 'DELETE FROM payment_sources WHERE id = $1 AND user_id = $2';
    const { rowCount } = await pool.query(query, [id, userId]);
    return (rowCount || 0) > 0;
  }

  static async exists(id: string): Promise<boolean> {
    const query = 'SELECT 1 FROM payment_sources WHERE id = $1';
    const { rows } = await pool.query(query, [id]);
    return rows.length > 0;
  }

  static async isUsedByPayments(paymentSourceId: string): Promise<boolean> {
    const query = 'SELECT 1 FROM recurring_payments WHERE payment_source_id = $1 LIMIT 1';
    const { rows } = await pool.query(query, [paymentSourceId]);
    return rows.length > 0;
  }
}

// Recurring Payments Database Operations
export class RecurringPaymentsDB {
  static async getAll(userId: string): Promise<RecurringPayment[]> {
    const query = `
      SELECT id, user_id, name, amount, currency, frequency, payment_source_id, start_date, category, created_at
      FROM recurring_payments
      WHERE user_id = $1
      ORDER BY name
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }

  static async checkExists(userId: string): Promise<boolean> {
    const query = 'SELECT 1 FROM recurring_payments WHERE user_id = $1 LIMIT 1';
    const { rows } = await pool.query(query, [userId]);
    return rows.length > 0;
  }

  static async create(userId: string, data: Omit<RecurringPayment, 'id' | 'user_id' | 'created_at'>): Promise<RecurringPayment> {
    const query = `
      INSERT INTO recurring_payments (user_id, name, amount, currency, frequency, payment_source_id, start_date, category)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, user_id, name, amount, currency, frequency, payment_source_id, start_date, category, created_at
    `;
    const { rows } = await pool.query(query, [
      userId,
      data.name,
      data.amount,
      data.currency,
      data.frequency,
      data.payment_source_id,
      data.start_date,
      data.category
    ]);
    return rows[0];
  }

  static async update(id: string, userId: string, data: Partial<Pick<RecurringPayment, 'name' | 'amount' | 'currency' | 'frequency' | 'payment_source_id' | 'start_date' | 'category'>>): Promise<RecurringPayment | null> {
    const query = `
      UPDATE recurring_payments
      SET name = $1, amount = $2, currency = $3, frequency = $4, payment_source_id = $5, start_date = $6, category = $7
      WHERE id = $8 AND user_id = $9
      RETURNING id, user_id, name, amount, currency, frequency, payment_source_id, start_date, category, created_at
    `;
    const { rows } = await pool.query(query, [
      data.name,
      data.amount,
      data.currency,
      data.frequency,
      data.payment_source_id,
      data.start_date,
      data.category,
      id,
      userId
    ]);
    return rows[0] || null;
  }

  static async delete(id: string, userId: string): Promise<boolean> {
    const query = 'DELETE FROM recurring_payments WHERE id = $1 AND user_id = $2';
    const { rowCount } = await pool.query(query, [id, userId]);
    return (rowCount || 0) > 0;
  }
}