import { OrderStatus } from '../../database/entities/order.entity';
import { ShipmentStatus } from '../../database/entities/shipment.entity';

export interface OrderDisplayStatus {
  primaryStatus: string;
  primaryLabel: string;
  primaryColor: string;
  primaryBgColor: string;
  shipmentStatus: string | null;
  shipmentLabel: string | null;
  canCancel: boolean;
  canReturn: boolean;
  showRescheduleDelivery: boolean;
  showRTOAlert: boolean;
  showDeliveryFailedAlert: boolean;
}

export interface ShipmentStatusInfo {
  status: string;
  label: string;
  description: string;
}

export const SHIPMENT_STATUS_INFO: Record<string, ShipmentStatusInfo> = {
  [ShipmentStatus.PENDING]: {
    status: ShipmentStatus.PENDING,
    label: 'Pending',
    description: 'Order is being processed',
  },
  [ShipmentStatus.PROCESSING]: {
    status: ShipmentStatus.PROCESSING,
    label: 'Processing',
    description: 'Preparing for dispatch',
  },
  [ShipmentStatus.PICKED_UP]: {
    status: ShipmentStatus.PICKED_UP,
    label: 'Picked Up',
    description: 'Package picked up by courier',
  },
  [ShipmentStatus.IN_TRANSIT]: {
    status: ShipmentStatus.IN_TRANSIT,
    label: 'In Transit',
    description: 'Package is on the way',
  },
  [ShipmentStatus.OUT_FOR_DELIVERY]: {
    status: ShipmentStatus.OUT_FOR_DELIVERY,
    label: 'Out for Delivery',
    description: 'Package is out for delivery',
  },
  [ShipmentStatus.DELIVERED]: {
    status: ShipmentStatus.DELIVERED,
    label: 'Delivered',
    description: 'Package delivered successfully',
  },
  [ShipmentStatus.FAILED]: {
    status: ShipmentStatus.FAILED,
    label: 'Delivery Failed',
    description: 'Delivery attempt was unsuccessful',
  },
  [ShipmentStatus.RTO]: {
    status: ShipmentStatus.RTO,
    label: 'Return to Origin',
    description: 'Package returned to sender',
  },
  [ShipmentStatus.CANCELLED]: {
    status: ShipmentStatus.CANCELLED,
    label: 'Cancelled',
    description: 'Shipment cancelled',
  },
};

export function getOrderDisplayStatus(
  orderStatus: string,
  shipmentStatus?: string | null,
  isRTO?: boolean,
  deliveryFailed?: boolean,
  isReturned?: boolean,
  deliveryDate?: Date,
): OrderDisplayStatus {
  const status = orderStatus as OrderStatus;
  
  const baseStatus: OrderDisplayStatus = {
    primaryStatus: status,
    primaryLabel: formatLabel(status),
    primaryColor: getStatusColor(status),
    primaryBgColor: getStatusBgColor(status),
    shipmentStatus: shipmentStatus || null,
    shipmentLabel: shipmentStatus ? formatLabel(shipmentStatus) : null,
    canCancel: false,
    canReturn: false,
    showRescheduleDelivery: false,
    showRTOAlert: false,
    showDeliveryFailedAlert: false,
  };

  switch (status) {
    case OrderStatus.PENDING_PAYMENT:
      return {
        ...baseStatus,
        primaryLabel: 'Payment Pending',
        primaryColor: 'text-orange-600',
        primaryBgColor: 'bg-orange-50',
        canCancel: true,
      };

    case OrderStatus.PENDING:
      return {
        ...baseStatus,
        primaryLabel: 'Pending',
        primaryColor: 'text-gray-600',
        primaryBgColor: 'bg-gray-50',
        canCancel: true,
      };

    case OrderStatus.CONFIRMED:
      return {
        ...baseStatus,
        primaryLabel: 'Confirmed',
        primaryColor: 'text-purple-600',
        primaryBgColor: 'bg-purple-50',
        canCancel: true,
      };

    case OrderStatus.PROCESSING:
      return {
        ...baseStatus,
        primaryLabel: 'Processing',
        primaryColor: 'text-amber-600',
        primaryBgColor: 'bg-amber-50',
        canCancel: true,
      };

    case OrderStatus.SHIPPED:
      if (isRTO) {
        return {
          ...baseStatus,
          primaryLabel: 'Return to Origin',
          primaryColor: 'text-orange-600',
          primaryBgColor: 'bg-orange-50',
          canCancel: false,
          canReturn: false,
          showRTOAlert: true,
          showRescheduleDelivery: false,
        };
      }
      if (deliveryFailed) {
        return {
          ...baseStatus,
          primaryLabel: 'Delivery Failed',
          primaryColor: 'text-red-600',
          primaryBgColor: 'bg-red-50',
          canCancel: false,
          canReturn: false,
          showRescheduleDelivery: true,
          showDeliveryFailedAlert: true,
        };
      }
      return {
        ...baseStatus,
        primaryLabel: 'Shipped',
        primaryColor: 'text-blue-600',
        primaryBgColor: 'bg-blue-50',
        canCancel: false,
        canReturn: deliveryDate ? isWithinReturnWindow(deliveryDate) : false,
      };

    case OrderStatus.DELIVERED:
      return {
        ...baseStatus,
        primaryLabel: 'Delivered',
        primaryColor: 'text-green-600',
        primaryBgColor: 'bg-green-50',
        canCancel: false,
        canReturn: deliveryDate ? isWithinReturnWindow(deliveryDate) : false,
      };

    case OrderStatus.CANCELLED:
      return {
        ...baseStatus,
        primaryLabel: 'Cancelled',
        primaryColor: 'text-red-600',
        primaryBgColor: 'bg-red-50',
        canCancel: false,
        canReturn: false,
      };

    case OrderStatus.REFUNDED:
      return {
        ...baseStatus,
        primaryLabel: 'Refunded',
        primaryColor: 'text-green-600',
        primaryBgColor: 'bg-green-50',
        canCancel: false,
        canReturn: false,
      };

    case OrderStatus.PAYMENT_FAILED:
      return {
        ...baseStatus,
        primaryLabel: 'Payment Failed',
        primaryColor: 'text-red-600',
        primaryBgColor: 'bg-red-50',
        canCancel: false,
        canReturn: false,
      };

    default:
      return baseStatus;
  }
}

function formatLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending_payment: 'text-orange-600',
    pending: 'text-gray-600',
    confirmed: 'text-purple-600',
    processing: 'text-amber-600',
    shipped: 'text-blue-600',
    delivered: 'text-green-600',
    cancelled: 'text-red-600',
    refunded: 'text-green-600',
    payment_failed: 'text-red-600',
  };
  return colors[status] || 'text-gray-600';
}

function getStatusBgColor(status: string): string {
  const colors: Record<string, string> = {
    pending_payment: 'bg-orange-50',
    pending: 'bg-gray-50',
    confirmed: 'bg-purple-50',
    processing: 'bg-amber-50',
    shipped: 'bg-blue-50',
    delivered: 'bg-green-50',
    cancelled: 'bg-red-50',
    refunded: 'bg-green-50',
    payment_failed: 'bg-red-50',
  };
  return colors[status] || 'bg-gray-50';
}

function isWithinReturnWindow(deliveryDate: Date, windowDays: number = 7): boolean {
  const now = new Date();
  const delivery = new Date(deliveryDate);
  const diffTime = now.getTime() - delivery.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= windowDays;
}

export function getShipmentStatusLabel(shipmentStatus: string | null | undefined): string {
  if (!shipmentStatus) return '';
  const info = SHIPMENT_STATUS_INFO[shipmentStatus];
  return info?.label || formatLabel(shipmentStatus);
}

export function getShipmentStatusDescription(shipmentStatus: string | null | undefined): string {
  if (!shipmentStatus) return '';
  const info = SHIPMENT_STATUS_INFO[shipmentStatus];
  return info?.description || '';
}
