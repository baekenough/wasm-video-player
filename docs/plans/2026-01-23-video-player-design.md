# WASM Video Player Design

> Created: 2026-01-23
> Status: Approved

## Overview

A high-performance web-based video player with WASM-powered decoding. Supports FFmpeg-level format coverage with smooth seek performance.

## Requirements

### Functional
- Play local video files (MKV, AVI, MP4, WebM, etc.)
- Support codecs: H.264, HEVC/H.265, VP9, and more
- Subtitle support: SRT, ASS/SSA
- Keyboard seek: Arrow keys (10s), Shift+Arrow (1min), customizable
- Volume control, fullscreen toggle

### Non-Functional
- Smooth playback performance
- Fast seek with keyframe indexing
- Cross-platform: Windows, Mac, Linux
- Dual deployment: Web + Desktop (Tauri)
- Test coverage: 100%

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Tauri Shell                          │
│  (Desktop container, file system access)                    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Web Layer (TypeScript)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ UI Controls │  │  Keyboard   │  │  Subtitle Renderer  │  │
│  │ (Dark Theme)│  │  Handler    │  │  (SRT/ASS)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Video Canvas (WebGL Rendering)            │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │ WASM Binding
┌─────────────────────────────────────────────────────────────┐
│                     WASM Core (Rust)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Demuxer    │  │  Decoder    │  │  Frame Buffer       │  │
│  │ (Container  │→ │ (H.264/265  │→ │ (Decoded frame      │  │
│  │  parsing)   │  │  HEVC, etc) │  │  management)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           ffmpeg-next (FFmpeg Rust Binding)          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow (Playback Pipeline)

```
File Selection              Decoding                    Rendering
────────────────────────────────────────────────────────────────

[Open File]
     │
     ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Tauri   │    │  WASM    │    │  WASM    │    │  WebGL   │
│  File    │───▶│ Demuxer  │───▶│ Decoder  │───▶│ Canvas   │
│  Read    │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │               │               │
                     ▼               ▼               ▼
              Video/Audio      YUV Frames      RGB Texture
              Packet Split     Decoding        GPU Render

                                    │
                     ┌──────────────┴──────────────┐
                     ▼                             ▼
              ┌──────────┐                  ┌──────────┐
              │  Audio   │                  │  Frame   │
              │  Context │                  │  Queue   │
              │(Web Audio)│                 │(Buffering)│
              └──────────┘                  └──────────┘
```

### Seek Optimization Strategy
- **Keyframe Indexing**: Parse keyframe positions on file load
- **Bidirectional Buffer**: Pre-decode frames before/after current position
- **Smart Seek**: Jump to nearest keyframe, decode only needed frames

### Seek Shortcuts
| Key | Action | Default | Customizable |
|-----|--------|---------|--------------|
| ←/→ | Seek backward/forward | 10 seconds | Yes |
| Shift + ←/→ | Large seek | 1 minute | Yes |

## Components

### WASM Core (Rust)

| Module | Role |
|--------|------|
| `demuxer` | Container parsing (MKV, AVI, MP4, etc.), stream separation |
| `decoder` | Video/audio codec decoding (H.264, HEVC, VP9, etc.) |
| `frame_buffer` | Decoded frame queue management, memory optimization |
| `keyframe_index` | Keyframe position indexing, fast seek support |
| `subtitle_parser` | SRT/ASS parsing in WASM |

### Web Layer (TypeScript)

| Module | Role |
|--------|------|
| `Player` | Main player class, WASM init and control |
| `Renderer` | WebGL-based frame rendering |
| `AudioPlayer` | Audio playback via Web Audio API, sync |
| `Controls` | Play/pause, seekbar, volume UI |
| `KeyboardHandler` | Shortcut handling, custom key bindings |
| `SubtitleRenderer` | Subtitle overlay on canvas |
| `Settings` | User settings (seek time, theme, etc.) storage |

### Tauri Layer

| Module | Role |
|--------|------|
| `file_handler` | File dialog, file reading |
| `window_manager` | Fullscreen, window size management |
| `config_store` | Settings file save/load (JSON) |

## UI Design (Modern Dark Theme)

```
┌─────────────────────────────────────────────────────────────┐
│ ■ ◆ ●                    filename.mkv                  ─ □ ✕│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                      [Video Area]                           │
│                                                             │
│                                                             │
│                    ┌─────────────────┐                      │
│                    │  Subtitle Area  │                      │
│                    └─────────────────┘                      │
├─────────────────────────────────────────────────────────────┤
│  ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━○          │
├─────────────────────────────────────────────────────────────┤
│  ⏮  ⏪  ▶  ⏩  ⏭    00:15:32 / 02:14:08    🔊━━━  ⚙  ⛶  │
└─────────────────────────────────────────────────────────────┘
```

### Control Bar Elements
- ⏮ Previous file (when playlist exists)
- ⏪ 10s backward
- ▶/⏸ Play/Pause
- ⏩ 10s forward
- ⏭ Next file
- 🔊 Volume slider
- ⚙ Settings (seek time, subtitles, etc.)
- ⛶ Fullscreen

### Behavior
- Control bar shows on mouse move, auto-hide after 3s
- Seekbar hover shows thumbnail preview
- Double-click: Fullscreen toggle
- Spacebar: Play/Pause

### Color Palette
| Element | Color |
|---------|-------|
| Background | #0d0d0d (near black) |
| Surface | #1a1a1a (control bar) |
| Accent | #e50914 (progress bar, highlights) |
| Text | #ffffff (primary) |
| Secondary | #808080 (inactive) |

## Error Handling

| Situation | Response |
|-----------|----------|
| Unsupported codec | Toast notification + codec info |
| Corrupted file | Play recoverable parts, skip option |
| Decode failure | Skip frame, jump to next keyframe |
| Out of memory | Auto-reduce buffer, show warning |
| Subtitle parse error | Continue without subtitles, notify |
| WASM load failure | Clear error message (no fallback) |

## Testing Strategy (Speckit-based)

### Speckit Workflow

```
.specify/
├── memory/
│   └── constitution.md              # Project principles
├── specs/
│   ├── 001-core-playback/
│   │   ├── spec.md                  # Playback spec
│   │   ├── plan.md                  # Technical plan
│   │   ├── tasks.md                 # Implementation tasks
│   │   └── data-model.md            # Data structures
│   ├── 002-seek-optimization/
│   ├── 003-subtitle-support/
│   ├── 004-ui-controls/
│   └── 005-settings/
└── templates/
```

### Coverage Target: 100%

| Layer | Tool | Target |
|-------|------|--------|
| Rust (WASM) | `cargo tarpaulin` | 100% |
| TypeScript | `vitest --coverage` | 100% |
| E2E | `playwright` | Core scenarios |

### TDD Flow (per speckit.tasks)
1. Define spec → `/speckit.specify`
2. Generate tasks → `/speckit.tasks` (tests first)
3. Write tests (Red)
4. Implement (Green)
5. Refactor
6. Verify coverage

### CI Coverage Enforcement
```yaml
coverage:
  rust: 100%
  typescript: 100%
  fail_under: true  # Fail build if not met
```

## Project Structure

```
wasm-video-player/
├── .specify/                        # Speckit specs
│   ├── memory/
│   │   └── constitution.md
│   └── specs/
│       └── ...
│
├── crates/                          # Rust WASM core
│   └── player-core/
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs               # WASM entry point
│           ├── demuxer/             # Container parsing
│           │   ├── mod.rs
│           │   ├── mkv.rs
│           │   ├── avi.rs
│           │   └── mp4.rs
│           ├── decoder/             # Codec decoding
│           │   ├── mod.rs
│           │   ├── h264.rs
│           │   ├── hevc.rs
│           │   └── vp9.rs
│           ├── frame_buffer.rs      # Frame buffer management
│           ├── keyframe_index.rs    # Keyframe indexing
│           └── subtitle/            # Subtitle parser
│               ├── mod.rs
│               ├── srt.rs
│               └── ass.rs
│
├── src/                             # TypeScript web layer
│   ├── main.ts                      # App entry point
│   ├── player/
│   │   ├── Player.ts                # Main player
│   │   ├── WasmBridge.ts            # WASM binding
│   │   └── AudioPlayer.ts           # Web Audio
│   ├── renderer/
│   │   ├── WebGLRenderer.ts         # WebGL rendering
│   │   └── SubtitleRenderer.ts      # Subtitle overlay
│   ├── ui/
│   │   ├── Controls.ts              # Control bar
│   │   ├── SeekBar.ts               # Seekbar
│   │   └── SettingsPanel.ts         # Settings panel
│   ├── input/
│   │   └── KeyboardHandler.ts       # Shortcuts
│   ├── settings/
│   │   └── Settings.ts              # User settings
│   └── styles/
│       └── dark-theme.css           # Dark theme
│
├── src-tauri/                       # Tauri native
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs
│       ├── file_handler.rs          # File system
│       └── config_store.rs          # Config storage
│
├── tests/                           # E2E tests
│   └── e2e/
│       └── playback.spec.ts
│
├── package.json
├── vite.config.ts
├── tauri.conf.json
└── README.md
```

## Build Commands

```bash
# Development
pnpm dev              # Web dev server
pnpm tauri dev        # Tauri development

# Build
pnpm build            # Web build
pnpm tauri build      # Desktop build (Win/Mac/Linux)

# Test
cargo test            # Rust tests
pnpm test             # TS tests
pnpm test:e2e         # E2E tests
pnpm test:coverage    # Coverage report
```

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| WASM Core | Rust + ffmpeg-next + wasm-bindgen |
| Web UI | TypeScript (Vanilla) + Vite |
| Rendering | WebGL + Canvas |
| Audio | Web Audio API |
| Desktop | Tauri |
| Testing | cargo tarpaulin, vitest, playwright |
| Spec Management | Speckit |

## Next Steps

1. Initialize project with `specify init`
2. Define constitution (`/speckit.constitution`)
3. Create specs for each feature (`/speckit.specify`)
4. Generate and execute tasks (`/speckit.tasks`, `/speckit.implement`)
