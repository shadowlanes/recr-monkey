import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Principal } from '../principal';
import { ServiceError } from '../services/errors';
import { listSources } from '../services/paymentSources';
import {
  createSubscription,
  deleteSubscription,
  formatDateOnly,
  listSubscriptions,
  spendSummary,
  upcomingCharges,
  updateSubscription,
} from '../services/subscriptions';

const CATEGORIES =
  'Subscription, Entertainment, Housing, Utilities, Health, Insurance, Transport, Other';

const ok = (value: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
});

// Expected failures go back to the model as a readable tool error; anything
// else is logged and reported generically.
async function run(fn: () => Promise<unknown>) {
  try {
    return ok(await fn());
  } catch (error) {
    if (!(error instanceof ServiceError)) console.error('MCP tool error:', error);
    const message = error instanceof ServiceError ? error.message : 'Internal error';
    return { content: [{ type: 'text' as const, text: message }], isError: true };
  }
}

// The caller already knows who they are; never echo the owner id.
const withoutOwner = <T extends { user_id: string }>({ user_id: _owner, ...rest }: T) => rest;

const subscriptionFields = {
  name: z.string().describe('What the payment is for, e.g. "Netflix"'),
  amount: z.number().positive().describe('Amount per charge, in the billing currency'),
  currency: z.string().describe('3-letter ISO currency code, e.g. INR, USD, AED'),
  start_date: z
    .string()
    .describe('YYYY-MM-DD. First or most recent charge date; anchors future charge dates'),
  category: z.string().nullable().describe(`One of: ${CATEGORIES}. null clears it`),
  payment_source_id: z
    .string()
    .nullable()
    .describe('Id from list_payment_sources. null detaches the source'),
};

// One server per request, scoped to the authenticated caller.
export function buildMcpServer(principal: Principal): McpServer {
  const userId = principal.userId;
  const server = new McpServer({ name: 'recr-monkey', version: '1.0.0' });

  server.registerTool(
    'list_subscriptions',
    {
      title: 'List subscriptions',
      description:
        "List all of the user's recurring payments and subscriptions with their native billing amount, currency, frequency and start date. Use this to find a subscription's id before updating or deleting it.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    () => run(async () => (await listSubscriptions(userId)).map(withoutOwner)),
  );

  server.registerTool(
    'get_upcoming_charges',
    {
      title: 'Upcoming charges',
      description:
        "List every charge due in the next N days (default 30), in date order, with the amount in its billing currency and converted to the user's display currency. Use this for 'what is due next' or 'what do I pay this week'.",
      inputSchema: {
        days: z.number().int().min(1).max(365).optional().describe('Window in days, default 30'),
      },
      annotations: { readOnlyHint: true },
    },
    ({ days }) => run(() => upcomingCharges(userId, days ?? 30)),
  );

  server.registerTool(
    'get_spend_summary',
    {
      title: 'Spend summary',
      description:
        "Total monthly and yearly spend across all subscriptions, converted to the user's display currency, with a per-category breakdown.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    () => run(() => spendSummary(userId)),
  );

  server.registerTool(
    'list_payment_sources',
    {
      title: 'List payment sources',
      description:
        "List the user's payment sources (cards and bank accounts, identified by name and last 4 digits) that subscriptions can be attached to.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    () => run(async () => (await listSources(userId)).map(withoutOwner)),
  );

  // Read-only keys do not see the write tools at all.
  if (!principal.canWrite) return server;

  server.registerTool(
    'add_subscription',
    {
      title: 'Add subscription',
      description: `Add a recurring payment. amount is in the billing currency (3-letter ISO code such as INR, USD, AED). frequency is weekly, monthly or yearly. start_date (YYYY-MM-DD) is the first or most recent charge date and anchors future charge dates; it defaults to today. category is optional, one of: ${CATEGORIES}.`,
      inputSchema: {
        name: subscriptionFields.name,
        amount: subscriptionFields.amount,
        currency: subscriptionFields.currency,
        // '4weeks' is legacy: editable, but not offered when adding.
        frequency: z.enum(['weekly', 'monthly', 'yearly']),
        start_date: subscriptionFields.start_date.optional(),
        category: subscriptionFields.category.optional(),
        payment_source_id: subscriptionFields.payment_source_id.optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (input) =>
      run(async () =>
        withoutOwner(
          await createSubscription(
            userId,
            { ...input, start_date: input.start_date ?? formatDateOnly(new Date()) },
            'mcp',
          ),
        ),
      ),
  );

  server.registerTool(
    'update_subscription',
    {
      title: 'Update subscription',
      description:
        'Change fields on an existing subscription. Only pass the fields to change. Get the id from list_subscriptions.',
      inputSchema: {
        id: z.string().describe('Subscription id from list_subscriptions'),
        name: subscriptionFields.name.optional(),
        amount: subscriptionFields.amount.optional(),
        currency: subscriptionFields.currency.optional(),
        frequency: z.enum(['weekly', 'monthly', '4weeks', 'yearly']).optional(),
        start_date: subscriptionFields.start_date.optional(),
        category: subscriptionFields.category.optional(),
        payment_source_id: subscriptionFields.payment_source_id.optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    ({ id, ...patch }) => run(async () => withoutOwner(await updateSubscription(userId, id, patch))),
  );

  server.registerTool(
    'delete_subscription',
    {
      title: 'Delete subscription',
      description:
        'Permanently delete a subscription. This cannot be undone. Confirm with the user before calling.',
      inputSchema: { id: z.string().describe('Subscription id from list_subscriptions') },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    ({ id }) =>
      run(async () => {
        await deleteSubscription(userId, id);
        return { deleted: true, id };
      }),
  );

  return server;
}
