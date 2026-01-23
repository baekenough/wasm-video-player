# Tasks: Settings

**Spec**: 005-settings
**Created**: 2026-01-23

## Task Overview

| ID | Task | Priority | Status |
|----|------|----------|--------|
| T001 | Implement Settings class | P1 | Pending |
| T002 | Implement LocalStorageAdapter | P1 | Pending |
| T003 | Implement TauriStorageAdapter | P2 | Pending |
| T004 | Implement SettingsPanel UI | P1 | Pending |
| T005 | Integrate with consumers | P1 | Pending |
| T006 | Settings migration support | P3 | Pending |
| T007 | Integration testing | P2 | Pending |

---

## T001: Implement Settings class

**Priority**: P1

### Description
Central settings state management with observer pattern.

### Acceptance Criteria
- [ ] Get/set individual settings
- [ ] Update partial settings
- [ ] Reset to defaults
- [ ] Subscribe to changes
- [ ] Validates values
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect, vi } from 'vitest';
import { Settings, DEFAULT_SETTINGS } from './Settings';

describe('Settings', () => {
  it('returns default values', () => {
    const settings = new Settings(mockStorage());

    expect(settings.get('seek')).toEqual(DEFAULT_SETTINGS.seek);
  });

  it('sets individual section', () => {
    const settings = new Settings(mockStorage());

    settings.set('seek', { shortInterval: 5, longInterval: 30 });

    expect(settings.get('seek').shortInterval).toBe(5);
  });

  it('updates partial settings', () => {
    const settings = new Settings(mockStorage());

    settings.update({ seek: { shortInterval: 5 } });

    expect(settings.get('seek').shortInterval).toBe(5);
    expect(settings.get('seek').longInterval).toBe(60); // default
  });

  it('resets to defaults', () => {
    const settings = new Settings(mockStorage());
    settings.set('seek', { shortInterval: 5, longInterval: 30 });

    settings.reset();

    expect(settings.get('seek')).toEqual(DEFAULT_SETTINGS.seek);
  });

  it('resets individual section', () => {
    const settings = new Settings(mockStorage());
    settings.set('seek', { shortInterval: 5, longInterval: 30 });
    settings.set('playback', { autoPlay: false, loop: true, speed: 2 });

    settings.resetSection('seek');

    expect(settings.get('seek')).toEqual(DEFAULT_SETTINGS.seek);
    expect(settings.get('playback').loop).toBe(true);
  });

  it('notifies subscribers on change', () => {
    const settings = new Settings(mockStorage());
    const listener = vi.fn();
    settings.subscribe(listener);

    settings.set('seek', { shortInterval: 5, longInterval: 30 });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ seek: { shortInterval: 5, longInterval: 30 } }),
      expect.objectContaining({ seek: { shortInterval: 5, longInterval: 30 } })
    );
  });

  it('unsubscribe stops notifications', () => {
    const settings = new Settings(mockStorage());
    const listener = vi.fn();
    const unsubscribe = settings.subscribe(listener);

    unsubscribe();
    settings.set('seek', { shortInterval: 5, longInterval: 30 });

    expect(listener).not.toHaveBeenCalled();
  });

  it('validates seek intervals', () => {
    const settings = new Settings(mockStorage());

    expect(() => settings.set('seek', { shortInterval: -1, longInterval: 60 })).toThrow();
  });
});
```

---

## T002: Implement LocalStorageAdapter

**Priority**: P1

### Description
Web localStorage adapter for settings persistence.

### Acceptance Criteria
- [ ] Saves settings as JSON
- [ ] Loads settings from JSON
- [ ] Handles missing data
- [ ] Handles corrupted data
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageAdapter } from './LocalStorageAdapter';

describe('LocalStorageAdapter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves settings to localStorage', async () => {
    const adapter = new LocalStorageAdapter();
    const data = { seek: { shortInterval: 5, longInterval: 30 } };

    await adapter.save(data as any);

    expect(localStorage.getItem('wasm-video-player-settings')).toBe(JSON.stringify(data));
  });

  it('loads settings from localStorage', async () => {
    const data = { seek: { shortInterval: 5, longInterval: 30 } };
    localStorage.setItem('wasm-video-player-settings', JSON.stringify(data));
    const adapter = new LocalStorageAdapter();

    const loaded = await adapter.load();

    expect(loaded).toEqual(data);
  });

  it('returns null when no data', async () => {
    const adapter = new LocalStorageAdapter();

    const loaded = await adapter.load();

    expect(loaded).toBeNull();
  });

  it('returns null on corrupted data', async () => {
    localStorage.setItem('wasm-video-player-settings', 'not json');
    const adapter = new LocalStorageAdapter();

    const loaded = await adapter.load();

    expect(loaded).toBeNull();
  });

  it('clears stored data', async () => {
    localStorage.setItem('wasm-video-player-settings', '{}');
    const adapter = new LocalStorageAdapter();

    await adapter.clear();

    expect(localStorage.getItem('wasm-video-player-settings')).toBeNull();
  });
});
```

---

## T003: Implement TauriStorageAdapter

**Priority**: P2

### Description
Tauri file system adapter for desktop settings.

### Acceptance Criteria
- [ ] Saves settings to config.json
- [ ] Loads settings from config.json
- [ ] Creates config directory if needed
- [ ] Handles missing file
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect, vi } from 'vitest';
import { TauriStorageAdapter } from './TauriStorageAdapter';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/fs', () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  removeFile: vi.fn(),
  BaseDirectory: { App: 'app' },
}));

describe('TauriStorageAdapter', () => {
  it('saves settings to file', async () => {
    const { writeTextFile } = await import('@tauri-apps/api/fs');
    const adapter = new TauriStorageAdapter();
    const data = { seek: { shortInterval: 5, longInterval: 30 } };

    await adapter.save(data as any);

    expect(writeTextFile).toHaveBeenCalledWith(
      'config.json',
      JSON.stringify(data, null, 2),
      expect.any(Object)
    );
  });

  it('loads settings from file', async () => {
    const { readTextFile } = await import('@tauri-apps/api/fs');
    const data = { seek: { shortInterval: 5, longInterval: 30 } };
    vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(data));
    const adapter = new TauriStorageAdapter();

    const loaded = await adapter.load();

    expect(loaded).toEqual(data);
  });

  it('returns null when file not found', async () => {
    const { readTextFile } = await import('@tauri-apps/api/fs');
    vi.mocked(readTextFile).mockRejectedValue(new Error('File not found'));
    const adapter = new TauriStorageAdapter();

    const loaded = await adapter.load();

    expect(loaded).toBeNull();
  });

  it('clears config file', async () => {
    const { removeFile } = await import('@tauri-apps/api/fs');
    const adapter = new TauriStorageAdapter();

    await adapter.clear();

    expect(removeFile).toHaveBeenCalledWith('config.json', expect.any(Object));
  });
});
```

---

## T004: Implement SettingsPanel UI

**Priority**: P1
**Depends on**: T001

### Description
Settings panel UI with form controls.

### Acceptance Criteria
- [ ] Show/hide toggle
- [ ] Seek interval inputs
- [ ] Subtitle settings controls
- [ ] Playback settings controls
- [ ] Reset button
- [ ] Changes apply immediately
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect, vi } from 'vitest';
import { SettingsPanel } from './SettingsPanel';

describe('SettingsPanel', () => {
  it('shows panel on show()', () => {
    const container = document.createElement('div');
    const panel = new SettingsPanel(container, mockSettings());

    panel.show();

    expect(container.querySelector('.settings-panel')!.classList.contains('visible')).toBe(true);
  });

  it('hides panel on hide()', () => {
    const container = document.createElement('div');
    const panel = new SettingsPanel(container, mockSettings());
    panel.show();

    panel.hide();

    expect(container.querySelector('.settings-panel')!.classList.contains('visible')).toBe(false);
  });

  it('displays current settings values', () => {
    const container = document.createElement('div');
    const settings = mockSettings({ seek: { shortInterval: 5, longInterval: 30 } });
    const panel = new SettingsPanel(container, settings);
    panel.show();

    const shortInput = container.querySelector('[name="shortInterval"]') as HTMLInputElement;
    expect(shortInput.value).toBe('5');
  });

  it('updates settings on input change', () => {
    const container = document.createElement('div');
    const settings = mockSettings();
    const panel = new SettingsPanel(container, settings);
    panel.show();

    const shortInput = container.querySelector('[name="shortInterval"]') as HTMLInputElement;
    shortInput.value = '15';
    shortInput.dispatchEvent(new Event('change'));

    expect(settings.update).toHaveBeenCalledWith({ seek: { shortInterval: 15 } });
  });

  it('reset button resets to defaults', () => {
    const container = document.createElement('div');
    const settings = mockSettings();
    const panel = new SettingsPanel(container, settings);
    panel.show();

    container.querySelector('.reset-button')!.click();

    expect(settings.reset).toHaveBeenCalled();
  });

  it('close button hides panel', () => {
    const container = document.createElement('div');
    const panel = new SettingsPanel(container, mockSettings());
    panel.show();

    container.querySelector('.close-button')!.click();

    expect(container.querySelector('.settings-panel')!.classList.contains('visible')).toBe(false);
  });
});
```

---

## T005: Integrate with consumers

**Priority**: P1
**Depends on**: T001, 002-seek, 003-subtitle, 004-ui

### Description
Connect settings to KeyboardHandler, SubtitleRenderer, Controls.

### Acceptance Criteria
- [ ] KeyboardHandler uses seek intervals from settings
- [ ] SubtitleRenderer uses subtitle settings
- [ ] Controls uses auto-hide timeout from settings
- [ ] AudioPlayer uses volume/mute from settings
- [ ] Updates propagate in real-time
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Settings integration', () => {
  it('KeyboardHandler uses seek intervals', () => {
    const settings = new Settings(mockStorage());
    settings.set('seek', { shortInterval: 5, longInterval: 30 });
    const seekManager = mockSeekManager();
    const handler = new KeyboardHandler(seekManager, settings);

    handler.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

    expect(seekManager.seekRelative).toHaveBeenCalledWith(5000);
  });

  it('SubtitleRenderer uses subtitle settings', () => {
    const settings = new Settings(mockStorage());
    settings.set('subtitle', { fontSize: 32, color: '#ff0000' });
    const renderer = new SubtitleRenderer(canvas, settings);

    renderer.render([{ text: 'Test' }]);

    expect(canvas.getContext('2d')!.font).toContain('32px');
  });

  it('Controls uses auto-hide timeout', () => {
    vi.useFakeTimers();
    const settings = new Settings(mockStorage());
    settings.set('ui', { controlBarTimeout: 5000 });
    const controls = new Controls(container, player, settings);

    vi.advanceTimersByTime(3000);
    expect(container.querySelector('.control-bar')!.classList.contains('hidden')).toBe(false);

    vi.advanceTimersByTime(2000);
    expect(container.querySelector('.control-bar')!.classList.contains('hidden')).toBe(true);
    vi.useRealTimers();
  });

  it('settings changes propagate', () => {
    const settings = new Settings(mockStorage());
    const handler = new KeyboardHandler(seekManager, settings);

    settings.set('seek', { shortInterval: 20, longInterval: 120 });
    handler.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

    expect(seekManager.seekRelative).toHaveBeenCalledWith(20000);
  });
});
```

---

## T006: Settings migration support

**Priority**: P3
**Depends on**: T001, T002, T003

### Description
Version-based settings migration for schema changes.

### Acceptance Criteria
- [ ] Settings include version number
- [ ] Detects version mismatch on load
- [ ] Migrates old settings to new schema
- [ ] Preserves user values during migration
- [ ] 100% test coverage

### Test First (TDD)
```typescript
import { describe, it, expect } from 'vitest';
import { migrateSettings } from './migration';

describe('Settings migration', () => {
  it('adds version to settings', () => {
    const settings = new Settings(mockStorage());
    const data = settings.getAll();

    expect(data.version).toBeDefined();
  });

  it('migrates v1 to v2', () => {
    const v1Data = {
      version: 1,
      seekShort: 10, // old format
      seekLong: 60,
    };

    const migrated = migrateSettings(v1Data);

    expect(migrated.version).toBe(2);
    expect(migrated.seek.shortInterval).toBe(10);
    expect(migrated.seek.longInterval).toBe(60);
  });

  it('preserves values during migration', () => {
    const v1Data = {
      version: 1,
      seekShort: 5, // custom value
    };

    const migrated = migrateSettings(v1Data);

    expect(migrated.seek.shortInterval).toBe(5);
  });

  it('adds new fields with defaults', () => {
    const v1Data = {
      version: 1,
      seekShort: 10,
    };

    const migrated = migrateSettings(v1Data);

    expect(migrated.subtitle).toEqual(DEFAULT_SETTINGS.subtitle);
  });

  it('no-op for current version', () => {
    const currentData = { version: CURRENT_VERSION, ...DEFAULT_SETTINGS };

    const migrated = migrateSettings(currentData);

    expect(migrated).toEqual(currentData);
  });
});
```

---

## T007: Integration testing

**Priority**: P2
**Depends on**: T001-T006

### Description
End-to-end settings tests.

### Tests
```typescript
import { test, expect } from '@playwright/test';

test('settings persist across sessions', async ({ page, context }) => {
  await page.goto('/');
  await openSettings(page);
  await page.locator('[name="shortInterval"]').fill('15');
  await page.locator('.close-button').click();

  // Reload page
  await page.reload();
  await openSettings(page);

  await expect(page.locator('[name="shortInterval"]')).toHaveValue('15');
});

test('settings apply immediately', async ({ page }) => {
  await loadVideo(page);
  await openSettings(page);
  await page.locator('[name="shortInterval"]').fill('5');
  await page.locator('.close-button').click();

  await page.keyboard.press('ArrowRight');

  // Verify seek was 5 seconds
  await expect(page.locator('.current-time')).toContainText('0:00:05');
});

test('reset restores defaults', async ({ page }) => {
  await page.goto('/');
  await openSettings(page);
  await page.locator('[name="shortInterval"]').fill('15');
  await page.locator('.reset-button').click();

  await expect(page.locator('[name="shortInterval"]')).toHaveValue('10');
});
```

---

## Dependency Graph

```
T001 (Settings) ───┬──▶ T002 (LocalStorage)
                   │
                   ├──▶ T003 (TauriStorage)
                   │
                   └──▶ T004 (SettingsPanel)
                              │
                              ▼
         ┌─────────────────────────────────┐
         │                                 │
002-seek │  003-subtitle  004-ui           │
    │    │       │           │             │
    └────┴───────┴───────────┘             │
                   │                       │
                   ▼                       │
            T005 (Integration) ◀───────────┘
                   │
                   ▼
            T006 (Migration)
                   │
                   ▼
            T007 (E2E Tests)
```
