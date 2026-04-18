import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalculateRateDto {
  @ApiProperty({ example: '243006', description: 'Pickup pincode (warehouse)' })
  @IsString()
  @IsNotEmpty()
  pickupPincode: string;

  @ApiProperty({ example: '110001', description: 'Delivery pincode' })
  @IsString()
  @IsNotEmpty()
  deliveryPincode: string;

  @ApiProperty({ example: 0.5, description: 'Package weight in kg' })
  @IsNumber()
  @IsNotEmpty()
  weight: number;

  @ApiProperty({ example: 10, description: 'Package length in cm' })
  @IsNumber()
  @IsNotEmpty()
  length: number;

  @ApiProperty({ example: 10, description: 'Package breadth in cm' })
  @IsNumber()
  @IsNotEmpty()
  breadth: number;

  @ApiProperty({ example: 10, description: 'Package height in cm' })
  @IsNumber()
  @IsNotEmpty()
  height: number;

  @ApiProperty({ example: true, description: 'Is COD (Cash on Delivery)' })
  @IsBoolean()
  @IsOptional()
  isCOD?: boolean;

  @ApiProperty({ example: 500, description: 'Cart/Order value for COD charges' })
  @IsNumber()
  @IsOptional()
  cartValue?: number;
}

export class ShippingRateResponseDto {
  id: string;
  name: string;
  serviceType: string;
  rate: number;
  codCharge: number;
  totalCost: number;
  estimatedDays: number;
  estimatedDelivery: string;
  availability: string;
}

export class CalculateRateResponseDto {
  couriers: ShippingRateResponseDto[];
}
