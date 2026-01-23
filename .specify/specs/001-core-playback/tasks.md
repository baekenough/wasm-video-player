# Tasks: Core Playback

**Spec**: 001-core-playback
**Created**: 2026-01-23

## Task Overview

| ID | Task | Priority | Status |
|----|------|----------|--------|
| T001 | Setup Rust WASM project | P0 | Deferred |
| T002 | Implement Demuxer | P1 | Completed (WebCodecs) |
| T003 | Implement VideoDecoder | P1 | Completed (WebCodecs) |
| T004 | Implement AudioDecoder | P1 | Completed (WebCodecs) |
| T005 | Implement FrameBuffer | P1 | Completed |
| T006 | Setup TypeScript project | P0 | Completed |
| T007 | Implement WasmBridge | P1 | Completed |
| T008 | Implement WebGLRenderer | P1 | Completed |
| T009 | Implement AudioPlayer | P1 | Completed |
| T010 | Implement Player class | P1 | Completed |
| T011 | Integration testing | P2 | In Progress |

## Changelog

### 2026-01-23 - Seek and Volume Bug Fixes
- **Fixed**: Seek always going to 0:00 - Removed `demuxer.start()` call after seek; mp4box.seek() alone repositions extraction
- **Fixed**: Play not resuming after pause - Added `needsSampleReload()` check and `reloadSamples()` method
- **Fixed**: Decoder state after seek - Changed from `reset()` to `flush()` to keep decoder configured
- **Fixed**: Race condition in seek - Added `stopPlaybackLoop()` before seek operations
- **Fixed**: Volume UI not updating on keyboard shortcuts - Added `volumechange` event handler to Controls

### Implementation Notes
- WebCodecs backend is primary; Rust WASM deferred for future enhancement
- Using mp4box.js for MP4 container demuxing
- WebCodecs VideoDecoder for hardware-accelerated decoding

---

## T001: Setup Rust WASM project

**Priority**: P0 (Blocker)
**Estimate**: Foundation task

### Description
Initialize Rust crate with wasm-bindgen and ffmpeg-next dependencies.

### Acceptance Criteria
- [ ] `crates/player-core/Cargo.toml` exists with correct dependencies
- [ ] `wasm-pack build` succeeds
- [ ] Basic WASM export works from TypeScript

### Test First (TDD)
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wasm_module_loads() {
        // Verify module can be instantiated
        assert!(true); // Placeholder until actual test
    }
}
```

---

## T002: Implement Demuxer

**Priority**: P1
**Depends on**: T001

### Description
Container parser using ffmpeg-next to extract video/audio streams.

### Acceptance Criteria
- [ ] Opens MKV, MP4, AVI, WebM containers
- [ ] Extracts video stream info (codec, resolution, framerate)
- [ ] Extracts audio stream info (codec, sample rate, channels)
- [ ] Reads packets sequentially
- [ ] 100% test coverage

### Test First (TDD)
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn opens_mkv_container() {
        let data = include_bytes!("../testdata/sample.mkv");
        let demuxer = Demuxer::open(data).unwrap();
        assert!(demuxer.video_info().codec == "h264");
    }

    #[test]
    fn opens_mp4_container() {
        let data = include_bytes!("../testdata/sample.mp4");
        let demuxer = Demuxer::open(data).unwrap();
        assert!(demuxer.video_info().width > 0);
    }

    #[test]
    fn reads_packets_sequentially() {
        let data = include_bytes!("../testdata/sample.mkv");
        let mut demuxer = Demuxer::open(data).unwrap();
        let packet = demuxer.read_packet();
        assert!(packet.is_some());
    }

    #[test]
    fn returns_none_at_eof() {
        // Read until EOF
    }
}
```

---

## T003: Implement VideoDecoder

**Priority**: P1
**Depends on**: T001

### Description
Video codec decoder for H.264, HEVC, VP9.

### Acceptance Criteria
- [ ] Decodes H.264 packets to YUV frames
- [ ] Decodes HEVC packets to YUV frames
- [ ] Decodes VP9 packets to YUV frames
- [ ] Handles decode errors gracefully
- [ ] 100% test coverage

### Test First (TDD)
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_h264_packet() {
        let decoder = VideoDecoder::new(&h264_params()).unwrap();
        let frames = decoder.decode(&h264_packet()).unwrap();
        assert!(!frames.is_empty());
    }

    #[test]
    fn decodes_hevc_packet() {
        let decoder = VideoDecoder::new(&hevc_params()).unwrap();
        let frames = decoder.decode(&hevc_packet()).unwrap();
        assert!(!frames.is_empty());
    }

    #[test]
    fn handles_corrupted_packet() {
        let decoder = VideoDecoder::new(&h264_params()).unwrap();
        let result = decoder.decode(&corrupted_packet());
        assert!(result.is_err() || result.unwrap().is_empty());
    }
}
```

---

## T004: Implement AudioDecoder

**Priority**: P1
**Depends on**: T001

### Description
Audio codec decoder for AAC, MP3, Opus, FLAC.

### Acceptance Criteria
- [ ] Decodes AAC packets to PCM samples
- [ ] Decodes MP3 packets to PCM samples
- [ ] Decodes Opus packets to PCM samples
- [ ] Handles decode errors gracefully
- [ ] 100% test coverage

### Test First (TDD)
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_aac_packet() {
        let decoder = AudioDecoder::new(&aac_params()).unwrap();
        let frames = decoder.decode(&aac_packet()).unwrap();
        assert!(!frames.is_empty());
    }

    #[test]
    fn output_is_pcm_float() {
        let decoder = AudioDecoder::new(&aac_params()).unwrap();
        let frames = decoder.decode(&aac_packet()).unwrap();
        assert_eq!(frames[0].format, SampleFormat::F32);
    }
}
```

---

## T005: Implement FrameBuffer

**Priority**: P1
**Depends on**: T003

### Description
Queue for decoded frames with capacity management.

### Acceptance Criteria
- [ ] Push/pop operations work correctly
- [ ] Respects capacity limit
- [ ] Clear operation works
- [ ] Thread-safe (if needed)
- [ ] 100% test coverage

### Test First (TDD)
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn push_pop_fifo() {
        let mut buffer = FrameBuffer::new(10);
        buffer.push(frame(1));
        buffer.push(frame(2));
        assert_eq!(buffer.pop().unwrap().pts, 1);
        assert_eq!(buffer.pop().unwrap().pts, 2);
    }

    #[test]
    fn respects_capacity() {
        let mut buffer = FrameBuffer::new(2);
        buffer.push(frame(1));
        buffer.push(frame(2));
        buffer.push(frame(3)); // Should drop oldest
        assert_eq!(buffer.len(), 2);
    }

    #[test]
    fn clear_empties_buffer() {
        let mut buffer = FrameBuffer::new(10);
        buffer.push(frame(1));
        buffer.clear();
        assert!(buffer.is_empty());
    }
}
```

---

## T006: Setup TypeScript project

**Priority**: P0 (Blocker)
**Parallel with**: T001

### Description
Initialize TypeScript project with Vite and Vitest.

### Acceptance Criteria
- [ ] `package.json` with dependencies
- [ ] `vite.config.ts` configured
- [ ] `vitest.config.ts` configured
- [ ] `pnpm dev` starts dev server
- [ ] `pnpm test` runs tests

### Test First (TDD)
```typescript
// src/main.test.ts
import { describe, it, expect } from 'vitest';

describe('Project Setup', () => {
  it('vitest works', () => {
    expect(1 + 1).toBe(2);
  });
});
```

---

## T007: Implement WasmBridge

**Priority**: P1
**Depends on**: T001, T006

### Description
TypeScript binding to WASM module.

### Acceptance Criteria
- [ ] Loads WASM module
- [ ] Exposes openFile, readFrame, seek, close
- [ ] Handles WASM errors gracefully
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { WasmBridge } from './WasmBridge';

describe('WasmBridge', () => {
  let bridge: WasmBridge;

  beforeAll(async () => {
    bridge = new WasmBridge();
    await bridge.init();
  });

  it('loads wasm module', () => {
    expect(bridge.isReady()).toBe(true);
  });

  it('opens video file', async () => {
    const handle = bridge.openFile(testVideoData);
    expect(handle).toBeDefined();
  });

  it('reads frames', () => {
    const handle = bridge.openFile(testVideoData);
    const frame = bridge.readFrame(handle);
    expect(frame).not.toBeNull();
  });
});
```

---

## T008: Implement WebGLRenderer

**Priority**: P1
**Depends on**: T006

### Description
WebGL-based frame renderer for YUV to RGB conversion and display.

### Acceptance Criteria
- [ ] Initializes WebGL context
- [ ] Compiles YUV→RGB shader
- [ ] Renders frame to canvas
- [ ] Handles resize
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect } from 'vitest';
import { WebGLRenderer } from './WebGLRenderer';

describe('WebGLRenderer', () => {
  it('initializes webgl context', () => {
    const canvas = document.createElement('canvas');
    const renderer = new WebGLRenderer();
    renderer.init(canvas);
    expect(renderer.isReady()).toBe(true);
  });

  it('renders frame without error', () => {
    const renderer = createRenderer();
    expect(() => renderer.render(testFrame)).not.toThrow();
  });

  it('handles resize', () => {
    const renderer = createRenderer();
    renderer.resize(1920, 1080);
    // Verify viewport updated
  });
});
```

---

## T009: Implement AudioPlayer

**Priority**: P1
**Depends on**: T006

### Description
Web Audio API wrapper for audio playback and sync.

### Acceptance Criteria
- [ ] Initializes AudioContext
- [ ] Plays PCM samples
- [ ] Volume control works
- [ ] Mute/unmute works
- [ ] Returns current playback time
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect } from 'vitest';
import { AudioPlayer } from './AudioPlayer';

describe('AudioPlayer', () => {
  it('initializes audio context', () => {
    const player = new AudioPlayer();
    player.init();
    expect(player.isReady()).toBe(true);
  });

  it('volume control works', () => {
    const player = createAudioPlayer();
    player.setVolume(0.5);
    expect(player.getVolume()).toBe(0.5);
  });

  it('mute sets volume to zero', () => {
    const player = createAudioPlayer();
    player.setVolume(0.8);
    player.mute();
    expect(player.getVolume()).toBe(0);
  });

  it('unmute restores previous volume', () => {
    const player = createAudioPlayer();
    player.setVolume(0.8);
    player.mute();
    player.unmute();
    expect(player.getVolume()).toBe(0.8);
  });
});
```

---

## T010: Implement Player class

**Priority**: P1
**Depends on**: T007, T008, T009

### Description
Main player class coordinating all components.

### Acceptance Criteria
- [ ] load() opens file and initializes
- [ ] play() starts playback loop
- [ ] pause() stops playback
- [ ] A/V sync maintained
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect } from 'vitest';
import { Player } from './Player';

describe('Player', () => {
  it('loads video file', async () => {
    const player = new Player(canvas);
    await player.load(testFile);
    expect(player.duration).toBeGreaterThan(0);
  });

  it('play starts playback', async () => {
    const player = await createLoadedPlayer();
    player.play();
    expect(player.isPlaying).toBe(true);
  });

  it('pause stops playback', async () => {
    const player = await createLoadedPlayer();
    player.play();
    player.pause();
    expect(player.isPlaying).toBe(false);
  });

  it('currentTime updates during playback', async () => {
    const player = await createLoadedPlayer();
    player.play();
    await sleep(100);
    expect(player.currentTime).toBeGreaterThan(0);
  });
});
```

---

## T011: Integration testing

**Priority**: P2
**Depends on**: T010

### Description
End-to-end tests for full playback pipeline.

### Acceptance Criteria
- [ ] MKV file plays correctly
- [ ] MP4 file plays correctly
- [ ] AVI file plays correctly
- [ ] WebM file plays correctly
- [ ] Audio syncs with video
- [ ] Play/pause works correctly

### Tests
```typescript
import { test, expect } from '@playwright/test';

test('plays MKV file', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles('testdata/sample.mkv');
  await expect(page.locator('video-player')).toHaveAttribute('data-playing', 'true');
});

test('audio syncs with video', async ({ page }) => {
  // Load video, play, check sync
});
```

---

## Dependency Graph

```
T001 (Rust Setup) ─────┬──▶ T002 (Demuxer)
                       ├──▶ T003 (VideoDecoder) ──▶ T005 (FrameBuffer)
                       └──▶ T004 (AudioDecoder)
                                    │
T006 (TS Setup) ───────┬──▶ T007 (WasmBridge) ◀───┘
                       ├──▶ T008 (WebGLRenderer)
                       └──▶ T009 (AudioPlayer)
                                    │
                                    ▼
                            T010 (Player) ──▶ T011 (Integration)
```
