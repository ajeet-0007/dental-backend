import { ApiProperty } from '@nestjs/swagger';

export class VerificationDebugDto {
  @ApiProperty({ required: false })
  pageUrl?: string;

  @ApiProperty({ required: false })
  pageTitle?: string;

  @ApiProperty({ required: false })
  pageText?: string;

  @ApiProperty({ required: false })
  consoleErrors?: string[];

  @ApiProperty({ required: false })
  screenshot?: string;
}

export class VerificationResponseDto {
  @ApiProperty()
  verified: boolean;

  @ApiProperty({ required: false })
  matchedName?: string;

  @ApiProperty({ required: false })
  matchedRegNo?: string;

  @ApiProperty({ required: false })
  source?: string;

  @ApiProperty({ required: false })
  error?: string;

  @ApiProperty({ required: false })
  retryable?: boolean;

  @ApiProperty({ required: false })
  nextAttemptAt?: Date;

  @ApiProperty({ required: false })
  debug?: VerificationDebugDto;
}
