# OpenSSF Best Practices Badge Application Guide

This document provides guidance for completing the OpenSSF Best Practices Badge application for ArchiComm.

## Application URL

Apply at: https://bestpractices.coreinfrastructure.org/

## Current Status

**Target**: Passing Badge (100% of required criteria)
**Stretch Goal**: Silver Badge (additional criteria)

## Badge Levels

- **Passing**: Basic best practices (required for top-tier projects)
- **Silver**: Additional quality criteria
- **Gold**: Exemplary practices

## Criteria Checklist

### Basics

✅ **Project website**: https://github.com/acailic/archicomm
✅ **Description**: Clear README with value proposition
✅ **License**: MIT (LICENSE file present)
✅ **Version numbering**: Semantic versioning 0.2.1
✅ **Release notes**: CHANGELOG.md present
✅ **English communication**: All docs in English

### Change Control

✅ **Public version-controlled source repository**: GitHub
✅ **Unique version numbering**: SemVer + git tags
✅ **Release notes**: CHANGELOG.md updated per release
✅ **Previous releases**: Tagged in git

### Reporting

✅ **Bug reporting process**: GitHub Issues with templates
✅ **Vulnerability reporting process**: SECURITY.md present
✅ **Response to vulnerability reports**: 24h SLA in SECURITY.md
⚠️ **Archive for vulnerabilities**: Need CVE assignments when applicable

### Quality

✅ **Working build system**: npm install && npm run build
✅ **Automated test suite**: Vitest + Playwright
✅ **Test policy**: Tests required for new features (CONTRIBUTING.md)
✅ **Continuous integration**: GitHub Actions CI
⚠️ **Test coverage**: Currently 70%, target 80%+ (in progress)
✅ **Coding standards**: ESLint + Prettier enforced

### Security

✅ **Secure development knowledge**: Team trained in OWASP Top 10
✅ **Use basic good cryptographic practices**: N/A (no crypto implementation)
✅ **Security review**: CodeQL, Snyk, OSV Scanner in CI
✅ **Static code analysis**: ESLint, TypeScript strict mode
✅ **Dynamic analysis**: Playwright E2E tests
⚠️ **Memory-safe language**: TypeScript (safe), Rust backend (safe)
✅ **Dependencies updated**: Dependabot enabled
✅ **Signed releases**: ⚠️ TODO - Need to implement

### Analysis

✅ **Static code analysis tool**: ESLint, TypeScript, SonarCloud
✅ **Dynamic analysis tool**: Playwright E2E, Vitest unit tests
✅ **Address reported warnings**: CI fails on errors
⚠️ **SAST tool**: SonarCloud configured, need to display results
⚠️ **Dependency vulnerability scanning**: npm audit + OSV + Snyk (need to document)

## Action Items for Passing Badge

### High Priority

1. **Increase test coverage to 80%+**
   - Status: In progress (thresholds updated in vite.config.ts)
   - Action: Write tests for uncovered code paths
   - Files: See coverage report at `coverage/index.html`

2. **Implement signed releases**
   - Status: TODO
   - Action: Add Sigstore/cosign to release workflow
   - Files: `.github/workflows/release.yml`

3. **Document security analysis tools**
   - Status: Partially done
   - Action: Add section to SECURITY.md listing all tools
   - Tools: CodeQL, npm audit, OSV Scanner, Snyk, SonarCloud

4. **Create CVE assignment process**
   - Status: TODO
   - Action: Document process for requesting CVEs from GitHub
   - File: SECURITY.md

### Medium Priority

5. **Add SAST results to README**
   - Status: Badge added, need to ensure SonarCloud is running
   - Action: Verify SonarCloud integration and display results

6. **Document cryptographic practices**
   - Status: N/A (no custom crypto)
   - Action: Document that we rely on browser/OS crypto only

7. **Create security checklist for contributors**
   - Status: TODO
   - Action: Add to CONTRIBUTING.md
   - Content: OWASP Top 10, input validation, XSS prevention

## Self-Certification Questionnaire

### Basics

**Q: Is the project website in English?**
A: Yes - https://github.com/acailic/archicomm

**Q: Does the project have a license?**
A: Yes - MIT License in LICENSE file

**Q: Does the project use version control?**
A: Yes - Git/GitHub

### Reporting

**Q: How do users report bugs?**
A: GitHub Issues with bug report template

**Q: How do users report vulnerabilities?**
A: SECURITY.md with email contact and 24h response SLA

**Q: Do you respond to vulnerability reports?**
A: Yes - 24 hour acknowledgment, security fixes prioritized

### Quality

**Q: Does the project have automated tests?**
A: Yes - Vitest for unit/integration, Playwright for E2E

**Q: What is your test coverage?**
A: Currently 70% lines, targeting 80%+ (updated thresholds)

**Q: Do you use continuous integration?**
A: Yes - GitHub Actions runs tests, linting, security scans on every PR

**Q: Do you have coding standards?**
A: Yes - ESLint + Prettier enforced via pre-commit hooks

### Security

**Q: Do developers know how to write secure software?**
A: Yes - Team follows OWASP guidelines, security in code review

**Q: Do you use static analysis?**
A: Yes - ESLint, TypeScript strict mode, SonarCloud, CodeQL

**Q: Do you use dynamic analysis?**
A: Yes - Playwright E2E tests, manual testing

**Q: Are releases cryptographically signed?**
A: In progress - Implementing Sigstore/cosign signing

**Q: Do you check dependencies for vulnerabilities?**
A: Yes - Dependabot, npm audit, OSV Scanner, Snyk

## Silver Badge Criteria

For future consideration:

- **Enhanced documentation**: Architecture diagrams, API docs (✅ Already have)
- **Multi-factor authentication**: Require for maintainers (✅ GitHub enforced)
- **Code review required**: All PRs reviewed before merge (⚠️ Document in CONTRIBUTING.md)
- **Branch protection**: main branch protected (✅ Already enabled)
- **Dependency pinning**: package-lock.json committed (✅ Already done)

## Submission Process

1. Go to https://bestpractices.coreinfrastructure.org/
2. Click "Get Your Badge"
3. Sign in with GitHub
4. Enter project URL: https://github.com/acailic/archicomm
5. Complete questionnaire (use answers above)
6. Submit for review
7. Address any feedback from OpenSSF reviewers
8. Once approved, update README badge with actual project ID

## Maintaining the Badge

After achieving passing badge:

- **Review annually**: Re-certify every 12 months
- **Update on major changes**: Re-submit if security model changes
- **Track criteria changes**: OpenSSF may add new requirements
- **Document compliance**: Keep this file updated with current status

## Resources

- [OpenSSF Best Practices Criteria](https://bestpractices.coreinfrastructure.org/en/criteria)
- [Badge Users](https://bestpractices.coreinfrastructure.org/en/projects)
- [CII Best Practices Guide](https://github.com/coreinfrastructure/best-practices-badge/blob/main/doc/criteria.md)

---

*Last updated: 2025-09-30*
*Next review: 2026-09-30*