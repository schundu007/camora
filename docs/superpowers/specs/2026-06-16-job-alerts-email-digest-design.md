# Job Alerts Email Digest — Design Spec

**Date:** 2026-06-16
**Status:** Approved

---

## Overview

Daily email digest of the top 10 job matches for opted-in users. Sent at 8am UTC via Resend. Jobs are pre-filtered by the user's saved `job_roles`, then Claude semantically ranks them against the user's `resume_text` and picks the top 10 with a 2-line relevance summary each.

---

## Data Layer

### Migration (ascend-backend startup, idempotent)

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_alerts_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_alerts_last_sent_at TIMESTAMPTZ;
```

### Unsubscribe token

Signed JWT embedded in every email footer:
- Payload: `{ sub: userId, purpose: 'job_alert_unsub', exp: +30 days }`
- Signed with `JWT_SECRET`
- `GET /api/v1/jobs/unsubscribe?token=<jwt>` — verifies token, sets `job_alerts_enabled = false`, no login required
- Renders a plain confirmation page: "You've been unsubscribed from Camora job alerts."

---

## Opt-in Surfaces

### 1. Onboarding final step

After roles are saved, before redirect to dashboard, show a full-screen opt-in card:

- **Icon:** Custom icon from `Icons.tsx` (target/role-match themed)
- **Heading:** "Daily job alerts"
- **Body:** "Get the top 10 roles matching your profile delivered to your inbox every morning at 8am."
- **Actions:** "Turn on alerts" (primary, gold-leaf) | "Skip" (ghost)
- "Turn on alerts" fires `PATCH /api/v1/profile` with `{ job_alerts_enabled: true }`, then navigates to dashboard
- "Skip" navigates to dashboard without changes

### 2. Jobs page banner

Shown when: user has ≥1 active role filter selected AND `user.job_alerts_enabled === false`.

- Dismissible per-session via `sessionStorage` (does not re-show on filter changes within the session)
- Positioned below the hero band, above the job list
- Uses custom `<Icon>` from `Icons.tsx` — no generic emoji
- Clicking the "On" toggle fires `PATCH /api/v1/profile` with `{ job_alerts_enabled: true }`
- On success: banner hides, brief "Alerts on ✓" toast shows

---

## Digest Endpoint

**Route:** `POST /api/v1/jobs/send-digest`
**Auth:** `X-API-Key` header matching `INTERNAL_API_KEY` env var (same pattern as billing verify route)
**Returns:** `{ sent: N, skipped: N, errors: N }`

### Per-user flow

1. **Load opted-in users** — `SELECT id, email, name, job_roles, resume_text FROM users WHERE job_alerts_enabled = true`
2. **Dedup check** — skip user if `job_alerts_last_sent_at > NOW() - INTERVAL '20 hours'`
3. **Load candidates** — query jobs DB: `posted_date >= NOW() - INTERVAL '24 hours' AND is_active = true`, filtered by `buildRoleCondition(user.job_roles)`. Limit 50.
4. **Skip if zero candidates** — no email, no timestamp update
5. **Claude ranking call** — single prompt per user:
   - Has resume: rank 50 candidates against `resume_text`, return top 10 with 2-line relevance summary each
   - No resume: return top 10 by recency with generic 2-line summary drawn from `ai_summary`
6. **Send email** via Resend
7. **Update** `job_alerts_last_sent_at = NOW()` on success

Sequential processing with 200ms delay between users to avoid Claude rate limits. Each user failure is caught and logged independently — one failure does not abort the batch.

---

## Email Template

HTML email, Camora navy + gold-leaf branding. Design will be refined after first live preview.

### Structure

```
Header
  Camora wordmark (left) + date (right)
  "Your top 10 matches today"

Resume banner (no-resume users only)
  Custom icon from Icons.tsx
  "These matches are based on your role preferences only.
   Upload your resume for personalized AI ranking."
  CTA: [ Upload Resume ] → https://camora.cariara.com/capra/resume

Job cards x10
  Company logo via logo.dev (same token as job board)
  Job title · Company name
  Location · Work type · Salary (if available) · Posted N hours ago
  2-line AI relevance summary (personalized if resume exists)
  [ Prepare ]   [ Apply ]

Footer
  "You're receiving this because you enabled job alerts."
  [ Unsubscribe ] → signed JWT link
```

### Links

- "Prepare" → `https://camora.cariara.com/jobs/{id}/prepare`
- "Apply" → raw `job_url` from jobs DB
- "Upload Resume" → `https://camora.cariara.com/capra/resume`
- "Unsubscribe" → `https://caprab.cariara.com/api/v1/jobs/unsubscribe?token=<jwt>`

---

## Railway Cron Trigger

On the existing `ascend-backend` Railway service, add a cron job:

- **Schedule:** `0 8 * * *` (8am UTC)
- **Command:** `curl -X POST https://caprab.cariara.com/api/v1/jobs/send-digest -H "X-API-Key: $INTERNAL_API_KEY"`

No new Railway service or package required.

---

## New Files

| File | Purpose |
|------|---------|
| `apps/ascend-backend/src/routes/jobAlerts.js` | Digest endpoint + unsubscribe route |
| `apps/ascend-backend/src/services/jobAlertEmailService.js` | Claude ranking + Resend send logic |
| `apps/camora/src/components/capra/JobAlertsBanner.tsx` | Jobs page opt-in banner |

### Modified Files

| File | Change |
|------|--------|
| `apps/ascend-backend/src/index.js` | Add migration columns + mount `jobAlerts` router |
| `apps/camora/src/pages/capra/OnboardingPage.jsx` | Add opt-in step before dashboard redirect |
| `apps/camora/src/pages/JobsPage.tsx` | Import and render `<JobAlertsBanner>` |
| `apps/camora/src/lib/api-client.ts` | Add `patchJobAlerts(enabled)` helper |

---

## Error Handling

- Claude failure for one user → log, skip, continue batch
- Resend failure → log, do NOT update `job_alerts_last_sent_at` (retries next day naturally)
- Jobs DB unavailable → abort entire batch, return 503
- Invalid unsubscribe token → return 400 "Invalid or expired link"

---

## Out of Scope

- Email open/click tracking
- Per-role granularity (all user roles combined into one digest)
- Frequency selection (daily only)
- Push notifications
