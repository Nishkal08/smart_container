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

function toFlagEmoji(isoCode) {
  if (!isoCode || isoCode.length !== 2) return null;
  const code = isoCode.toUpperCase();
  const offset = 127397;
  return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + offset));
}

export default function CountryFlag({ code, size = 'sm' }) {
  if (!code) return null;

  const upper = code.toUpperCase().trim();
  const iso = COUNTRY_TO_ISO[upper] || (upper.length === 2 ? upper : null);

  if (!iso) return null;

  const emoji = toFlagEmoji(iso);
  if (!emoji) return null;

  const sizeClass = size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-xl';

  return <span className={sizeClass} title={code}>{emoji}</span>;
}
