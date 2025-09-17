# Repository Guidelines

## Project Structure & Modules

- `src/`: React + TypeScript app (`main.tsx`, `App.tsx`), feature code in `components/`, `hooks/`, `services/`, `lib/`, and styles in `styles/`/`index.css`. Additional docs in `src/guidelines/`.
- `src-tauri/`: Tauri (Rust) backend (`src/main.rs`, `tauri.conf.json`, `icons/`, `target/`). Tauri commands are exposed with `#[tauri::command]` (e.g., `create_project`, `save_diagram`).
- Root: `index.html`, `vite.config.ts`, `package.json`, `README.md`, built web assets in `dist/`.

## Build, Test, and Development

- `npm run dev` / `npm start`: Launch desktop app (Tauri dev).
- `npm run web:dev`: Run Vite dev server for the web UI.
- `npm run web:build`: Build web assets to `dist/`.
- `npm run build` / `npm run release`: Create production desktop bundles (Tauri).
- `npm run build:debug` / `npm run preview`: Debug desktop build and quick preview.
- `npm run tauri:icon`: Generate platform icons from a base image.
- `npm test`, `npm run lint`: Currently placeholders; see Testing/Coding Style below.

## Coding Style & Naming

- Language: TypeScript, React function components; prefer small, composable components.
- Naming: Components `PascalCase` (e.g., `ButtonPanel.tsx`), hooks `useX`, files live under the matching folder (`src/packages/ui/components/Foo/`), non-React utilities `camelCase.ts` in `src/lib/`.
- Formatting: 2-space indent, consistent imports, keep files focused. No enforced ESLint/Prettier yet—match surrounding style.
- UI: Use Radix UI primitives where possible; keep styles colocated and reusable (utility classes in `index.css`).

## Testing Guidelines

- Framework: Not configured yet. Recommended: Vitest + React Testing Library.
- Location: `src/__tests__/` or `*.test.ts(x)` adjacent to source.
- Targets: Unit tests for components/lib, light integration around Tauri invocations. Aim for ≥80% coverage when added.
- Example (after setup): `npx vitest --run` or `npm test`.

## Commit & Pull Requests

- Commits: Prefer Conventional Commits (e.g., `feat:`, `fix:`); emojis optional (seen in history).
- PRs: Clear description, scope, and testing steps; link issues; include screenshots/GIFs for UI; note platform checks (macOS/Windows/Linux) for Tauri.

## Security & Configuration

- Tauri allowlist: Tighten before release (restrict `fs.scope`, disable unused APIs) in `src-tauri/tauri.conf.json`.
- Secrets: Never hardcode; use environment files and ignore them from VCS.
- Review Rust commands for input validation and thread safety (`State<Mutex<...>>`).
