## Summary

<!-- What this pull request changes on the profile and why, in two or three sentences. -->

## Changes

-

## How it was verified

- [ ] `node scripts/check-standards.mjs`: no personal email addresses or links to private repositories
- [ ] `trufflehog git file://. --since-commit origin/main --results=verified,unknown --fail`: no secrets in the new commits
- [ ] Every number and claim has a source in shipped work (STANDARDS.md, Honest documentation)
- [ ] Every link opens, and every image has alt text
- [ ] The README renders correctly on GitHub, in light and dark mode

## Screenshots

<!-- Required for visible changes to the profile. -->

## Documentation

- [ ] `CHANGELOG.md` updated under `Unreleased`

## Notes for reviewers

<!-- Where to look first, open questions, follow-ups. -->
