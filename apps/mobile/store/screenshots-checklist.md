# Screenshot capture checklist

Capture from a real device or the Xcode/Android simulator at the exact dimensions each store demands. Cropping a smaller screenshot to fit a larger size always looks pixelated and reviewers will flag it.

## iOS (App Store Connect)
Required for at least one device size; the same images can be reused for smaller sizes. Use the **iPhone 16 Pro Max** simulator for 6.7" (1290 × 2796) — that's the canonical size for 2026 submissions.

| # | Screen | What to show | State to set |
|---|--------|--------------|--------------|
| 1 | Login | Brand + tagline + Continue with Google | First launch |
| 2 | Prep tab | "Hi {name}" + topic cards | Signed in, no scroll |
| 3 | Audio Interview — idle | Tap to start + tip card visible | Pre-recording |
| 4 | Audio Interview — listening | Stop button red + transcript "Listening…" | Mid-record |
| 5 | Audio Interview — Sona answered | Transcript text + Sona panel populated | Post-stream |
| 6 | Account | Email + plan + nav rows | Signed in |

Optional: caption overlays in your store listing copy ("Tap to start", "Sona surfaces your prep") look better than naked screenshots — generate via figma or `screenshot-frame` later.

## Android (Play Console)
At least 2 phone screenshots, 16:9 to 9:16 ratio. Same screens as iOS list — no need to re-shoot, just resize/letterbox to 1080 × 1920 or 1080 × 2400.

**Feature graphic — required, easy to forget**: 1024 × 500 banner shown at the top of the Play listing. Camora navy background, "Camora" wordmark + "Apply • Prepare • Practice • Attend" tagline.

## Capture commands

iOS simulator:
```
xcrun simctl io booted screenshot --type=png ~/Desktop/camora-ios-{n}.png
```

Android emulator:
```
adb exec-out screencap -p > ~/Desktop/camora-android-{n}.png
```

Resize for Play Store (8 phone screenshots from a 1284 × 2778 source):
```
cd ~/Desktop && for f in camora-ios-*.png; do
  magick "$f" -resize 1080x2400^ -gravity center -extent 1080x2400 -background "#0F1115" "play-${f}"
done
```
