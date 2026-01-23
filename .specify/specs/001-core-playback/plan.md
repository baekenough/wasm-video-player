# Technical Plan: Core Playback

**Spec**: 001-core-playback
**Created**: 2026-01-23

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Layer (TypeScript)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │    Player    │  │  WasmBridge  │  │   AudioPlayer    │  │
│  │   (main.ts)  │──│  (binding)   │──│  (Web Audio)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│          │                │                    │            │
│          ▼                ▼                    ▼            │
│  ┌────────────────────────────────────────────────────┐    │
│  │              WebGLRenderer (frame display)          │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │ WASM Binding
┌─────────────────────────────────────────────────────────────┐
│                     WASM Core (Rust)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Demuxer    │──│   Decoder    │──│   FrameBuffer    │  │
│  │ (container)  │  │  (codec)     │  │   (queue)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│          │                                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │              ffmpeg-next (FFmpeg Binding)           │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Module Design

### WASM Core (Rust)

#### `crates/player-core/src/demuxer/mod.rs`
```rust
pub struct Demuxer {
    context: ffmpeg::format::context::Input,
    video_stream_index: usize,
    audio_stream_index: Option<usize>,
}

impl Demuxer {
    pub fn open(data: &[u8]) -> Result<Self, DemuxError>;
    pub fn read_packet(&mut self) -> Option<Packet>;
    pub fn seek(&mut self, timestamp: i64) -> Result<(), SeekError>;
    pub fn video_info(&self) -> VideoInfo;
    pub fn audio_info(&self) -> Option<AudioInfo>;
}
```

#### `crates/player-core/src/decoder/mod.rs`
```rust
pub struct VideoDecoder {
    decoder: ffmpeg::decoder::Video,
}

pub struct AudioDecoder {
    decoder: ffmpeg::decoder::Audio,
}

impl VideoDecoder {
    pub fn new(params: &CodecParameters) -> Result<Self, DecoderError>;
    pub fn decode(&mut self, packet: &Packet) -> Result<Vec<VideoFrame>, DecoderError>;
}

impl AudioDecoder {
    pub fn new(params: &CodecParameters) -> Result<Self, DecoderError>;
    pub fn decode(&mut self, packet: &Packet) -> Result<Vec<AudioFrame>, DecoderError>;
}
```

#### `crates/player-core/src/frame_buffer.rs`
```rust
pub struct FrameBuffer {
    frames: VecDeque<VideoFrame>,
    capacity: usize,
}

impl FrameBuffer {
    pub fn new(capacity: usize) -> Self;
    pub fn push(&mut self, frame: VideoFrame);
    pub fn pop(&mut self) -> Option<VideoFrame>;
    pub fn peek(&self) -> Option<&VideoFrame>;
    pub fn clear(&mut self);
    pub fn len(&self) -> usize;
}
```

### Web Layer (TypeScript)

#### `src/player/Player.ts`
```typescript
export class Player {
  private wasm: WasmBridge;
  private renderer: WebGLRenderer;
  private audio: AudioPlayer;
  private state: PlayerState;

  async load(file: File): Promise<void>;
  play(): void;
  pause(): void;
  seek(time: number): void;
  get currentTime(): number;
  get duration(): number;
  get isPlaying(): boolean;
}
```

#### `src/player/WasmBridge.ts`
```typescript
export class WasmBridge {
  private module: WebAssembly.Module;

  async init(): Promise<void>;
  openFile(data: Uint8Array): VideoHandle;
  readFrame(handle: VideoHandle): Frame | null;
  seek(handle: VideoHandle, timestamp: number): void;
  getVideoInfo(handle: VideoHandle): VideoInfo;
  close(handle: VideoHandle): void;
}
```

#### `src/renderer/WebGLRenderer.ts`
```typescript
export class WebGLRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private texture: WebGLTexture;

  init(canvas: HTMLCanvasElement): void;
  render(frame: VideoFrame): void;
  resize(width: number, height: number): void;
  destroy(): void;
}
```

#### `src/player/AudioPlayer.ts`
```typescript
export class AudioPlayer {
  private context: AudioContext;
  private gainNode: GainNode;

  init(): void;
  play(samples: Float32Array, sampleRate: number): void;
  setVolume(level: number): void;
  mute(): void;
  unmute(): void;
  get currentTime(): number;
}
```

## Data Flow

```
File Selection → Demux → Decode → Buffer → Render
     │            │        │        │        │
     ▼            ▼        ▼        ▼        ▼
  Uint8Array  Packets   Frames   Queue   WebGL
```

### Playback Loop
1. Main loop requests next frame from FrameBuffer
2. If buffer low, demux more packets → decode → push to buffer
3. Render frame to WebGL canvas
4. Send audio samples to Web Audio API
5. Sync video frame display to audio clock

## Dependencies

### Rust (Cargo.toml)
```toml
[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
web-sys = { version = "0.3", features = ["console"] }
ffmpeg-next = "7.0"
```

### TypeScript (package.json)
```json
{
  "devDependencies": {
    "typescript": "^5.0",
    "vite": "^5.0",
    "vitest": "^1.0"
  }
}
```

## Testing Strategy

### Unit Tests (Rust)
- Demuxer: Parse test containers, extract streams
- Decoder: Decode test packets, verify frame output
- FrameBuffer: Queue operations, capacity limits

### Unit Tests (TypeScript)
- Player: State transitions, API correctness
- WebGLRenderer: Shader compilation, frame rendering
- AudioPlayer: Sample playback, sync accuracy

### Integration Tests
- Full pipeline: File → Playback
- Format compatibility: MKV, MP4, AVI, WebM
- Codec support: H.264, HEVC, VP9

## Milestones

1. **M1**: Rust WASM setup, basic demuxer
2. **M2**: Video decoder, frame buffer
3. **M3**: WebGL renderer, frame display
4. **M4**: Audio decoder, Web Audio playback
5. **M5**: A/V sync, play/pause control
6. **M6**: Full format/codec testing
