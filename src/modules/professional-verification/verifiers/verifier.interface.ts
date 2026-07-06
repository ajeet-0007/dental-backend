export interface VerificationDebug {
  pageUrl?: string;
  pageTitle?: string;
  pageText?: string;
  pageHtml?: string;
  consoleErrors?: string[];
  screenshot?: string;
}

export interface VerificationResult {
  verified: boolean;
  matchedName?: string;
  matchedRegNo?: string;
  source?: string;
  error?: string;
  retryable?: boolean;
  debug?: VerificationDebug;
}

export interface IVerifier {
  verify(registrationId: string, stateCouncil: string): Promise<VerificationResult>;
  readonly source: string;
}
