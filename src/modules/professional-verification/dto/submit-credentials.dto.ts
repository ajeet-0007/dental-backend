import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { STATE_DENTAL_COUNCILS } from '../constants/state-councils';

export class SubmitCredentialsDto {
  @ApiProperty({ description: 'Dental Council Registration ID (e.g., A1234)' })
  @IsString()
  dentalRegistrationId: string;

  @ApiProperty({ enum: STATE_DENTAL_COUNCILS })
  @IsString()
  @IsIn(STATE_DENTAL_COUNCILS)
  stateDentalCouncil: string;
}
