import { Router } from 'express';
import { z } from 'zod';
import { sourceInput } from './services/paymentSources';
import { subscriptionInput } from './services/subscriptions';

// Request bodies come straight from the zod schemas the services validate
// with, so the spec cannot drift from the real rules. Paths and response
// shapes are written out here: change them together with the routes.
const body = (schema: z.ZodType) => {
  const { $schema: _ignored, ...json } = z.toJSONSchema(schema, {
    io: 'input',
    target: 'openapi-3.0',
    unrepresentable: 'any',
  }) as Record<string, unknown>;
  return json;
};

const envelope = (data: unknown) => ({
  type: 'object',
  properties: { data, error: { nullable: true, type: 'object', properties: { message: { type: 'string' } } } },
});
const ok = (description: string, data: unknown) => ({
  description,
  content: { 'application/json': { schema: envelope(data) } },
});
const jsonBody = (schema: unknown) => ({
  required: true,
  content: { 'application/json': { schema } },
});
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' } };
const arrayOf = (ref: string) => ({ type: 'array', items: { $ref: `#/components/schemas/${ref}` } });
const errors = {
  '400': { description: 'Validation failed; error.message says which field' },
  '401': { description: 'Missing or invalid credentials' },
  '403': { description: 'Read-only key used for a write' },
  '404': { description: 'Not found, or not owned by the caller' },
};

export function buildOpenApi(baseUrl: string) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Recr Monkey API',
      version: '1.0.0',
      description:
        'Personal subscription tracker. Authenticate with `Authorization: Bearer recr_...` (API key from Settings -> AI access) or an OAuth access token. Every response is `{ data, error }`; on success `error` is null. Each subscription keeps its own billing currency; totals are converted to the user display currency. Read-only keys get 403 on POST/PUT/DELETE. Assistants should prefer the MCP endpoint (POST /mcp), which describes its own tools.',
    },
    servers: [{ url: baseUrl }],
    security: [{ bearer: [] }],
    components: {
      securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } },
      schemas: {
        SubscriptionInput: body(subscriptionInput),
        Subscription: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string', example: 'USD' },
            frequency: { type: 'string', enum: ['weekly', 'monthly', '4weeks', 'yearly'] },
            start_date: { type: 'string', example: '2026-01-15' },
            payment_source_id: { type: 'string', nullable: true },
            category: { type: 'string', nullable: true },
            created_via: { type: 'string', enum: ['web', 'api', 'mcp'] },
          },
        },
        PaymentSourceInput: body(sourceInput),
        PaymentSource: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['bank_account', 'debit_card', 'credit_card'] },
            identifier: { type: 'string', description: 'Last 4 digits' },
          },
        },
        UpcomingCharges: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            display_currency: { type: 'string' },
            total_in_display_currency: { type: 'number' },
            charges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  subscription_id: { type: 'string' },
                  name: { type: 'string' },
                  amount: { type: 'number', description: 'Billing currency' },
                  currency: { type: 'string' },
                  amount_in_display_currency: { type: 'number' },
                  category: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        SpendSummary: {
          type: 'object',
          properties: {
            display_currency: { type: 'string' },
            subscription_count: { type: 'integer' },
            monthly_total: { type: 'number' },
            yearly_total: { type: 'number' },
            by_category: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  monthly_total: { type: 'number' },
                  count: { type: 'integer' },
                },
              },
            },
            rates_fetched_at: { type: 'string' },
          },
        },
      },
    },
    paths: {
      '/api/recurring-payments': {
        get: {
          summary: 'List all subscriptions',
          responses: { '200': ok('Subscriptions', arrayOf('Subscription')), '401': errors['401'] },
        },
        post: {
          summary: 'Add a subscription',
          requestBody: jsonBody({ $ref: '#/components/schemas/SubscriptionInput' }),
          responses: { '200': ok('Created, as a one-item array', arrayOf('Subscription')), ...errors },
        },
      },
      '/api/recurring-payments/upcoming': {
        get: {
          summary: 'Charges due in the next N days, in date order',
          parameters: [
            { name: 'days', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 365, default: 30 } },
          ],
          responses: { '200': ok('Charges', { $ref: '#/components/schemas/UpcomingCharges' }), '401': errors['401'] },
        },
      },
      '/api/recurring-payments/summary': {
        get: {
          summary: 'Monthly and yearly spend by category, in the display currency',
          responses: { '200': ok('Summary', { $ref: '#/components/schemas/SpendSummary' }), '401': errors['401'] },
        },
      },
      '/api/recurring-payments/{id}': {
        put: {
          summary: 'Replace a subscription (send every field)',
          parameters: [idParam],
          requestBody: jsonBody({ $ref: '#/components/schemas/SubscriptionInput' }),
          responses: { '200': ok('Updated, as a one-item array', arrayOf('Subscription')), ...errors },
        },
        delete: {
          summary: 'Permanently delete a subscription',
          parameters: [idParam],
          responses: { '200': ok('Deleted', { nullable: true }), ...errors },
        },
      },
      '/api/payment-sources': {
        get: {
          summary: 'List payment sources',
          responses: { '200': ok('Sources', arrayOf('PaymentSource')), '401': errors['401'] },
        },
        post: {
          summary: 'Add a payment source',
          requestBody: jsonBody({ $ref: '#/components/schemas/PaymentSourceInput' }),
          responses: { '200': ok('Created, as a one-item array', arrayOf('PaymentSource')), ...errors },
        },
      },
      '/api/payment-sources/{id}': {
        put: {
          summary: 'Replace a payment source',
          parameters: [idParam],
          requestBody: jsonBody({ $ref: '#/components/schemas/PaymentSourceInput' }),
          responses: { '200': ok('Updated', arrayOf('PaymentSource')), ...errors },
        },
        delete: {
          summary: 'Delete a payment source; its subscriptions are detached, not deleted',
          parameters: [idParam],
          responses: { '200': ok('Deleted', { nullable: true }), ...errors },
        },
      },
      '/api/preferences': {
        get: {
          summary: 'Get the display currency',
          responses: {
            '200': ok('Preferences', { type: 'object', properties: { display_currency: { type: 'string' } } }),
            '401': errors['401'],
          },
        },
        put: {
          summary: 'Set the display currency',
          requestBody: jsonBody({
            type: 'object',
            required: ['display_currency'],
            properties: { display_currency: { type: 'string', pattern: '^[A-Z]{3}$' } },
          }),
          responses: { '200': ok('Updated', { type: 'object' }), ...errors },
        },
      },
      '/api/rates': {
        get: {
          summary: 'USD-based exchange rates (cached 24h)',
          responses: { '200': ok('Rates', { type: 'object' }), '401': errors['401'] },
        },
      },
    },
  };
}

const router = Router();
// Public on purpose: it describes the API, it exposes no data.
router.get('/', (req, res) => {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  res.json(buildOpenApi(`${proto}://${req.get('host')}`));
});
export default router;
