# Technical Plan: Subtitle Support

**Spec**: 003-subtitle-support
**Created**: 2026-01-23

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                   Subtitle System                        │
├──────────────────────────────────────────────────────────┤
│  External File          Embedded Track                   │
│       │                      │                           │
│       ▼                      ▼                           │
│  ┌──────────┐         ┌──────────────┐                  │
│  │  Parser  │         │   Demuxer    │                  │
│  │ SRT/ASS  │         │ extract sub  │                  │
│  └──────────┘         └──────────────┘                  │
│       │                      │                           │
│       └──────────┬───────────┘                          │
│                  ▼                                       │
│         ┌──────────────┐                                │
│         │ SubtitleTrack │                               │
│         │   entries[]   │                               │
│         └──────────────┘                                │
│                  │                                       │
│                  ▼                                       │
│         ┌──────────────┐      ┌──────────────┐         │
│         │ SubtitleSync │ ────▶│  Renderer    │         │
│         │ (time match) │      │  (overlay)   │         │
│         └──────────────┘      └──────────────┘         │
└──────────────────────────────────────────────────────────┘
```

## Module Design

### WASM Core (Rust)

#### `crates/player-core/src/subtitle/mod.rs`
```rust
pub mod srt;
pub mod ass;

pub struct SubtitleTrack {
    pub format: SubtitleFormat,
    pub language: Option<String>,
    pub entries: Vec<SubtitleEntry>,
}

pub struct SubtitleEntry {
    pub start_time: i64,    // milliseconds
    pub end_time: i64,      // milliseconds
    pub text: String,
    pub style: Option<SubtitleStyle>,  // ASS only
}

pub enum SubtitleFormat {
    Srt,
    Ass,
}

pub trait SubtitleParser {
    fn parse(data: &[u8]) -> Result<SubtitleTrack, ParseError>;
}
```

#### `crates/player-core/src/subtitle/srt.rs`
```rust
pub struct SrtParser;

impl SubtitleParser for SrtParser {
    fn parse(data: &[u8]) -> Result<SubtitleTrack, ParseError> {
        // Parse SRT format:
        // 1
        // 00:00:01,000 --> 00:00:04,000
        // Hello, world!
        //
        // 2
        // ...
    }
}

impl SrtParser {
    fn parse_timestamp(s: &str) -> Result<i64, ParseError>;
    fn detect_encoding(data: &[u8]) -> Encoding;
}
```

#### `crates/player-core/src/subtitle/ass.rs`
```rust
pub struct AssParser;

pub struct SubtitleStyle {
    pub font_name: String,
    pub font_size: u32,
    pub primary_color: Color,
    pub outline_color: Color,
    pub back_color: Color,
    pub bold: bool,
    pub italic: bool,
    pub alignment: Alignment,
    pub margin_l: i32,
    pub margin_r: i32,
    pub margin_v: i32,
}

impl SubtitleParser for AssParser {
    fn parse(data: &[u8]) -> Result<SubtitleTrack, ParseError>;
}

impl AssParser {
    fn parse_style_section(lines: &[&str]) -> Vec<SubtitleStyle>;
    fn parse_events_section(lines: &[&str], styles: &[SubtitleStyle]) -> Vec<SubtitleEntry>;
    fn parse_override_tags(text: &str) -> (String, StyleOverrides);
}
```

### Web Layer (TypeScript)

#### `src/subtitle/SubtitleManager.ts`
```typescript
export class SubtitleManager {
  private tracks: SubtitleTrack[] = [];
  private activeTrack: SubtitleTrack | null = null;
  private timingOffset: number = 0;

  // Load external subtitle file
  async loadFile(file: File): Promise<SubtitleTrack>;

  // Load embedded track from demuxer
  loadEmbedded(track: SubtitleTrack): void;

  // Get active entries for current time
  getActiveEntries(currentTime: number): SubtitleEntry[];

  // Track management
  setActiveTrack(index: number | null): void;
  getTrackList(): SubtitleTrackInfo[];

  // Timing adjustment
  setTimingOffset(ms: number): void;
}
```

#### `src/renderer/SubtitleRenderer.ts`
```typescript
export interface SubtitleRenderOptions {
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  position: 'bottom' | 'top';
}

export class SubtitleRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: SubtitleRenderOptions;

  constructor(canvas: HTMLCanvasElement, options?: Partial<SubtitleRenderOptions>);

  // Render subtitle entries
  render(entries: SubtitleEntry[]): void;

  // Clear subtitle area
  clear(): void;

  // Update options
  setOptions(options: Partial<SubtitleRenderOptions>): void;

  // Handle ASS styling
  private applyAssStyle(entry: SubtitleEntry): void;
  private renderStyledText(text: string, style: SubtitleStyle): void;
}
```

## SRT Format Reference

```
1
00:00:01,000 --> 00:00:04,000
First subtitle line

2
00:00:05,500 --> 00:00:08,000
Second line
with multiple lines

3
00:00:10,000 --> 00:00:12,000
<i>Italic text</i>
```

## ASS Format Reference (Simplified)

```
[Script Info]
Title: Example

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, ...
Style: Default,Arial,20,&H00FFFFFF,...

[Events]
Format: Layer, Start, End, Style, Text
Dialogue: 0,0:00:01.00,0:00:04.00,Default,Hello world
Dialogue: 0,0:00:05.00,0:00:08.00,Default,{\i1}Italic{\i0}
```

## Testing Strategy

### Unit Tests (Rust)
- SRT parser: Valid files, edge cases, encoding detection
- ASS parser: Styles, events, override tags
- Timestamp parsing: Various formats

### Unit Tests (TypeScript)
- SubtitleManager: Track loading, time matching
- SubtitleRenderer: Text positioning, styling

### Integration Tests
- External SRT file loading and display
- External ASS file with styles
- Embedded subtitle extraction
- Timing offset adjustment

## Milestones

1. **M1**: SRT parser in Rust
2. **M2**: ASS parser (basic) in Rust
3. **M3**: SubtitleManager in TypeScript
4. **M4**: SubtitleRenderer with basic styling
5. **M5**: Embedded track extraction
6. **M6**: ASS advanced styling support
