# TypeDiag

TypeDiag is a typing practice + diagnostics playground focused on **3D latency visualization**.
Instead of stopping at WPM/accuracy, it builds a **Spatial Keystroke Dynamics Model (SKDM)** from your keystroke transitions and renders your latency as a 3D “terrain” over a physical keyboard layout.

## What it does

- **Practice**: real-time typing with Hangul-aware alignment via **MVSA** (jamo-level matching, IME intermediate states, carry-over handling).
- **Diagnostics**: converts `{fromKey → toKey, latencyMs}` events into two 3D views:
  - **Global Latency Surface** (macro latency terrain via triangulation)
  - **Cylindrical Vector View** (micro transition patterns into a focused key)
- **Session lifecycle**: managed by `SessionService` (idle-based run/page finalization rules).

## Tech

Next.js (App Router), React, Zustand (slice pattern), Three.js, Vitest, Vanilla CSS.
Database & Vector Search: PostgreSQL (TimescaleDB), Drizzle ORM, pgvector.
AI & APIs: Upstage Embedding API, Gemini 2.5 Flash-Lite.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The root page redirects to `/{lang}` based on your browser language (`ko` or `en`).

## Useful scripts

```bash
npm run validate   # typecheck + lint + test
npm run build
```

## Docs

- `docs/MVSA_ALGORITHM.md` — Hangul alignment & real-time error classification
- `docs/SKDM_ARCHITECTURE.md` — SKDM pipeline and 3D visualization architecture
- `docs/STATE_MANAGEMENT.md` — Zustand slices & session lifecycle
- `docs/DESIGN_SYSTEM.md` — UI theme (“Space Grey & Ocean Cyan”)
- `docs/DIAGNOSTICS.md` — 3D diagnostics stats & mathematical ideation specifications (Korean)
- `docs/HARDCORE_MODE.md` — Hardcore MLP Language Model specifications (Korean)
- `docs/SUBJECT_MODE.md` — Subject Mode vector caching (pgvector) and LLM generation architecture (Korean)
