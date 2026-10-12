/**
 * Normalizes the various shapes a shipping address can arrive in (a JSON
 * string, a plain object, or the display string the storefront builds for an
 * inline/unsaved address) into the canonical JSON snapshot stored on the order
 * and consumed by ShipRocket.
 *
 * Saved addresses are already canonical; only the inline path needs the
 * fallback parsing. Kept free of Nest/DB dependencies so orders, payments and
 * notifications can all share it.
 */

export interface NormalizedAddress {
  firstName: string;
  lastName: string;
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone: string;
}

const PINCODE_REGEX = /\b(\d{6})\b/;

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function pincodeFromObject(obj: Record<string, any>): string {
  const direct =
    obj.pincode ?? obj.zipCode ?? obj.zipcode ?? obj.postalCode ?? obj.postal_code;
  if (direct !== undefined && direct !== null && String(direct).trim() !== '') {
    const digits = String(direct).replace(/\D/g, '');
    if (digits) return digits.slice(0, 6);
  }

  for (const key of ['addressLine1', 'address1', 'address', 'city', 'state']) {
    const val = obj[key];
    if (typeof val === 'string') {
      const match = val.match(PINCODE_REGEX);
      if (match) return match[1];
    }
  }
  return '';
}

/**
 * Extracts a 6-digit Indian PIN code from an address object, JSON string, or
 * plain display string. Returns '' when none can be found.
 */
export function extractPincode(value: unknown): string {
  if (value === undefined || value === null) return '';

  if (typeof value === 'object') {
    return pincodeFromObject(value as Record<string, any>);
  }

  const text = String(value).trim();
  if (!text) return '';

  const parsed = tryParseJson(text);
  if (parsed && typeof parsed === 'object') {
    return pincodeFromObject(parsed as Record<string, any>);
  }

  const match = text.match(PINCODE_REGEX);
  return match ? match[1] : '';
}

/**
 * Parses the display string the storefront builds for inline addresses:
 *   "Name, AddressLine1, AddressLine2, City, State - 123456"
 * into a loose object. Best-effort only; used as a fallback when the input is
 * not already JSON.
 */
function parseDisplayAddress(text: string): Record<string, any> {
  const pincode = (text.match(PINCODE_REGEX) || [])[1] || '';

  let withoutPin = pincode
    ? text.replace(new RegExp(`\\s*-?\\s*${pincode}\\s*$`), '')
    : text;
  withoutPin = withoutPin.replace(/[,\s-]+$/, '');

  const parts = withoutPin.split(',').map((part) => part.trim());
  const name = parts[0] || '';
  const addressLine1 = parts[1] || '';

  let addressLine2 = '';
  let city = '';
  let state = '';
  if (parts.length >= 5) {
    addressLine2 = parts[2] || '';
    city = parts[3] || '';
    state = parts[4] || '';
  } else {
    city = parts[2] || '';
    state = parts[3] || '';
  }

  return { name, addressLine1, addressLine2, city, state, pincode };
}

/**
 * Parses any supported shipping-address input into an object, or null when
 * there is nothing usable.
 */
export function parseShippingAddressInput(
  raw: unknown,
): Record<string, any> | null {
  if (raw === undefined || raw === null) return null;

  if (typeof raw === 'object') {
    return { ...(raw as Record<string, any>) };
  }

  const text = String(raw).trim();
  if (!text) return null;

  const parsed = tryParseJson(text);
  if (parsed && typeof parsed === 'object') {
    return parsed as Record<string, any>;
  }

  return parseDisplayAddress(text);
}

/**
 * Builds the canonical JSON snapshot for a shipping address from any supported
 * input. `fallbackPhone` (typically the order DTO's `phone`) is used when the
 * address itself carries no phone. Returns null when no usable address is
 * present.
 */
export function normalizeShippingAddress(
  raw: unknown,
  fallbackPhone?: string,
): string | null {
  const parsed = parseShippingAddressInput(raw);
  if (!parsed) return null;

  const name = pickString(parsed.name, parsed.firstName, parsed.customerName);
  const firstName = pickString(parsed.firstName, parsed.name);
  const lastName = pickString(parsed.lastName);
  const addressLine1 = pickString(
    parsed.addressLine1,
    parsed.address1,
    parsed.address,
  );
  const addressLine2 = pickString(parsed.addressLine2, parsed.address2);
  const city = pickString(parsed.city);
  const state = pickString(parsed.state);
  const pincode = extractPincode(parsed);
  const country = pickString(parsed.country, 'India') || 'India';
  const phone = pickString(parsed.phone, parsed.mobile, fallbackPhone);

  const normalized: NormalizedAddress = {
    firstName: firstName || name,
    lastName,
    name: name || firstName,
    addressLine1,
    addressLine2,
    city,
    state,
    pincode,
    country,
    phone,
  };

  if (
    !normalized.name &&
    !normalized.addressLine1 &&
    !normalized.pincode &&
    !normalized.phone
  ) {
    return null;
  }

  return JSON.stringify(normalized);
}
