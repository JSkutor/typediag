# TypeDiag

TypeDiag is a typing practice + diagnostics playground focused on **3D latency visualization**.
Instead of stopping at WPM/accuracy, it builds a **Spatial Keystroke Dynamics Model (SKDM)** from your keystroke transitions and renders your latency as a 3D “terrain” over a physical keyboard layout.

## What it does

- **Practice**: real-time typing with Hangul-aware alignment via **MVSA** (jamo-level matching, IME intermediate states, carry-over handling).
- **Diagnostics**: converts `{fromKey → toKey, latencyMs}` events into two 3D views:
  - **Global Latency Surface** (macro latency terrain via triangulation)
  - **Cylindrical Vector View** (micro transition patterns into a focused key)
- **Session lifecycle**: managed by `SessionService` (3-minute idle run split, 5-minute intra-page gap split).
- **Topic Mode**: semantic caching (pgvector) + OpenAI fallback for custom practice sentences.
- **Auth**: Clerk login or anonymous guest sessions with HMAC token bootstrap.

## Tech

Next.js (App Router), React, Zustand (slice pattern), Three.js, Vitest, Vanilla CSS.
Database & Vector Search: PostgreSQL (TimescaleDB), Drizzle ORM, pgvector.
AI & APIs: Upstage Embedding API, OpenAI GPT-4.1-nano.
Auth: Clerk + guest HMAC (`GUEST_TOKEN_SECRET`).

## Run locally

### 1. Install dependencies

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in at minimum:

| Variable | Required for |
| :--- | :--- |
| `DATABASE_URL` | Session persistence, Topic cache |
| `NEXT_PUBLIC_CLERK_*`, `CLERK_SECRET_KEY` | Sign-in (optional for guest-only use) |
| `GUEST_TOKEN_SECRET` | Guest API in production (dev has fallback) |
| `UPSTAGE_API_KEY` | Topic Mode vector search |
| `OPENAI_API_KEY` | Topic Mode LLM generation |

### 3. Database

```bash
npm run db:up      # TimescaleDB via Docker
npm run db:push    # Apply Drizzle schema
npm run db:seed    # Enable pgvector + seed data
```

### 4. Dev server

```bash
npm run dev
```

Open `http://localhost:3000`. The root page redirects to `/{lang}` based on your browser language (`ko` or `en`).

## Useful scripts

```bash
npm run validate   # typecheck + lint + test
npm run build
npm run db:studio  # Drizzle Studio
npm run db:embed    # Batch-embed target texts (requires UPSTAGE_API_KEY)
```

## Docs

- `docs/AUTH.md` — Clerk login, guest HMAC tokens, account merge
- `docs/API.md` — HTTP API routes (`/api/session`, Topic, sync)
- `docs/DB_SCHEMA.md` — PostgreSQL schema & session lifecycle
- `docs/MVSA_ALGORITHM.md` — Hangul alignment & real-time error classification
- `docs/SKDM_ARCHITECTURE.md` — SKDM pipeline and 3D visualization architecture
- `docs/STATE_MANAGEMENT.md` — Zustand slices & session lifecycle
- `docs/DESIGN_SYSTEM.md` — UI theme (“Space Grey & Ocean Cyan”)
- `docs/DIAGNOSTICS.md` — Cylindrical Diagnostics 구조·용어·통계 (focusKey, accumulator, Cloud Typing, piecewise regression)
- `docs/HARDCORE_MODE.md` — Hardcore MLP language model (Korean)
- `docs/TOPIC_MODE.md` — Topic Mode vector caching & LLM generation (Korean)

### For contributors & AI agents

`AGENTS.md` at the repo root is an **internal guide** for Cursor/Antigravity-style agents (SSOT table, commit conventions, quality gates). It is not end-user documentation.
