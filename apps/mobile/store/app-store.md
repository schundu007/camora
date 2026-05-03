# App Store Connect — listing draft

## App name
Camora — Study & Live Notes

## Subtitle (30 char max)
Apply, Prepare, Practice, Attend

## Promotional text (170 char max — editable post-release)
Study technical and behavioral topics on the go. Capture live audio notes during meetings and conversations and surface relevant material from your library.

## Description
Camora is a focused study and audio note-taking companion built around four moments: Apply, Prepare, Practice, Attend.

PREPARE — study on the go
Browse curated topics on data structures and algorithms, system design, behavioral conversations, and company-specific notes. Your progress syncs with the Camora web app — start a topic on a laptop, finish it on your phone.

PRACTICE — review what you've covered
Review the topics you've worked through. The interactive coding pad and system-design diagrams live on the desktop and web apps; the mobile Practice tab is for spaced review, not deep coding sessions.

ATTEND — live audio notes
For phone calls, meetings, study sessions, and lectures, Camora records audio through your phone's microphone (only when you tap the record button), transcribes what's said, and surfaces relevant material from your study library. The recording auto-stops after 10 minutes and you can stop earlier any time. A red banner stays visible whenever audio is being captured.

WHAT THIS APP IS NOT
- Camora does not write or speak your part of the conversation. It surfaces material you have already studied — what you say is up to you.
- Camora is for professional and educational settings where note-taking is appropriate. It is not for academic exams or any setting where assistance would violate the rules.
- Recording another person is regulated in many places. You confirm consent on first use, and you are responsible for following local law and for informing anyone in range that audio is being captured.

WHY MOBILE IS AUDIO-ONLY
Camora's video, screen-share, and live-coding features depend on capturing audio and video from other apps running on the same machine. iOS does not allow apps to access another app's audio or screen. For the full Camora workflow, use the desktop app or camora.cariara.com on a laptop.

ACCOUNT & SUBSCRIPTION
Sign in with the same Google account you use on camora.cariara.com. Free plan includes the study library. Camora subscriptions are managed on the web.

## Keywords (100 char max, comma-separated)
study,notes,transcription,audio,coding,system design,behavioral,leetcode,DSA,career,faang

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
Replace `apps/mobile/assets/icon.png` with the production 1024×1024 PNG (no alpha) before final submission. Current artwork is a placeholder generated via vector primitives.

## Screenshots required
- iPhone 6.7" (Pro Max): 1290 × 2796 — at least 3, max 10
- iPhone 6.5" (older Pro Max): 1284 × 2778 — only required if 6.7" not provided
- iPhone 5.5" (legacy): 1242 × 2208 — optional but improves App Store presentation on older indexed pages
- iPad Pro 12.9" (3rd gen+): 2048 × 2732 — only required if app supports iPad

Screens to capture:
1. Live tab — recording state with live transcript
2. Live tab — library context rendered
3. Prep tab — topic list
4. Login screen
5. Account tab

## App Privacy (Data collection questionnaire)
See `privacy-answers.md`.

## Sign-in for review
- Email: review@cariara.com (create a real account before submission)
- Password: provide via App Store Connect "Sign-In Information"

## Notes for App Review (paste into "Notes" in App Store Connect)

PURPOSE
Camora is a study and audio note-taking app for technical professionals. The Live tab transcribes audio captured by the phone's microphone (only when the user taps record) and surfaces relevant material from the user's study library. It does not generate the user's side of any conversation — it is a transcription + note-lookup tool.

INTENDED USE
- Recording personal notes during study sessions, lectures, and meetings
- Transcribing notes from one-on-one or small-group professional conversations where consent has been obtained

NOT INTENDED FOR
- Academic exams or any setting where third-party assistance would violate the rules
- Covert recording

HOW TO TEST THE FULL FLOW
1. Open the app → tap "Continue with Google" → sign in with the test credentials provided in App Store Connect.
2. Tab "Prep" → tap "Data Structures & Algorithms" → tap "Two pointers" → confirm the topic body renders.
3. Tab "Live":
   a. Tap "Start listening" — a one-time consent modal appears confirming you have the right to record. Tap "I understand — continue."
   b. iOS shows the standard mic permission prompt. Tap "Allow."
   c. A red banner "Recording — 0:0X" appears at the top.
   d. Speak any sentence into the phone, e.g. "What is dynamic programming?"
   e. Tap "Stop". The transcript renders. The "From your library" panel populates with relevant material.
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
