## Description

Provide a clear and concise description of the changes. Include context and motivation. If this introduces UI changes, add screenshots or a short video.

## Related Issues

Link related issues using `Closes #<issue-number>` to auto-close.

## Type of change

- [ ] Bug fix
- [ ] Feature
- [ ] Performance improvement
- [ ] Refactor/Chore
- [ ] Documentation
- [ ] Test-only change

## How Has This Been Tested?

Describe the tests you ran and how. Include commands, environment (web and/or Tauri desktop), and any relevant details.

## Breaking changes

Describe any breaking changes and the migration path.

## Checklist

Please ensure the following, aligned with our CONTRIBUTING guidelines:

- [ ] Code builds locally without type errors (TypeScript)
- [ ] ESLint passes (`lint` script)
- [ ] Code is formatted with Prettier
- [ ] Unit tests added/updated and pass (`test` script)
- [ ] E2E tests updated/passing when applicable (Playwright)
- [ ] Relevant documentation updated (README/Docs/Comments)
- [ ] No large, unrelated changes in this PR
- [ ] For Tauri desktop, validated on at least one OS (macOS/Windows/Linux)
- [ ] If applicable, added migration notes for breaking changes

## Reviewer notes

Call out areas that need special attention (e.g., tricky logic, concurrency, performance-sensitive paths), and suggested testing steps for reviewers.

## Deployment considerations

Note any deployment steps or environment changes required (e.g., Tauri signing, env vars, CI adjustments).

