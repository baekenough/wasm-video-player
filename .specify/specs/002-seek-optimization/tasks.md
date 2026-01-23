# Tasks: Seek Optimization

**Spec**: 002-seek-optimization
**Created**: 2026-01-23

## Task Overview

| ID | Task | Priority | Status |
|----|------|----------|--------|
| T001 | Implement KeyframeIndex | P1 | Pending |
| T002 | Enhanced Demuxer.seek | P1 | Pending |
| T003 | Implement SeekManager | P1 | Pending |
| T004 | Implement KeyboardHandler | P1 | Pending |
| T005 | Implement SeekBar | P1 | Pending |
| T006 | Integration testing | P2 | Pending |

---

## T001: Implement KeyframeIndex

**Priority**: P1
**Depends on**: 001-core-playback

### Description
Build and query keyframe position index for fast seeking.

### Acceptance Criteria
- [ ] Builds index from container on file open
- [ ] find_nearest returns closest keyframe
- [ ] find_before returns keyframe <= timestamp
- [ ] find_after returns keyframe >= timestamp
- [ ] Index build time < 1 second for typical files
- [ ] 100% test coverage

### Test First (TDD)
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_index_from_demuxer() {
        let mut demuxer = open_test_file();
        let index = KeyframeIndex::build(&mut demuxer).unwrap();
        assert!(index.len() > 0);
    }

    #[test]
    fn find_nearest_returns_closest() {
        let index = create_test_index(vec![0, 1000, 2000, 3000]);
        assert_eq!(index.find_nearest(1100).unwrap().timestamp, 1000);
        assert_eq!(index.find_nearest(1900).unwrap().timestamp, 2000);
    }

    #[test]
    fn find_before_returns_previous() {
        let index = create_test_index(vec![0, 1000, 2000]);
        assert_eq!(index.find_before(1500).unwrap().timestamp, 1000);
        assert_eq!(index.find_before(1000).unwrap().timestamp, 1000);
    }

    #[test]
    fn find_after_returns_next() {
        let index = create_test_index(vec![0, 1000, 2000]);
        assert_eq!(index.find_after(500).unwrap().timestamp, 1000);
        assert_eq!(index.find_after(1000).unwrap().timestamp, 1000);
    }

    #[test]
    fn handles_empty_index() {
        let index = KeyframeIndex::new();
        assert!(index.find_nearest(1000).is_none());
    }
}
```

---

## T002: Enhanced Demuxer.seek

**Priority**: P1
**Depends on**: T001

### Description
Seek to keyframe using index, return frames to skip.

### Acceptance Criteria
- [ ] Uses keyframe index for fast lookup
- [ ] Seeks to correct byte position
- [ ] Returns actual position and frames to skip
- [ ] Handles seek to start/end
- [ ] 100% test coverage

### Test First (TDD)
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn seeks_to_keyframe() {
        let mut demuxer = open_test_file();
        let result = demuxer.seek(5000).unwrap();
        // Should seek to keyframe before 5000
        assert!(result.actual_timestamp <= 5000);
    }

    #[test]
    fn returns_frames_to_skip() {
        let mut demuxer = open_test_file();
        let result = demuxer.seek(5000).unwrap();
        assert!(result.frames_to_skip >= 0);
    }

    #[test]
    fn seek_to_start() {
        let mut demuxer = open_test_file();
        let result = demuxer.seek(0).unwrap();
        assert_eq!(result.actual_timestamp, 0);
    }

    #[test]
    fn seek_beyond_end_clamps() {
        let mut demuxer = open_test_file();
        let result = demuxer.seek(i64::MAX).unwrap();
        assert!(result.actual_timestamp <= demuxer.duration());
    }
}
```

---

## T003: Implement SeekManager

**Priority**: P1
**Depends on**: 001-core-playback

### Description
TypeScript seek coordinator with debouncing.

### Acceptance Criteria
- [ ] seek() debounces rapid requests
- [ ] seekRelative() calculates absolute position
- [ ] cancel() aborts pending seek
- [ ] Validates timestamp bounds
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect, vi } from 'vitest';
import { SeekManager } from './SeekManager';

describe('SeekManager', () => {
  it('debounces rapid seek requests', async () => {
    const player = mockPlayer();
    const manager = new SeekManager(player);

    manager.seek(1000);
    manager.seek(2000);
    manager.seek(3000);

    await sleep(300); // Debounce delay

    expect(player.seek).toHaveBeenCalledTimes(1);
    expect(player.seek).toHaveBeenCalledWith(3000);
  });

  it('immediate seek bypasses debounce', () => {
    const player = mockPlayer();
    const manager = new SeekManager(player);

    manager.seek(1000, true);

    expect(player.seek).toHaveBeenCalledWith(1000);
  });

  it('seekRelative adds to current time', () => {
    const player = mockPlayer({ currentTime: 5000 });
    const manager = new SeekManager(player);

    manager.seekRelative(10000);

    expect(player.seek).toHaveBeenCalledWith(15000);
  });

  it('validates timestamp bounds', () => {
    const player = mockPlayer({ duration: 60000 });
    const manager = new SeekManager(player);

    manager.seek(-1000);
    expect(player.seek).toHaveBeenCalledWith(0);

    manager.seek(100000);
    expect(player.seek).toHaveBeenCalledWith(60000);
  });

  it('cancel aborts pending seek', async () => {
    const player = mockPlayer();
    const manager = new SeekManager(player);

    manager.seek(1000);
    manager.cancel();

    await sleep(300);

    expect(player.seek).not.toHaveBeenCalled();
  });
});
```

---

## T004: Implement KeyboardHandler

**Priority**: P1
**Depends on**: T003

### Description
Keyboard shortcut handler for seek operations.

### Acceptance Criteria
- [ ] Arrow keys seek short interval
- [ ] Shift+Arrow seeks long interval
- [ ] Configurable intervals
- [ ] Prevents default browser behavior
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect, vi } from 'vitest';
import { KeyboardHandler } from './KeyboardHandler';

describe('KeyboardHandler', () => {
  it('right arrow seeks forward short interval', () => {
    const seekManager = mockSeekManager();
    const handler = new KeyboardHandler(seekManager, { shortInterval: 10 });

    handler.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

    expect(seekManager.seekRelative).toHaveBeenCalledWith(10000);
  });

  it('left arrow seeks backward short interval', () => {
    const seekManager = mockSeekManager();
    const handler = new KeyboardHandler(seekManager, { shortInterval: 10 });

    handler.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

    expect(seekManager.seekRelative).toHaveBeenCalledWith(-10000);
  });

  it('shift+right seeks forward long interval', () => {
    const seekManager = mockSeekManager();
    const handler = new KeyboardHandler(seekManager, { longInterval: 60 });

    handler.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true }));

    expect(seekManager.seekRelative).toHaveBeenCalledWith(60000);
  });

  it('prevents default behavior', () => {
    const seekManager = mockSeekManager();
    const handler = new KeyboardHandler(seekManager);
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    vi.spyOn(event, 'preventDefault');

    handler.handleKeyDown(event);

    expect(event.preventDefault).toHaveBeenCalled();
  });
});
```

---

## T005: Implement SeekBar

**Priority**: P1
**Depends on**: T003

### Description
Seekbar UI component with click and drag support.

### Acceptance Criteria
- [ ] Click seeks to clicked position
- [ ] Drag updates position in real-time
- [ ] Shows progress visually
- [ ] Handles edge cases (start, end)
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect } from 'vitest';
import { SeekBar } from './SeekBar';

describe('SeekBar', () => {
  it('click seeks to position', () => {
    const seekManager = mockSeekManager();
    const seekBar = new SeekBar(container, seekManager, { duration: 60000 });

    // Simulate click at 50% position
    seekBar.handleClick(createClickEvent(0.5));

    expect(seekManager.seek).toHaveBeenCalledWith(30000);
  });

  it('drag updates position', () => {
    const seekManager = mockSeekManager();
    const seekBar = new SeekBar(container, seekManager, { duration: 60000 });

    seekBar.handleDragStart(createClickEvent(0.2));
    seekBar.handleDragMove(createClickEvent(0.5));

    expect(seekManager.seek).toHaveBeenCalledWith(30000);
  });

  it('setProgress updates visual', () => {
    const seekBar = new SeekBar(container, mockSeekManager());

    seekBar.setProgress(30000, 60000);

    expect(container.querySelector('.progress').style.width).toBe('50%');
  });

  it('handles click at start', () => {
    const seekManager = mockSeekManager();
    const seekBar = new SeekBar(container, seekManager, { duration: 60000 });

    seekBar.handleClick(createClickEvent(0));

    expect(seekManager.seek).toHaveBeenCalledWith(0);
  });

  it('handles click at end', () => {
    const seekManager = mockSeekManager();
    const seekBar = new SeekBar(container, seekManager, { duration: 60000 });

    seekBar.handleClick(createClickEvent(1));

    expect(seekManager.seek).toHaveBeenCalledWith(60000);
  });
});
```

---

## T006: Integration testing

**Priority**: P2
**Depends on**: T001-T005

### Description
End-to-end seek tests.

### Acceptance Criteria
- [ ] Keyboard seek works
- [ ] Seekbar click works
- [ ] Seekbar drag works
- [ ] Seek completes within 500ms
- [ ] Audio resyncs after seek

### Tests
```typescript
import { test, expect } from '@playwright/test';

test('keyboard seek forward', async ({ page }) => {
  await loadVideo(page);
  await page.keyboard.press('ArrowRight');
  const time = await page.locator('.current-time').textContent();
  expect(parseTime(time)).toBe(10);
});

test('seekbar click', async ({ page }) => {
  await loadVideo(page);
  await page.locator('.seekbar').click({ position: { x: 300, y: 10 } });
  // Verify position updated
});

test('seek performance', async ({ page }) => {
  await loadVideo(page);
  const start = Date.now();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => window.player.isPlaying);
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(500);
});
```

---

## Dependency Graph

```
001-core-playback
        │
        ▼
T001 (KeyframeIndex) ──▶ T002 (Demuxer.seek)
        │
        ├──────────────────────────────────────────┐
        │                                          │
        ▼                                          ▼
T003 (SeekManager) ──▶ T004 (KeyboardHandler)     │
        │                                          │
        └──────────────▶ T005 (SeekBar) ◀─────────┘
                                │
                                ▼
                        T006 (Integration)
```
