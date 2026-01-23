# WASM Video Player

A high-performance, web-based video player with WebAssembly-powered decoding. Supports FFmpeg-level format coverage with smooth seek performance.

[한국어](./README_ko.md)

## Features

- **Universal Format Support**: Play MKV, AVI, MP4, WebM, and more
- **Multiple Codecs**: H.264, HEVC/H.265, VP9 via FFmpeg.wasm
- **WebCodecs Acceleration**: Hardware-accelerated decoding when available
- **Fast Seeking**: Keyframe-indexed seek with bidirectional buffering
- **Keyboard Controls**: Arrow keys for 5s seek, Shift+Arrow for 60s seek
- **Subtitle Support**: SRT and ASS/SSA formats
- **Modern UI**: Netflix-inspired dark theme with responsive design
- **Cross-Platform**: Web and Desktop (via Tauri)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Tauri Shell                          │
│            (Desktop container, file system access)          │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Web Layer (TypeScript)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ UI Controls │  │  Keyboard   │  │  Subtitle Renderer  │  │
│  │ (Dark Theme)│  │  Handler    │  │  (SRT/ASS)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Video Canvas (WebGL Rendering)              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │ WASM Binding
┌─────────────────────────────────────────────────────────────┐
│                     Decoding Layer                          │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │  WebCodecs API  │  │  FFmpeg.wasm (fallback)         │   │
│  │  (HW Accel)     │  │  (Universal format support)     │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- Rust & wasm-pack (for WASM build)

### Installation

```bash
# Clone the repository
git clone https://github.com/user/wasm-video-player.git
cd wasm-video-player

# Install dependencies
npm install

# Build WASM module
npm run wasm:build

# Start development server
npm run dev
```

Open https://localhost:3002 in your browser.

### Usage

1. **Load Video**: Drag and drop a video file or click to browse
2. **Playback Controls**:
   - `Space`: Play/Pause
   - `←/→`: Seek 5 seconds backward/forward
   - `Shift + ←/→`: Seek 60 seconds backward/forward
   - `↑/↓`: Volume up/down
   - `F`: Toggle fullscreen
   - `M`: Mute/Unmute

## Development

### Project Structure

```
wasm-video-player/
├── src/                    # TypeScript source
│   ├── main.ts             # Entry point
│   ├── App.ts              # Application controller
│   ├── player/             # Playback core
│   │   ├── Player.ts       # Player controller
│   │   ├── WasmBridge.ts   # Decoder bridge
│   │   ├── Demuxer.ts      # Container parsing
│   │   └── WebCodecsDecoder.ts
│   ├── renderer/           # Video rendering
│   │   └── WebGLRenderer.ts
│   ├── ui/                 # UI components
│   │   ├── Controls.ts
│   │   ├── SeekBar.ts
│   │   └── VolumeControl.ts
│   ├── input/              # Input handling
│   │   └── KeyboardHandler.ts
│   ├── settings/           # User settings
│   └── subtitle/           # Subtitle handling
├── crates/player-core/     # Rust WASM (optional)
├── src-tauri/              # Desktop shell
├── e2e/                    # E2E tests
└── .specify/               # Specifications
    ├── memory/
    │   └── constitution.md
    └── specs/
        ├── 001-core-playback/
        ├── 002-seek-optimization/
        ├── 003-subtitle-support/
        ├── 004-ui-controls/
        └── 005-settings/
```

### NPM Scripts

```bash
# Development
npm run dev              # Start dev server (port 3002)
npm run build            # Production build
npm run preview          # Preview production build

# WASM
npm run wasm:build       # Build WASM (release)
npm run wasm:dev         # Build WASM (debug)

# Testing
npm test                 # Run unit tests
npm run test:ui          # Run tests with UI
npm run test:coverage    # Generate coverage report
npm run test:e2e         # Run E2E tests

# Code Quality
npm run lint             # ESLint check
npm run format           # Prettier format
```

### Build for Production

```bash
# Web build
npm run build

# Desktop build (requires Tauri CLI)
npm run tauri build
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Decoding | WebCodecs API, FFmpeg.wasm |
| Demuxing | mp4box.js |
| Rendering | WebGL 2.0, Canvas API |
| Audio | Web Audio API |
| UI | TypeScript (Vanilla), CSS |
| Build | Vite |
| Testing | Vitest, Playwright |
| Desktop | Tauri (optional) |

## Testing

### Unit Tests

```bash
npm test                 # Watch mode
npm run test:coverage    # With coverage report
```

Coverage target: **100%** for both Rust and TypeScript

### E2E Tests

```bash
# Start dev server first
npm run dev

# Run E2E tests
npm run test:e2e
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `←` | Seek -5 seconds |
| `→` | Seek +5 seconds |
| `Shift + ←` | Seek -60 seconds |
| `Shift + →` | Seek +60 seconds |
| `↑` | Volume up |
| `↓` | Volume down |
| `M` | Mute / Unmute |
| `F` | Toggle fullscreen |

## Browser Support

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | 94+ | Full support (WebCodecs) |
| Edge | 94+ | Full support (WebCodecs) |
| Firefox | 130+ | FFmpeg.wasm fallback |
| Safari | 16.4+ | Limited WebCodecs support |

> **Note**: HTTPS is required for SharedArrayBuffer and WebCodecs API.

## Supported Formats

### Containers
- MP4, M4V, MOV
- MKV, WebM
- AVI (via FFmpeg.wasm)

### Video Codecs
- H.264 / AVC
- H.265 / HEVC
- VP9
- AV1 (browser dependent)

### Audio Codecs
- AAC
- MP3
- Opus
- Vorbis

### Subtitles
- SRT
- ASS / SSA

## Configuration

Settings are stored in localStorage and can be customized:

```typescript
interface Settings {
  playback: {
    autoPlay: boolean;
    loop: boolean;
    volume: number;        // 0-1
    muted: boolean;
    playbackRate: number;  // 0.25-2.0
  };
  seek: {
    shortSeek: number;     // seconds (default: 5)
    longSeek: number;      // seconds (default: 60)
  };
  subtitle: {
    enabled: boolean;
    fontSize: number;
    fontColor: string;
    backgroundColor: string;
  };
  ui: {
    theme: 'dark' | 'light';
    controlsAutoHide: boolean;
    controlsHideDelay: number;
  };
}
```

## Design Principles

1. **WASM-First Architecture**: Performance-critical ops in WebAssembly
2. **Test-First Development**: 100% coverage target, TDD workflow
3. **Performance-Oriented**: Keyframe indexing, bidirectional buffering
4. **Cross-Platform**: Same codebase for web and desktop
5. **Simplicity**: Minimal dependencies, no framework overhead

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests first (TDD)
4. Implement the feature
5. Ensure 100% test coverage
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Standards

- TypeScript: ESLint + Prettier, strict mode
- Rust: `cargo fmt`, `cargo clippy`
- Comments: English only, explain "why" not "what"

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

- [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) - FFmpeg for WebAssembly
- [mp4box.js](https://github.com/niclas-niclas/niclas-niclas.github.io) - MP4 parsing
- [Tauri](https://tauri.app/) - Desktop framework
