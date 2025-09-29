# ADR-001: Use Tauri for Desktop Shell

## Status

**Accepted**

## Context

ArchiComm needs to run as a cross-platform desktop application to provide:
- Offline-first functionality for system design practice
- Native file system access for importing/exporting diagrams and audio
- Low latency audio recording and playback
- Professional desktop experience with native menus, keyboard shortcuts, and OS integration

We evaluated two primary options for building a desktop app with web technologies:
1. **Electron** - Mature, widely-used framework (VS Code, Slack, Discord)
2. **Tauri** - Modern alternative built with Rust

### Requirements

- **Bundle size**: Users should be able to download and install quickly
- **Memory usage**: App should not consume excessive RAM (important for developers running multiple tools)
- **Security**: Strong security model to protect user data and prevent attacks
- **Performance**: Fast startup time and smooth UI interactions
- **Developer experience**: Good tooling, documentation, and community support
- **Build tooling**: Integration with modern web dev tools (Vite, TypeScript, React)

### Electron Analysis

**Pros**:
- Mature ecosystem with extensive plugins and libraries
- Large community and comprehensive documentation
- Battle-tested in production (VS Code, Slack, Figma desktop)
- Well-known developer patterns
- Extensive Chromium APIs available

**Cons**:
- Large bundle size (100-150 MB minimum, including Chromium + Node.js)
- High memory usage (~200-300 MB baseline)
- Security vulnerabilities in Node.js integration (requires careful context isolation)
- Slower startup time due to Chromium overhead
- Heavyweight runtime for our use case

### Tauri Analysis

**Pros**:
- Small bundle size (5-15 MB, uses system WebView)
- Low memory usage (~50-100 MB baseline)
- Strong security model by default (Rust backend, capability-based permissions)
- Fast startup time
- Modern architecture (Rust backend + web frontend, clear separation)
- Built-in updater with code signing
- Active development and growing community

**Cons**:
- Smaller ecosystem compared to Electron
- Fewer third-party plugins
- Less battle-tested in large-scale production apps
- Platform-specific WebView differences (WebKit on macOS, WebView2 on Windows, WebKitGTK on Linux)
- Steeper learning curve for developers unfamiliar with Rust

## Decision

**We choose Tauri** for the following reasons:

### 1. Bundle Size and Performance

Tauri's 10-15 MB bundles vs. Electron's 100+ MB is a significant difference for user experience:
- Faster downloads (critical for open source adoption)
- Lower disk space usage
- Easier distribution via Homebrew and package managers

For a learning tool like ArchiComm, the lower barrier to installation is crucial.

### 2. Memory Efficiency

ArchiComm's typical memory footprint with Tauri:
- ~80 MB baseline
- ~150-200 MB with large canvas (100+ components)

With Electron, we'd expect:
- ~250 MB baseline
- ~400-500 MB with large canvas

Since developers often run multiple tools simultaneously, the lower memory usage is a significant advantage.

### 3. Security Model

Tauri's security model aligns with our goals:
- Rust backend prevents entire classes of memory safety vulnerabilities
- Capability-based permissions (explicit allow-list of file system access, commands, etc.)
- No Node.js integration in frontend (removes a major attack surface)
- Built-in CSP (Content Security Policy) support

This is important for a tool that handles user-created content and may eventually integrate with external services.

### 4. Modern Architecture

Tauri's clear separation between backend (Rust) and frontend (web) enforces good architectural practices:
- Frontend is pure web code (React, TypeScript)
- Backend handles file system, OS APIs, and privileged operations
- Communication via type-safe IPC commands

This separation simplifies our architecture and makes testing easier.

### 5. Future-Proofing

Tauri represents the direction the industry is moving:
- Rust adoption growing rapidly
- System WebView approach reduces duplication (every OS ships a modern browser)
- Active investment from organizations like CrabNebula

### 6. Trade-offs We Accept

We accept the following trade-offs:

**Smaller ecosystem**: We'll need to implement some features ourselves (e.g., custom file dialogs, OS-specific integrations). However, ArchiComm's feature set is relatively focused, and we haven't encountered blockers.

**WebView differences**: We need to test on all three platforms (macOS WebKit, Windows WebView2, Linux WebKitGTK). However, we were already planning cross-platform testing, and modern CSS/JS features are well-supported across all WebViews.

**Less battle-tested**: Tauri is newer than Electron. However, it's used in production by companies like [1Password](https://blog.1password.com/1password-8-for-linux/), and the core team is responsive.

**Rust learning curve**: Team members need to learn Rust for backend work. However, most ArchiComm logic lives in the React frontend, and our Rust code is minimal (file I/O, native dialogs, auto-updates).

## Consequences

### Positive

- **Faster onboarding**: Users download a 10 MB app instead of 100+ MB
- **Lower system requirements**: App runs smoothly on older hardware
- **Better security posture**: Rust backend eliminates memory safety vulnerabilities
- **Cleaner architecture**: Clear frontend/backend separation
- **Future-proof**: Betting on a modern, growing technology

### Negative

- **Learning curve**: Team must learn Rust for backend features
- **Fewer plugins**: Need to implement some features ourselves (e.g., advanced file system operations)
- **Platform testing**: Must test on macOS, Windows, and Linux WebViews
- **Smaller community**: Fewer Stack Overflow answers and third-party guides

### Mitigation Strategies

1. **Minimize Rust code**: Keep most logic in React frontend, use Rust only for privileged operations
2. **Document platform differences**: Maintain a compatibility matrix for WebView features
3. **Contribute upstream**: Report bugs and contribute to Tauri ecosystem
4. **Provide web fallback**: Maintain a web version for users who prefer not to install desktop apps

## Implementation Notes

### Initial Setup

```bash
npm create tauri-app@latest
# Select: React, TypeScript, Vite
```

### Key Files

- `src-tauri/tauri.conf.json` - Tauri configuration
- `src-tauri/src/main.rs` - Rust backend entry point
- `src-tauri/Cargo.toml` - Rust dependencies

### IPC Commands

Commands exposed from Rust backend:
- `save_design` - Save canvas to file system
- `load_design` - Load canvas from file system
- `export_audio` - Export audio recording
- `open_file_dialog` - Show native file picker
- `save_file_dialog` - Show native save dialog

### Build and Distribution

```bash
npm run tauri build  # Creates platform-specific bundles
```

Output formats:
- **macOS**: `.dmg` and `.app`
- **Windows**: `.msi` and `.exe`
- **Linux**: `.deb`, `.AppImage`, `.rpm`

### Auto-Updates

Tauri includes a built-in updater:
- Code signing required (Apple Developer cert, Windows authenticode)
- JSON manifest with version + download URLs
- Background updates with user prompts

## Alternatives Considered

### Web-Only PWA

**Why not chosen**: Requires internet connection, lacks file system access, no audio recording in all browsers, no native menus/shortcuts.

### Native Swift/Kotlin/C++

**Why not chosen**: Would require writing UI code three times (macOS, Windows, Linux), much slower development, team lacks native mobile/desktop expertise.

### NW.js

**Why not chosen**: Similar bundle size to Electron, smaller ecosystem, less active development.

## References

- [Tauri Documentation](https://tauri.app/)
- [Tauri vs Electron Comparison](https://tauri.app/v1/references/benchmarks/)
- [1Password's Migration to Tauri](https://blog.1password.com/1password-8-for-linux/)
- [Rust Security](https://www.memorysafety.org/)

## Review

This ADR should be reviewed:
- When Tauri releases v2.0 (major version change)
- If we encounter platform-specific blockers
- If bundle size or memory usage becomes a problem
- If team expertise shifts (e.g., hiring Electron experts)

---

**Date**: 2024-06-15
**Author**: @acailic
**Reviewers**: Core team
**Last Updated**: 2025-09-30