# WASM Video Player Constitution

## Core Principles

### I. WASM-First Architecture
All performance-critical operations (demuxing, decoding, frame buffering) MUST be implemented in Rust/WASM. JavaScript/TypeScript layer handles only UI, rendering, and WASM binding. No video processing logic in the web layer.

### II. Test-First Development (NON-NEGOTIABLE)
- TDD mandatory: Tests written → Tests fail (Red) → Implement (Green) → Refactor
- Coverage target: **100%** for both Rust and TypeScript
- CI fails if coverage drops below 100%
- No feature merges without full test coverage

### III. Performance-Oriented Design
- **Keyframe Indexing**: Parse keyframe positions on file load for fast seek
- **Bidirectional Buffering**: Pre-decode frames before/after current position
- **Smart Seek**: Jump to nearest keyframe, decode only needed frames
- **Memory Management**: Auto-reduce buffer on memory pressure

### IV. Cross-Platform Compatibility
- Primary target: Web (modern browsers with WASM support)
- Secondary target: Desktop via Tauri (Windows, Mac, Linux)
- Same codebase for both deployments
- No platform-specific hacks in core logic

### V. Simplicity & YAGNI
- Start with core playback, add features incrementally
- No premature optimization without profiling
- Minimal dependencies, prefer standard APIs
- Clear separation: WASM Core / Web Layer / Tauri Shell

## Technology Stack (Fixed)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| WASM Core | Rust + ffmpeg-next + wasm-bindgen | Performance, codec coverage |
| Web UI | TypeScript (Vanilla) + Vite | Simplicity, no framework overhead |
| Rendering | WebGL + Canvas | GPU acceleration |
| Audio | Web Audio API | Browser standard |
| Desktop | Tauri | Lightweight, Rust-based |
| Testing | cargo tarpaulin, vitest, playwright | 100% coverage tooling |

## Quality Gates

### Before Merge
- [ ] All tests pass
- [ ] 100% coverage maintained
- [ ] No new warnings (Rust: `#![deny(warnings)]`, TS: strict mode)
- [ ] Performance benchmarks pass (if applicable)

### Code Standards
- Rust: `cargo fmt`, `cargo clippy` with no warnings
- TypeScript: ESLint + Prettier, strict mode enabled
- Comments: English only, explain "why" not "what"

## Error Handling Policy

| Situation | Response |
|-----------|----------|
| Unsupported codec | Graceful notification, no crash |
| Corrupted file | Play recoverable parts, skip corrupted |
| Decode failure | Skip frame, continue playback |
| Out of memory | Reduce buffer, warn user |
| WASM load failure | Clear error message, no fallback |

## File Structure Convention

```
wasm-video-player/
├── crates/player-core/     # Rust WASM (demuxer, decoder, buffer)
├── src/                    # TypeScript web layer
├── src-tauri/              # Tauri native layer
├── tests/                  # E2E tests
└── .specify/specs/         # Feature specifications
```

## Governance

- This constitution supersedes all other practices
- Amendments require: documentation, justification, migration plan
- All PRs must verify compliance with these principles
- When in doubt, prioritize: Correctness > Performance > Features

**Version**: 1.0.0 | **Ratified**: 2026-01-23
