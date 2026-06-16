# TypeDiag

TypeDiag is an advanced typing diagnostics and practice application. It uses a Spatial Keystroke Dynamics Model (SKDM) to analyze your typing habits and visualizes your keystroke latency in a 3D topological map.

## Documentation

The project documentation has been organized for better readability:

*   **[Roadmap & TODOs](TODO.md)**: Master checklist, ongoing tasks, and architectural plans (located in root).
*   **[Zustand & Session Lifecycle](docs/STATE_MANAGEMENT.md)**: State management slices design and SessionService timeout rules.
*   **[SKDM Architecture](docs/SKDM_ARCHITECTURE.md)**: Explanation of the 3D visualization model, latency surface, and the data pipeline.
*   **[Database Schema](docs/DB_SCHEMA.md)**: Current mock database structure and planned transition to a real relational database.
*   **[Design System](docs/DESIGN_SYSTEM.md)**: Color palettes, typography, and premium UI guidelines used in this project.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Running Tests

To run the unit and integration tests using Vitest:

```bash
npm run test
```

