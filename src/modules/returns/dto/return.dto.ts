import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export enum ReturnReason {
  DEFECTIVE = 'defective',
  WRONG_ITEM = 'wrong_item',
  DAMAGED = 'damaged',
  NOT_AS_DESCRIBED = 'not_as_described',
  CHANGED_MIND = 'changed_mind',
  OTHER = 'other',
}

export class ReturnItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orderItemId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditionImages?: string[];
}

export class InitiateReturnDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ enum: ReturnReason })
  @IsEnum(ReturnReason)
  @IsNotEmpty()
  reason: ReturnReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiProperty({ type: [ReturnItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pickupCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pickupState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pickupPincode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pickupPhone?: string;
}

export class CancelReturnDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReschedulePickupDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  pickupDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pickupSlot?: string;
}

export class UploadImagesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  images: string[];
}

export class ReviewReturnDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsString()
  @IsNotEmpty()
  decision: 'approved' | 'rejected';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QualityCheckDto {
  @ApiProperty({ enum: ['passed', 'failed'] })
  @IsString()
  @IsNotEmpty()
  result: 'passed' | 'failed';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ProcessRefundDto {
  @ApiPropertyOptional({ enum: ['original_payment'] })
  @IsOptional()
  @IsEnum(['original_payment'])
  refundMethod?: 'original_payment';
}

export class ReturnQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;
}

export class ReturnResponseDto {
  id: string;
  orderId: string;
  orderNumber: string;
  shipmentId: string;
  status: string;
  reason: string;
  comments: string;
  itemTotal: number;
  shippingDeduction: number;
  refundAmount: number;
  refundMethod: string;
  refundStatus: string;
  createdAt: Date;
  updatedAt: Date;
  items: ReturnItem[];
  timeline: ReturnTimelineItem[];
}

class ReturnItem {
  id: string;
  productName: string;
  productImage: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  condition: string;
  images: string[];
}

class ReturnTimelineItem {
  id: string;
  action: string;
  actor: string;
  actorName: string;
  previousStatus: string;
  newStatus: string;
  comment: string;
  createdAt: Date;
}

export class EligibilityResponseDto {
  eligible: boolean;
  reasons: string[];
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  paymentMethod: string;
  deliveryDate: Date | null;
  daysSinceDelivery: number;
  remainingDays: number;
}
