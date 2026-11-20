// Offline category suggestion from a subscription's name. No network, no model:
// a merchant dictionary (global + India + UAE) and a generic keyword fallback.
//
// Matching rules:
// - Names and patterns are normalized the same way (lowercase, "&" -> "and",
//   other punctuation -> space), so patterns can be written naturally
//   ("Disney+", "AT&T", "Apollo 24/7").
// - A pattern matches as whole words. Merchant patterns of 6+ letters also match
//   inside run-together names ("JioHotstar", "netflixpremium").
// - Merchants beat generic keywords; within a tier the longest match wins, so
//   "Tata AIG" -> Insurance while "Tata Play" -> Entertainment and
//   "Tata Power" -> Utilities.

import type { Category } from './categories';

const MERCHANTS: Record<Exclude<Category, 'Other'>, string[]> = {
  Entertainment: [
    // Global video
    'Netflix', 'Prime Video', 'Amazon Prime Video', 'Disney+', 'Hulu', 'HBO Max', 'HBO', 'Peacock',
    'Paramount+', 'Apple TV', 'Crunchyroll', 'MUBI', 'DAZN', 'Discovery+',
    'Lionsgate Play', 'YouTube Premium', 'YouTube TV', 'Twitch', 'Plex',
    // India video / DTH
    'Hotstar', 'JioHotstar', 'JioCinema', 'SonyLIV', 'Sony LIV', 'Zee5',
    'Aha', 'Sun NXT', 'ALTBalaji', 'ALTT', 'MX Player', 'Hoichoi', 'Eros Now',
    'Voot', 'ShemarooMe', 'ManoramaMAX', 'Chaupal', 'Klikk', 'Stage OTT',
    'Tata Play', 'Tata Sky', 'Dish TV', 'd2h', 'Airtel Digital TV',
    'Airtel Xstream', 'Sun Direct', 'Jio TV', 'BookMyShow', 'PVR', 'INOX',
    'FanCode', 'Lionsgate',
    // UAE / MENA video
    'OSN', 'OSN+', 'Shahid', 'StarzPlay', 'Starz Play', 'beIN', 'TOD',
    'Yango Play', 'Weyyak', 'eLife', 'Vox Cinemas', 'Reel Cinemas',
    // Music / audio
    'Spotify', 'Apple Music', 'YouTube Music', 'Amazon Music', 'Tidal', 'Deezer',
    'SoundCloud', 'Audible', 'Gaana', 'JioSaavn', 'Saavn', 'Wynk', 'Hungama',
    'Kuku FM', 'Pocket FM', 'Anghami', 'Storytel',
    // Gaming / reading / creators
    'Xbox Game Pass', 'Game Pass', 'Xbox', 'PlayStation Plus', 'PS Plus',
    'PlayStation', 'Nintendo Switch Online', 'Nintendo', 'Steam', 'EA Play',
    'Ubisoft+', 'Apple Arcade', 'Kindle Unlimited', 'Scribd', 'Patreon',
    'OnlyFans', 'Pratilipi',
  ],
  Subscription: [
    // AI / dev / productivity software
    'ChatGPT', 'OpenAI', 'Claude', 'Anthropic', 'Gemini', 'Perplexity',
    'Midjourney', 'Cursor', 'GitHub', 'Copilot', 'JetBrains', 'Notion', 'Figma',
    'Canva', 'Adobe', 'Creative Cloud', 'Lightroom', 'Photoshop',
    'Microsoft 365', 'Office 365', 'Power BI', 'Google One', 'Google Workspace',
    'G Suite', 'iCloud', 'Apple One', 'Dropbox', 'Box.com', 'OneDrive', 'pCloud',
    '1Password', 'Bitwarden', 'LastPass', 'Dashlane', 'NordVPN', 'ExpressVPN',
    'Surfshark', 'Proton', 'ProtonMail', 'Grammarly', 'Slack', 'Zoom',
    'Evernote', 'Todoist', 'Obsidian', 'Linear', 'Atlassian', 'Jira', 'Trello',
    'Calendly', 'Loom', 'Superhuman', 'Fastmail', 'Zoho', 'Tally',
    'LinkedIn Premium', 'LinkedIn', 'Setapp', 'CleanMyMac', 'Raycast',
    // Hosting / infra
    'AWS', 'Amazon Web Services', 'Google Cloud', 'Azure', 'DigitalOcean',
    'Vercel', 'Netlify', 'Cloudflare', 'Heroku', 'Hetzner', 'Linode',
    'Supabase', 'GoDaddy', 'Namecheap', 'Hostinger', 'Bluehost', 'Squarespace',
    'Wix', 'WordPress', 'Shopify', 'Substack', 'Medium', 'Mailchimp',
    // Learning
    'Duolingo', 'Coursera', 'Udemy', 'edX', 'Skillshare', 'MasterClass',
    'Brilliant', 'Blinkist', 'Byjus', "Byju's", 'Unacademy', 'Physics Wallah',
    'PhysicsWallah', 'Vedantu', 'upGrad', 'Simplilearn', 'Scaler', 'Testbook',
    'Great Learning', 'Babbel', 'Khan Academy',
    // News
    'New York Times', 'NYTimes', 'Washington Post', 'The Economist', 'WSJ',
    'Wall Street Journal', 'Financial Times', 'Bloomberg', 'The Atlantic',
    'Times of India', 'TOI Plus', 'The Hindu', 'Hindustan Times',
    'Indian Express', 'Economic Times', 'ET Prime', 'Mint', 'Livemint',
    'Moneycontrol', 'Business Standard', 'Newslaundry', 'The Ken',
    'The Morning Context', 'Khaleej Times', 'Gulf News', 'The National',
    // Shopping / delivery memberships
    'Amazon Prime', 'Prime', 'Times Prime', 'Swiggy One', 'Zomato Gold',
    'Flipkart Plus', 'Flipkart VIP', 'Myntra Insider', 'Blinkit', 'BigBasket',
    'bbstar', 'Zepto Pass', 'Noon One', 'Noon VIP', 'Talabat Pro', 'Careem Plus',
    'Deliveroo Plus', 'Instacart+', 'Walmart+', 'Costco', 'DoorDash DashPass',
    'DashPass',
    // Phone / OS stores
    'Apple', 'Google Play', 'App Store',
  ],
  Housing: [
    'Rent', 'House rent', 'Flat rent', 'Room rent', 'Mortgage', 'Home loan',
    'Housing loan', 'HOA', 'Society maintenance', 'Maintenance charges',
    'Apartment maintenance', 'Property tax', 'Service charge', 'Ejari',
    'Emaar', 'Nakheel', 'Dubai Properties', 'Aldar', 'Damac', 'Sobha',
    'NoBroker', 'NestAway', 'Stanza Living', 'Zolo', 'PG', 'Hostel',
    'HDFC Home Loan', 'SBI Home Loan', 'LIC Housing', 'Dubai Municipality',
    'Housing fee', 'Landlord', 'Lease',
  ],
  Utilities: [
    // Global telecom
    'Verizon', 'AT&T', 'T-Mobile', 'Comcast', 'Xfinity', 'Spectrum', 'Vodafone',
    'Google Fi', 'Mint Mobile', 'Starlink',
    // India telecom / broadband
    'Airtel', 'Jio', 'JioFiber', 'Jio Fiber', 'Jio AirFiber', 'Vi', 'Vodafone Idea',
    'BSNL', 'MTNL', 'ACT Fibernet', 'ACT', 'Hathway', 'Excitel',
    'Tata Play Fiber', 'You Broadband', 'Spectra', 'Asianet', 'GTPL',
    'Den Broadband',
    // India electricity
    'BESCOM', 'MSEDCL', 'Mahavitaran', 'Tata Power', 'Adani Electricity',
    'BSES', 'BSES Rajdhani', 'BSES Yamuna', 'TPDDL', 'TNEB', 'TANGEDCO',
    'KSEB', 'CESC', 'WBSEDCL', 'Torrent Power', 'APSPDCL', 'TSSPDCL',
    'UPPCL', 'PSPCL', 'DHBVN', 'UHBVN', 'MPEB', 'JVVNL', 'CSPDCL', 'HESCOM',
    'MESCOM', 'GESCOM', 'CHESCOM', 'NBPDCL', 'SBPDCL', 'BEST Undertaking',
    // India gas / water
    'Mahanagar Gas', 'MGL', 'Indraprastha Gas', 'IGL', 'Gujarat Gas',
    'Adani Gas', 'Adani Total Gas', 'Indane', 'HP Gas', 'Bharat Gas',
    'BWSSB', 'Delhi Jal Board', 'DJB',
    // UAE
    'DEWA', 'SEWA', 'FEWA', 'ADDC', 'AADC', 'TAQA', 'Etihad WE',
    'Etihad Water', 'Etisalat', 'e&', 'du', 'Virgin Mobile', 'Empower',
    'Emicool', 'Tabreed', 'Lootah Gas', 'Emirates Gas', 'Chiller',
    'District cooling',
  ],
  Health: [
    // Fitness
    'Gym', 'Cult', 'Cult.fit', 'Cultfit', "Gold's Gym", 'Anytime Fitness',
    'Snap Fitness', 'Fitness First', 'GymNation', 'Gymnation', "Barry's",
    'Crunch', 'Planet Fitness', 'Equinox', 'Peloton', 'Strava', 'Fitbit',
    'Whoop', 'Oura', 'MyFitnessPal', 'HealthifyMe', 'Fittr', 'Nike Training',
    'ClassPass', 'F45', 'Orangetheory', 'Yoga',
    // Mental health
    'Headspace', 'Calm', 'BetterHelp', 'Talkspace', 'Wysa', 'Amaha',
    'Mindhouse',
    // Pharmacy / care
    'Practo', 'Tata 1mg', '1mg', 'PharmEasy', 'Netmeds', 'Apollo 24/7',
    'Apollo', 'MediBuddy', 'Truemeds', 'Medplus', 'Aster', 'Okadoc',
    'Life Pharmacy', 'Boots', 'Medicine', 'Pharmacy', 'Therapy', 'Dental',
    'Physio', 'Physiotherapy',
  ],
  Insurance: [
    // India
    'LIC', 'HDFC Life', 'HDFC Ergo', 'ICICI Lombard', 'ICICI Prudential',
    'ICICI Pru', 'SBI Life', 'SBI General', 'Star Health', 'Niva Bupa',
    'Max Bupa', 'Care Health', 'Religare Health', 'Bajaj Allianz',
    'Bajaj General', 'Bajaj Life', 'Max Life', 'Axis Max Life', 'Tata AIG',
    'Tata AIA', 'Digit', 'Go Digit', 'Acko', 'PolicyBazaar', 'Aditya Birla Health',
    'Aditya Birla Sun Life', 'ManipalCigna', 'Kotak Life', 'Kotak General',
    'PNB MetLife', 'Reliance General', 'New India Assurance', 'United India',
    'Oriental Insurance', 'National Insurance', 'Future Generali',
    'Edelweiss Tokio', 'Bharti AXA', 'Canara HSBC', 'IFFCO Tokio',
    'Royal Sundaram', 'Chola MS', 'Universal Sompo', 'Liberty General',
    'Zuno', 'Navi Health', 'Plum', 'Ditto', 'Term plan', 'Mediclaim',
    // UAE
    'Daman', 'Thiqa', 'AXA', 'GIG Gulf', 'Orient Insurance', 'Sukoon',
    'Oman Insurance', 'ADNIC', 'Dubai Insurance', 'Emirates Insurance',
    'RSA Insurance', 'Salama', 'Takaful', 'Noor Takaful', 'Tokio Marine',
    'Watania', 'Union Insurance', 'Al Ain Ahlia', 'Al Sagr', 'MetLife',
    'Cigna', 'Bupa', 'Allianz', 'Zurich', 'Al Buhaira', 'Dubai National Insurance',
    'Abu Dhabi National Insurance', 'Insurancemarket', 'Policybazaar.ae',
    // Global
    'GEICO', 'Progressive', 'State Farm', 'Allstate', 'Lemonade', 'Aetna',
    'Prudential', 'Aviva', 'AIG', 'Chubb',
  ],
  Transport: [
    // Global
    'Uber', 'Uber One', 'Lyft', 'Bolt', 'Zipcar', 'Lime', 'Tesla',
    // India
    'FASTag', 'Ola', 'Ola Money', 'Rapido', 'Namma Yatri', 'BluSmart',
    'IRCTC', 'Yulu', 'Bounce', 'Zoomcar', 'Revv', 'Drivezy', 'Park+',
    'Metro card', 'Delhi Metro', 'Namma Metro', 'Mumbai Metro', 'BMTC', 'BEST bus',
    'Indian Oil', 'IOCL', 'Bharat Petroleum', 'BPCL', 'HPCL', 'Shell',
    // UAE
    'Salik', 'Darb', 'RTA', 'Nol', 'Nol card', 'Careem', 'Hala Taxi', 'Yango',
    'Parkin', 'Mawaqif', 'ENOC', 'ADNOC', 'Emarat', 'Ekar', 'Udrive',
    'Dubai Metro', 'Dubai Taxi',
  ],
};

const KEYWORDS: Record<Exclude<Category, 'Other'>, string[]> = {
  Entertainment: [
    'streaming', 'ott', 'movies', 'movie', 'music', 'cinema', 'gaming', 'game',
    'tv', 'cable', 'dth', 'podcast', 'audiobook', 'comics',
  ],
  Subscription: [
    'software', 'saas', 'app', 'cloud storage', 'storage', 'vpn', 'domain',
    'hosting', 'newsletter', 'newspaper', 'magazine', 'news', 'course',
    'tuition', 'tutor', 'coaching', 'school fees', 'college fees', 'membership',
    'license', 'licence', 'plan',
  ],
  Housing: [
    'rent', 'mortgage', 'home loan', 'housing', 'maintenance', 'society', 'hoa',
    'apartment', 'flat', 'condo', 'villa', 'property', 'landlord', 'lease',
    'paying guest', 'maid', 'cook', 'househelp', 'house help', 'laundry',
  ],
  Utilities: [
    'electricity', 'electric', 'power', 'water', 'gas', 'lpg', 'cylinder',
    'internet', 'broadband', 'wifi', 'wi fi', 'fiber', 'fibre', 'mobile',
    'phone', 'postpaid', 'prepaid', 'recharge', 'landline', 'sim', 'data plan',
    'utility', 'utilities', 'sewage', 'garbage', 'trash', 'cooling', 'ac',
    'housekeeping',
  ],
  Health: [
    'health', 'fitness', 'workout', 'pilates', 'crossfit', 'swimming', 'doctor',
    'clinic', 'hospital', 'medical', 'meds', 'vitamins', 'supplements', 'dentist',
    'meditation', 'wellness', 'spa', 'salon', 'sports club', 'badminton',
    'tennis', 'football',
  ],
  Insurance: [
    'insurance', 'assurance', 'policy', 'premium payment', 'life cover',
    'term insurance', 'health insurance', 'medical insurance', 'car insurance',
    'motor insurance', 'bike insurance', 'home insurance', 'travel insurance',
    'renters insurance', 'takaful',
  ],
  Transport: [
    'car', 'bike', 'scooter', 'car loan', 'bike loan', 'auto loan', 'car emi',
    'fuel', 'petrol', 'diesel', 'ev charging', 'charging', 'parking', 'toll',
    'metro', 'bus pass', 'train', 'railway', 'commute', 'cab', 'taxi',
    'car wash', 'car rental', 'car lease', 'vehicle', 'driver', 'chauffeur',
  ],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

interface Rule {
  category: Category;
  phrase: string; // normalized, space-separated
  compact: string; // phrase without spaces, for run-together names
  allowCompact: boolean;
}

function buildRules(source: Record<string, string[]>, allowCompact: boolean): Rule[] {
  const rules: Rule[] = [];
  for (const [category, patterns] of Object.entries(source)) {
    for (const pattern of patterns) {
      const phrase = normalize(pattern);
      if (!phrase) continue;
      const compact = phrase.replace(/ /g, '');
      rules.push({
        category: category as Category,
        phrase,
        compact,
        allowCompact: allowCompact && compact.length >= 6,
      });
    }
  }
  // Longest first, so the first hit is the most specific one.
  return rules.sort((a, b) => b.compact.length - a.compact.length);
}

const MERCHANT_RULES = buildRules(MERCHANTS, true);
const KEYWORD_RULES = buildRules(KEYWORDS, false);

function firstMatch(rules: Rule[], padded: string, compact: string): Category | null {
  for (const rule of rules) {
    if (padded.includes(` ${rule.phrase} `)) return rule.category;
    if (rule.allowCompact && compact.includes(rule.compact)) return rule.category;
  }
  return null;
}

/** Best-guess category for a subscription name, or null when nothing matches. */
export function suggestCategory(name: string): Category | null {
  const normalized = normalize(name);
  if (!normalized) return null;
  const padded = ` ${normalized} `;
  const compact = normalized.replace(/ /g, '');
  return (
    firstMatch(MERCHANT_RULES, padded, compact) ?? firstMatch(KEYWORD_RULES, padded, compact)
  );
}
