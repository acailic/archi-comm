# Community Health Metrics

This document tracks ArchiComm's community health metrics, transparency indicators, and project sustainability data. Updated monthly.

## Overview

**Mission**: Reach top 0.1% of open source projects through transparency, quality, and community engagement.

**Current Status**: Top 10-15% (established foundation, moving toward elite tier)

---

## Response Time SLAs

### Issues
- **Target**: First response within 48 hours
- **Current**: TBD (tracking started 2025-09-30)
- **Status**: 🟡 Baseline being established

### Pull Requests
- **Target**: Initial review within 72 hours
- **Current**: TBD (tracking started 2025-09-30)
- **Status**: 🟡 Baseline being established

### Security Issues
- **Target**: Acknowledgment within 24 hours
- **Current**: 0 security reports received
- **Status**: 🟢 Ready to respond

---

## Current Month: September 2025

### Contributor Metrics

| Metric | Value | Trend | Target |
|--------|-------|-------|--------|
| **Active Contributors** | 1 | - | 5+ |
| **New Contributors (30d)** | 0 | - | 2+ |
| **Repeat Contributors** | 0 | - | 50% retention |
| **Maintainers** | 1 | - | 3+ |
| **Bus Factor** | 1 | 🔴 | 3+ |

**Action Items**:
- [x] Create MAINTAINERS.md with subsystem ownership
- [ ] Recruit co-maintainers from active contributors
- [ ] Launch community channels (Discord/Slack)

### Code Quality Metrics

| Metric | Value | Trend | Target |
|--------|-------|-------|--------|
| **Test Coverage (Lines)** | 70% | - | 80%+ |
| **Test Coverage (Functions)** | 60% | - | 75%+ |
| **Test Coverage (Branches)** | 55% | - | 70%+ |
| **SonarCloud Quality Gate** | - | - | Pass |
| **Technical Debt Ratio** | - | - | <5% |
| **Code Smells** | - | - | <100 |
| **Security Hotspots** | 0 | 🟢 | 0 |

**Action Items**:
- [x] Update coverage thresholds in vite.config.ts
- [ ] Write tests to meet 80% target
- [ ] Verify SonarCloud integration
- [ ] Address technical debt items

### Repository Activity

| Metric | Value | Trend | Target |
|--------|-------|-------|--------|
| **Stars** | TBD | - | 1000+ |
| **Forks** | TBD | - | 100+ |
| **Watchers** | TBD | - | 50+ |
| **Open Issues** | TBD | - | <50 |
| **Open PRs** | TBD | - | <10 |
| **Commits (30d)** | TBD | - | 50+ |

### Security & Supply Chain

| Metric | Value | Status | Target |
|--------|-------|--------|--------|
| **OpenSSF Best Practices** | Applied | 🟡 | Passing |
| **SLSA Build Level** | 3 | 🟢 | 3+ |
| **Signed Releases** | Yes (Sigstore) | 🟢 | Yes |
| **Dependabot Enabled** | Yes | 🟢 | Yes |
| **Security Scans** | 4 tools | 🟢 | 3+ tools |
| **CVEs (Open)** | 0 | 🟢 | 0 |

**Security Tools**:
- CodeQL (SAST)
- npm audit (dependency scanning)
- OSV Scanner (vulnerability database)
- Snyk (commercial scanning)

### Documentation Quality

| Metric | Value | Status | Target |
|--------|-------|--------|--------|
| **README Completeness** | 100% | 🟢 | 100% |
| **API Documentation** | Yes | 🟢 | Yes |
| **Architecture Docs** | Yes | 🟢 | Yes |
| **Contributing Guide** | Yes | 🟢 | Yes |
| **Code of Conduct** | Yes | 🟢 | Yes |
| **Security Policy** | Yes | 🟢 | Yes |
| **ADRs** | 1 | 🟡 | 5+ |
| **Troubleshooting Guide** | No | 🔴 | Yes |

**Action Items**:
- [x] Create MAINTAINERS.md
- [x] Create API_STABILITY.md
- [x] Create ADR-001 (Tauri over Electron)
- [ ] Create TROUBLESHOOTING.md
- [ ] Add more ADRs for major decisions

### Release Metrics

| Metric | Value | Trend | Target |
|--------|-------|-------|--------|
| **Current Version** | 0.2.1 | - | - |
| **Releases (90d)** | TBD | - | 1+ per month |
| **Release Frequency** | TBD | - | Monthly |
| **Time to Release** | TBD | - | <7 days |
| **Breaking Changes (12m)** | TBD | - | Minimize |

### Community Engagement

| Metric | Value | Status | Target |
|--------|-------|--------|--------|
| **Discord Members** | 0 | 🔴 | 100+ |
| **Newsletter Subscribers** | 0 | 🔴 | 50+ |
| **Blog Posts (90d)** | 0 | 🔴 | 1+ per month |
| **Demo Videos** | 0 | 🔴 | 3+ |
| **Social Media Followers** | 0 | 🔴 | 500+ |

**Action Items**:
- [ ] Launch Discord/Slack community
- [ ] Create demo videos
- [ ] Set up newsletter
- [ ] Write architecture blog posts
- [ ] Create social media accounts

---

## Historical Data

### July 2025

*Tracking starts September 2025*

### August 2025

*Tracking starts September 2025*

### September 2025

See current month data above.

---

## CHAOSS Metrics

We track [CHAOSS (Community Health Analytics Open Source Software)](https://chaoss.community/) metrics:

### Growth-Maturity-Decline (GMD)

- **Contributors**: Number of unique contributors over time
- **New Contributors**: First-time contributors in period
- **Inactive Contributors**: Contributors with no activity in 90 days
- **Organizations Contributing**: Number of organizations represented

### Risk

- **Bus Factor**: Minimum number of contributors whose absence would harm the project (Current: 1, Target: 3+)
- **Elephant Factor**: Minimum number of organizations whose absence would harm the project (Current: 1)
- **Committer Diversity**: Distribution of commit ownership

### Value

- **Responsiveness**: Time to first response for issues and PRs
- **Activity**: Commits, issues, PRs opened/closed
- **Diversity**: Demographics and organizational diversity

### Adoption

- **Downloads**: Package downloads per month
- **Stars Growth**: GitHub stars over time
- **Forks Growth**: Repository forks over time
- **Dependents**: Projects depending on ArchiComm

---

## Transparency Commitments

### What We Track

✅ Response times (issues, PRs, security)
✅ Contributor growth and retention
✅ Code quality and test coverage
✅ Security posture and vulnerabilities
✅ Release frequency and stability
✅ Community engagement metrics

### What We Share

- This metrics document (updated monthly)
- [GitHub Insights](https://github.com/acailic/archicomm/pulse) (public)
- SonarCloud quality dashboard (public)
- Test coverage reports (public)
- Security advisories (public)

### What We Don't Track

❌ Individual contributor performance rankings
❌ Personal demographic data without consent
❌ Private communications or discussions
❌ User behavior or analytics without opt-in

---

## How to Contribute to These Goals

### Improve Bus Factor (Critical)
- Become a subsystem maintainer (see MAINTAINERS.md)
- Review PRs consistently for 2-3 months
- Take ownership of a specific area (canvas, audio, UI)

### Increase Test Coverage
- Add tests for uncovered code paths
- Write integration tests for new features
- Add E2E tests for user workflows

### Grow Community
- Share ArchiComm on social media
- Write blog posts or tutorials
- Create demo videos
- Answer questions in discussions
- Help with documentation

### Improve Quality
- Fix bugs and code smells
- Reduce technical debt
- Improve error handling
- Add performance optimizations

---

## Dashboards and Tools

### Internal Tools
- GitHub Insights: https://github.com/acailic/archicomm/pulse
- GitHub Metrics: https://github.com/acailic/archicomm/graphs/contributors
- SonarCloud: https://sonarcloud.io/project/overview?id=acailic_archicomm
- Test Coverage: Generate with `npm run test:coverage`

### External Tools (Planned)
- [ ] CHAOSS Augur dashboard
- [ ] Cauldron.io project page
- [ ] LFX Insights (if we join Linux Foundation)

---

## Monthly Review Process

On the last day of each month:

1. **Collect metrics** from GitHub, SonarCloud, npm, etc.
2. **Update this document** with current month data
3. **Move current month** to historical section
4. **Analyze trends** and identify action items
5. **Share update** in discussions and newsletter
6. **Commit changes** and create summary issue

---

## Contact

Questions about metrics or want to help?

- **Discussions**: https://github.com/acailic/archicomm/discussions
- **Maintainers**: See MAINTAINERS.md
- **Project Lead**: @acailic

---

*Last updated: 2025-09-30*
*Next update: 2025-10-31*

**Legend**: 🟢 Meeting target | 🟡 In progress | 🔴 Needs attention