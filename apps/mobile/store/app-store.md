# App Store Connect — listing draft

## App name
Camora — Interview Prep & Audio

## Subtitle (30 char max)
Apply, Prepare, Practice, Attend

## Promotional text (170 char max — editable post-release)
Prep DSA, system design, and behavioral on the go. During phone screens, Camora transcribes the call and surfaces relevant context from your own prep notes.

## Description
Camora is a focused interview-prep companion built around four moments: Apply, Prepare, Practice, Attend.

PREPARE
Browse curated topics for data structures and algorithms, system design, behavioral, and company-specific interviews. Your progress syncs with the Camora web app — start a topic on a laptop, finish it on your phone.

PRACTICE
Review problems you've worked. The full coding pad and system-design diagrams live on the desktop and web apps, so the practice tab on mobile is for review, not deep coding sessions.

ATTEND — Audio transcription for phone interviews
For phone-screen interviews, Camora records audio through your phone's microphone (only when you tap the record button), transcribes the conversation, and surfaces relevant prep topics you've already studied. The recording auto-stops after 10 minutes and you can stop earlier any time. A red banner stays visible whenever audio is being captured.

WHAT THIS APP IS NOT
- Camora does not write or speak interview answers for you. It surfaces context from your own prep notes — what you say is up to you.
- Camora is for job interviews and professional contexts. It is not for academic exams or any setting where assistance would violate the rules.
- Recording the other party of a phone call is regulated in many places. You confirm consent on first use, and you are responsible for following local law and for informing the other party that audio is being captured.

WHY MOBILE IS AUDIO-ONLY
Camora's video, screen-share, and live-coding features depend on capturing audio and video from other apps running on the same machine. iOS does not allow apps to access another app's audio or screen. For full-feature interviews, use the Camora desktop app or camora.cariara.com on a laptop.

ACCOUNT & SUBSCRIPTION
Sign in with the same Google account you use on camora.cariara.com. Free plan includes prep content. Camora subscriptions are managed on the web.

## Keywords (100 char max, comma-separated)
interview,prep,coding,system design,behavioral,leetcode,job,DSA,faang,transcription,career

## Support URL
https://camora.cariara.com/docs/getting-started

## Marketing URL
https://camora.cariara.com

## Privacy policy URL
https://camora.cariara.com/legal/privacy

## Category
Primary: Education
Secondary: Productivity

## Age rating
4+ (no objectionable content)

## App Store icon
Replace `apps/mobile/assets/icon.png` with the production 1024×1024 PNG (no alpha).

## Screenshots required
- iPhone 6.7" (Pro Max): 1290 × 2796 — at least 3, max 10
- iPhone 6.5" (older Pro Max): 1284 × 2778 — only required if 6.7" not provided
- iPhone 5.5" (legacy): 1242 × 2208 — optional but improves App Store presentation on older indexed pages
- iPad Pro 12.9" (3rd gen+): 2048 × 2732 — only required if app supports iPad

Screens to capture:
1. Audio Interview tab — recording state with live transcript
2. Audio Interview tab — Sona answer rendered
3. Prep tab — topic list
4. Login screen
5. Account tab

## App Privacy (Data collection questionnaire)
See `privacy-answers.md`.

## Sign-in for review
- Email: review@cariara.com (create a real account before submission)
- Password: provide via App Store Connect "Sign-In Information"
- Notes for reviewer: see the dedicated reviewer-notes block below.

## Notes for App Review (paste into "Notes" in App Store Connect)

PURPOSE
Camora is an interview *prep* app. The Audio Interview tab is for transcribing job-interview phone screens — not for academic exams. The app does not generate answers for the user; it transcribes audio and surfaces relevant topics from the user's prep notes.

HOW TO TEST THE FULL FLOW
1. Open the app → tap "Continue with Google" → sign in with the test credentials provided in App Store Connect.
2. Tab "Prep" → tap "Data Structures & Algorithms" → tap "Two pointers" → confirm the topic body renders.
3. Tab "Interview":
   a. Tap "Start listening" — a one-time consent modal appears. Tap "I understand — continue."
   b. iOS shows the standard mic permission prompt. Tap "Allow."
   c. A red banner "Recording — 0:0X" appears at the top.
   d. Speak any question into the phone, e.g. "What is dynamic programming?"
   e. Tap "Stop". The transcript renders. The "Context from your prep" panel populates with relevant material from the user's prep.
4. Tab "Account":
   a. Verify "Manage subscription on web" is NOT shown on iOS (it's hidden per Guideline 3.1.3 — reader-app rule).
   b. Tap "Delete account" → confirmation modal → "Delete forever". The user is signed out and the account is permanently removed (Guideline 5.1.1(v)).

EXPECTED PERMISSIONS
- Microphone (one-time prompt on first record). Used only while the user is actively recording. Recording auto-stops after 10 minutes.
- No location, contacts, camera, photos, or tracking permissions are requested.

NO TRACKING / NO ANALYTICS SDK
Camora does not collect any data classified as "tracking" under App Tracking Transparency. No third-party advertising or analytics SDKs are integrated.

## Export compliance
ITSAppUsesNonExemptEncryption is set to false in app.json — Camora uses only HTTPS (standard exempt encryption). No additional ATS exception needed.
