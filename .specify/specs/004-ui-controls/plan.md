# Technical Plan: UI Controls

**Spec**: 004-ui-controls
**Created**: 2026-01-23

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Video Container                    │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │              Canvas (WebGL)                    │  │   │
│  │  │                                                │  │   │
│  │  │                                                │  │   │
│  │  │              ┌─────────────────┐               │  │   │
│  │  │              │  Subtitle Layer │               │  │   │
│  │  │              └─────────────────┘               │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │              Control Bar                       │  │   │
│  │  │  ┌────────────────────────────────────────┐   │  │   │
│  │  │  │            Seek Bar                     │   │  │   │
│  │  │  └────────────────────────────────────────┘   │  │   │
│  │  │  ⏮ ⏪ ▶ ⏩ ⏭  00:15:32/02:14:08  🔊━━ ⚙ ⛶  │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Module Design

### Component Hierarchy

```
VideoPlayer (root)
├── VideoContainer
│   ├── Canvas (WebGL)
│   └── SubtitleOverlay
├── ControlBar
│   ├── SeekBar
│   ├── PlayButton
│   ├── TimeDisplay
│   ├── VolumeControl
│   │   ├── MuteButton
│   │   └── VolumeSlider
│   ├── SettingsButton
│   └── FullscreenButton
└── KeyboardHandler
```

### TypeScript Modules

#### `src/ui/Controls.ts`
```typescript
export class Controls {
  private container: HTMLElement;
  private player: Player;
  private visible: boolean = true;
  private hideTimer: number | null = null;
  private hideDelay: number = 3000;

  constructor(container: HTMLElement, player: Player);

  // Visibility management
  show(): void;
  hide(): void;
  toggle(): void;
  resetHideTimer(): void;

  // Event handlers
  private onMouseMove(): void;
  private onMouseLeave(): void;
  private onPlayerStateChange(state: PlayerState): void;

  // DOM creation
  private createControlBar(): HTMLElement;
  private attachEventListeners(): void;
}
```

#### `src/ui/PlayButton.ts`
```typescript
export class PlayButton {
  private button: HTMLButtonElement;
  private player: Player;

  constructor(container: HTMLElement, player: Player);

  private updateIcon(): void;
  private onClick(): void;
}
```

#### `src/ui/VolumeControl.ts`
```typescript
export class VolumeControl {
  private container: HTMLElement;
  private slider: HTMLInputElement;
  private muteButton: HTMLButtonElement;
  private audioPlayer: AudioPlayer;
  private previousVolume: number = 1;

  constructor(container: HTMLElement, audioPlayer: AudioPlayer);

  setVolume(level: number): void;
  toggleMute(): void;

  private onSliderChange(): void;
  private onMuteClick(): void;
  private updateUI(): void;
}
```

#### `src/ui/TimeDisplay.ts`
```typescript
export class TimeDisplay {
  private element: HTMLElement;
  private currentTime: HTMLSpanElement;
  private duration: HTMLSpanElement;

  constructor(container: HTMLElement);

  update(current: number, total: number): void;

  private formatTime(seconds: number): string;
}
```

#### `src/ui/FullscreenManager.ts`
```typescript
export class FullscreenManager {
  private container: HTMLElement;
  private isFullscreen: boolean = false;

  constructor(container: HTMLElement);

  toggle(): void;
  enter(): void;
  exit(): void;

  private onFullscreenChange(): void;
}
```

#### `src/input/KeyboardHandler.ts`
```typescript
export interface KeyBindings {
  playPause: string;       // Default: 'Space'
  seekBack: string;        // Default: 'ArrowLeft'
  seekForward: string;     // Default: 'ArrowRight'
  seekBackLarge: string;   // Default: 'Shift+ArrowLeft'
  seekForwardLarge: string;// Default: 'Shift+ArrowRight'
  volumeUp: string;        // Default: 'ArrowUp'
  volumeDown: string;      // Default: 'ArrowDown'
  mute: string;            // Default: 'm'
  fullscreen: string;      // Default: 'f'
}

export class KeyboardHandler {
  private bindings: KeyBindings;
  private player: Player;
  private controls: Controls;

  constructor(player: Player, controls: Controls, bindings?: Partial<KeyBindings>);

  attach(element: HTMLElement): void;
  detach(): void;
  setBindings(bindings: Partial<KeyBindings>): void;

  private handleKeyDown(event: KeyboardEvent): void;
  private matchesBinding(event: KeyboardEvent, binding: string): boolean;
}
```

## CSS Architecture

### `src/styles/dark-theme.css`
```css
:root {
  --player-bg: #0d0d0d;
  --control-bg: #1a1a1a;
  --accent: #e50914;
  --text-primary: #ffffff;
  --text-secondary: #808080;
}

.video-player {
  background: var(--player-bg);
  position: relative;
}

.control-bar {
  background: linear-gradient(transparent, var(--control-bg));
  position: absolute;
  bottom: 0;
  opacity: 1;
  transition: opacity 0.3s;
}

.control-bar.hidden {
  opacity: 0;
  pointer-events: none;
}

.seek-bar {
  --progress: 0%;
  background: var(--text-secondary);
}

.seek-bar::before {
  width: var(--progress);
  background: var(--accent);
}
```

## Event Flow

```
User Action → Event Handler → Player/Component → UI Update

Examples:
- Click Play → PlayButton.onClick → Player.play() → updateIcon()
- Press Space → KeyboardHandler → Player.toggle() → Controls.show()
- Move Mouse → Controls.onMouseMove → resetHideTimer()
- 3s Idle → hideTimer fires → Controls.hide()
```

## Testing Strategy

### Unit Tests
- Controls: Show/hide, timer management
- PlayButton: State sync
- VolumeControl: Level changes, mute toggle
- TimeDisplay: Format correctness
- KeyboardHandler: Key matching

### Integration Tests
- Full control workflow
- Keyboard shortcuts
- Auto-hide behavior
- Fullscreen toggle

## Milestones

1. **M1**: Control bar structure and CSS
2. **M2**: PlayButton, TimeDisplay
3. **M3**: SeekBar integration
4. **M4**: VolumeControl
5. **M5**: FullscreenManager
6. **M6**: KeyboardHandler
7. **M7**: Auto-hide behavior
