# Professional Verification Module

**Location:** `src/modules/professional-verification/`

## Purpose

Dental professional verification: users submit their Dental Council of India (DCI) registration ID and state council. The system scrapes the DCI website using Puppeteer to verify credentials. Supports manual approve/reject by admin with rate limiting to prevent abuse.

---

## Flow Diagram

### Verification Flow

```
User                       ProfVerificationService               DCI Website
  │                                │                                │
  │ POST /profile/verification     │                                │
  │ { dentalRegistrationId:       │                                │
  │   "ABC123",                    │                                │
  │   stateDentalCouncil:          │                                │
  │   "Delhi Dental Council" }     │                                │
  │ ───────────────────────────►   │                                │
  │                                │  Validate state council        │
  │                                │  against STATE_DENTAL_COUNCILS │
  │                                │                                │
  │                                │  Rate limit check:             │
  │                                │  • Max 3 attempts per hour     │
  │                                │  • Reset on success            │
  │                                │                                │
  │                                │  Launch headless browser       │
  │                                │  (Puppeteer)                   │
  │                                │                                │
  │                                │  Navigate to DCI verification  │
  │                                │  page                          │
  │                                │ ───────────────────────────►   │
  │                                │                                │
  │                                │  Fill form:                    │
  │                                │  • Registration No             │
  │                                │  • State Council (dropdown)    │
  │                                │                                │
  │                                │  Submit form, wait for results │
  │                                │ ◄── verification result ───── │
  │                                │                                │
  │                                │  Parse result:                 │
  │                                │  • Name matched?               │
  │                                │  • Registration valid?         │
  │                                │                                │
  │                                │  if verified:                  │
  │                                │    Update user:                │
  │                                │    isProfessionalVerified=true │
  │                                │    verificationMethod="dci"    │
  │                                │    professionalVerifiedAt=now  │
  │                                │  else:                         │
  │                                │    Increment attempt count     │
  │                                │    Record error message        │
  │                                │                                │
  │  ◄── { verified: true/false,  │                                │
  │        matchedName?,           │                                │
  │        source: "dci_scrape" }  │                                │
```

---

## API Endpoints

### User Endpoints (JWT)

| Method | Path | Description |
|---|---|---|
| POST | `/profile/verification` | Submit credentials for verification |
| GET | `/profile/verification` | Get current verification status |

### Admin Endpoints (JWT + ADMIN)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/verification/pending` | Pending verification requests |
| POST | `/admin/verification/verify/:userId` | Re-verify a user |
| POST | `/admin/verification/approve/:userId` | Manual approve |
| POST | `/admin/verification/reject/:userId` | Manual reject (with reason) |

---

## Service Layer

| Method | Description |
|---|---|
| `submitCredentials(userId, dto)` | Validate council, rate-limit check, DCI scrape, update user |
| `getVerificationStatus(userId)` | Return { verified, professional } |
| `getPendingVerifications(page, limit)` | Users where verification fields are set but not verified |
| `approveManually(userId)` | Force set isProfessionalVerified = true |
| `rejectManually(userId, reason)` | Set with rejection reason |
| `reVerify(userId)` | Trigger another DCI scrape |

---

## DCI Verifier (Puppeteer)

| Method | Description |
|---|---|
| `verify(registrationId, stateCouncil)` | Launch browser → navigate DCI site → fill form → parse result → close browser |
| `getBrowser()` | Singleton browser instance (lazy init) |

**State councils:** Validated against `STATE_DENTAL_COUNCILS` constant (array of Indian state dental council names). Mapped to DCI form values via `STATE_COUNCIL_MAP`.

---

## Rate Limiting

- Max **3 verification attempts** per user per hour
- Counter stored in `verificationAttempts` and `verificationLastAttemptAt` on User entity
- Counter resets on successful verification
- Returns `canAttempt: false` with `nextAttemptAt` in response

---

## DTOs

| DTO | Fields |
|---|---|
| `SubmitCredentialsDto` | dentalRegistrationId (required), stateDentalCouncil (required, validated against STATE_DENTAL_COUNCILS) |
| `VerificationResponseDto` | verified, matchedName?, matchedRegNo?, source?, error?, retryable?, nextAttemptAt? |

---

## Module Configuration

```
ProfessionalVerificationModule
├── imports: [TypeOrmModule.forFeature([User])]
├── controllers: [ProfessionalVerificationController, AdminVerificationController]
├── providers: [ProfessionalVerificationService, DciVerifier]
└── exports: [ProfessionalVerificationService]
```
