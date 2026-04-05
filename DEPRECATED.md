# DEPRECATED — AI-Content-GTO-Engine

**Status: ARCHIVED — Do not use for new development.**

This repository has been fully superseded by the Smarter-Poker-World-Hub. All useful components have been migrated:

## What moved where

| Original File | New Location in World Hub |
|---|---|
| `src/core/GameLibrary.ts` | `src/config/GameLibrary.ts` |
| `src/orbs/Training/LevelRegistry.ts` | `src/config/LevelRegistry.ts` |
| `src/orbs/Training/MasteryGate.ts` | `src/guards/MasteryGate.ts` |
| `src/core/MasterySealEngine.js` | Merged into `src/guards/MasteryGate.ts` |

## Why deprecated

The core problem: this repo used `Math.random()` for scenario generation and hardcoded fake EV values instead of real solver data. The World Hub already has the correct deterministic engine:

- `src/config/solverRanges.js` — PioSolver-derived GTO data (the source of truth)
- `src/games/SolverScenarioGenerator.js` — Builds scenarios from solver data
- `src/games/ScenarioDatabase.js` — Serves scenarios to the UI

## Files NOT migrated (intentionally discarded)

- `src/core/ScenarioGenerator.js` — Uses Math.random(), produces fake scenarios
- `src/deploy/content-seeder.js` — Seeds with random EV values
- `src/database/training_seed.sql` — Hand-typed fabricated EV values
- `src/core/PokerEngine.ts` — Mock client-side poker state machine
- `src/services/DrillQuestionService.ts` — Had MOCK_SCENARIOS fallback
- `src/core/PioRangeDatabase.ts` — Redundant with solverRanges.js

## Date deprecated

April 2026
