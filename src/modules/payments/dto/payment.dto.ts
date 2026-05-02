import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, ValidateNested, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentSessionItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productVariantId?: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  unitPrice: number;

  @ApiProperty()
  @IsString()
  productName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productImage?: string;

  @ApiProperty()
  @IsString()
  sku: string;
}

export class CreatePaymentSessionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  addressId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customerNote?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  selectedCourier?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  selectedService?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  shippingRate?: number;

  @ApiProperty({ type: [PaymentSessionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentSessionItemDto)
  items: PaymentSessionItemDto[];

  @ApiProperty()
  @IsNumber()
  subtotal: number;

  @ApiProperty()
  @IsNumber()
  taxAmount: number;

  @ApiProperty()
  @IsNumber()
  shippingAmount: number;

  @ApiProperty()
  @IsNumber()
  totalAmount: number;
}

export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

export class VerifyPaymentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  razorpayPaymentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  razorpayOrderId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  razorpaySignature?: string;
}
