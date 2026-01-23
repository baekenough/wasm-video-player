# Technical Plan: Seek Optimization

**Spec**: 002-seek-optimization
**Created**: 2026-01-23

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Seek System                           │
├──────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │  Keyboard    │───▶│  SeekManager │───▶│  Demuxer  │  │
│  │  Handler     │    │              │    │  .seek()  │  │
│  └──────────────┘    │  - debounce  │    └───────────┘  │
│         ▲            │  - validate  │          │        │
│         │            │  - execute   │          ▼        │
│  ┌──────────────┐    └──────────────┘    ┌───────────┐  │
│  │   Seekbar    │───▶       │           │  Keyframe │  │
│  │   Click/Drag │           │           │  Index    │  │
│  └──────────────┘           ▼           └───────────┘  │
│                    ┌──────────────┐                     │
│                    │ FrameBuffer  │                     │
│                    │  .clear()    │                     │
│                    │  .refill()   │                     │
│                    └──────────────┘                     │
└──────────────────────────────────────────────────────────┘
```

## Module Design

### WASM Core (Rust)

#### `crates/player-core/src/keyframe_index.rs`
```rust
pub struct KeyframeIndex {
    // Sorted list of keyframe positions
    keyframes: Vec<KeyframeEntry>,
}

pub struct KeyframeEntry {
    pub timestamp: i64,      // PTS in time_base units
    pub byte_offset: i64,    // Byte position in file
    pub frame_number: u64,   // Frame index
}

impl KeyframeIndex {
    pub fn build(demuxer: &mut Demuxer) -> Result<Self, IndexError>;
    pub fn find_nearest(&self, timestamp: i64) -> Option<&KeyframeEntry>;
    pub fn find_before(&self, timestamp: i64) -> Option<&KeyframeEntry>;
    pub fn find_after(&self, timestamp: i64) -> Option<&KeyframeEntry>;
}
```

#### Enhanced `demuxer/mod.rs`
```rust
impl Demuxer {
    // Seek to nearest keyframe
    pub fn seek(&mut self, timestamp: i64) -> Result<SeekResult, SeekError> {
        // Use keyframe index for fast lookup
        let keyframe = self.keyframe_index.find_before(timestamp)?;

        // FFmpeg seek to keyframe
        self.context.seek(keyframe.byte_offset, ..)?;

        Ok(SeekResult {
            actual_timestamp: keyframe.timestamp,
            frames_to_skip: self.calculate_skip_frames(keyframe, timestamp),
        })
    }

    fn calculate_skip_frames(&self, keyframe: &KeyframeEntry, target: i64) -> u32;
}
```

### Web Layer (TypeScript)

#### `src/player/SeekManager.ts`
```typescript
export class SeekManager {
  private player: Player;
  private pendingSeek: number | null = null;
  private debounceTimer: number | null = null;

  constructor(player: Player);

  // Seek with debouncing for rapid inputs
  seek(timestamp: number, immediate: boolean = false): void;

  // Relative seek (for keyboard shortcuts)
  seekRelative(delta: number): void;

  // Cancel pending seek
  cancel(): void;

  private executeSeek(timestamp: number): Promise<void>;
  private validateTimestamp(timestamp: number): number;
}
```

#### `src/input/KeyboardHandler.ts`
```typescript
export interface SeekConfig {
  shortInterval: number;  // Default: 10 seconds
  longInterval: number;   // Default: 60 seconds
}

export class KeyboardHandler {
  private seekManager: SeekManager;
  private config: SeekConfig;

  constructor(seekManager: SeekManager, config: SeekConfig);

  attach(element: HTMLElement): void;
  detach(): void;

  private handleKeyDown(event: KeyboardEvent): void;
}
```

#### `src/ui/SeekBar.ts`
```typescript
export class SeekBar {
  private element: HTMLElement;
  private seekManager: SeekManager;
  private isDragging: boolean = false;

  constructor(container: HTMLElement, seekManager: SeekManager);

  setProgress(current: number, total: number): void;
  setBuffered(ranges: TimeRanges): void;

  private handleClick(event: MouseEvent): void;
  private handleDragStart(event: MouseEvent): void;
  private handleDragMove(event: MouseEvent): void;
  private handleDragEnd(event: MouseEvent): void;
  private positionToTime(x: number): number;
}
```

## Seek Algorithm

### Fast Seek Flow
```
1. User requests seek to timestamp T
2. SeekManager validates and debounces
3. Find nearest keyframe K where K.timestamp <= T
4. Demuxer.seek(K.byte_offset)
5. Clear FrameBuffer
6. Decode frames from K to T (skip rendering)
7. Resume normal playback from T
```

### Keyframe Index Building
```
On file open:
1. Scan container for keyframe markers
2. For each keyframe:
   - Record timestamp (PTS)
   - Record byte offset
   - Record frame number
3. Sort by timestamp
4. Store in memory (typically < 1MB for 2hr video)
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Seek latency | < 500ms |
| Keyframe index build | < 1s |
| Memory for index | < 1MB |
| Audio resync | < 100ms |

## Testing Strategy

### Unit Tests (Rust)
- KeyframeIndex: Build, search, edge cases
- Demuxer.seek: Various positions, boundaries

### Unit Tests (TypeScript)
- SeekManager: Debouncing, validation
- KeyboardHandler: Key mapping, modifiers
- SeekBar: Click position calculation

### Integration Tests
- Full seek cycle: request → display
- Rapid seeking: multiple seeks in succession
- Edge cases: seek to start, end, beyond bounds

## Milestones

1. **M1**: KeyframeIndex structure and building
2. **M2**: Enhanced Demuxer.seek with index
3. **M3**: SeekManager with debouncing
4. **M4**: KeyboardHandler integration
5. **M5**: SeekBar UI component
6. **M6**: Performance optimization and testing
