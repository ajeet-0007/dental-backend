import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ReturnReason {
  DEFECTIVE = 'defective',
  WRONG_ITEM = 'wrong_item',
  DAMAGED = 'damaged',
  NOT_AS_DESCRIBED = 'not_as_described',
  CHANGED_MIND = 'changed_mind',
  OTHER = 'other',
}

export class InitiateReturnDto {
  @ApiProperty({ description: 'Shipment ID to return' })
  @IsString()
  @IsNotEmpty()
  shipmentId: string;

  @ApiProperty({ enum: ReturnReason, description: 'Reason for return' })
  @IsEnum(ReturnReason)
  @IsNotEmpty()
  reason: ReturnReason;

  @ApiProperty({ description: 'Additional comments', required: false })
  @IsOptional()
  @IsString()
  comments?: string;
}

export class ReturnShipmentResponseDto {
  id: string;
  shipmentId: string;
  reason: string;
  status: string;
  trackingNumber: string;
  createdAt: Date;
}
