# Privacy questionnaires — answers for both stores

These answers must be kept in sync with what the app actually does. If you wire
new tracking, analytics, or third-party SDKs, update this file AND both store
listings on the same day.

## Apple App Store — App Privacy

### Data Types Collected
- **Contact Info → Email Address**
  - Linked to identity: Yes
  - Used for: App Functionality (auth)
  - Tracking: No
- **Contact Info → Name**
  - Linked to identity: Yes
  - Used for: App Functionality (display name in UI)
  - Tracking: No
- **User Content → Audio Data**
  - Linked to identity: Yes (uploaded with the user's bearer token, attributable to their account)
  - Used for: App Functionality (transcription only — audio is not retained after the transcript is generated)
  - Tracking: No
- **User Content → Other User Content** (the transcript text + Sona answer text)
  - Linked to identity: Yes
  - Used for: App Functionality
  - Tracking: No
- **Identifiers → User ID**
  - Linked to identity: Yes
  - Used for: App Functionality
  - Tracking: No
- **Diagnostics → Crash Data** — only if you enable Sentry/Crashlytics later. Off by default.

### Tracking
"Tracking" in Apple's sense (linking user data to data from other companies for ads or sharing with data brokers) — **No, the app does not track**.

## Google Play — Data Safety form

### Data collected
| Data type | Collected | Shared | Optional/Required | Purpose |
|-----------|-----------|--------|-------------------|---------|
| Email | Yes | No | Required | Account management |
| Name | Yes | No | Required | Account management |
| User IDs | Yes | No | Required | Account management |
| Audio recordings | Yes | No | Required | App functionality (transcription) |
| Other in-app messages (transcript + Sona answer) | Yes | No | Required | App functionality |

### Encryption in transit
Yes — all network calls use HTTPS.

### Data deletion
Users can request deletion via support@cariara.com. The web account page also exposes a delete-account flow that wipes user records.

### Why audio is not "shared"
Audio is sent to Camora's own backend for transcription via a third-party speech-to-text service that acts as a data processor on Camora's behalf under a data processing agreement, not a third-party recipient. Per Google's definition, that is "collected" but not "shared."

## Both stores — common copy

### What permissions does the app request?
- **Microphone (RECORD_AUDIO / NSMicrophoneUsageDescription)** — to record audio when the user taps the record button on the Interview tab. Recording does not start automatically and stops when the user taps stop.
- **Background audio (UIBackgroundModes: audio / FOREGROUND_SERVICE_MICROPHONE)** — so an active recording survives the screen sleeping mid-call. Not used when no recording is active.
- **Internet (implicit on iOS, INTERNET on Android)** — to upload audio for transcription, fetch prep content, and authenticate.

### What the app does NOT do
- No location access
- No contacts access
- No camera access (mobile is audio-only)
- No advertising IDs, no third-party ad SDKs
- No background recording without an active user tap
