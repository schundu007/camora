# Google Play Console — listing draft

## App name (50 char max)
Camora — Interview Prep & Audio

## Short description (80 char max)
Prep coding, system design, behavioral. Audio transcription for phone screens.

## Full description (4000 char max)
Camora is a focused interview-prep companion built around four moments: Apply, Prepare, Practice, Attend.

PREPARE — study on the go
Curated topics for data structures and algorithms, system design, behavioral, and company-specific interviews. Progress syncs with the Camora web app, so you can start a topic on a laptop and finish it on your phone.

PRACTICE — review your problems
Review the problems you've worked through. The full coding pad and system-design diagrams live on the desktop and web apps; the mobile Practice tab is for spaced review, not deep coding sessions.

ATTEND — audio interview transcription
For phone-screen interviews, Camora records audio through your phone's microphone (only when you tap the record button), transcribes the conversation, and surfaces relevant prep topics you've already studied. Recording auto-stops after 10 minutes and you can stop earlier any time. A red banner stays visible whenever audio is being captured. The app is for job interviews — not academic exams.

WHY MOBILE IS AUDIO-ONLY
Camora's video, screen-share, and live coding features depend on capturing audio and video from other apps running on the same machine. Mobile operating systems restrict that. For full-feature interviews, use the Camora desktop app or camora.cariara.com on a laptop.

ACCOUNT
Sign in with the same Google account you use on camora.cariara.com.

PRIVACY
Camora records audio only when you tap the record button. You confirm consent on first use, and you are responsible for following local recording laws and informing the other party. Audio is sent to our backend for transcription and is not stored after processing. Read the full privacy policy at camora.cariara.com/legal/privacy.

## Category
Education

## Tags
Education, Productivity, Job Search

## Contact email
support@cariara.com

## Website
https://camora.cariara.com

## Privacy policy
https://camora.cariara.com/legal/privacy

## Content rating questionnaire (IARC)
- Violence: None
- Sexuality: None
- Profanity: None — but user-generated content (transcribed audio) may contain it
- Controlled substances: None
- Gambling: None
- User-generated content: Yes (audio transcripts shown to the user only)
- Shares user location: No
- Targets children: No (13+ minimum)
- Expected rating: Everyone / 3+

## Data safety form
See `privacy-answers.md`.

## App access (test credentials for Play review)
- Username: review@cariara.com
- Password: provide via Play Console "App access"
- Walkthrough: see "Notes for Play Reviewer" below — paste into "Instructions" field in App Content → App access.

## Notes for Play Reviewer

PURPOSE
Camora is an interview *prep* app. The Audio Interview tab is for transcribing job-interview phone screens — not for academic exams. The app does not generate answers for the user; it transcribes audio and surfaces relevant topics from the user's prep notes.

HOW TO TEST THE FULL FLOW
1. Open the app → "Continue with Google" → sign in with the credentials above.
2. Prep tab → tap "Data Structures & Algorithms" → tap any topic → confirm body renders.
3. Interview tab:
   a. Tap "Start listening" — one-time consent modal appears. Continue.
   b. Mic permission prompt → Allow.
   c. Red "Recording" banner appears.
   d. Speak any question, e.g. "What is dynamic programming?"
   e. Tap "Stop" — transcript renders, then prep context appears.
4. Account tab:
   a. Tap "Delete account" → confirm. The account is permanently deleted via the backend, and the user is signed out.

PERMISSIONS
- RECORD_AUDIO: only while the user is actively recording on the Interview tab. Auto-stops after 10 minutes.
- FOREGROUND_SERVICE_MICROPHONE: declared so the recording survives the screen sleeping mid-call.
- POST_NOTIFICATIONS: required for Android 13+ if we add a foreground-service notification later. Not currently used to push marketing.
- No location, contacts, camera, or background location.

NO ADS, NO TRACKING
Camora does not show ads and does not integrate any third-party advertising or analytics SDKs.

## Graphic assets required
- App icon: 512 × 512 PNG, 32-bit, with alpha. Generated from `apps/mobile/assets/icon.png` (1024×1024) — Play Console handles resize automatically when you upload the 1024.
- Feature graphic: 1024 × 500 PNG/JPEG. **Required** — Play Console rejects without it.
- Phone screenshots: 16:9 to 9:16 ratio, 320–3840 px on any side. Min 2, max 8.
- 7-inch tablet screenshots: optional
- 10-inch tablet screenshots: optional

## Release strategy
1. Internal testing → invite chundubabu@gmail.com only
2. Closed testing → invite up to 100 testers (manual roster or Google group)
3. Open testing → optional beta channel
4. Production → staged rollout (start at 10–20%, monitor crash-free rate, ramp over 1–2 weeks)
