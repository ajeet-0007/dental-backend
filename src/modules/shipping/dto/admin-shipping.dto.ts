import { IsString, IsOptional, IsArray, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class ShippingQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  courier?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;
}

export class BulkActionDto {
  @IsArray()
  @IsNumber({}, { each: true })
  shipmentIds: number[];
}

export class SchedulePickupDto {
  @IsArray()
  @IsNumber({}, { each: true })
  shipmentIds: number[];

  @IsDateString()
  scheduledDate: string;

  @IsOptional()
  @IsString()
  pickupLocation?: string;
}

export class AssignAwbDto {
  @IsNumber()
  shipmentId: number;

  @IsNumber()
  courierCompanyId: number;
}

export class NdrActionDto {
  @IsNumber()
  shipmentId: number;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;
}

export class CancelBySrIdDto {
  @IsString()
  shippingRocketId: string;
}

export class BulkCancelBySrIdsDto {
  @IsArray()
  @IsString({ each: true })
  shippingRocketIds: string[];
}