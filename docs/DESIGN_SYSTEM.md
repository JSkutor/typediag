# TypeDiag Design System

This document defines the core visual theme **"Space Grey & Ocean Cyan"** for the TypeDiag project. It provides specific design specifications, CSS token mappings, and logical principles behind the UI. The Single Source of Truth (SSOT) for runtime CSS variables is [`src/app/styles/tokens.css`](file:///src/app/styles/tokens.css).

This guide is targeted at developers, AI agents, and the project owner to ensure a cohesive and accurate implementation of the UI components and design aesthetics.

---

## 1. Theme Concept: Space Grey & Ocean Cyan

The UI is inspired by an urban, precise software aesthetic. It combines a dark, sophisticated metal texture base (Space Grey) with clear, vibrant accents (Ocean Cyan). The goal is to provide a highly focused, distraction-free environment for typing diagnostics. 

- **Global Base**: The `body` uses `--bg-base` with a subtle top-center radial gradient (`radial-gradient(ellipse at 50% -10%, rgba(56, 97, 251, 0.06), transparent 65%)`) for depth.

---

## 2. Design Tokens (CSS Variables)

All core colors and visual properties are defined in `tokens.css`. Use these CSS variables strictly instead of hardcoding hex values.

### 2.1. Surfaces & Backgrounds
Defines the depth and elevation of application panels.

- `--bg-base`: **`#1e2024`** - The primary dark charcoal grey background for the app. (Alias: `--bg-color`)
- `--bg-raised`: **`#262930`** - Used for floating containers, panels, and dashboards. (Alias: `--panel-bg`)
- `--bg-overlay`: **`#323640`** - Used for elevated interactive elements and hover states.
- `--bg-inset`: **`#151619`** - Used for sunken elements, like scrollbar tracks or deep backgrounds.

### 2.2. Typography & Text Colors
Optimized for readability against dark surfaces.

- `--text-primary`: **`#d0deeb`** - Bright cobalt silver-blue grey for maximum readability on primary content.
- `--text-secondary`: **`#8ca6b5`** - Used for secondary information, meta text, and subtitles.
- `--text-muted`: **`#73869c`** - Low-contrast text for disabled states, hints, and placeholders.
- `--text-inverse`: **`#1e2024`** - Dark text used over light or accented backgrounds (e.g., active cyan buttons).

### 2.3. Accents & Highlights
Used to draw attention to critical metrics, active states, and diagnostic anomalies.

- `--accent`: **`#4dc6e8`** - The primary "Ocean Cyan" highlight. Used for active typing cursors, important metrics, and hesitation outliers. (Alias: `--key-accent-bg`, `--accent-cool`)
- `--accent-hover`: **`#6dd4f0`** - Hover state for primary accent interactive elements.
- `--accent-secondary`: **`#a194b8`** - Lavender purple for secondary highlights or specific onboarding badges.
- `--accent-dim`: **`rgba(77, 198, 232, 0.12)`** - A faint wash of cyan. Used for subtle glows, inactive active-states, or mesh watermarks like Delaunay triangulations. (Alias: `--accent-glow`, `--accent-cool-dim`)

### 2.4. Feedback Colors
Semantic colors for validation and error states.

- `--success`: **`#57d68d`** - Green for perfect typing or positive feedback.
- `--error`: **`#ef5b5b`** - Red for typos, omitted characters, and dangerous metrics.
- `--warning`: **`#f2c94c`** - Yellow/Amber for cognitive delays or caution states.

### 2.5. Borders & Dividers
Subtle structural delineations.

- `--border-subtle`: **`rgba(140, 166, 181, 0.08)`** - Very fine silver boundary lines. (Alias: `--border-color`, `--border-keycap`)
- `--border-strong`: **`rgba(140, 166, 181, 0.16)`** - Stronger borders for active elements, inputs, and distinct panel separations.

---

## 3. UI Components & Elements

### 3.1. Virtual Keyboard (Keycaps)
The visual representation of mechanical keyboard keys requires precise styling to emulate physical PBT keycaps.

- **Face Color**: `--keycap-face` (`#323640`) for standard keys (Alias: `--key-alpha-bg`). Hover state: `--keycap-face-hover` (`#3b404b`).
- **Top Lighting**: `--keycap-top` (`#383c47`) used to create a 3D bevel.
- **Modifier Keys**: `--key-mod-bg` (`#262930`) with `--key-mod-text` (`var(--text-secondary)`).
- **Shadows**: `--keycap-shadow` (`rgba(12, 14, 16, 0.35)`). (Alias: `--shadow-color`)
- **Elevation states**:
  - *Default/Idle*: `--shadow-key` (`0 4px 6px var(--keycap-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.05)`).
  - *Active (Pressed)*: `--shadow-key-active` (`0 1px 2px var(--keycap-shadow)`). Visually pushes the key down with `transform: translateY(3px)`.

### 3.2. Glassmorphism Panels & Dashboards
Used in diagnostic drawers and floating UI.

- **Class**: `.glass-panel`
- **Styling**: Uses translucent backgrounds (`rgba(42, 43, 46, 0.6)`), `--border-strong`, `--radius-lg`, and background blur (`backdrop-filter: blur(16px)`).
- **Shadow**: `--shadow-panel` (`0 12px 40px rgba(12, 14, 16, 0.45)`).

### 3.3. Typography Rules
- **Primary Font (`--font-sans`)**: `Outfit`, `system-ui`, `-apple-system`, `sans-serif`.
  - *Usage*: Headers, generic UI text, descriptions. Geometrical and modern.
- **Monospace Font (`--font-mono`)**: `Fira Code`, `"SF Mono"`, `ui-monospace`, `monospace`.
  - *Usage*: Keyboard key labels, metrics, numerical data, and practice typing text. Precise and developer-oriented.

---

## 4. Layout & Geometry

- **Radii**: 
  - `--radius-sm`: `6px`
  - `--radius-md`: `10px`
  - `--radius-lg`: `16px`
- **Spacing Scale**: Follows a standard token set (`--space-1` to `--space-10` mapping to `4px` through `64px`).
- **Container Max Width**: `--container-max` (`1120px`).
- **Header Height**: `--header-height` (`64px`).

---

## 5. Micro-interactions & Visual Effects

- **Typing Cursor**: A `2px` wide vertical line colored with `--accent` and a soft glow (`box-shadow: 0 0 8px var(--accent)`). Animates with a 1-second step blink.
- **Delaunay Triangulation (3D Diagnostics)**: Rendered via canvas/SVG, using `--accent-dim` with `1px` stroke width to act as a hologram watermark without obscuring data.
- **Hesitation Highlights**: Keys representing high hesitation dynamically shift background to `--accent` and text to `--text-inverse` to alert the user without the cognitive strain of red alerts.
- **3D HUD Drawer (`.cyl-drawer`)**: Features a translucent `blur(24px)` background (`rgba(18, 20, 24, 0.82)`), smoothly sliding in with cubic-bezier transitions while preventing text bleed-through using `clip-path`.
