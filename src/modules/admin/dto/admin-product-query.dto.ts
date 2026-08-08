import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

const toBoolean = ({ value }: { value: unknown }) =>
  value === "true" || value === true || value === 1 || value === "1";

const toStringArray = ({ value }: { value: unknown }): string[] => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
};

const toNumberArray = ({ value }: { value: unknown }): number[] => {
  if (Array.isArray(value)) return value.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
  if (typeof value === "string") return value.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
  return [];
};

export class AdminProductQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  brandId?: number;

  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  departmentIds?: number[];

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  hasVariants?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsIn(["in", "low", "out"])
  stockStatus?: string;

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  missing?: string[];

  @IsOptional()
  @IsIn(["name", "sku", "name-brand"])
  duplicate?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  expired?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  expiringSoon?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  expiringDays?: number;
}
