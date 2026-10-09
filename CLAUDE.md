# Instructions for AI coding assistants

This repository is Erica Thompson's GitHub profile README. It follows Erica Thompson's engineering standards (the `engineering-standards` repository). The rules below are the ones that apply to a public profile page.

## Before you push

Run what CI runs, in this order, and push only when all pass:

```bash
node scripts/check-standards.mjs
trufflehog git file://. --since-commit origin/main --results=verified,unknown --fail
```

The secret scan needs `trufflehog` installed locally (`brew install trufflehog`). It is the same scan CI runs, so a finding never reaches a pull request.

## Never

- Claim a result, technology, number or client the shipped work does not support. Every number has a source: shipped work, a test run, or a report
- Add a personal email address or a link to a private repository. A bare profile link is fine; `standards.config.json` lists the repositories that are public
- Commit secrets, or ask for a key to be pasted into chat
- Pin a GitHub Action to a tag instead of a commit SHA, or give a workflow more than `contents: read` without a stated reason
- Remove a CI step because it fails. Fix the cause

## Always

- Give every image alt text, and keep link text meaningful out of context
- Add an entry to `CHANGELOG.md` under `Unreleased` for every visible change
- Use the pull request template. Include a screenshot for visible changes
- Keep pull requests small and single-purpose
- Write the pull request title as the final commit message: pull requests are squash merged, so the title becomes the commit on `main`
- Write commit messages that explain why
- Check recent commits and open pull requests before starting; another session may be working in the same files

## When unsure

Ask rather than guess. A wrong assumption that ships costs more than a question.
