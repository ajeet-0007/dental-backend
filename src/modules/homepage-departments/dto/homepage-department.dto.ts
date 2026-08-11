import { IsNotEmpty, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHomepageDepartmentDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  departmentId: number;

  @ApiProperty({ default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateHomepageDepartmentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  departmentId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
