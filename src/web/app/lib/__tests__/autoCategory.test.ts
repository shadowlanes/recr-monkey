import { suggestCategory } from '../autoCategory';

const cases: Array<[string, string | null]> = [
  // Global
  ['Netflix', 'Entertainment'],
  ['Spotify Family', 'Entertainment'],
  ['YouTube Premium', 'Entertainment'],
  ['Amazon Prime Video', 'Entertainment'],
  ['Amazon Prime', 'Subscription'],
  ['ChatGPT Plus', 'Subscription'],
  ['Claude Pro', 'Subscription'],
  ['iCloud+', 'Subscription'],
  ['AT&T', 'Utilities'],
  ['Uber One', 'Transport'],
  ['GEICO auto', 'Insurance'],
  // India
  ['Disney+ Hotstar', 'Entertainment'],
  ['JioHotstar', 'Entertainment'],
  ['SonyLIV', 'Entertainment'],
  ['Tata Play', 'Entertainment'],
  ['Tata Play Fiber', 'Utilities'],
  ['Tata Power', 'Utilities'],
  ['Tata AIG car', 'Insurance'],
  ['Airtel postpaid', 'Utilities'],
  ['Airtel Xstream', 'Entertainment'],
  ['Jio Fiber', 'Utilities'],
  ['BESCOM electricity', 'Utilities'],
  ['Mahanagar Gas', 'Utilities'],
  ['LIC', 'Insurance'],
  ['LIC Housing Finance', 'Housing'],
  ['HDFC Ergo health insurance', 'Insurance'],
  ['Star Health', 'Insurance'],
  ['Cult.fit', 'Health'],
  ['Swiggy One', 'Subscription'],
  ['FASTag recharge', 'Transport'],
  ['Society maintenance', 'Housing'],
  ['Maid salary', 'Housing'],
  // UAE
  ['DEWA', 'Utilities'],
  ['du home internet', 'Utilities'],
  ['e& mobile', 'Utilities'],
  ['Etisalat', 'Utilities'],
  ['Empower cooling', 'Utilities'],
  ['Salik', 'Transport'],
  ['Nol card top-up', 'Transport'],
  ['Daman health', 'Insurance'],
  ['Sukoon car insurance', 'Insurance'],
  ['OSN+', 'Entertainment'],
  ['Anghami', 'Entertainment'],
  ['Ejari renewal', 'Housing'],
  ['Talabat Pro', 'Subscription'],
  ['GymNation', 'Health'],
  // Generic keywords
  ['Apartment rent', 'Housing'],
  ['Health insurance', 'Insurance'],
  ['Car loan', 'Transport'],
  ['Electricity bill', 'Utilities'],
  ['Gym membership', 'Health'],
  ['Parking', 'Transport'],
  // No match
  ['', null],
  ['Pocket money for Riya', null],
  ['xyzzy', null],
];

describe('suggestCategory', () => {
  it.each(cases)('%s -> %s', (name, expected) => {
    expect(suggestCategory(name)).toBe(expected);
  });

  it('ignores case and punctuation', () => {
    expect(suggestCategory('  NETFLIX!!  ')).toBe('Entertainment');
    expect(suggestCategory('apollo-24/7')).toBe('Health');
  });

  it('does not match short merchants inside other words', () => {
    // "du" inside "duolingo", "digit" inside "digital"
    expect(suggestCategory('Duolingo')).toBe('Subscription');
    expect(suggestCategory('Digital Ocean')).toBe('Subscription');
  });
});
