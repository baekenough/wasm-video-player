# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project structure with TypeScript and Vite
- WebCodecs-based video decoding with hardware acceleration
- FFmpeg.wasm fallback for unsupported formats
- mp4box.js integration for MP4 container parsing
- WebGL-based video rendering
- Web Audio API integration for audio playback
- Keyboard controls (Arrow keys for seek, Space for play/pause)
- Dark theme UI inspired by Netflix
- Three-panel layout (timeline, player, file browser)
- Settings system with LocalStorage persistence
- Subtitle support infrastructure (SRT, ASS/SSA)
- Comprehensive unit test suite with Vitest
- E2E test suite with Playwright
- Speckit-based specification management

### Fixed
- Seek timestamp unit mismatch causing playback to restart at 0:00
- Frame queue synchronization during seek operations
- Volume control UI responsiveness

### Technical
- WASM-first architecture for performance-critical operations
- 100% test coverage target enforced
- Constitution document defining project principles
- Five feature specifications created:
  - 001-core-playback
  - 002-seek-optimization
  - 003-subtitle-support
  - 004-ui-controls
  - 005-settings

## [0.1.0] - 2026-01-23

### Added
- Initial release
- Basic video playback functionality
- File drag-and-drop support
- Playback controls (play, pause, seek)
- Volume control
- Fullscreen support
- Keyboard shortcuts

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 0.1.0 | 2026-01-23 | Initial release with core playback |

## Roadmap

### v0.2.0 (Planned)
- [ ] Complete subtitle rendering (SRT, ASS)
- [ ] Timeline thumbnail preview
- [ ] Playlist support
- [ ] Improved seek performance with keyframe indexing

### v0.3.0 (Planned)
- [ ] Tauri desktop build
- [ ] Cross-platform file system access
- [ ] Settings export/import

### v1.0.0 (Planned)
- [ ] Stable API
- [ ] Full documentation
- [ ] Performance benchmarks
- [ ] Production-ready builds
