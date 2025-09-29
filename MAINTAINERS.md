# Maintainers

## Core Team

- [@acailic](https://github.com/acailic) - Project Lead, Architecture

## Subsystem Owners

### Canvas System
**Status**: [SEEKING MAINTAINER]

**Responsibilities**:
- React Flow integration and optimization
- Node and edge rendering (OptimizedNode.tsx, OptimizedEdge.tsx)
- Canvas performance and virtualization
- Layout engine and auto-layout features
- Canvas interaction layer and event handling

**Key Files**:
- `src/packages/canvas/components/*`
- `src/packages/canvas/hooks/*`
- `src/lib/performance/CanvasOptimizer.ts`

### Audio System
**Status**: [SEEKING MAINTAINER]

**Responsibilities**:
- Audio recording and playback
- MediaRecorder integration
- Audio state management
- Audio performance optimization

**Key Files**:
- `src/packages/audio/*`
- `src/packages/ui/components/AudioRecording.tsx`

### UI Components
**Status**: [SEEKING MAINTAINER]

**Responsibilities**:
- Component library and palette
- Design system and theming
- Accessibility compliance (WCAG 2.1 AA)
- Properties panel and modals
- Status bar and overlays

**Key Files**:
- `src/packages/ui/components/*`
- `src/packages/ui/components/panels/*`
- `src/packages/ui/components/modals/*`

### Testing Infrastructure
**Status**: [SEEKING MAINTAINER]

**Responsibilities**:
- Unit tests (Vitest)
- E2E tests (Playwright)
- Test coverage monitoring
- Performance benchmarking
- CI/CD pipeline maintenance

**Key Files**:
- `src/__tests__/*`
- `config/vite.config.ts`
- `.github/workflows/*`

## Becoming a Maintainer

We're actively looking for contributors to become subsystem maintainers!

### Requirements

- **Consistent contributions**: 3+ merged PRs in the subsystem
- **Code quality**: Demonstrates understanding of project standards and patterns
- **Communication**: Active in issues, PRs, and discussions
- **Commitment**: Able to dedicate 4-8 hours per month to maintenance

### Benefits

- Commit access to the repository
- Recognition in README and release notes
- Direct influence on technical decisions
- Invitation to maintainer-only channels
- Priority support for your contributions

### Process

1. **Express interest**: Comment on [this issue](https://github.com/acailic/archicomm/issues) or email acailic@example.com
2. **Demonstrate expertise**: Contribute 3+ quality PRs in your target subsystem
3. **Shadow period**: Work with existing maintainers for 1-2 months
4. **Nomination**: Current maintainer nominates you to core team
5. **Vote**: Core team reviews and votes (lazy consensus)

## Decision Making

### Lazy Consensus

For most decisions:
- Propose change in GitHub issue or PR
- Wait 72 hours for feedback
- If no objections, proceed
- If objections, discuss and find consensus

### Voting

For major decisions (breaking changes, new dependencies, architecture changes):
- Proposal must be open for at least 1 week
- Requires 2/3 majority of maintainers
- Project lead has tiebreaker vote

### Emergency Changes

For security fixes or critical bugs:
- Any maintainer can merge immediately
- Must notify other maintainers within 24 hours
- Post-merge review within 1 week

## Maintainer Responsibilities

### Code Review

- Review PRs in your subsystem within 72 hours
- Provide constructive feedback
- Ensure tests pass and coverage meets thresholds
- Check for breaking changes and documentation

### Issue Triage

- Respond to new issues within 48 hours
- Add appropriate labels and milestones
- Assign to maintainers or contributors
- Close stale or duplicate issues

### Release Management

- Participate in release planning
- Test release candidates
- Update CHANGELOG
- Write release notes for your subsystem

### Community Engagement

- Welcome new contributors
- Answer questions in discussions
- Mentor potential maintainers
- Represent project professionally

## Maintainer Rotation

To prevent burnout and ensure fresh perspectives:

- Maintainers serve 12-month terms (renewable)
- Review commitment quarterly
- Can step down to "emeritus" status anytime
- Emeritus maintainers retain recognition but lose commit access

## Contact

- **Discussions**: [GitHub Discussions](https://github.com/acailic/archicomm/discussions)
- **Security**: See [SECURITY.md](SECURITY.md)
- **Project Lead**: [@acailic](https://github.com/acailic)

---

*Last updated: 2025-09-30*