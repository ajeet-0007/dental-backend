import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities';
import { ProfessionalVerificationService } from './professional-verification.service';
import {
  ProfessionalVerificationController,
  AdminVerificationController,
} from './professional-verification.controller';
import { DciVerifier } from './verifiers/dci-verifier';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [ProfessionalVerificationController, AdminVerificationController],
  providers: [ProfessionalVerificationService, DciVerifier],
  exports: [ProfessionalVerificationService],
})
export class ProfessionalVerificationModule {}
