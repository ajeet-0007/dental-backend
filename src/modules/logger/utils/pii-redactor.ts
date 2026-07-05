const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'authorization',
  'apiKey',
  'api_key',
  'apikey',
  'accessToken',
  'refreshToken',
  'jwt',
  'card_number',
  'cardNumber',
  'cvv',
  'cvc',
  'ssn',
  'creditCard',
  'credit_card',
  'privateKey',
  'private_key',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'MYSQL_DATABASE_PASSWORD',
  'SUPABASE_SERVICE_KEY',
  'SMTP_PASSWORD',
];

const SENSITIVE_PATTERNS = [
  /\\bpassword\\s*[=:]\\s*['"][^'"]+['"]/gi,
  /\\btoken\\s*[=:]\\s*['"][^'"]+['"]/gi,
  /\\bsecret\\s*[=:]\\s*['"][^'"]+['"]/gi,
  /\\bapi[_-]?key\\s*[=:]\\s*['"][^'"]+['"]/gi,
  /Authorization:\\s*Bearer\\s+[A-Za-z0-9._\\-]+/gi,
  /sk_live_\\w+/gi,
  /pk_live_\\w+/gi,
  /ghp_\\w+/gi,
  /xox[bpsa]-\\w+/gi,
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some(
    (sk) => lower === sk.toLowerCase() || lower.includes(sk.toLowerCase()),
  );
}

function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.length > 2000) {
      return `${value.substring(0, 200)}... [truncated ${value.length} chars]`;
    }
    return '[REDACTED]';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return '[REDACTED]';
  }
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (typeof value === 'object') {
    return redactObject(value as Record<string, unknown>);
  }
  return value;
}

function redactObject(
  obj: Record<string, unknown>,
  depth = 0,
): Record<string, unknown> {
  if (depth > 10) {
    return { '[REDACTED_DEPTH]': true };
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      result[key] = redactValue(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = Array.isArray(value)
        ? value.map((v) =>
            typeof v === 'object' && v !== null
              ? redactObject(v as Record<string, unknown>, depth + 1)
              : v,
          )
        : redactObject(value as Record<string, unknown>, depth + 1);
    } else if (typeof value === 'string') {
      result[key] = applyPatternRedaction(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function applyPatternRedaction(value: string): string {
  let result = value;
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

export function redactContext(context: Record<string, any>): Record<string, any> {
  try {
    return redactObject(context);
  } catch {
    return { '[REDACTED_ERROR]': true, originalType: typeof context };
  }
}

export function redactErrorMessage(message: string): string {
  return applyPatternRedaction(message);
}

export function redactStackTrace(stack: string): string {
  let result = applyPatternRedaction(stack);
  result = result.replace(/\/Users\/[^/]+\//g, '/Users/[REDACTED]/');
  result = result.replace(/\/home\/[^/]+\//g, '/home/[REDACTED]/');
  return result;
}
