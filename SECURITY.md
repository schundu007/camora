# Security Policy

Camora handles interview recordings, resumes, OAuth tokens and payment state. We take
reports seriously and we will not be annoyed that you found something.

## Reporting a vulnerability

**Please do not open a public issue, PR or discussion for a security problem.**

Report it privately, in this order of preference:

1. **GitHub private vulnerability reporting** — the *Report a vulnerability* button under
   this repository's **Security** tab. This is the preferred route: it is private, it
   threads properly, and it needs no email.
2. **Email** — security@cariara.com

Please include:

- what the issue is and roughly how bad you think it is,
- the steps to reproduce it, or a proof of concept,
- the affected service (`camora`, `lumora-backend`, `ascend-backend`, `ai-services`,
  `code-runner`, `playground-backend`, `desktop`, `mobile`, `extension`),
- anything you know about impact — whose data, how much.

A working exploit is not required. A clear description of the class of bug is plenty.

## What to expect

| | |
|---|---|
| First response | within 3 working days |
| Triage and severity assessment | within 7 days |
| Fix for a critical issue | as fast as we can, deployed without waiting for a release |
| Credit | you are named in the fix, unless you would rather not be |

We will tell you when it is fixed and when it is safe to talk about publicly. We would
appreciate you holding off on disclosure until then, but we are not going to pretend we can
impose a deadline on you.

## In scope

Anything in this repository, plus the production deployments at `camora.cariara.com` and
its backing APIs. Of particular interest:

- authentication and session handling — the `cariara_sso` JWT cookie, the OAuth flow, the
  SSO handoff between the two backends,
- authorization — subscription gates, admin gates, quota bypasses, one user reading
  another user's documents, sessions, resumes or transcripts,
- the sandboxes — escaping `code-runner`, or escaping a `playground-backend` lab VM into
  the host or into another tenant's session,
- SQL injection, SSRF, XSS,
- Stripe webhook forgery or replay,
- exposed secrets, in the repo or in a built bundle.

## Out of scope

- Findings from an automated scanner with no demonstrated impact.
- Missing hardening headers with no exploitable consequence.
- Rate limiting on endpoints that are not sensitive.
- Social engineering, physical attacks, or anything targeting our staff or users.
- Denial of service. Please do not stress-test production.

## Testing rules

Test against your **own** account and your own data. Do not access, modify or exfiltrate
anyone else's data — if you stumble into someone else's data while proving a bug, stop,
do not save it, and say so in the report. Do not run destructive tests, and do not degrade
the service for real users.

Report in good faith and stay within these rules and we will not pursue anything against
you.
