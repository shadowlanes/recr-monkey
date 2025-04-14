export const CATEGORY_COLORS = {
  'Subscription': { color: '#db2777', light: '#fce7f3' },     // Pink
  'Utilities': { color: '#2563eb', light: '#dbeafe' },        // Blue
  'Entertainment': { color: '#d97706', light: '#fef3c7' },    // Amber
  'Insurance': { color: '#059669', light: '#d1fae5' },        // Green
  'Mortgage/Rent': { color: '#7c3aed', light: '#ede9fe' },    // Purple
  'Transportation': { color: '#0891b2', light: '#cffafe' },   // Cyan
  'Health': { color: '#e11d48', light: '#ffe4e6' },          // Red
  'Education': { color: '#8b5cf6', light: '#f3e8ff' },       // Violet
  'Savings': { color: '#15803d', light: '#dcfce7' },         // Emerald
  'Debt': { color: '#b91c1c', light: '#fee2e2' },            // Dark Red
  'Other': { color: '#475569', light: '#f1f5f9' },           // Slate
  'Total': { color: '#1e293b', light: '#e2e8f0' },           // Dark slate
  'Uncategorized': { color: '#475569', light: '#f1f5f9' }    // Same as Other
} as const;

export const DEFAULT_CHART_COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
  '#9966FF', '#FF9F40', '#E8E8E8'
];

export const getCategoryColor = (category: string): { color: string; light: string } => {
  return CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || 
         { color: '#475569', light: '#f1f5f9' };
};
