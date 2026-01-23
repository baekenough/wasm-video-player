# Documentation

This directory contains technical documentation for the WASM Video Player project.

## Contents

### Architecture & Design

- [Design Document](./plans/2026-01-23-video-player-design.md) - Overall system design and architecture

### Specifications

All feature specifications are managed via Speckit in the `.specify/` directory:

```
.specify/
├── memory/
│   └── constitution.md        # Project principles and governance
└── specs/
    ├── 001-core-playback/     # Core video playback
    ├── 002-seek-optimization/ # Seek performance
    ├── 003-subtitle-support/  # Subtitle rendering
    ├── 004-ui-controls/       # User interface
    └── 005-settings/          # User settings
```

### Quick Links

| Document | Description |
|----------|-------------|
| [README](../README.md) | Project overview and quick start |
| [Contributing](../CONTRIBUTING.md) | Contribution guidelines |
| [Changelog](../CHANGELOG.md) | Version history |
| [Constitution](../.specify/memory/constitution.md) | Core principles |

## Architecture Overview

```
┌─────────────────────────────────────────┐
│           Web/Desktop UI                │
│  (TypeScript, Dark Theme, Responsive)   │
├─────────────────────────────────────────┤
│         Player Controller               │
│    (State Machine, Event Handling)      │
├─────────────────────────────────────────┤
│      Decoder Bridge (WasmBridge)        │
│  ┌─────────────┬────────────────────┐   │
│  │ WebCodecs   │   FFmpeg.wasm      │   │
│  │ (HW Accel)  │   (Fallback)       │   │
│  └─────────────┴────────────────────┘   │
├─────────────────────────────────────────┤
│         Rendering (WebGL)               │
│    (GPU Accelerated Frame Display)      │
└─────────────────────────────────────────┘
```

## Data Flow

```
File → Demuxer → Decoder → Frame Buffer → WebGL Renderer → Canvas
                    ↓
              Audio Decoder → Web Audio API → Speaker
```

## Module Overview

| Module | Path | Description |
|--------|------|-------------|
| App | `src/App.ts` | Application orchestration |
| Player | `src/player/Player.ts` | Playback state machine |
| WasmBridge | `src/player/WasmBridge.ts` | Decoder abstraction |
| Demuxer | `src/player/Demuxer.ts` | Container parsing (mp4box) |
| WebCodecsDecoder | `src/player/WebCodecsDecoder.ts` | Hardware decoding |
| FFmpegDecoder | `src/player/FFmpegDecoder.ts` | FFmpeg.wasm fallback |
| WebGLRenderer | `src/renderer/WebGLRenderer.ts` | GPU rendering |
| KeyboardHandler | `src/input/KeyboardHandler.ts` | Shortcuts |
| Settings | `src/settings/Settings.ts` | User preferences |

## Testing Strategy

| Layer | Tool | Target |
|-------|------|--------|
| Unit (TypeScript) | Vitest | 100% coverage |
| Unit (Rust) | cargo test | 100% coverage |
| E2E | Playwright | Core scenarios |

## Development Commands

```bash
# Documentation
npm run docs        # Generate API docs (if configured)

# Development
npm run dev         # Start dev server
npm test           # Run tests

# Build
npm run build      # Production build
```
