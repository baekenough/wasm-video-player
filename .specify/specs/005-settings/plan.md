# Technical Plan: Settings

**Spec**: 005-settings
**Created**: 2026-01-23

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Settings System                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ SettingsPanel│    │   Settings   │    │   Storage    │  │
│  │    (UI)      │◀──▶│   (State)    │◀──▶│  (Persist)   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │           │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Consumers                          │  │
│  │  KeyboardHandler  SubtitleRenderer  Player  Controls │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Module Design

### TypeScript Modules

#### `src/settings/Settings.ts`
```typescript
export interface SettingsData {
  seek: {
    shortInterval: number;  // seconds, default: 10
    longInterval: number;   // seconds, default: 60
  };
  subtitle: {
    fontSize: number;       // pixels, default: 24
    fontFamily: string;     // default: 'sans-serif'
    color: string;          // hex, default: '#ffffff'
    backgroundColor: string; // hex with alpha, default: '#00000080'
    timingOffset: number;   // milliseconds, default: 0
    enabled: boolean;       // default: true
  };
  playback: {
    autoPlay: boolean;      // default: true
    loop: boolean;          // default: false
    speed: number;          // multiplier, default: 1.0
  };
  ui: {
    controlBarTimeout: number; // milliseconds, default: 3000
  };
  audio: {
    volume: number;         // 0-1, default: 1
    muted: boolean;         // default: false
  };
}

export class Settings {
  private data: SettingsData;
  private storage: SettingsStorage;
  private listeners: Set<SettingsListener>;

  constructor(storage: SettingsStorage);

  // Getters
  get<K extends keyof SettingsData>(key: K): SettingsData[K];
  getAll(): Readonly<SettingsData>;

  // Setters
  set<K extends keyof SettingsData>(key: K, value: SettingsData[K]): void;
  update(partial: DeepPartial<SettingsData>): void;

  // Reset
  reset(): void;
  resetSection<K extends keyof SettingsData>(key: K): void;

  // Persistence
  async save(): Promise<void>;
  async load(): Promise<void>;

  // Observers
  subscribe(listener: SettingsListener): () => void;

  private notifyListeners(changes: Partial<SettingsData>): void;
}

export type SettingsListener = (settings: SettingsData, changes: Partial<SettingsData>) => void;
```

#### `src/settings/SettingsStorage.ts`
```typescript
export interface SettingsStorage {
  load(): Promise<SettingsData | null>;
  save(data: SettingsData): Promise<void>;
  clear(): Promise<void>;
}

// Web implementation (localStorage)
export class LocalStorageAdapter implements SettingsStorage {
  private key: string = 'wasm-video-player-settings';

  async load(): Promise<SettingsData | null> {
    const raw = localStorage.getItem(this.key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async save(data: SettingsData): Promise<void> {
    localStorage.setItem(this.key, JSON.stringify(data));
  }

  async clear(): Promise<void> {
    localStorage.removeItem(this.key);
  }
}

// Tauri implementation (config file)
export class TauriStorageAdapter implements SettingsStorage {
  private configPath: string;

  async load(): Promise<SettingsData | null> {
    // Use Tauri fs API
    const { readTextFile, BaseDirectory } = await import('@tauri-apps/api/fs');
    try {
      const content = await readTextFile('config.json', { dir: BaseDirectory.App });
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async save(data: SettingsData): Promise<void> {
    const { writeTextFile, BaseDirectory } = await import('@tauri-apps/api/fs');
    await writeTextFile('config.json', JSON.stringify(data, null, 2), { dir: BaseDirectory.App });
  }

  async clear(): Promise<void> {
    const { removeFile, BaseDirectory } = await import('@tauri-apps/api/fs');
    await removeFile('config.json', { dir: BaseDirectory.App });
  }
}
```

#### `src/ui/SettingsPanel.ts`
```typescript
export class SettingsPanel {
  private container: HTMLElement;
  private settings: Settings;
  private visible: boolean = false;

  constructor(container: HTMLElement, settings: Settings);

  show(): void;
  hide(): void;
  toggle(): void;

  private render(): void;
  private createSeekSection(): HTMLElement;
  private createSubtitleSection(): HTMLElement;
  private createPlaybackSection(): HTMLElement;
  private createResetButton(): HTMLElement;

  private onSettingChange(section: string, key: string, value: any): void;
  private onReset(): void;
}
```

## Default Settings

```typescript
export const DEFAULT_SETTINGS: SettingsData = {
  seek: {
    shortInterval: 10,
    longInterval: 60,
  },
  subtitle: {
    fontSize: 24,
    fontFamily: 'sans-serif',
    color: '#ffffff',
    backgroundColor: '#00000080',
    timingOffset: 0,
    enabled: true,
  },
  playback: {
    autoPlay: true,
    loop: false,
    speed: 1.0,
  },
  ui: {
    controlBarTimeout: 3000,
  },
  audio: {
    volume: 1,
    muted: false,
  },
};
```

## Settings Panel UI

```
┌─────────────────────────────────────────────┐
│  Settings                              ✕    │
├─────────────────────────────────────────────┤
│                                             │
│  ── Seek ──────────────────────────────     │
│  Short interval:  [10] seconds              │
│  Long interval:   [60] seconds              │
│                                             │
│  ── Subtitles ─────────────────────────     │
│  Font size:       [24] px                   │
│  Color:           [#ffffff] ■               │
│  Background:      [#000000] ■  [50]%        │
│  Timing offset:   [0] ms                    │
│                                             │
│  ── Playback ──────────────────────────     │
│  Auto-play:       [✓]                       │
│  Loop:            [ ]                       │
│  Speed:           [1.0x] ▼                  │
│                                             │
│  ─────────────────────────────────────      │
│  [Reset to Defaults]                        │
│                                             │
└─────────────────────────────────────────────┘
```

## Storage Strategy

### Web (localStorage)
```
Key: wasm-video-player-settings
Value: JSON string of SettingsData
```

### Tauri (config file)
```
Location: $APP_DATA/config.json
Format: Pretty-printed JSON
```

### Migration Strategy
```typescript
interface SettingsWithVersion {
  version: number;
  data: SettingsData;
}

function migrate(stored: SettingsWithVersion): SettingsData {
  let data = stored.data;

  if (stored.version < 2) {
    // Migration from v1 to v2
    data = { ...data, /* new fields */ };
  }

  return data;
}
```

## Testing Strategy

### Unit Tests
- Settings: Get/set, defaults, validation
- LocalStorageAdapter: Save/load/clear
- TauriStorageAdapter: File operations (mocked)
- SettingsPanel: Render, user interactions

### Integration Tests
- Full settings flow: UI → Settings → Storage
- Persistence across sessions
- Reset to defaults
- Migration between versions

## Milestones

1. **M1**: Settings class and defaults
2. **M2**: LocalStorageAdapter
3. **M3**: TauriStorageAdapter
4. **M4**: SettingsPanel UI
5. **M5**: Integration with consumers
6. **M6**: Migration support
