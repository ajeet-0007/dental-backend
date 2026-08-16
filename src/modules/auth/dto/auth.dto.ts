import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsIn,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_PATTERN, {
    message:
      'Password must be at least 8 characters and include uppercase, lowercase and a number',
  })
  password: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;
}

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class SendOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ enum: ['login', 'register', 'reset'] })
  @IsIn(['login', 'register', 'reset'])
  type: string;
}

export class VerifyOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @Length(4, 4)
  code: string;

  @ApiProperty({ enum: ['login', 'register', 'reset'] })
  @IsIn(['login', 'register', 'reset'])
  type: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @Length(4, 4)
  code: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_PATTERN, {
    message:
      'Password must be at least 8 characters and include uppercase, lowercase and a number',
  })
  newPassword: string;
}
