# Tasks: Subtitle Support

**Spec**: 003-subtitle-support
**Created**: 2026-01-23

## Task Overview

| ID | Task | Priority | Status |
|----|------|----------|--------|
| T001 | Implement SRT Parser | P1 | Pending |
| T002 | Implement ASS Parser | P2 | Pending |
| T003 | Implement SubtitleManager | P1 | Pending |
| T004 | Implement SubtitleRenderer | P1 | Pending |
| T005 | Embedded subtitle extraction | P2 | Pending |
| T006 | Integration testing | P2 | Pending |

---

## T001: Implement SRT Parser

**Priority**: P1

### Description
Parse SRT subtitle format in Rust/WASM.

### Acceptance Criteria
- [ ] Parses standard SRT format
- [ ] Handles multi-line entries
- [ ] Detects UTF-8 and common encodings
- [ ] Handles basic HTML tags (<i>, <b>)
- [ ] Gracefully handles malformed entries
- [ ] 100% test coverage

### Test First (TDD)
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_basic_srt() {
        let srt = r#"
1
00:00:01,000 --> 00:00:04,000
Hello, world!

2
00:00:05,500 --> 00:00:08,000
Second subtitle
"#;
        let track = SrtParser::parse(srt.as_bytes()).unwrap();
        assert_eq!(track.entries.len(), 2);
        assert_eq!(track.entries[0].text, "Hello, world!");
    }

    #[test]
    fn parses_multiline_entry() {
        let srt = r#"
1
00:00:01,000 --> 00:00:04,000
Line one
Line two
"#;
        let track = SrtParser::parse(srt.as_bytes()).unwrap();
        assert_eq!(track.entries[0].text, "Line one\nLine two");
    }

    #[test]
    fn parses_timestamp_correctly() {
        let srt = r#"
1
01:23:45,678 --> 02:34:56,789
Text
"#;
        let track = SrtParser::parse(srt.as_bytes()).unwrap();
        assert_eq!(track.entries[0].start_time, 5025678); // ms
        assert_eq!(track.entries[0].end_time, 9296789);   // ms
    }

    #[test]
    fn handles_html_tags() {
        let srt = r#"
1
00:00:01,000 --> 00:00:04,000
<i>Italic</i> and <b>bold</b>
"#;
        let track = SrtParser::parse(srt.as_bytes()).unwrap();
        // Tags preserved for renderer
        assert!(track.entries[0].text.contains("<i>"));
    }

    #[test]
    fn skips_malformed_entries() {
        let srt = r#"
1
00:00:01,000 --> 00:00:04,000
Valid entry

invalid timestamp
No timestamp here

2
00:00:05,000 --> 00:00:08,000
Another valid
"#;
        let track = SrtParser::parse(srt.as_bytes()).unwrap();
        assert_eq!(track.entries.len(), 2);
    }
}
```

---

## T002: Implement ASS Parser

**Priority**: P2
**Depends on**: T001

### Description
Parse ASS/SSA subtitle format with style support.

### Acceptance Criteria
- [ ] Parses [Script Info] section
- [ ] Parses [V4+ Styles] section
- [ ] Parses [Events] section
- [ ] Handles basic override tags ({\i1}, {\b1}, etc.)
- [ ] Maps styles to entries
- [ ] 100% test coverage

### Test First (TDD)
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_basic_ass() {
        let ass = r#"
[Script Info]
Title: Test

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour
Style: Default,Arial,20,&H00FFFFFF

[Events]
Format: Layer, Start, End, Style, Text
Dialogue: 0,0:00:01.00,0:00:04.00,Default,Hello world
"#;
        let track = AssParser::parse(ass.as_bytes()).unwrap();
        assert_eq!(track.entries.len(), 1);
        assert_eq!(track.entries[0].text, "Hello world");
    }

    #[test]
    fn parses_styles() {
        let ass = create_ass_with_style("TestStyle", "Arial", 24, "#FFFFFF");
        let track = AssParser::parse(ass.as_bytes()).unwrap();
        let style = &track.entries[0].style.as_ref().unwrap();
        assert_eq!(style.font_name, "Arial");
        assert_eq!(style.font_size, 24);
    }

    #[test]
    fn parses_override_tags() {
        let ass = create_ass_with_text(r"{\i1}Italic{\i0} normal");
        let track = AssParser::parse(ass.as_bytes()).unwrap();
        // Override tags should be parsed
        assert!(track.entries[0].text.contains("Italic"));
    }

    #[test]
    fn parses_timestamp() {
        let ass = create_ass_with_timing("1:23:45.67", "2:34:56.78");
        let track = AssParser::parse(ass.as_bytes()).unwrap();
        assert_eq!(track.entries[0].start_time, 5025670); // ms
    }
}
```

---

## T003: Implement SubtitleManager

**Priority**: P1
**Depends on**: T001

### Description
TypeScript manager for subtitle tracks and time-based lookup.

### Acceptance Criteria
- [ ] Loads external subtitle files
- [ ] Manages multiple tracks
- [ ] Returns active entries for current time
- [ ] Supports timing offset
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect } from 'vitest';
import { SubtitleManager } from './SubtitleManager';

describe('SubtitleManager', () => {
  it('loads external SRT file', async () => {
    const manager = new SubtitleManager();
    const file = new File([srtContent], 'test.srt');

    const track = await manager.loadFile(file);

    expect(track.entries.length).toBeGreaterThan(0);
  });

  it('gets active entries for current time', () => {
    const manager = new SubtitleManager();
    manager.loadTrack(createTrack([
      { start: 1000, end: 4000, text: 'First' },
      { start: 5000, end: 8000, text: 'Second' },
    ]));

    const entries = manager.getActiveEntries(2000);

    expect(entries).toHaveLength(1);
    expect(entries[0].text).toBe('First');
  });

  it('returns empty when no active subtitle', () => {
    const manager = new SubtitleManager();
    manager.loadTrack(createTrack([
      { start: 1000, end: 4000, text: 'First' },
    ]));

    const entries = manager.getActiveEntries(5000);

    expect(entries).toHaveLength(0);
  });

  it('applies timing offset', () => {
    const manager = new SubtitleManager();
    manager.loadTrack(createTrack([
      { start: 1000, end: 4000, text: 'First' },
    ]));
    manager.setTimingOffset(500);

    // Original 1000-4000, with +500 offset becomes 500-3500
    const entries = manager.getActiveEntries(600);

    expect(entries).toHaveLength(1);
  });

  it('manages multiple tracks', () => {
    const manager = new SubtitleManager();
    manager.loadTrack(createTrack([{ start: 0, end: 1000, text: 'Track 1' }]));
    manager.loadTrack(createTrack([{ start: 0, end: 1000, text: 'Track 2' }]));

    expect(manager.getTrackList()).toHaveLength(2);

    manager.setActiveTrack(1);
    expect(manager.getActiveEntries(500)[0].text).toBe('Track 2');
  });
});
```

---

## T004: Implement SubtitleRenderer

**Priority**: P1
**Depends on**: T003

### Description
Canvas-based subtitle renderer with styling support.

### Acceptance Criteria
- [ ] Renders text on canvas overlay
- [ ] Supports configurable font/size/color
- [ ] Positions at bottom of video
- [ ] Handles multi-line text
- [ ] Applies ASS styles (basic)
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect, vi } from 'vitest';
import { SubtitleRenderer } from './SubtitleRenderer';

describe('SubtitleRenderer', () => {
  it('renders text on canvas', () => {
    const canvas = document.createElement('canvas');
    const renderer = new SubtitleRenderer(canvas);
    const ctx = canvas.getContext('2d')!;
    vi.spyOn(ctx, 'fillText');

    renderer.render([{ text: 'Hello' }]);

    expect(ctx.fillText).toHaveBeenCalledWith('Hello', expect.any(Number), expect.any(Number));
  });

  it('applies font settings', () => {
    const canvas = document.createElement('canvas');
    const renderer = new SubtitleRenderer(canvas, { fontSize: 32, fontFamily: 'Arial' });
    const ctx = canvas.getContext('2d')!;

    renderer.render([{ text: 'Test' }]);

    expect(ctx.font).toContain('32px');
    expect(ctx.font).toContain('Arial');
  });

  it('clears previous subtitles', () => {
    const canvas = document.createElement('canvas');
    const renderer = new SubtitleRenderer(canvas);
    const ctx = canvas.getContext('2d')!;
    vi.spyOn(ctx, 'clearRect');

    renderer.clear();

    expect(ctx.clearRect).toHaveBeenCalled();
  });

  it('handles multi-line text', () => {
    const canvas = document.createElement('canvas');
    const renderer = new SubtitleRenderer(canvas);
    const ctx = canvas.getContext('2d')!;
    vi.spyOn(ctx, 'fillText');

    renderer.render([{ text: 'Line 1\nLine 2' }]);

    expect(ctx.fillText).toHaveBeenCalledTimes(2);
  });

  it('updates options dynamically', () => {
    const canvas = document.createElement('canvas');
    const renderer = new SubtitleRenderer(canvas);

    renderer.setOptions({ fontSize: 48, color: '#ff0000' });
    renderer.render([{ text: 'Test' }]);

    const ctx = canvas.getContext('2d')!;
    expect(ctx.font).toContain('48px');
  });
});
```

---

## T005: Embedded subtitle extraction

**Priority**: P2
**Depends on**: T001, T002, 001-core-playback

### Description
Extract embedded subtitle tracks from container.

### Acceptance Criteria
- [ ] Detects subtitle streams in MKV
- [ ] Extracts SRT embedded tracks
- [ ] Extracts ASS embedded tracks
- [ ] Reports track language if available
- [ ] 100% test coverage

### Test First (TDD)
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_embedded_subtitle_tracks() {
        let data = include_bytes!("../testdata/video-with-subs.mkv");
        let demuxer = Demuxer::open(data).unwrap();

        let tracks = demuxer.subtitle_tracks();

        assert!(!tracks.is_empty());
    }

    #[test]
    fn extracts_embedded_srt() {
        let data = include_bytes!("../testdata/video-with-srt.mkv");
        let demuxer = Demuxer::open(data).unwrap();

        let track = demuxer.extract_subtitle(0).unwrap();

        assert_eq!(track.format, SubtitleFormat::Srt);
        assert!(!track.entries.is_empty());
    }

    #[test]
    fn reports_track_language() {
        let data = include_bytes!("../testdata/video-with-subs.mkv");
        let demuxer = Demuxer::open(data).unwrap();

        let tracks = demuxer.subtitle_tracks();

        assert!(tracks[0].language.is_some());
    }
}
```

---

## T006: Integration testing

**Priority**: P2
**Depends on**: T001-T005

### Description
End-to-end subtitle tests.

### Tests
```typescript
import { test, expect } from '@playwright/test';

test('displays external SRT subtitles', async ({ page }) => {
  await loadVideo(page);
  await loadSubtitle(page, 'test.srt');

  await seekTo(page, 2000);

  await expect(page.locator('.subtitle')).toContainText('First subtitle');
});

test('displays ASS styled subtitles', async ({ page }) => {
  await loadVideo(page);
  await loadSubtitle(page, 'test.ass');

  await seekTo(page, 2000);

  const subtitle = page.locator('.subtitle');
  await expect(subtitle).toHaveCSS('font-style', 'italic');
});

test('timing offset works', async ({ page }) => {
  await loadVideo(page);
  await loadSubtitle(page, 'test.srt');
  await setTimingOffset(page, 500);

  // Subtitle originally at 1000-4000 should now appear at 500
  await seekTo(page, 600);

  await expect(page.locator('.subtitle')).toBeVisible();
});
```

---

## Dependency Graph

```
T001 (SRT Parser) ────┬────▶ T003 (SubtitleManager) ──▶ T004 (SubtitleRenderer)
                      │                │
T002 (ASS Parser) ────┤                │
                      │                ▼
                      └──▶ T005 (Embedded) ─────────────▶ T006 (Integration)
```
