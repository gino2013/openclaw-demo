# Changelog

All notable changes to OpenClaw will be documented in this file.

## [Unreleased]

## [0.1.0] - 2026-03-04

### Added
- `packages/core`: Shared types, `createLogger`, `OpenClawError` hierarchy
- `packages/gateway`: WebSocket Gateway with SSE broadcast and REST `/agents`
- `packages/orchestrator`: Round-robin task routing with timeout + retry
- `packages/sdk`: `OpenClawAgent` base class with auto-reconnect
- `apps/office`: Pokemon pixel-art office dashboard (Pixi.js v8 + Next.js 14)
  - GBA 160×144 native canvas scaled 4×
  - Agent sprites with 6-state animation machine
  - Envelope delegation animations
  - Celebration confetti on task completion
  - HUD bar, Agent panel, Event log
- `apps/example`: Two-agent demo (Developer + Reviewer)
- GitHub Actions CI matrix (Node 18/20/22)
