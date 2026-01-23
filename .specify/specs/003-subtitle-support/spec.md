# Feature Specification: Subtitle Support

**Feature Branch**: `003-subtitle-support`
**Created**: 2026-01-23
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - Display SRT Subtitles (Priority: P1)

User watches video with external SRT subtitle file.

**Why this priority**: SRT is the most common subtitle format.

**Independent Test**: Load video with SRT file, verify subtitles appear at correct times.

**Acceptance Scenarios**:

1. **Given** video playing with SRT loaded, **When** subtitle timestamp matches, **Then** subtitle text displays
2. **Given** subtitle displaying, **When** timestamp passes, **Then** subtitle disappears
3. **Given** SRT with special characters, **When** displaying, **Then** characters render correctly (UTF-8)
4. **Given** multiple subtitle lines, **When** displaying, **Then** all lines show with proper spacing

---

### User Story 2 - Display ASS/SSA Subtitles (Priority: P2)

User watches video with styled ASS/SSA subtitles.

**Why this priority**: ASS is common for anime and styled content.

**Independent Test**: Load ASS file, verify styles (font, color, position) apply correctly.

**Acceptance Scenarios**:

1. **Given** ASS with custom font, **When** displaying, **Then** specified font is used
2. **Given** ASS with colors, **When** displaying, **Then** text colors match specification
3. **Given** ASS with positioning, **When** displaying, **Then** subtitle appears at specified position
4. **Given** ASS with effects, **When** displaying, **Then** basic effects render (bold, italic)

---

### User Story 3 - Embedded Subtitles (Priority: P2)

User watches video with embedded subtitle tracks.

**Why this priority**: Many MKV files have embedded subtitles.

**Independent Test**: Load MKV with embedded subs, verify track detection and display.

**Acceptance Scenarios**:

1. **Given** MKV with embedded SRT track, **When** opened, **Then** subtitle track is detected
2. **Given** multiple subtitle tracks, **When** opened, **Then** user can select track
3. **Given** embedded ASS track, **When** selected, **Then** displays with styling

---

### User Story 4 - Subtitle Controls (Priority: P3)

User can toggle and adjust subtitles.

**Why this priority**: User control enhances experience.

**Independent Test**: Toggle subtitle on/off, adjust timing offset.

**Acceptance Scenarios**:

1. **Given** subtitles visible, **When** user toggles off, **Then** subtitles hide
2. **Given** subtitles hidden, **When** user toggles on, **Then** subtitles show
3. **Given** subtitle timing off, **When** user adjusts offset, **Then** timing shifts accordingly

---

### Edge Cases

- What happens when SRT file encoding is not UTF-8?
- How does system handle malformed subtitle files?
- What happens when subtitle timestamp exceeds video duration?
- How does system handle overlapping subtitle entries?

## Requirements

### Functional Requirements

- **FR-001**: System MUST parse SRT subtitle format
- **FR-002**: System MUST parse ASS/SSA subtitle format
- **FR-003**: System MUST detect embedded subtitle tracks in containers
- **FR-004**: System MUST render subtitles overlaid on video
- **FR-005**: System MUST support subtitle toggle (show/hide)
- **FR-006**: System MUST support timing offset adjustment
- **FR-007**: System MUST handle UTF-8 and common encodings

### Key Entities

- **SubtitleTrack**: Format type, language, embedded/external flag
- **SubtitleEntry**: Start time, end time, text content, style (for ASS)
- **SubtitleStyle**: Font, size, color, position, effects (ASS-specific)

## Success Criteria

### Measurable Outcomes

- **SC-001**: SRT parsing succeeds for 99% of well-formed files
- **SC-002**: ASS basic styling (font, color, position) renders correctly
- **SC-003**: Subtitle sync accuracy within 50ms of specified timestamp
- **SC-004**: Subtitle rendering does not impact playback performance
- **SC-005**: 100% test coverage for subtitle parsing
