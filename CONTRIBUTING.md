# Contributing to WASM Video Player

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Development Philosophy

This project follows strict principles defined in our [Constitution](/.specify/memory/constitution.md):

1. **WASM-First Architecture**: Performance-critical code in Rust/WASM
2. **Test-First Development (TDD)**: Tests before implementation, 100% coverage
3. **Simplicity**: Minimal dependencies, clear separation of concerns

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Rust (latest stable)
- wasm-pack

### Setup

```bash
git clone https://github.com/user/wasm-video-player.git
cd wasm-video-player
npm install
npm run wasm:build
npm run dev
```

## Development Workflow

### 1. Pick an Issue

- Check existing issues or create a new one
- Comment to claim the issue

### 2. Create a Branch

```bash
git checkout -b feature/your-feature
# or
git checkout -b fix/your-fix
```

### 3. Follow TDD (Test-Driven Development)

```
1. Write failing test → Red
2. Implement minimum code → Green
3. Refactor → Clean
4. Repeat
```

### 4. Ensure Quality

```bash
# Run tests
npm test

# Check coverage (must be 100%)
npm run test:coverage

# Lint and format
npm run lint
npm run format
```

### 5. Commit

Use conventional commits:

```
feat: add subtitle support
fix: resolve seek issue on keyframe
docs: update README
test: add player unit tests
refactor: simplify decoder logic
```

### 6. Pull Request

- Fill out the PR template
- Ensure all CI checks pass
- Request review

## Code Standards

### TypeScript

- Use strict mode
- No `any` type (use `unknown` if needed)
- Prefer interfaces over types for objects
- Document public APIs with JSDoc

```typescript
/**
 * Seek to a specific timestamp
 * @param timestamp - Target time in seconds
 * @throws Error if not initialized
 */
async seek(timestamp: number): Promise<void> {
  // implementation
}
```

### Rust

- Run `cargo fmt` before commit
- No clippy warnings: `cargo clippy -- -D warnings`
- Use `#![deny(warnings)]` in lib.rs

### CSS

- Use CSS custom properties for theming
- Follow BEM naming convention
- Dark theme is default

## Testing Guidelines

### Unit Tests

- Place tests alongside source files: `Player.test.ts`
- Use descriptive test names
- Test edge cases and error paths

```typescript
describe('Player', () => {
  describe('seek', () => {
    it('should seek to the nearest keyframe', async () => {
      // test
    });

    it('should throw error when not initialized', async () => {
      // test
    });
  });
});
```

### E2E Tests

- Place in `e2e/` directory
- Test user scenarios, not implementation details
- Use Playwright's auto-waiting

```typescript
test('should play video after loading', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('.file-loader input', 'sample.mp4');
  await page.click('[data-testid="play-button"]');
  await expect(page.locator('.player')).toHaveAttribute('data-state', 'playing');
});
```

## Architecture Overview

```
src/
├── main.ts           # Entry point
├── App.ts            # Application orchestration
├── player/           # Core playback
│   ├── Player.ts     # State machine
│   ├── WasmBridge.ts # Decoder abstraction
│   └── Demuxer.ts    # Container parsing
├── renderer/         # Display
├── ui/               # Components
├── input/            # User input
├── settings/         # Preferences
└── subtitle/         # Subtitle handling
```

## Specification-Driven Development

We use Speckit for feature specifications:

```
.specify/specs/
├── 001-core-playback/
│   ├── spec.md       # Feature specification
│   ├── plan.md       # Technical plan
│   └── tasks.md      # Implementation tasks
├── 002-seek-optimization/
├── 003-subtitle-support/
├── 004-ui-controls/
└── 005-settings/
```

When adding a new feature:

1. Create spec in `.specify/specs/XXX-feature-name/spec.md`
2. Get spec approved
3. Create implementation plan
4. Generate tasks
5. Implement with TDD

## Error Handling

| Scenario | Handling |
|----------|----------|
| Unsupported codec | Show notification, don't crash |
| Corrupted file | Play recoverable parts |
| Decode failure | Skip frame, continue |
| Out of memory | Reduce buffer, warn user |

## Performance Considerations

- Profile before optimizing
- Avoid blocking the main thread
- Use `requestAnimationFrame` for rendering
- Batch DOM updates
- Minimize memory allocations in hot paths

## Documentation

- Update README for user-facing changes
- Add JSDoc for public APIs
- Update architecture docs for structural changes
- Keep CHANGELOG updated

## Questions?

- Open an issue for questions
- Join discussions in existing issues
- Check existing documentation first

Thank you for contributing!
