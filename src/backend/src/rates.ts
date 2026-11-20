import { Router, Request, Response } from 'express';
import { ApiResponse } from './types';

const router = Router();

export interface RatesPayload {
  base: 'USD';
  rates: Record<string, number>;
  fetched_at: string;
}

// Served if the provider is unreachable and nothing is cached yet.
const FALLBACK_RATES: RatesPayload = {
  base: 'USD',
  rates: { USD: 1, INR: 88.4, AED: 3.67, EUR: 0.93, GBP: 0.79, JPY: 155, CAD: 1.4, AUD: 1.54 },
  fetched_at: new Date(0).toISOString(),
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const PROVIDER_URL = 'https://open.er-api.com/v6/latest/USD';

let cache: { payload: RatesPayload; expires: number } | null = null;

async function fetchRates(): Promise<RatesPayload> {
  const response = await fetch(PROVIDER_URL);
  if (!response.ok) {
    throw new Error(`Rates provider returned ${response.status}`);
  }
  const body = (await response.json()) as { result: string; rates: Record<string, number> };
  if (body.result !== 'success' || !body.rates?.USD) {
    throw new Error('Rates provider returned an unexpected payload');
  }
  return { base: 'USD', rates: body.rates, fetched_at: new Date().toISOString() };
}

export async function getRates(): Promise<RatesPayload> {
  if (cache && Date.now() < cache.expires) {
    return cache.payload;
  }
  try {
    const payload = await fetchRates();
    cache = { payload, expires: Date.now() + CACHE_TTL_MS };
    return payload;
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    // Serve stale rates over no rates
    return cache?.payload ?? FALLBACK_RATES;
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const payload = await getRates();
  const response: ApiResponse<RatesPayload> = { data: payload, error: null };
  res.json(response);
});

export default router;
