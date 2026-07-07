export interface VerificationResult {
  verified: boolean;
  matchedName?: string;
  matchedRegNo?: string;
  matchedCouncil?: string;
  matchedQualification?: string;
  matchedRegistrationDate?: string;
  source?: string;
  error?: string;
  retryable?: boolean;
}

export interface IVerifier {
  verify(registrationId: string, stateCouncil: string): Promise<VerificationResult>;
  readonly source: string;
}
