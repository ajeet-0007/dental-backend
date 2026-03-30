import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsArray, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VariantOptionInputDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  optionName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  optionValue: string;
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sellingPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  mrp?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  brandId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  departments?: string;

  @ApiProperty({ default: 'unit' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ default: 1 })
  @IsOptional()
  @IsNumber()
  minOrderQuantity?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isReturnable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  returnDays?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  hasVariants?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  stock?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  features?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  keySpecifications?: Record<string, string>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  packaging?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  directionToUse?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  additionalInfo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  warranty?: string;
}

export class ProductOptionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  values?: (string | { value: string; hexCode?: string; swatchUrl?: string })[];
}

export class UpdateProductDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sellingPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  mrp?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  minOrderQuantity?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isReturnable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  returnDays?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  hasVariants?: boolean;

  @ApiProperty({ required: false, type: [ProductOptionDto] })
  @IsOptional()
  @IsArray()
  options?: ProductOptionDto[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  features?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  keySpecifications?: Record<string, string>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  packaging?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  directionToUse?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  additionalInfo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  warranty?: string;
}

export class CreateProductVariantDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sellingPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  mrp?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  weightUnit?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  flavor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  packQuantity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;

  @ApiProperty({ required: false, type: [VariantOptionInputDto] })
  @IsOptional()
  @IsArray()
  options?: VariantOptionInputDto[];
}

export class UpdateProductVariantDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sellingPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  mrp?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  weightUnit?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  flavor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  packQuantity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  hasVariants?: boolean;

  @ApiProperty({ required: false, type: [ProductOptionDto] })
  @IsOptional()
  @IsArray()
  options?: ProductOptionDto[];
}

export class ProductQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categories?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  brandId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  departments?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiProperty({ default: 10 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sortOrder?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  hasVariants?: boolean;

  @ApiProperty({ required: false, type: [ProductOptionDto] })
  @IsOptional()
  @IsArray()
  options?: ProductOptionDto[];
}

export class ProductOptionValueDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  value: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hexCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  swatchUrl?: string;

  @ApiProperty()
  position: number;
}

export class CreateVariantDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sellingPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  mrp?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  weightUnit?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  packQuantity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiProperty({ required: false, type: [VariantOptionInputDto] })
  @IsOptional()
  @IsArray()
  options?: VariantOptionInputDto[];
}

export class CreateProductWithVariantsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sellingPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  mrp?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ default: 'unit' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false, type: [ProductOptionDto] })
  @IsOptional()
  @IsArray()
  options?: ProductOptionDto[];

  @ApiProperty({ required: false, type: [CreateVariantDto] })
  @IsOptional()
  @IsArray()
  variants?: CreateVariantDto[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  features?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  keySpecifications?: Record<string, string>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  packaging?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  directionToUse?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  additionalInfo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  warranty?: string;
}

export class VariantWithAttributesDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  sku?: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  sellingPrice: number;

  @ApiProperty()
  mrp: number;

  @ApiProperty({ required: false })
  weight?: number;

  @ApiProperty({ required: false })
  weightUnit?: string;

  @ApiProperty({ required: false })
  image?: string;

  @ApiProperty({ required: false, type: [String] })
  images?: string[];

  @ApiProperty()
  packQuantity: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false })
  expiresAt?: string;

  @ApiProperty({ required: false })
  createdAt?: Date;

  @ApiProperty({ required: false })
  updatedAt?: Date;

  @ApiProperty({ required: false })
  attributes?: Record<string, string>;
}

export class ProductWithVariantsDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  shortDescription?: string;

  @ApiProperty({ required: false })
  sku?: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  sellingPrice: number;

  @ApiProperty()
  mrp: number;

  @ApiProperty({ required: false })
  brand?: string;

  @ApiProperty()
  unit: string;

  @ApiProperty({ required: false, type: [String] })
  images?: string[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isFeatured: boolean;

  @ApiProperty()
  hasVariants: boolean;

  @ApiProperty({ required: false })
  expiresAt?: string;

  @ApiProperty({ required: false })
  category?: any;

  @ApiProperty({ required: false, type: [ProductOptionDto] })
  options?: ProductOptionDto[];

  @ApiProperty({ required: false, type: [VariantWithAttributesDto] })
  variants?: VariantWithAttributesDto[];

  @ApiProperty({ required: false })
  inventories?: any[];

  @ApiProperty()
  createdAt?: Date;

  @ApiProperty()
  updatedAt?: Date;

  @ApiProperty({ required: false, type: [String] })
  features?: string[];

  @ApiProperty({ required: false })
  keySpecifications?: Record<string, string>;

  @ApiProperty({ required: false })
  packaging?: string;

  @ApiProperty({ required: false })
  directionToUse?: string;

  @ApiProperty({ required: false })
  additionalInfo?: string;

  @ApiProperty({ required: false })
  warranty?: string;
}
