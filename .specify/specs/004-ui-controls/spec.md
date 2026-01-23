# Feature Specification: UI Controls

**Feature Branch**: `004-ui-controls`
**Created**: 2026-01-23
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - Play/Pause Control (Priority: P1)

User controls playback with play/pause button and spacebar.

**Why this priority**: Most basic control needed for any player.

**Independent Test**: Click play/pause, press spacebar, verify state changes.

**Acceptance Scenarios**:

1. **Given** video paused, **When** user clicks play button, **Then** video plays
2. **Given** video playing, **When** user clicks pause button, **Then** video pauses
3. **Given** video paused, **When** user presses spacebar, **Then** video plays
4. **Given** video playing, **When** user presses spacebar, **Then** video pauses

---

### User Story 2 - Volume Control (Priority: P1)

User adjusts audio volume with slider and keyboard.

**Why this priority**: Essential for audio experience.

**Independent Test**: Drag volume slider, press mute, verify audio level changes.

**Acceptance Scenarios**:

1. **Given** video playing, **When** user drags volume to 50%, **Then** audio plays at half volume
2. **Given** video playing, **When** user clicks mute icon, **Then** audio mutes
3. **Given** audio muted, **When** user clicks mute icon, **Then** audio unmutes to previous level
4. **Given** video playing, **When** user presses M key, **Then** audio toggles mute

---

### User Story 3 - Fullscreen Toggle (Priority: P1)

User enters and exits fullscreen mode.

**Why this priority**: Fullscreen is expected for video viewing.

**Independent Test**: Click fullscreen button, press F or Escape, verify mode changes.

**Acceptance Scenarios**:

1. **Given** windowed mode, **When** user clicks fullscreen button, **Then** enters fullscreen
2. **Given** fullscreen mode, **When** user clicks fullscreen button, **Then** exits fullscreen
3. **Given** windowed mode, **When** user presses F key, **Then** enters fullscreen
4. **Given** fullscreen mode, **When** user presses Escape, **Then** exits fullscreen
5. **Given** windowed mode, **When** user double-clicks video, **Then** enters fullscreen

---

### User Story 4 - Control Bar Auto-Hide (Priority: P2)

Control bar hides automatically during playback for immersive experience.

**Why this priority**: Reduces visual clutter during viewing.

**Independent Test**: Start playback, wait 3 seconds, verify controls hide.

**Acceptance Scenarios**:

1. **Given** video playing, **When** 3 seconds pass without mouse movement, **Then** control bar hides
2. **Given** controls hidden, **When** user moves mouse, **Then** control bar shows
3. **Given** video paused, **When** controls visible, **Then** controls stay visible (don't auto-hide)
4. **Given** controls hidden, **When** user presses any key, **Then** controls show

---

### User Story 5 - Time Display (Priority: P2)

User sees current position and total duration.

**Why this priority**: Users need to know video progress.

**Independent Test**: Play video, verify time display updates correctly.

**Acceptance Scenarios**:

1. **Given** video loaded, **When** displayed, **Then** shows "00:00:00 / HH:MM:SS" format
2. **Given** video playing, **When** time passes, **Then** current time updates every second
3. **Given** seekbar hovered, **When** mouse over position, **Then** shows time at that position

---

### Edge Cases

- What happens when video has no audio track?
- How does system handle very long videos (>10 hours)?
- What happens when fullscreen is not supported?
- How does system handle rapid control interactions?

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide play/pause button
- **FR-002**: System MUST provide volume slider with mute toggle
- **FR-003**: System MUST provide fullscreen toggle
- **FR-004**: System MUST provide seekbar with current position
- **FR-005**: System MUST display current time and duration
- **FR-006**: System MUST auto-hide controls after 3 seconds of inactivity
- **FR-007**: System MUST support keyboard shortcuts (Space, M, F, Escape)

### Key Entities

- **ControlBar**: Visibility state, auto-hide timer
- **VolumeState**: Current level (0-1), muted flag, previous level (for unmute)
- **TimeDisplay**: Current timestamp, total duration, formatted strings

## Success Criteria

### Measurable Outcomes

- **SC-001**: Control state changes within 100ms of user input
- **SC-002**: Auto-hide triggers after exactly 3 seconds
- **SC-003**: All keyboard shortcuts respond within 50ms
- **SC-004**: Time display updates smoothly without flicker
- **SC-005**: 100% test coverage for UI control logic
