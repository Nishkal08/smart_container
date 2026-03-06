const COUNTRY_TO_ISO = {
  'AF': 'AF', 'AL': 'AL', 'DZ': 'DZ', 'AO': 'AO', 'AR': 'AR', 'AU': 'AU', 'AT': 'AT',
  'BD': 'BD', 'BE': 'BE', 'BR': 'BR', 'BG': 'BG', 'KH': 'KH', 'CM': 'CM', 'CA': 'CA',
  'CL': 'CL', 'CN': 'CN', 'CO': 'CO', 'CD': 'CD', 'CG': 'CG', 'CR': 'CR', 'CI': 'CI',
  'HR': 'HR', 'CU': 'CU', 'CZ': 'CZ', 'DK': 'DK', 'DO': 'DO', 'EC': 'EC', 'EG': 'EG',
  'SV': 'SV', 'ET': 'ET', 'FI': 'FI', 'FR': 'FR', 'DE': 'DE', 'GH': 'GH', 'GR': 'GR',
  'GT': 'GT', 'HN': 'HN', 'HK': 'HK', 'HU': 'HU', 'IN': 'IN', 'ID': 'ID', 'IR': 'IR',
  'IQ': 'IQ', 'IE': 'IE', 'IL': 'IL', 'IT': 'IT', 'JM': 'JM', 'JP': 'JP', 'JO': 'JO',
  'KZ': 'KZ', 'KE': 'KE', 'KP': 'KP', 'KR': 'KR', 'KW': 'KW', 'LB': 'LB', 'LY': 'LY',
  'MG': 'MG', 'MY': 'MY', 'MX': 'MX', 'MA': 'MA', 'MZ': 'MZ', 'MM': 'MM', 'NP': 'NP',
  'NL': 'NL', 'NZ': 'NZ', 'NG': 'NG', 'NO': 'NO', 'PK': 'PK', 'PA': 'PA', 'PY': 'PY',
  'PE': 'PE', 'PH': 'PH', 'PL': 'PL', 'PT': 'PT', 'QA': 'QA', 'RO': 'RO', 'RU': 'RU',
  'SA': 'SA', 'SN': 'SN', 'RS': 'RS', 'SG': 'SG', 'ZA': 'ZA', 'ES': 'ES', 'LK': 'LK',
  'SD': 'SD', 'SE': 'SE', 'CH': 'CH', 'SY': 'SY', 'TW': 'TW', 'TZ': 'TZ', 'TH': 'TH',
  'TR': 'TR', 'UA': 'UA', 'AE': 'AE', 'GB': 'GB', 'US': 'US', 'UY': 'UY', 'UZ': 'UZ',
  'VE': 'VE', 'VN': 'VN', 'YE': 'YE', 'ZM': 'ZM', 'ZW': 'ZW', 'SO': 'SO', 'SS': 'SS',
  'CF': 'CF', 'ML': 'ML', 'NI': 'NI', 'BY': 'BY',
  // Common full names
  'CHINA': 'CN', 'INDIA': 'IN', 'BRAZIL': 'BR', 'RUSSIA': 'RU', 'JAPAN': 'JP',
  'GERMANY': 'DE', 'FRANCE': 'FR', 'ITALY': 'IT', 'SPAIN': 'ES', 'TURKEY': 'TR',
  'MEXICO': 'MX', 'NIGERIA': 'NG', 'EGYPT': 'EG', 'PAKISTAN': 'PK', 'IRAN': 'IR',
  'IRAQ': 'IQ', 'SYRIA': 'SY', 'YEMEN': 'YE', 'LIBYA': 'LY', 'SUDAN': 'SD',
  'SOMALIA': 'SO', 'AFGHANISTAN': 'AF', 'MYANMAR': 'MM', 'VENEZUELA': 'VE',
  'COLOMBIA': 'CO', 'ARGENTINA': 'AR', 'PERU': 'PE', 'CHILE': 'CL',
  'THAILAND': 'TH', 'VIETNAM': 'VN', 'INDONESIA': 'ID', 'BANGLADESH': 'BD',
  'PHILIPPINES': 'PH', 'MALAYSIA': 'MY', 'SINGAPORE': 'SG', 'AUSTRALIA': 'AU',
  'CANADA': 'CA', 'UNITED STATES': 'US', 'UNITED KINGDOM': 'GB',
  'SOUTH AFRICA': 'ZA', 'KENYA': 'KE', 'GHANA': 'GH', 'ETHIOPIA': 'ET',
  'MOROCCO': 'MA', 'TANZANIA': 'TZ', 'NETHERLANDS': 'NL', 'BELGIUM': 'BE',
  'SWITZERLAND': 'CH', 'SWEDEN': 'SE', 'NORWAY': 'NO', 'DENMARK': 'DK',
  'FINLAND': 'FI', 'POLAND': 'PL', 'UKRAINE': 'UA', 'SAUDI ARABIA': 'SA',
  'UAE': 'AE', 'QATAR': 'QA', 'KUWAIT': 'KW', 'JORDAN': 'JO',
};

// ISO 2-letter code → friendly full country name
const ISO_TO_NAME = {
  AF: 'Afghanistan', AL: 'Albania', DZ: 'Algeria', AO: 'Angola', AR: 'Argentina',
  AU: 'Australia', AT: 'Austria', BD: 'Bangladesh', BE: 'Belgium', BR: 'Brazil',
  BG: 'Bulgaria', BY: 'Belarus', KH: 'Cambodia', CM: 'Cameroon', CA: 'Canada',
  CF: 'Central African Republic', CL: 'Chile', CN: 'China', CO: 'Colombia',
  CD: 'DR Congo', CG: 'Congo', CR: 'Costa Rica', CI: "Côte d'Ivoire",
  HR: 'Croatia', CU: 'Cuba', CZ: 'Czech Republic', DK: 'Denmark',
  DO: 'Dominican Republic', EC: 'Ecuador', EG: 'Egypt', SV: 'El Salvador',
  ET: 'Ethiopia', FI: 'Finland', FR: 'France', DE: 'Germany', GH: 'Ghana',
  GR: 'Greece', GT: 'Guatemala', HN: 'Honduras', HK: 'Hong Kong', HU: 'Hungary',
  IN: 'India', ID: 'Indonesia', IR: 'Iran', IQ: 'Iraq', IE: 'Ireland',
  IL: 'Israel', IT: 'Italy', JM: 'Jamaica', JP: 'Japan', JO: 'Jordan',
  KZ: 'Kazakhstan', KE: 'Kenya', KP: 'North Korea', KR: 'South Korea',
  KW: 'Kuwait', LB: 'Lebanon', LY: 'Libya', MG: 'Madagascar', MY: 'Malaysia',
  MX: 'Mexico', ML: 'Mali', MA: 'Morocco', MZ: 'Mozambique', MM: 'Myanmar',
  NP: 'Nepal', NL: 'Netherlands', NZ: 'New Zealand', NG: 'Nigeria', NI: 'Nicaragua',
  NO: 'Norway', PK: 'Pakistan', PA: 'Panama', PY: 'Paraguay', PE: 'Peru',
  PH: 'Philippines', PL: 'Poland', PT: 'Portugal', QA: 'Qatar', RO: 'Romania',
  RU: 'Russia', SA: 'Saudi Arabia', SN: 'Senegal', RS: 'Serbia', SG: 'Singapore',
  ZA: 'South Africa', ES: 'Spain', LK: 'Sri Lanka', SD: 'Sudan', SS: 'South Sudan',
  SE: 'Sweden', CH: 'Switzerland', SY: 'Syria', TW: 'Taiwan', TZ: 'Tanzania',
  TH: 'Thailand', TR: 'Turkey', UA: 'Ukraine', AE: 'United Arab Emirates',
  GB: 'United Kingdom', US: 'United States', UY: 'Uruguay', UZ: 'Uzbekistan',
  VE: 'Venezuela', VN: 'Vietnam', YE: 'Yemen', ZM: 'Zambia', ZW: 'Zimbabwe',
  SO: 'Somalia', CF: 'Central African Republic',
};

function toFlagEmoji(isoCode) {
  if (!isoCode || isoCode.length !== 2) return null;
  const code = isoCode.toUpperCase();
  const offset = 127397;
  return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + offset));
}

/** Returns the friendly full country name for a 2-letter ISO code or stored name. */
export function getCountryName(code) {
  if (!code) return code;
  const upper = code.toUpperCase().trim();
  // Already a full name stored in the reverse map
  if (upper.length > 2) {
    const iso = COUNTRY_TO_ISO[upper];
    return iso ? (ISO_TO_NAME[iso] ?? code) : code;
  }
  return ISO_TO_NAME[upper] ?? code;
}

export default function CountryFlag({ code, size = 'sm', showName = false }) {
  if (!code) return null;

  const upper = code.toUpperCase().trim();
  const iso = COUNTRY_TO_ISO[upper] || (upper.length === 2 ? upper : null);

  if (!iso) return showName ? <span>{getCountryName(code)}</span> : null;

  const emoji = toFlagEmoji(iso);
  if (!emoji) return showName ? <span>{getCountryName(code)}</span> : null;

  const sizeClass = size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-xl';
  const name = ISO_TO_NAME[iso.toUpperCase()] ?? code;

  if (showName) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={sizeClass}>{emoji}</span>
        <span>{name}</span>
      </span>
    );
  }

  return <span className={sizeClass} title={name}>{emoji}</span>;
}
