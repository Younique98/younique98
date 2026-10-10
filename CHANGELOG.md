# Changelog

Every pull request adds its entry under `Unreleased`. At release time, `Unreleased` becomes the version number and date, and a GitHub release is cut from a tag on `main`.

## [Unreleased]

### Fixed
- The placement figure matches its source: over 80% of the engineers Erica mentors one-on-one and in groups have landed tech roles, as ericathompson.io/about states, rather than over 80% of all 500+ engineers trained
- The animated headline has alt text that reads its five lines, instead of "Typing SVG", and no longer links to the tool that generates it, a link with no meaning for a visitor (WCAG 1.1.1, 2.4.4)
- Visitors whose system asks for reduced motion see a still headline instead of the typing animation (`assets/headline-static.svg`), as the design standards require a non-motion alternative for every animation
- The contact badges are announced by the words they show: "Portfolio: ericathompson.io", "LinkedIn profile" and "Book an Audit by email", instead of "Portfolio" and "Email" (WCAG 2.5.3, label in name)
- The "How I Lead" link pointed at the `engineering-standards` repository, which is private, so every visitor who followed it reached a 404 page. It now opens the leadership principles on ericathompson.io/about, and `standards.config.json` no longer lists `engineering-standards` as public, so the standards check fails if a link to it comes back while it is private

### Added (engineering standards)
- The repository follows the engineering standards: `standards.config.json` and `scripts/check-standards.mjs` fail CI on a personal email address or a link to a private repository in the README, which is the page every visitor to the profile reads first
- CI runs the standards check on every pull request, a secret scan runs on every push and weekly across the full history, and CodeQL analyzes the workflows
- The YouTube badge and the contribution streak image have alt text, so screen reader users hear what they are (WCAG 1.1.1)
- `CLAUDE.md`, `SECURITY.md`, a pull request template, issue forms, code owners, release note groups and Dependabot for the pinned actions
