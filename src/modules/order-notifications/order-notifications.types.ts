export const ORDER_PLACED_EVENT = 'order.placed';
export const ORDER_CANCELLED_EVENT = 'order.cancelled';

export interface OrderEmailItem {
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  sellingPrice: number;
  totalAmount: number;
}

export interface OrderEmailPayload {
  orderId: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: OrderEmailItem[];
  subtotal: number;
  shippingAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  placedAt: string;
}

export interface OrderPlacedPayload extends OrderEmailPayload {}

export interface OrderCancelledPayload extends OrderEmailPayload {
  cancelledBy: 'user' | 'admin';
  reason?: string;
}