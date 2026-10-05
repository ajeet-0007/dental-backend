import { OrderEmailItem, OrderEmailPayload } from './order-notifications.types';

/**
 * Builds the email payload for an order. Kept as a plain function rather than an
 * injectable service so the order, payment, admin and webhook code paths can all
 * share it without pulling in a module dependency, and so the emit sites stay
 * free of any database work of their own.
 *
 * MySQL `decimal` columns come back from TypeORM as strings, so every monetary
 * value is coerced here - the templates would otherwise render "1299.000000".
 */
export function buildOrderEmailPayload(
  order: any,
  paymentMethod?: string,
): OrderEmailPayload {
  const address = parseShippingAddress(order?.shippingAddress);
  const user = order?.user;

  const fullName = [user?.firstName, user?.lastName]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join(' ')
    .trim();

  const items: OrderEmailItem[] = (order?.items || []).map((item: any) => ({
    name: item?.productName || 'Product',
    sku: item?.sku || undefined,
    quantity: toNumber(item?.quantity),
    unitPrice: toNumber(item?.unitPrice),
    sellingPrice: toNumber(item?.sellingPrice),
    totalAmount: toNumber(item?.totalAmount),
  }));

  return {
    orderId: order?.id || '',
    orderNumber: order?.orderNumber || '',
    status: order?.status || '',
    paymentMethod:
      paymentMethod || order?.payments?.[0]?.method || 'unknown',
    customerName: fullName || address?.name || 'Customer',
    customerEmail: user?.email || '',
    customerPhone: address?.phone,
    items,
    subtotal: toNumber(order?.subtotal),
    shippingAmount: toNumber(order?.shippingAmount),
    discountAmount: toNumber(order?.discountAmount),
    taxAmount: toNumber(order?.taxAmount),
    totalAmount: toNumber(order?.totalAmount),
    placedAt: toIsoDate(order?.createdAt),
  };
}

export function parseShippingAddress(
  value?: string | null,
): Record<string, any> | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoDate(value: unknown): string {
  if (!value) return new Date().toISOString();

  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
}