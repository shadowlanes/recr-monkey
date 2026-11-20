// Category vocabulary and colors. Colors resolve to the CSS tokens
// defined in globals.css so they adapt to the theme-neutral palette.

export const CATEGORIES = [
  'Subscription',
  'Entertainment',
  'Housing',
  'Utilities',
  'Health',
  'Insurance',
  'Transport',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

const CATEGORY_VAR: Record<string, string> = {
  Subscription: '--cat-subscription',
  Entertainment: '--cat-entertainment',
  Housing: '--cat-housing',
  Utilities: '--cat-utilities',
  Health: '--cat-health',
  Insurance: '--cat-insurance',
  Transport: '--cat-transport',
  Other: '--cat-other',
  // Legacy categories from the pre-rewrite data map onto the new palette
  'Mortgage/Rent': '--cat-housing',
  Transportation: '--cat-transport',
  Education: '--cat-subscription',
  Savings: '--cat-other',
  Debt: '--cat-other',
};

function categoryVar(category: string | null): string {
  return CATEGORY_VAR[category || 'Other'] || '--cat-other';
}

/** Saturated-ish pastel for bars and dots. */
export function categoryColor(category: string | null): string {
  return `var(${categoryVar(category)})`;
}

/** Pale fill for chips and date tiles. */
export function categorySoft(category: string | null): string {
  return `var(${categoryVar(category)}-soft)`;
}

/** Text color that reads on the soft fill. */
export function categoryInk(category: string | null): string {
  return `var(${categoryVar(category)}-ink)`;
}

export function categoryLabel(category: string | null): string {
  return category || 'Uncategorized';
}
