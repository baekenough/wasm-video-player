# Feature Specification: Core Playback

**Feature Branch**: `001-core-playback`
**Created**: 2026-01-23
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - Play Local Video File (Priority: P1)

User opens a local video file and watches it play smoothly.

**Why this priority**: Core functionality - without playback, nothing else matters.

**Independent Test**: Can be fully tested by loading a test video file and verifying frames render correctly.

**Acceptance Scenarios**:

1. **Given** app is open, **When** user selects an MKV file, **Then** video starts playing within 2 seconds
2. **Given** video is playing, **When** user clicks pause, **Then** video pauses immediately
3. **Given** video is paused, **When** user clicks play, **Then** video resumes from same position
4. **Given** video is playing, **When** video reaches end, **Then** playback stops at last frame

---

### User Story 2 - Audio Sync (Priority: P1)

Audio plays in sync with video frames.

**Why this priority**: Video without audio is incomplete experience.

**Independent Test**: Play video with audio track, verify lip sync and audio delay < 50ms.

**Acceptance Scenarios**:

1. **Given** video with audio track, **When** playing, **Then** audio is synchronized within 50ms
2. **Given** video playing, **When** seeking, **Then** audio resumes in sync after seek
3. **Given** video with multiple audio tracks, **When** playing, **Then** default track plays

---

### User Story 3 - Format Support (Priority: P2)

Player supports common video formats and codecs.

**Why this priority**: Users have videos in various formats.

**Independent Test**: Load test files in each supported format.

**Acceptance Scenarios**:

1. **Given** MKV file with H.264, **When** opened, **Then** plays correctly
2. **Given** MP4 file with HEVC, **When** opened, **Then** plays correctly
3. **Given** WebM file with VP9, **When** opened, **Then** plays correctly
4. **Given** AVI file, **When** opened, **Then** plays correctly
5. **Given** unsupported codec, **When** opened, **Then** shows clear error message

---

### Edge Cases

- What happens when file is corrupted mid-stream?
- How does system handle very large files (>10GB)?
- What happens when audio track is missing?
- How does system handle variable frame rate videos?

## Requirements

### Functional Requirements

- **FR-001**: System MUST load and parse video containers (MKV, MP4, AVI, WebM)
- **FR-002**: System MUST decode H.264, HEVC/H.265, VP9 video codecs
- **FR-003**: System MUST decode common audio codecs (AAC, MP3, Opus, FLAC)
- **FR-004**: System MUST render decoded frames via WebGL
- **FR-005**: System MUST synchronize audio playback with video frames
- **FR-006**: System MUST support play/pause control
- **FR-007**: System MUST handle end-of-file gracefully

### Key Entities

- **VideoFile**: Container format, streams, duration, metadata
- **VideoStream**: Codec, resolution, frame rate, bitrate
- **AudioStream**: Codec, sample rate, channels, bitrate
- **Frame**: Decoded frame data, timestamp, keyframe flag
- **FrameBuffer**: Queue of decoded frames awaiting render

## Success Criteria

### Measurable Outcomes

- **SC-001**: Video starts playing within 2 seconds of file selection
- **SC-002**: Audio sync deviation < 50ms during normal playback
- **SC-003**: Supports 5+ container formats
- **SC-004**: Supports 3+ video codecs
- **SC-005**: 100% test coverage for all modules
