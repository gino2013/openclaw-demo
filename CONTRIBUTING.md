# Contributing to OpenClaw

Thank you for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/your-org/openclaw.git
cd openclaw
pnpm install
cp .env.example .env.local
pnpm build
```

## Running in Dev Mode

```bash
# All packages (watch mode)
pnpm dev

# Specific package
pnpm --filter gateway dev
pnpm --filter office dev
```

## Code Style

- TypeScript strict mode — no `any`
- Prettier + ESLint enforced (run `pnpm lint`)
- All public API methods must have JSDoc comments
- Errors via `OpenClawError` subclasses only

## Pull Request Process

1. Fork and create a branch from `develop`
2. Make your changes with tests
3. Run `pnpm lint && pnpm typecheck && pnpm build`
4. Open a PR against `develop`

## Sprite Art Guidelines

When contributing pixel art sprites:
- 16×16 px tile size
- ≤8 colors per tile
- No gradients — flat pixel colors only
- Export as PNG spritesheet (matching existing layout)
