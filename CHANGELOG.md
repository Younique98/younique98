# Changelog

Every pull request adds its entry under `Unreleased`. At release time, `Unreleased` becomes the version number and date, and a GitHub release is cut from a tag on `main`.

## [Unreleased]

### Added (engineering standards)
- The repository follows the engineering standards: `standards.config.json` and `scripts/check-standards.mjs` fail CI on a personal email address or a link to a private repository in the README, which is the page every visitor to the profile reads first
- CI runs the standards check on every pull request, a secret scan runs on every push and weekly across the full history, and CodeQL analyzes the workflows
- The YouTube badge and the contribution streak image have alt text, so screen reader users hear what they are (WCAG 1.1.1)
- `CLAUDE.md`, `SECURITY.md`, a pull request template, issue forms, code owners, release note groups and Dependabot for the pinned actions
