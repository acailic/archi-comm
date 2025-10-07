<div align="center">

<img src="src-tauri/icons/128x128@2x.png" width="110" height="110" alt="ArchiComm logo">

# ArchiComm Community Edition

### A desktop companion for learning and practicing system design

<!-- Badges -->

[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/0000/badge)](https://www.bestpractices.dev/projects/0000)
[![Build Status](https://github.com/acailic/archi-comm/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/acailic/archi-comm/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=acailic_archicomm&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=acailic_archicomm)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=acailic_archicomm&metric=coverage)](https://sonarcloud.io/summary/new_code?id=acailic_archicomm)
[![Technical Debt](https://sonarcloud.io/api/project_badges/measure?project=acailic_archicomm&metric=sqale_index)](https://sonarcloud.io/summary/new_code?id=acailic_archicomm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
<img alt="Version" src="https://img.shields.io/badge/version-0.2.1-blue.svg">
<img alt="Node >=18" src="https://img.shields.io/badge/node-%3E%3D18.0.0-339933?logo=nodedotjs&logoColor=white">
<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white">
<img alt="Prettier" src="https://img.shields.io/badge/code_style-Prettier-ff69b4?logo=prettier&logoColor=white">
<a href="https://tauri.app"><img alt="Tauri" src="https://img.shields.io/badge/Desktop-Tauri-FFC131?logo=tauri&logoColor=white"></a>
<a href="https://react.dev"><img alt="React" src="https://img.shields.io/badge/UI-React-61DAFB?logo=react&logoColor=white"></a>

Learn, practice, and teach system design fundamentals through guided scenarios, interactive diagrams, and repeatable exercises. This is the Community Edition, focused on core features for learners and interview practice. Upgrade to ArchiComm Pro for advanced features.

</div>

---

## Table of Contents

- [Quick Start](#quick-start)
- [Why ArchiComm Community Edition](#why-archicomm-community-edition)
- [Study Flow](#study-flow)
- [Community Edition Features](#community-edition-features)
- [Delight Features](#delight-features-)
- [Audio Features](#audio-features-community-edition)
- [Study Modules](#study-modules)
- [Canvas System Overview](#canvas-system-overview)
- [System Design Practice Workflow](#system-design-practice-workflow)
- [Tech Stack](#tech-stack)
- [Architecture Guide](#architecture-guide)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [ArchiComm Pro](#archicomm-pro)
- [License](#license)

---

## Why ArchiComm Community Edition

ArchiComm Community Edition is a free, open-source desktop app for learning and practicing system design. It focuses on core study flows and interview practice, making it ideal for students, job seekers, and educators.

- Study by doing: work through realistic scenarios end-to-end
- Reason about trade-offs: latency vs. throughput, consistency vs. availability, cost vs. performance
- Build a reusable toolkit: patterns, checklists, estimations, and ADRs you can export
- Teach and coach: run time-boxed interview sessions with rubrics and hints

See also: [src/docs/SystemDesignPractice.md](src/docs/SystemDesignPractice.md)

---

## Installation

### Quick Install (macOS via Homebrew)

```bash
brew tap acailic/tap
brew install --cask archicomm
```

This installs the notarized desktop bundle to `/Applications/ArchiComm.app`. Launch it from Spotlight or run:

```bash
open /Applications/ArchiComm.app
```

Upgrade anytime with `brew upgrade archicomm`. Prefer to build from source? Replace the cask command with `brew install acailic/tap/archicomm`.

### Download from GitHub Releases

Every tagged build ships to [GitHub Releases](https://github.com/acailic/archi-comm/releases) with SHA256 checksums.

| Platform | Artifact | How to install |
| --- | --- | --- |
| macOS (Intel/Apple Silicon) | `ArchiComm-macOS.dmg` | Double-click the DMG and drag ArchiComm to Applications. |
| Windows 10/11 | `ArchiComm-Setup-x64.exe` | Run the signed installer and follow the wizard. |
| Linux (AppImage) | `ArchiComm-x86_64.AppImage` | `chmod +x ArchiComm-x86_64.AppImage && ./ArchiComm-x86_64.AppImage` |
| Linux (Debian/Ubuntu) | `archicomm_x.y.z_amd64.deb` | `sudo dpkg -i archicomm_x.y.z_amd64.deb` |

Download from the latest release manually or via curl:

```bash
# macOS DMG example
curl -L \
  https://github.com/acailic/archi-comm/releases/latest/download/ArchiComm-macOS.dmg \
  -o ArchiComm-macOS.dmg
```

Verify the downloaded file with the checksum listed on the release page (`shasum -a 256 <file>` on macOS/Linux or `Get-FileHash` on Windows).

### Development Setup

```bash
# Clone and launch the desktop app
git clone https://github.com/acailic/archicomm.git
cd archicomm
npm install
npm run tauri:dev  # for desktop development
# or
npm run dev        # for web development
```

Build binaries: `npm run build` (creates signed Tauri bundles for your OS).

### Package Manager

We standardize on npm for dependency management. Commit updates to `package-lock.json` and avoid adding alternative lockfiles (`yarn.lock`, `pnpm-lock.yaml`). Vite's canonical configuration lives at `config/vite.config.ts`; update that file when changing dev server or build behavior.

### Auto-Updates

ArchiComm includes an automatic update system that securely downloads and installs updates. You can:

- Enable/disable automatic update checks in preferences
- Manually check for updates from the Help menu
- View update history and release notes

---

## Architecture Guide

For a deeper dive into the system and developer guidance, see the Architecture Guide.

- Architecture overview, canvas internals, and performance: `docs/ARCHITECTURE.md`
- APIs for components, hooks, and services: `docs/API_REFERENCE.md`

## Study Flow

- Define requirements: functional scope, SLAs/SLOs, constraints, traffic assumptions.
- Estimate: back‑of‑the‑envelope throughput, storage, QPS, fan‑out, costs.
- Design: place components on the canvas; connect data flows and failure domains.
- Explore trade‑offs: toggle replication, sharding, consistency, cache policies, queues.
- Validate: run checklists and rubrics; capture risks and mitigation strategies.
- Document: export diagram (SVG/PNG), notes/ADR (Markdown), and assumptions.

---

## Community Edition Features

- **Voice Recording**: Record audio explanations of your system designs with manual transcript entry
- Scenario templates: classic problems (URL shortener, news feed, chat, ride-hailing, file storage)
- Patterns library: load balancing, caching, sharding, CQRS, pub/sub, rate limiting
- Trade-off explorer: consistency levels, replication factors, partitioning schemes, backpressure
- Estimation helpers: latency budgets, p50/p95, queue depth, storage growth, cost rough-order
- Interview mode: time-boxed session, hints, rubric, and exportable scorecard
- Exports: diagrams (SVG/PNG), notes (Markdown), and ADR templates

New in this build:

- File-based custom challenges (import JSON via Challenge Selection > Import Challenge)
- Architecture templates pre-seeding (load suggested components and links)
- Progressive solution hints (manual toggle or contextual prompts)
- Auto-save of canvas to Tauri backend (diagram + connections)

<details>
<summary><b>Pro Version Features (Upgrade)</b></summary>

- Automatic transcription (speech-to-text)
- Advanced AI review and feedback
- Company-specific templates and premium modules
- Audio analysis and voice command features
- Offline transcription and enhanced export options

[Learn more about ArchiComm Pro](https://archicomm.com/pro)

</details>

---

## Delight Features ✨

ArchiComm includes thoughtful UI/UX enhancements designed to make learning system design more engaging and enjoyable:

### Component Personality

- **Hover Effects**: Components scale and glow subtly when you hover over them
- **Drag Trails**: Semi-transparent trail effect follows components as you drag them
- **Landing Animations**: Gentle bounce animation when dropping components on the canvas
- **Connection Flows**: Animated data flow visualization along connection lines
- **Selection Pulse**: Pulsing ring effect around selected components

### Canvas Delight

- **Empty States**: Beautiful, inspiring illustrations when the canvas is empty
- **Grid Snap Feedback**: Satisfying magnetic pull animation when components snap to grid
- **Smooth Zoom/Pan**: Momentum-based scrolling for natural canvas navigation
- **First Component Celebration**: Special animation when adding your first component

### Learning Tooltips

- **Component Education**: Hover over components to see use cases, best practices, and real-world examples
- **"Did You Know?" Facts**: Educational system design facts rotate during loading screens
- **Pattern Library**: Browse and learn from common architecture patterns
- **Contextual Help**: Smart tooltips appear based on your actions

### Smooth Transitions

- **Loading Skeletons**: Shimmer effect loading states with educational content
- **Friendly Errors**: Helpful error messages with actionable suggestions instead of generic errors
- **Beautiful Empty Panels**: Thoughtful empty states across all UI panels
- **Micro-Interactions**: Polished animations for state changes and user actions

### Configuration

All animations respect your system preferences and can be toggled:

- **Animations Toggle**: Press `Ctrl+Shift+A` to toggle animations on/off
- **Reduced Motion**: Automatically respects `prefers-reduced-motion` system setting
- **Performance**: Animations use GPU acceleration and CSS for 60fps performance

### Keyboard Shortcuts

- `Shift+P` - Open pattern library
- `Shift+?` - Show component education (when component selected)
- `Ctrl+Shift+A` - Toggle animations
- `Shift+D` - Show random system design fact
- `Cmd+K` - Quick add component

---

## Audio Features (Community Edition)

ArchiComm Community Edition provides simple, reliable audio recording and manual transcription:

### Recording

- **MediaRecorder API**: Browser-native recording with pause/resume support
- **Manual Transcription**: Rich text editor for typing your explanations
- **Audio Playback**: Listen to your recordings while editing transcripts

### Simplified Design

- Single recording engine for maximum compatibility
- No complex transcription dependencies
- Manual transcript editing with word count and analysis
- Export audio and transcript data together

### Usage

```typescript
import { SimpleAudioManager } from "@audio/SimpleAudioManager";

// Initialize the simple audio manager
const audioManager = new SimpleAudioManager({
  maxDuration: 300000, // 5 minutes
});

// Start recording
await audioManager.startRecording();

// Stop and get audio data
audioManager.stopRecording();
// Audio data will be available via event listeners
```

---

## Study Modules

ArchiComm Community Edition loads "Tasks" (study modules) that define prompts, acceptance criteria, hints, and assets. You can add your own tasks or use built-ins.

- Structure and examples: [src/docs/SystemDesignPractice.md](src/docs/SystemDesignPractice.md)
- Create a task: add a `task.json` under `src/lib/tasks/plugins/<your-task>/` and export it from `src/lib/tasks/index.ts`

---

## Canvas System Overview

- Simplified architecture: `DesignCanvas` integrates with `SimpleCanvas` (React Flow-based)
- Simple state management: Zustand store (`SimpleAppStore`) replaces complex RxJS patterns
- Component rendering: Single React Flow node type with customizable styling
- Persistence: Local storage and export/import functionality

### Keyboard Shortcuts

- V: Select, H: Pan, Z: Zoom, A: Annotate
- Space + Drag: Pan viewport
- Ctrl/Cmd+A: Select all; Del/Backspace: Delete
- Arrow keys: Nudge; Ctrl/Cmd+Arrow: Fine nudge

### Task Plugins

- Plugins live under `src/lib/task-system/plugins/<task-id>`
- Example: `url-shortener` with `task.json` and `assets/`
- Loaded via `src/lib/task-system/templates/index.ts`

### Developer Diagnostics

- `DeveloperDiagnosticsPage` shows live canvas metrics (FPS, score, workers, memory)
- Export diagnostics as JSON for debugging

- Optional assets: diagrams, seed data, or reference links

Example scenarios included:

- URL shortener at scale
- Twitter/Instagram news feed
- Real-time chat and presence
- Distributed cache and invalidation
- Background jobs and retries
- Ride-hailing dispatch

<details>
<summary><b>Pro Version Modules</b></summary>

- Company-specific templates
- Premium scenario modules
- Advanced challenge types

[Upgrade to Pro](https://archicomm.com/pro)

</details>

---

## System Design Practice Workflow

1. Select or import a challenge in Challenge Selection.
2. Start designing on the canvas. Optionally load the architecture template when prompted.
3. Toggle Solution Hints for progressive guidance. Hints group by topic and difficulty.
4. Your work auto-saves to the local Tauri backend (no network required).
5. Record your explanation, then review your session and export.

### Importing Custom Challenges (File-Based)

- Click Import Challenge in Challenge Selection (Tauri only).
- Pick a `.json` file containing either an array of challenges or an object: `{ "version": "...", "challenges": [...] }`.
- Valid entries must include: `id`, `title`, `description`, `requirements[]`, `difficulty`, `estimatedTime`, `category`.
- Optional fields: `solutionHints[]`, `architectureTemplate`, `tags[]`, `prerequisites[]`, `learningObjectives[]`, `resources[]`, `variants[]`.

Minimal JSON example:

```
{
  "version": "1.0.0",
  "challenges": [
    {
      "id": "hello-world",
      "title": "Hello World Service",
      "description": "Design a tiny service that returns a greeting.",
      "requirements": ["Expose HTTP endpoint", "Return greeting"],
      "difficulty": "beginner",
      "estimatedTime": 10,
      "category": "system-design",
      "solutionHints": [
        { "id": "h1", "title": "API Shape", "content": "Keep it simple.", "type": "architecture", "difficulty": "beginner" }
      ],
      "architectureTemplate": {
        "name": "Hello World",
        "description": "API + Service",
        "components": [
          { "type": "api-gateway", "label": "API", "description": "HTTP entry" },
          { "type": "server", "label": "Service", "description": "Business logic" }
        ],
        "connections": [
          { "from": "API", "to": "Service", "label": "HTTP", "type": "sync", "protocol": "REST" }
        ]
      }
    }
  ]
}
```

### Templates and Hints

- When a challenge contains an `architectureTemplate`, you’ll see a prompt to load it. You can also load it from the Solution Hints panel.
- Hints appear in categories like architecture, scaling, technology, tradeoff, and optimization; toggle them anytime from the toolbar.

### Persistence

- The canvas auto-saves to the Tauri backend (in-memory for this build) keyed by challenge id.
- Manual save triggers are available from the toolbar; exports (JSON/PNG) remain available.

### Troubleshooting

- Import fails: ensure your JSON matches the minimal format above. Invalid entries are ignored with warnings.
- No auto-save: verify you’re running the Tauri desktop build. Web preview skips native persistence.
- Template didn’t load: some components must have unique labels; the loader maps connections by label.

## AI Review (Community Edition)

You can request basic rubric-based feedback using a local Tauri command that proxies to your model provider (keeps keys out of the UI). Setup steps and sample code are documented in [src/docs/SystemDesignPractice.md](src/docs/SystemDesignPractice.md).

- Configure `OPENAI_API_KEY` (or swap in another provider)
- Invoke `ai_review` from the UI; receive summary, strengths, risks, and a score

<details>
<summary><b>Pro Version AI Review</b></summary>

- Advanced AI feedback and scoring
- Customizable rubrics
- Company-specific review criteria

[Upgrade to Pro](https://archicomm.com/pro)

</details>

## Shortcuts

- Command palette: `Ctrl/Cmd + K`
- Add/Connect mode: `A` / `C`
- Zoom to fit: `Ctrl/Cmd + 0`
- Duplicate: `Ctrl/Cmd + D`
- Undo/Redo: `Ctrl/Cmd + Z` / `Ctrl/Cmd + Shift + Z`

Press `?` in the app for the full list.

---

## Tech Stack

- Desktop shell: Tauri (Rust)
- UI: React + TypeScript, Radix UI, Tailwind
- Bundler/Dev: Vite
- Testing: Vitest (unit/integration) + Playwright (E2E)
- Demo assets: Automated marketing screenshots via Playwright (`npm run demo:prepare && npm run demo:screenshots`, see `e2e/README-DEMO-SCREENSHOTS.md`)
- Canvas and interactions: custom canvas engine, Motion/Framer animations

## Developer Tools

ArchiComm uses modern development tools to ensure code quality and consistency:

- **Knip** — Detects unused files, dependencies, and exports (`npm run unused:check`)
- **commitlint** — Enforces conventional commit message format
- **Dependabot** — Automated dependency updates via GitHub
- **EditorConfig** — Consistent editor settings across IDEs
- **VS Code Integration** — Recommended extensions, debug configurations, and tasks
- **Playwright CLI** — Install browsers with `npm run demo:prepare` (wraps `npx playwright install`) before running screenshot suites

**Commit Format:** All commits must follow conventional commit format:

```bash
feat(canvas): Add node auto-layout
fix(audio): Resolve recording buffer overflow
docs: Update installation instructions
```

**Structure Validation:** Repository structure is validated on pre-commit:

```bash
npm run validate:structure
```

For complete tooling documentation, see `docs/TOOLING.md`.

## Repository Layout

- `config/` — centralised configuration for Vite, ESLint, Playwright, TypeScript, semantic-release, and Sonar
- `docs/` — tracked documentation (essential docs in `docs/development/` are tracked; personal notes are git-ignored)
- `src/packages/core/` (`@core`) — domain primitives, shared types, and core business logic
- `src/packages/ui/` (`@ui`) — component library and design system primitives for the desktop app
- `src/packages/canvas/` (`@canvas`) — diagram engine, interactions, and canvas-specific utilities
- `src/packages/services/` (`@services`) — integration services, gateways, and persistence adapters
- `src/packages/audio/` (`@audio`) — audio capture, processing, and transcription pipeline
- `src/shared/hooks/`, `src/stores/`, `src/lib/` — shared hooks, Zustand stores, and utilities that complement the packages
- `distribution/homebrew/` — Homebrew cask & formula definitions tracked with the repo
- `tools/` — development scripts and structure validators (`npm run validate:structure`)

Useful scripts:

- `npm run dev` — web dev server (Vite)
- `npm run tauri:dev` — desktop dev shell
- `npm run test:coverage` — generate coverage report
- `npm run e2e` — run Playwright tests locally
- `npm run validate:structure` — validate repository structure
- `npm run deps:check` — check for outdated dependencies
- `npm run unused:check` — detect unused code and dependencies

For complete tooling documentation, see `docs/TOOLING.md`.

---

## Contributing

We welcome improvements to modules, patterns, checklists, and study flows for the Community Edition.

- Start here: `CONTRIBUTING.md` for a quick start checklist, local dev workflow, and PR standards
- Explore the architecture: `docs/ARCHITECTURE.md`
- Consult the API reference: `docs/API_REFERENCE.md`
- Development tooling: `docs/TOOLING.md` for all tools and their usage
- Security policy: `docs/SECURITY.md`
- API stability: `docs/API_STABILITY.md`
- Maintainers: `docs/MAINTAINERS.md`

Ideas that help learners most:

- New study modules with clear acceptance criteria and hints
- Trade-off explorers (e.g., sharding vs. hashing strategies)
- Estimation worksheets and rubric improvements
- Better exports (ADR templates, interview scorecards)
- Audio and speech-to-text enhancements (see `TODO.md`)

---

## ArchiComm Pro

ArchiComm Pro unlocks advanced features for professional users, including automatic transcription, advanced AI review, company-specific templates, and more. Upgrade for the full experience.

[Learn more and upgrade](https://archicomm.com/pro)

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ by the ArchiComm Team**

_Empowering architects to design the future, one component at a time._

⭐ **Star us on GitHub** • 🐦 **Follow on Twitter** • 💬 **Join Discord**

</div>
