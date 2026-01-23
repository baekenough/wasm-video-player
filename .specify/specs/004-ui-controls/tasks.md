# Tasks: UI Controls

**Spec**: 004-ui-controls
**Created**: 2026-01-23

## Task Overview

| ID | Task | Priority | Status |
|----|------|----------|--------|
| T001 | Create control bar structure | P1 | Completed |
| T002 | Implement PlayButton | P1 | Completed |
| T003 | Implement TimeDisplay | P1 | Completed |
| T004 | Implement VolumeControl | P1 | Completed |
| T005 | Implement FullscreenManager | P1 | Completed |
| T006 | Implement auto-hide behavior | P2 | Completed |
| T007 | Implement KeyboardHandler | P1 | Completed |
| T008 | Dark theme CSS | P2 | Completed |
| T009 | Integration testing | P2 | In Progress |

## Changelog

### 2026-01-23 - Keyboard and Volume Fixes
- **Fixed**: Volume slider UI not updating when using Up/Down arrow keys
  - Added `volumechange` event listener to Controls.ts
  - Controls now updates slider value when player emits volume change
- **Fixed**: Keyboard shortcuts not working in input fields
  - Added check to ignore events from INPUT/TEXTAREA elements
- **Enhanced**: KeyboardHandler now supports:
  - Space: Play/Pause
  - Left/Right arrows: Short seek (5s)
  - Shift+Left/Right: Long seek (60s)
  - Up/Down arrows: Volume +/-5%
  - M: Mute toggle
  - F: Fullscreen toggle

---

## T001: Create control bar structure

**Priority**: P1

### Description
Create the HTML/DOM structure for the control bar.

### Acceptance Criteria
- [ ] Control bar container with proper structure
- [ ] Placeholder slots for all components
- [ ] Proper z-index layering
- [ ] Responsive layout
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect } from 'vitest';
import { Controls } from './Controls';

describe('Controls structure', () => {
  it('creates control bar element', () => {
    const container = document.createElement('div');
    const controls = new Controls(container, mockPlayer());

    expect(container.querySelector('.control-bar')).not.toBeNull();
  });

  it('has seekbar slot', () => {
    const container = document.createElement('div');
    new Controls(container, mockPlayer());

    expect(container.querySelector('.seekbar-container')).not.toBeNull();
  });

  it('has button container', () => {
    const container = document.createElement('div');
    new Controls(container, mockPlayer());

    expect(container.querySelector('.button-container')).not.toBeNull();
  });
});
```

---

## T002: Implement PlayButton

**Priority**: P1
**Depends on**: T001

### Description
Play/pause toggle button with icon state.

### Acceptance Criteria
- [ ] Shows play icon when paused
- [ ] Shows pause icon when playing
- [ ] Click toggles playback
- [ ] Updates on player state change
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect, vi } from 'vitest';
import { PlayButton } from './PlayButton';

describe('PlayButton', () => {
  it('shows play icon when paused', () => {
    const player = mockPlayer({ isPlaying: false });
    const container = document.createElement('div');
    const button = new PlayButton(container, player);

    expect(container.querySelector('.icon-play')).not.toBeNull();
  });

  it('shows pause icon when playing', () => {
    const player = mockPlayer({ isPlaying: true });
    const container = document.createElement('div');
    const button = new PlayButton(container, player);

    expect(container.querySelector('.icon-pause')).not.toBeNull();
  });

  it('click calls player.play when paused', () => {
    const player = mockPlayer({ isPlaying: false });
    const container = document.createElement('div');
    const button = new PlayButton(container, player);

    container.querySelector('button')!.click();

    expect(player.play).toHaveBeenCalled();
  });

  it('click calls player.pause when playing', () => {
    const player = mockPlayer({ isPlaying: true });
    const container = document.createElement('div');
    const button = new PlayButton(container, player);

    container.querySelector('button')!.click();

    expect(player.pause).toHaveBeenCalled();
  });

  it('updates icon on player state change', () => {
    const player = mockPlayer({ isPlaying: false });
    const container = document.createElement('div');
    const button = new PlayButton(container, player);

    player.emit('statechange', { isPlaying: true });

    expect(container.querySelector('.icon-pause')).not.toBeNull();
  });
});
```

---

## T003: Implement TimeDisplay

**Priority**: P1
**Depends on**: T001

### Description
Current time / duration display.

### Acceptance Criteria
- [ ] Displays current time
- [ ] Displays total duration
- [ ] Formats as HH:MM:SS
- [ ] Updates every second during playback
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect } from 'vitest';
import { TimeDisplay } from './TimeDisplay';

describe('TimeDisplay', () => {
  it('displays formatted time', () => {
    const container = document.createElement('div');
    const display = new TimeDisplay(container);

    display.update(3661000, 7200000); // 1:01:01 / 2:00:00

    expect(container.textContent).toContain('1:01:01');
    expect(container.textContent).toContain('2:00:00');
  });

  it('formats hours correctly', () => {
    const container = document.createElement('div');
    const display = new TimeDisplay(container);

    display.update(0, 3600000); // 0:00:00 / 1:00:00

    expect(container.textContent).toContain('0:00:00');
    expect(container.textContent).toContain('1:00:00');
  });

  it('formats minutes correctly', () => {
    const container = document.createElement('div');
    const display = new TimeDisplay(container);

    display.update(65000, 300000); // 0:01:05 / 0:05:00

    expect(container.textContent).toContain('0:01:05');
  });

  it('pads seconds with zero', () => {
    const container = document.createElement('div');
    const display = new TimeDisplay(container);

    display.update(5000, 60000); // 0:00:05 / 0:01:00

    expect(container.textContent).toContain('0:00:05');
  });
});
```

---

## T004: Implement VolumeControl

**Priority**: P1
**Depends on**: T001

### Description
Volume slider with mute button.

### Acceptance Criteria
- [ ] Slider controls volume (0-100%)
- [ ] Mute button toggles mute
- [ ] Unmute restores previous volume
- [ ] Visual feedback for current level
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect, vi } from 'vitest';
import { VolumeControl } from './VolumeControl';

describe('VolumeControl', () => {
  it('slider changes volume', () => {
    const audioPlayer = mockAudioPlayer();
    const container = document.createElement('div');
    const control = new VolumeControl(container, audioPlayer);

    const slider = container.querySelector('input[type=range]') as HTMLInputElement;
    slider.value = '50';
    slider.dispatchEvent(new Event('input'));

    expect(audioPlayer.setVolume).toHaveBeenCalledWith(0.5);
  });

  it('mute button mutes audio', () => {
    const audioPlayer = mockAudioPlayer({ volume: 0.8 });
    const container = document.createElement('div');
    const control = new VolumeControl(container, audioPlayer);

    container.querySelector('.mute-button')!.click();

    expect(audioPlayer.mute).toHaveBeenCalled();
  });

  it('unmute restores previous volume', () => {
    const audioPlayer = mockAudioPlayer({ volume: 0.8, muted: true });
    const container = document.createElement('div');
    const control = new VolumeControl(container, audioPlayer);

    container.querySelector('.mute-button')!.click();

    expect(audioPlayer.unmute).toHaveBeenCalled();
  });

  it('shows muted icon when muted', () => {
    const audioPlayer = mockAudioPlayer({ muted: true });
    const container = document.createElement('div');
    const control = new VolumeControl(container, audioPlayer);

    expect(container.querySelector('.icon-muted')).not.toBeNull();
  });

  it('shows volume icon based on level', () => {
    const audioPlayer = mockAudioPlayer({ volume: 0.8 });
    const container = document.createElement('div');
    const control = new VolumeControl(container, audioPlayer);

    expect(container.querySelector('.icon-volume-high')).not.toBeNull();
  });
});
```

---

## T005: Implement FullscreenManager

**Priority**: P1
**Depends on**: T001

### Description
Fullscreen toggle with keyboard and button support.

### Acceptance Criteria
- [ ] Enter fullscreen via button
- [ ] Exit fullscreen via button
- [ ] Toggle via F key
- [ ] Exit via Escape
- [ ] Handle browser fullscreen API
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect, vi } from 'vitest';
import { FullscreenManager } from './FullscreenManager';

describe('FullscreenManager', () => {
  it('enters fullscreen', () => {
    const container = document.createElement('div');
    vi.spyOn(container, 'requestFullscreen').mockResolvedValue(undefined);
    const manager = new FullscreenManager(container);

    manager.enter();

    expect(container.requestFullscreen).toHaveBeenCalled();
  });

  it('exits fullscreen', () => {
    vi.spyOn(document, 'exitFullscreen').mockResolvedValue(undefined);
    const manager = new FullscreenManager(document.createElement('div'));

    manager.exit();

    expect(document.exitFullscreen).toHaveBeenCalled();
  });

  it('toggle enters when not fullscreen', () => {
    const container = document.createElement('div');
    vi.spyOn(container, 'requestFullscreen').mockResolvedValue(undefined);
    const manager = new FullscreenManager(container);

    manager.toggle();

    expect(container.requestFullscreen).toHaveBeenCalled();
  });

  it('toggle exits when fullscreen', () => {
    vi.spyOn(document, 'exitFullscreen').mockResolvedValue(undefined);
    Object.defineProperty(document, 'fullscreenElement', { value: {}, configurable: true });
    const manager = new FullscreenManager(document.createElement('div'));

    manager.toggle();

    expect(document.exitFullscreen).toHaveBeenCalled();
  });

  it('tracks fullscreen state', () => {
    const manager = new FullscreenManager(document.createElement('div'));

    expect(manager.isFullscreen).toBe(false);
  });
});
```

---

## T006: Implement auto-hide behavior

**Priority**: P2
**Depends on**: T001

### Description
Auto-hide control bar after inactivity.

### Acceptance Criteria
- [ ] Hides after 3 seconds of no mouse movement
- [ ] Shows on mouse movement
- [ ] Shows on any key press
- [ ] Stays visible when paused
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Controls } from './Controls';

describe('Controls auto-hide', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hides after 3 seconds', () => {
    const container = document.createElement('div');
    const controls = new Controls(container, mockPlayer({ isPlaying: true }));

    vi.advanceTimersByTime(3000);

    expect(container.querySelector('.control-bar')!.classList.contains('hidden')).toBe(true);
  });

  it('shows on mouse move', () => {
    const container = document.createElement('div');
    const controls = new Controls(container, mockPlayer({ isPlaying: true }));

    vi.advanceTimersByTime(3000);
    container.dispatchEvent(new MouseEvent('mousemove'));

    expect(container.querySelector('.control-bar')!.classList.contains('hidden')).toBe(false);
  });

  it('resets timer on mouse move', () => {
    const container = document.createElement('div');
    const controls = new Controls(container, mockPlayer({ isPlaying: true }));

    vi.advanceTimersByTime(2000);
    container.dispatchEvent(new MouseEvent('mousemove'));
    vi.advanceTimersByTime(2000);

    expect(container.querySelector('.control-bar')!.classList.contains('hidden')).toBe(false);
  });

  it('stays visible when paused', () => {
    const container = document.createElement('div');
    const controls = new Controls(container, mockPlayer({ isPlaying: false }));

    vi.advanceTimersByTime(5000);

    expect(container.querySelector('.control-bar')!.classList.contains('hidden')).toBe(false);
  });

  it('shows on key press', () => {
    const container = document.createElement('div');
    const controls = new Controls(container, mockPlayer({ isPlaying: true }));

    vi.advanceTimersByTime(3000);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Space' }));

    expect(container.querySelector('.control-bar')!.classList.contains('hidden')).toBe(false);
  });
});
```

---

## T007: Implement KeyboardHandler

**Priority**: P1
**Depends on**: T002, T004, T005

### Description
Global keyboard shortcuts for player control.

### Acceptance Criteria
- [ ] Space toggles play/pause
- [ ] M toggles mute
- [ ] F toggles fullscreen
- [ ] Escape exits fullscreen
- [ ] Prevents default for handled keys
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect, vi } from 'vitest';
import { KeyboardHandler } from './KeyboardHandler';

describe('KeyboardHandler', () => {
  it('space toggles play/pause', () => {
    const player = mockPlayer();
    const handler = new KeyboardHandler(player, mockControls());

    handler.handleKeyDown(new KeyboardEvent('keydown', { code: 'Space' }));

    expect(player.toggle).toHaveBeenCalled();
  });

  it('m toggles mute', () => {
    const player = mockPlayer();
    const handler = new KeyboardHandler(player, mockControls());

    handler.handleKeyDown(new KeyboardEvent('keydown', { key: 'm' }));

    expect(player.toggleMute).toHaveBeenCalled();
  });

  it('f toggles fullscreen', () => {
    const controls = mockControls();
    const handler = new KeyboardHandler(mockPlayer(), controls);

    handler.handleKeyDown(new KeyboardEvent('keydown', { key: 'f' }));

    expect(controls.fullscreenManager.toggle).toHaveBeenCalled();
  });

  it('escape exits fullscreen', () => {
    const controls = mockControls();
    const handler = new KeyboardHandler(mockPlayer(), controls);

    handler.handleKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(controls.fullscreenManager.exit).toHaveBeenCalled();
  });

  it('prevents default for handled keys', () => {
    const handler = new KeyboardHandler(mockPlayer(), mockControls());
    const event = new KeyboardEvent('keydown', { code: 'Space' });
    vi.spyOn(event, 'preventDefault');

    handler.handleKeyDown(event);

    expect(event.preventDefault).toHaveBeenCalled();
  });
});
```

---

## T008: Dark theme CSS

**Priority**: P2
**Depends on**: T001

### Description
Dark theme styling for all UI components.

### Acceptance Criteria
- [ ] Near-black background (#0d0d0d)
- [ ] Control bar with gradient
- [ ] Accent color for progress (#e50914)
- [ ] Smooth transitions
- [ ] Hover states

### Deliverables
- `src/styles/dark-theme.css`

---

## T009: Integration testing

**Priority**: P2
**Depends on**: T001-T008

### Description
End-to-end UI control tests.

### Tests
```typescript
import { test, expect } from '@playwright/test';

test('play button toggles playback', async ({ page }) => {
  await loadVideo(page);
  await page.locator('.play-button').click();
  await expect(page.locator('.icon-pause')).toBeVisible();
});

test('volume slider changes volume', async ({ page }) => {
  await loadVideo(page);
  await page.locator('.volume-slider').fill('50');
  // Verify audio level changed
});

test('fullscreen toggle works', async ({ page }) => {
  await loadVideo(page);
  await page.locator('.fullscreen-button').click();
  // Verify fullscreen
});

test('controls auto-hide', async ({ page }) => {
  await loadVideo(page);
  await page.locator('.play-button').click();
  await page.waitForTimeout(3500);
  await expect(page.locator('.control-bar')).toHaveClass(/hidden/);
});

test('keyboard shortcuts work', async ({ page }) => {
  await loadVideo(page);
  await page.keyboard.press('Space');
  await expect(page.locator('.icon-pause')).toBeVisible();
});
```

---

## Dependency Graph

```
T001 (Structure) ───┬──▶ T002 (PlayButton)
                    ├──▶ T003 (TimeDisplay)
                    ├──▶ T004 (VolumeControl)
                    ├──▶ T005 (FullscreenManager)
                    ├──▶ T006 (Auto-hide)
                    └──▶ T008 (CSS)
                              │
T002, T004, T005 ───────────▶ T007 (KeyboardHandler)
                                      │
All ────────────────────────────────▶ T009 (Integration)
```
