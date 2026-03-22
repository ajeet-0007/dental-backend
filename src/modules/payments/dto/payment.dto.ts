import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
