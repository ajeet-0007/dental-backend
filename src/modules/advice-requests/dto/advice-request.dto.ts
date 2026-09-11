import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export const ADVICE_STATUSES = ["pending", "reviewed", "resolved"] as const;

export class CreateAdviceRequestDto {
  @ApiProperty({ example: "Dr. Anil Kumar" })
  @IsString()
  @IsNotEmpty()
  doctorName: string;

  @ApiPropertyOptional({ example: "Smile Dental Clinic" })
  @IsOptional()
  @IsString()
  clinicName?: string;

  @ApiProperty({ example: "anil@clinic.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: "+919876543210" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: "Suction motor" })
  @IsString()
  @IsNotEmpty()
  equipmentName: string;

  @ApiProperty({ example: "Dental Chair" })
  @IsString()
  @IsNotEmpty()
  equipmentCategory: string;

  @ApiPropertyOptional({ example: "Marathon" })
  @IsOptional()
  @IsString()
  equipmentBrand?: string;

  @ApiProperty({ example: "The suction motor stops mid-procedure..." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  problemDescription: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class UpdateAdviceRequestStatusDto {
  @ApiProperty({ enum: ADVICE_STATUSES, example: "reviewed" })
  @IsString()
  @IsIn(ADVICE_STATUSES)
  @IsNotEmpty()
  status: string;

  @ApiPropertyOptional({ example: "Diagnosed: worn carbon brushes" })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}