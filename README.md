<div align="center">

<img src="src-tauri/icons/128x128@2x.png" width="110" height="110" alt="ArchiComm logo">

# ArchiComm Community Edition
### A desktop companion for learning and practicing system design

<!-- Quality & Ecosystem Badges -->
<a href="https://github.com/acailic/archi-comm/actions/workflows/ci.yml"><img alt="Build" src="https://github.com/acailic/archi-comm/actions/workflows/ci.yml/badge.svg?branch=main"></a>
<a href="https://github.com/acailic/archi-comm/actions/workflows/coverage.yml"><img alt="Coverage" src="https://github.com/acailic/archi-comm/actions/workflows/coverage.yml/badge.svg?branch=main"></a>
<a href="https://github.com/acailic/archi-comm/actions/workflows/security.yml"><img alt="Security" src="https://github.com/acailic/archi-comm/actions/workflows/security.yml/badge.svg?branch=main"></a>
<a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg"></a>
<img alt="Version" src="https://img.shields.io/badge/version-0.2.1-blue.svg">
<img alt="Node >=18" src="https://img.shields.io/badge/node-%3E%3D18.0.0-339933?logo=node.js&logoColor=white">
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

## Quick Start

```bash
# Clone and launch the desktop app
git clone https://github.com/acailic/archicomm.git
cd archicomm
npm install
npm run dev   # or: npm start
```

Build binaries: `npm run build` (Tauri bundles for your OS).

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

## Audio Features (Community Edition)

ArchiComm Community Edition includes basic audio recording capabilities to help you practice explaining your system designs verbally—a crucial skill for technical interviews and design reviews.

### Included Features
- **Audio Recording**: Record your design explanations with built-in microphone support
- **Manual Transcription**: Enter text transcripts alongside your audio recordings
- **Playback Controls**: Review your recorded explanations with integrated audio playback
- **Duration Tracking**: Monitor recording time with real-time duration display
- **Word Count Analysis**: Track transcript length and speaking pace metrics

<details>
<summary><b>Pro Version Audio Features</b></summary>

- Automatic speech-to-text conversion
- Voice command recognition
- Audio analysis and feedback
- Offline transcription

[Upgrade to Pro](https://archicomm.com/pro)
</details>

See [TODO.md](TODO.md) for the complete roadmap of planned audio and speech features.

---

## Study Modules

ArchiComm Community Edition loads "Tasks" (study modules) that define prompts, acceptance criteria, hints, and assets. You can add your own tasks or use built-ins.

- Structure and examples: [src/docs/SystemDesignPractice.md](src/docs/SystemDesignPractice.md)
- Create a task: add a `task.json` under `src/lib/tasks/plugins/<your-task>/` and export it from `src/lib/tasks/index.ts`

---

## Canvas System Overview

- Three-layer architecture: `DesignCanvas` (orchestration), `CanvasArea` (viewport + interactions), `CanvasComponent` (node rendering)
- Performance manager: `CanvasPerformanceManager` tracks FPS, render time, memory; optimizes via batching and culling
- Persistence: Tauri-backed JSON files in `$APPDATA/archicomm/projects/<id>.json` with web fallbacks

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

1) Select or import a challenge in Challenge Selection.
2) Start designing on the canvas. Optionally load the architecture template when prompted.
3) Toggle Solution Hints for progressive guidance. Hints group by topic and difficulty.
4) Your work auto-saves to the local Tauri backend (no network required).
5) Record your explanation, then review your session and export.

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
- Canvas and interactions: custom canvas engine, Motion/Framer animations

Useful scripts:
- `npm run dev` — web dev server (Vite)
- `npm run tauri:dev` — desktop dev shell
- `npm run test:coverage` — generate coverage report
- `npm run e2e` — run Playwright tests locally

---

## Contributing

We welcome improvements to modules, patterns, checklists, and study flows for the Community Edition.

- Start here: `CONTRIBUTING.md` for a quick start checklist, local dev workflow, and PR standards
- Explore the architecture: `docs/ARCHITECTURE.md`
- Consult the API reference: `docs/API_REFERENCE.md`

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

*Empowering architects to design the future, one component at a time.*

⭐ **Star us on GitHub** • 🐦 **Follow on Twitter** • 💬 **Join Discord**

</div>
| Open Project | `Ctrl + O` | `Cmd + O` | Open existing project |
| Save Project | `Ctrl + S` | `Cmd + S` | Save current project |
| Save As | `Ctrl + Shift + S` | `Cmd + Shift + S` | Save with new name |
| Export | `Ctrl + E` | `Cmd + E` | Export project |

### **🎯 Selection & Editing**
| Action | Windows/Linux | macOS | Description |
|:---|:---:|:---:|:---|
| Select All | `Ctrl + A` | `Cmd + A` | Select all components |
| Multi-Select | `Shift + Click` | `Shift + Click` | Add to selection |
| Box Select | `Drag` | `Drag` | Select with rectangle |
| Lasso Select | `L + Drag` | `L + Drag` | Free-form selection |
| Invert Selection | `Ctrl + I` | `Cmd + I` | Invert current selection |

### **↩️ History & Undo**
| Action | Windows/Linux | macOS | Description |
|:---|:---:|:---:|:---|
| Undo | `Ctrl + Z` | `Cmd + Z` | Undo last action |
| Redo | `Ctrl + Y` | `Cmd + Shift + Z` | Redo last undone action |
| History Panel | `Ctrl + H` | `Cmd + H` | Show history timeline |

### **🎨 View & Layout**
| Action | Windows/Linux | macOS | Description |
|:---|:---:|:---:|:---|
| Grid Toggle | `Ctrl + '` | `Cmd + '` | Show/hide grid |
| Snap Toggle | `Ctrl + ;` | `Cmd + ;` | Toggle snapping |
| Rulers | `Ctrl + R` | `Cmd + R` | Show/hide rulers |
| Guides | `Ctrl + Shift + ;` | `Cmd + Shift + ;` | Show/hide guides |
| Layers Panel | `F7` | `F7` | Toggle layers panel |

### **🔍 Navigation & Search**
| Action | Windows/Linux | macOS | Description |
|:---|:---:|:---:|:---|
| Find Component | `Ctrl + F` | `Cmd + F` | Find specific component |
| Go to Component | `Ctrl + G` | `Cmd + G` | Navigate to component |
| Next Match | `F3` | `Cmd + G` | Go to next search result |
| Previous Match | `Shift + F3` | `Cmd + Shift + G` | Go to previous result |

### **⚙️ Tools & Modes**
| Action | Windows/Linux | macOS | Description |
|:---|:---:|:---:|:---|
| Hand Tool | `H` | `H` | Pan/navigate mode |
| Select Tool | `V` | `V` | Default selection tool |
| Text Tool | `T` | `T` | Add text labels |
| Shape Tool | `U` | `U` | Draw basic shapes |
| Measure Tool | `M` | `M` | Measure distances |

### **🎵 Audio & Recording**
| Action | Windows/Linux | macOS | Description |
|:---|:---:|:---:|:---|
| Start Recording | `R` | `R` | Begin audio recording |
| Stop Recording | `Esc` | `Esc` | Stop audio recording |
| Play/Pause | `Spacebar` | `Spacebar` | Play/pause audio |
| Quick Voice Note | `Shift + V` | `Shift + V` | Record quick voice note |

### **🚀 Performance & System**
| Action | Windows/Linux | macOS | Description |
|:---|:---:|:---:|:---|
| Performance Monitor | `Ctrl + Shift + P` | `Cmd + Shift + P` | Show performance stats |
| Memory Usage | `Ctrl + Shift + M` | `Cmd + Shift + M` | Display memory usage |
| Developer Tools | `F12` | `Cmd + Option + I` | Open developer console |
| Reload App | `Ctrl + R` | `Cmd + R` | Reload application |
| Hard Refresh | `Ctrl + Shift + R` | `Cmd + Shift + R` | Clear cache and reload |

</details>

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ by the ArchiComm Team**

*Empowering architects to design the future, one component at a time.*

⭐ **Star us on GitHub** • 🐦 **Follow on Twitter** • 💬 **Join Discord**

</div>
