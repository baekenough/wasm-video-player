# Feature Specification: Settings

**Feature Branch**: `005-settings`
**Created**: 2026-01-23
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - Customize Seek Intervals (Priority: P1)

User customizes keyboard seek intervals to their preference.

**Why this priority**: Different users prefer different seek amounts.

**Independent Test**: Change seek interval setting, verify arrow keys use new value.

**Acceptance Scenarios**:

1. **Given** default settings, **When** user opens settings, **Then** sees seek interval options
2. **Given** settings panel, **When** user changes short seek to 5s, **Then** Arrow keys seek 5s
3. **Given** settings panel, **When** user changes long seek to 30s, **Then** Shift+Arrow seeks 30s
4. **Given** settings changed, **When** app restarts, **Then** settings persist

---

### User Story 2 - Subtitle Settings (Priority: P2)

User adjusts subtitle appearance and timing.

**Why this priority**: Subtitle preferences vary by user.

**Independent Test**: Change subtitle size/color, verify display updates.

**Acceptance Scenarios**:

1. **Given** settings panel, **When** user changes subtitle size, **Then** subtitles render larger/smaller
2. **Given** settings panel, **When** user changes subtitle color, **Then** subtitles use new color
3. **Given** settings panel, **When** user adjusts timing offset, **Then** subtitles shift accordingly
4. **Given** settings panel, **When** user changes background opacity, **Then** subtitle background updates

---

### User Story 3 - Playback Settings (Priority: P2)

User adjusts playback-related preferences.

**Why this priority**: Power users want control over playback behavior.

**Independent Test**: Change auto-play setting, verify behavior on next file open.

**Acceptance Scenarios**:

1. **Given** settings panel, **When** user enables auto-play, **Then** videos play automatically on open
2. **Given** settings panel, **When** user disables auto-play, **Then** videos pause on open
3. **Given** settings panel, **When** user enables loop, **Then** video loops at end
4. **Given** settings panel, **When** user changes playback speed, **Then** video plays at new speed

---

### User Story 4 - Settings Persistence (Priority: P1)

Settings persist across sessions.

**Why this priority**: Users don't want to reconfigure every time.

**Independent Test**: Change setting, restart app, verify setting retained.

**Acceptance Scenarios**:

1. **Given** settings changed, **When** app closes and reopens, **Then** settings are restored
2. **Given** Tauri desktop app, **When** settings saved, **Then** stored in config file
3. **Given** web version, **When** settings saved, **Then** stored in localStorage
4. **Given** corrupted settings file, **When** app opens, **Then** uses defaults gracefully

---

### Edge Cases

- What happens when settings file is corrupted?
- How does system handle migration between settings versions?
- What happens when user resets to defaults?
- How does system sync settings across web/desktop?

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide settings panel accessible from UI
- **FR-002**: System MUST allow customization of seek intervals (short, long)
- **FR-003**: System MUST allow customization of subtitle appearance
- **FR-004**: System MUST allow customization of playback behavior
- **FR-005**: System MUST persist settings across sessions
- **FR-006**: System MUST provide "Reset to Defaults" option
- **FR-007**: System MUST handle corrupted settings gracefully

### Key Entities

- **Settings**: All user preferences as structured object
- **SeekSettings**: Short interval (default 10s), long interval (default 60s)
- **SubtitleSettings**: Font size, color, background opacity, timing offset
- **PlaybackSettings**: Auto-play flag, loop flag, playback speed

## Settings Schema

```typescript
interface Settings {
  seek: {
    shortInterval: number;  // seconds, default: 10
    longInterval: number;   // seconds, default: 60
  };
  subtitle: {
    fontSize: number;       // pixels, default: 24
    color: string;          // hex, default: "#ffffff"
    backgroundColor: string; // hex with alpha, default: "#00000080"
    timingOffset: number;   // milliseconds, default: 0
  };
  playback: {
    autoPlay: boolean;      // default: true
    loop: boolean;          // default: false
    speed: number;          // multiplier, default: 1.0
  };
  ui: {
    controlBarTimeout: number; // milliseconds, default: 3000
  };
}
```

## Success Criteria

### Measurable Outcomes

- **SC-001**: Settings panel opens within 200ms
- **SC-002**: Setting changes apply immediately without restart
- **SC-003**: Settings persist correctly across 100% of restarts
- **SC-004**: Reset to defaults restores all values correctly
- **SC-005**: 100% test coverage for settings logic
