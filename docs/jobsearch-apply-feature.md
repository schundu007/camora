# Job-search / Assisted-Apply feature — review guide

Branch: `feat/jobsearch-apply` (local, not committed/pushed at time of writing).

Adds a profile-driven **assisted-apply** pipeline on top of camora's existing jobs
feed and existing DOCX resume generation. Turns the old "Apply = external link-out"
into: **profile → track → tailor CV/cover → open apply page → mark applied.**

Scope deliberately **excludes** full browser-automation auto-submit (ToS / captcha /
per-board custom questions). "Assisted" = we prep + hand off; the user submits.

## User flow
1. `/jobsearch/profile` — fill in a structured candidate profile (distinct from the
   account `ProfilePage`).
2. `/jobsearch/applications` — status board. Add applications; drag-free status moves
   via a dropdown; delete.
3. On a card → **Tailor CV** → modal loads the profile + (if the app links a jobs-feed
   job) prefills the JD → **Generate** → tailored resume + cover letter (DOCX) + a
   gap-analysis match score → download both.
4. Same modal → **Apply**: "Open application page ↗" (the job URL) → attach the
   downloaded docs on the employer site → **Mark as applied** (sets `status='applied'`
   + `applied_at`).

## Files

### Backend — `apps/lumora-backend`
| File | What |
|---|---|
| `src/index.js` | (edited, additive) DDL for 2 tables in `runMigrations()`; import + mount of 2 routers |
| `src/services/jobSeekerProfileDb.js` | get/upsert the candidate profile |
| `src/services/jobApplicationsDb.js` | application CRUD (owner-scoped) |
| `src/routes/jobseekerProfile.js` | `GET/PUT /api/v1/jobsearch/profile` |
| `src/routes/jobApplications.js` | `GET/POST /` + `GET/PATCH/DELETE /:id` under `/api/v1/jobsearch/applications` |

### Frontend — `apps/camora`
| File | What |
|---|---|
| `src/App.tsx` | (edited, additive) 2 lazy imports + 2 protected routes |
| `src/lib/jobsearch-api.ts` | typed client: profile, applications, tailored-doc generation |
| `src/pages/JobSeekerProfilePage.tsx` | profile editor (`/jobsearch/profile`) |
| `src/pages/ApplicationsPage.tsx` | status board (`/jobsearch/applications`) |
| `src/components/jobsearch/TailorDocsModal.tsx` | tailor + apply-handoff modal |
| `src/components/jobsearch/TrackJobButton.tsx` | "Track" action for the job feed |
| `src/pages/JobsPage.tsx` | (edited, additive) import + `{user && <TrackJobButton job={job} />}` in the card footer |

## Data model (main Camora DB, idempotent DDL at boot)
- `job_seeker_profiles` — one row per user (`user_id` PK). Scalars + JSONB
  (`links, skills, experience, education, certifications, languages, preferences`).
- `job_applications` — `id UUID`, `user_id`, snapshot fields (`source_job_id, title,
  company, location, job_url, source, sector, role_type`), `status` (CHECK:
  saved/drafting/ready/applied/interviewing/offer/rejected), `fit_rating` (1–5),
  `channel, contact_person, notes, tailored_cv_url, cover_letter_url, applied_at`,
  timestamps. Columns mirror the reference `job_search_tracker.csv`.
  `status='saved'` is the saved-but-not-applied state (no separate saved_jobs table).
  `source_job_id` references the external jobportal DB **by value only** (no cross-DB FK).

## Reuse / integration notes
- **Auth:** every route uses the standard `authenticate` middleware; all rows scoped by
  `req.user.id`.
- **Tailored docs** reuse the *existing* ascend endpoint `POST /api/v1/resume/generate`
  (called from the browser with `VITE_CAPRA_API_URL`) — no new AI/DOCX code. The profile
  is flattened to the plain-text `resume` that endpoint expects.
- **Namespaces:** `/api/v1/jobsearch/*` and frontend `/jobsearch/*` were unused. No
  collision with the existing `/api/v1/jobs*`, `/api/v1/resume*`, `/jobs`, or the account
  `/profile`.

## Verification done
- `node --check` on all new/edited backend files — clean.
- `apps/camora` `npx tsc --noEmit` — **0 errors in these files** (repo has 4 pre-existing
  errors in `SQLPlayground.tsx` / `AmdPrepPage.tsx`, unrelated).
- **Not** runtime-tested — needs live DB + auth + Gemini.

## Manual test checklist (once running)
- [ ] Boot lumora-backend; confirm `job_seeker_profiles` + `job_applications` created (no migration errors in logs).
- [ ] `GET /api/v1/jobsearch/profile` on a fresh user → `{ profile: null }`.
- [ ] `PUT` a profile → row upserts; re-`GET` returns it; edit + save again updates in place.
- [ ] `POST /api/v1/jobsearch/applications` → 201; appears in `GET`.
- [ ] Invalid `status` on POST/PATCH → 400 with the allowed list.
- [ ] `PATCH /:id` status change → persists; `DELETE /:id` → 204, gone.
- [ ] Another user cannot read/patch/delete the first user's rows (owner scoping).
- [ ] UI: profile saves; tracker add/move/delete works with optimistic update + rollback on failure.
- [ ] Tailor modal: JD prefills for a jobs-feed-linked app; Generate returns docs + score; both DOCX download and open in Word.
- [ ] Apply: "Open application page" opens the job URL; "Mark as applied" moves the card to Applied and stamps `applied_at`.
- [ ] JobsPage: signed-in users see a "Track" link on each job card; clicking it shows "Tracked ✓" and the job appears in the tracker as `saved`; signed-out users don't see it.

## Deferred / not in this branch
- **R2 persistence** of generated DOCX + populating `tailored_cv_url` / `cover_letter_url`
  (currently the user downloads; the columns exist but are unused).
- **CSV import/export** to/from `job_search_tracker.csv`.
- **Full auto-submit** (out of scope by design).
