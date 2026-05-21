# Camora GitHub Logo & README Design

## Goal

Add the Camora logo to the GitHub repository via (1) a root `README.md` and (2) a 1280×640 social preview banner the user uploads through GitHub Settings.

## README

- **File**: `/README.md` at repo root
- **Content**: centered logo, "Camora" h1, tagline, one-liner descriptions of Lumora and Capra, tech stack badges, live link
- **Logo reference**: relative path `apps/camora/public/camora-logo.png` (621×617px, already in repo)
- **Logo display size**: 120px wide, centered

## Social Preview Banner

- **File**: `.github/social-preview.png`
- **Dimensions**: 1280×640px
- **Layout**: dark charcoal (#0d1117) background, logo left, "Camora" + tagline right
- **Generation**: ImageMagick `convert` composite
- **Upload**: manual via GitHub → Settings → General → Social preview → "Edit"

## Delivery

1. Create `README.md`
2. Generate `.github/social-preview.png` via ImageMagick
3. Commit and push both files
4. Instruct user to upload `.github/social-preview.png` to GitHub Settings
