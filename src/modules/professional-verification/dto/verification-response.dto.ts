import { ApiProperty } from '@nestjs/swagger';

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
}
