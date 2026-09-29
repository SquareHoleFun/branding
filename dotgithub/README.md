# Content for the organisation's `.github` repository

GitHub shows `profile/README.md` of a **public** repository named `.github` on the organisation's overview page.
This folder is that content, kept here with the brand files so the banner stays in step with them.

To publish it: create the public repository `.github` in the organisation and copy `profile/README.md` and
`profile/banner.png` into its `profile/` folder. `profile/banner.png` is a copy of `github/profile-banner.png`
(`node scripts/build.mjs` writes both; `manifest.json` lists the same sha256 for each).

The banner is linked with a relative path (`banner.png`). If the overview page does not show it, replace the `src`
with the file's absolute URL in the `.github` repository
(`https://raw.githubusercontent.com/<organisation>/.github/main/profile/banner.png`).

The organisation's other images are in `github/`: `org-avatar-500.png` (Settings, Profile picture) and the two
`social-preview-*-1280x640.png` files (each repository's Settings, Social preview).
