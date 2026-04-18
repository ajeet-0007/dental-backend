import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShipmentDto {
  @ApiProperty({ description: 'Order ID', required: false })
  @IsUUID()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ example: 'Delhivery', description: 'Selected courier name', required: false })
  @IsString()
  @IsOptional()
  selectedCourier?: string;

  @ApiProperty({ example: 'Express', description: 'Service type (Express, Standard, etc)', required: false })
  @IsString()
  @IsOptional()
  selectedService?: string;

  @ApiProperty({ example: 0.5, description: 'Package weight in kg' })
  @IsNumber()
  @IsOptional()
  weight?: number;

  @ApiProperty({ example: 10, description: 'Package length in cm' })
  @IsNumber()
  @IsOptional()
  length?: number;

  @ApiProperty({ example: 10, description: 'Package breadth in cm' })
  @IsNumber()
  @IsOptional()
  breadth?: number;

  @ApiProperty({ example: 10, description: 'Package height in cm' })
  @IsNumber()
  @IsOptional()
  height?: number;

  @ApiProperty({ example: '243001', description: 'Delivery pincode' })
  @IsString()
  @IsOptional()
  deliveryPincode?: string;

  @ApiProperty({ example: true, description: 'Is COD payment' })
  @IsBoolean()
  @IsOptional()
  isCOD?: boolean;
}

export class CreateShipmentResponseDto {
  id: string;
  shippingRocketId: string;
  orderId: string;
  trackingNumber: string;
  labelUrl: string;
  estimatedDelivery: Date;
  courierName: string;
  status: string;
}

export class TrackingDto {
  @ApiProperty({ description: 'Tracking number from ShippingRocket' })
  @IsString()
  @IsNotEmpty()
  trackingNumber: string;
}

export class TrackingResponseDto {
  trackingNumber: string;
  status: string;
  courierName: string;
  estimatedDelivery: Date;
  lastUpdate: Date;
  events: Array<{
    status: string;
    timestamp: Date;
    location: string;
  }>;
}
