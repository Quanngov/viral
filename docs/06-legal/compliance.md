# Compliance

> Не определено в текущем проекте.

## Legal documents in repository

**Не определено в текущем проекте:**
- Privacy Policy
- Terms of Service
- Cookie policy
- GDPR / 152-FZ compliance procedures
- Data Processing Agreements

## Technical measures present in code

| Measure | Status |
|---------|--------|
| httpOnly session cookie | Yes |
| OAuth token encryption at rest | Yes (AES-256-GCM) |
| Password hashing | Yes (`bcryptjs` via `verifyPassword`) |
| Admin access via secret | Yes (`ADMIN_SECRET`) |
| Sentry error reporting | Optional via env |
| Audit log | `AdminEvent` table |

## Payment compliance

Billing orders stored in DB; **no PCI-integrated payment provider** in codebase. Manual order confirm only.

## Meta / Google / TikTok platform policies

Developers must configure apps in respective developer consoles. Required redirect URIs documented in OAuth error pages (`oauth-error-response.ts`).

**Не определено в текущем проекте:** formal compliance checklist for platform app review.

## Связанные документы

- [[personal-data]]
- [[authentication]]
