# Migration Guide: Component & Package Reorganisation

This document helps contributors update local branches after the repository was reorganised around the `src/packages` layout.

## What Changed

| Legacy Path | New Location | Import Alias |
| --- | --- | --- |
| `src/components/**` | `src/packages/ui/components/**` | `@ui/components/...` |
| `src/features/canvas/**` | `src/packages/canvas/**` | `@canvas/...` |
| `src/lib/audio/**` | `src/packages/audio/**` | `@audio/...` |
| `src/services/**` | `src/packages/services/**` | `@services/...` |
| `src/shared/types.ts` | `src/packages/core/types.ts` | `@core/types` |
| `src/lib/utils.ts` | `src/packages/core/utils.ts` | `@core/utils` |

All tooling configuration moved under `config/` and the Vite/TypeScript aliases were updated accordingly.

## Updating Imports

1. Replace `@/components/...` (and `@components/...`) with `@ui/components/...`.
2. Replace `@/features/canvas/...` with `@canvas/...`.
3. Replace audio references: `@/lib/audio...` → `@audio...`.
4. Replace service imports: `@/services...` → `@services...`.
5. Pull shared helpers from `@core` (`@core/types`, `@core/utils`).

The new path aliases are defined in `config/tsconfig.json` and `config/vite.config.ts`.

## Verifying the Move

- Run `npm run validate:structure` (also part of the pre-commit hook). The script fails if disallowed import segments (`@/components`, `src/components`, etc.) are detected.
- Run `npm run lint` and `npm run test` to confirm updated aliases are resolved.
- Playwright tests require `npm run e2e` (configuration now lives in `config/playwright.config.ts`).

## Troubleshooting

- **VS Code cache:** Reload the TypeScript project (`Developer: Reload Project`) so the new `tsconfig` paths take effect.
- **Old branches:** Rebase onto a commit after the reorganisation, then run the import replacements listed above.
- **Missing UI exports:** If you cannot find a component, import it from `@ui/components/...`. The package barrel (`src/packages/ui/components/index.ts`) re-exports all components, including UI primitives.

## Next Steps

- Gradually migrate the remaining helpers in `src/lib` into dedicated packages.
- Add new packages under `src/packages` following the same pattern (`index.ts` + barrel exports + alias).
- Keep personal notes inside `docs/development/` so the main repository stays clean.
