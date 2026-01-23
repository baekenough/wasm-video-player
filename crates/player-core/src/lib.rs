//! Player Core - WASM Video Player Core Library
//!
//! This crate provides the core functionality for a WebAssembly-based video player,
//! including demuxing, decoding, frame buffering, and subtitle handling.
//!
//! # Architecture
//!
//! ```text
//! ┌─────────────┐     ┌─────────────┐     ┌───────────────┐
//! │   Demuxer   │ ──▶ │   Decoder   │ ──▶ │ FrameBuffer   │
//! └─────────────┘     └─────────────┘     └───────────────┘
//!       │                                         │
//!       ▼                                         ▼
//! ┌─────────────┐                         ┌───────────────┐
//! │  Subtitle   │                         │   Renderer    │
//! └─────────────┘                         │   (JS side)   │
//!                                         └───────────────┘
//! ```
//!
//! # Example
//!
//! ```ignore
//! use player_core::PlayerCore;
//!
//! let player = PlayerCore::new();
//! player.load(&video_data)?;
//! player.play();
//! ```

#![deny(warnings)]
#![deny(missing_docs)]
#![deny(clippy::all)]

use wasm_bindgen::prelude::*;

pub mod decoder;
pub mod demuxer;
pub mod error;
pub mod frame_buffer;
pub mod subtitle;

pub use decoder::{AudioDecoder, VideoDecoder};
pub use demuxer::Demuxer;
pub use error::{PlayerError, Result};
pub use frame_buffer::{AudioFrameBuffer, FrameBufferManager, VideoFrameBuffer};
pub use subtitle::{SubtitleParser, SubtitleTrack};

/// Library version string.
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Returns the library version.
#[wasm_bindgen]
pub fn version() -> String {
    VERSION.to_string()
}

/// Player state enumeration.
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PlayerState {
    /// Initial state, no media loaded.
    Idle,
    /// Media is being loaded.
    Loading,
    /// Media is loaded and ready to play.
    Ready,
    /// Media is currently playing.
    Playing,
    /// Playback is paused.
    Paused,
    /// Playback has ended.
    Ended,
    /// An error occurred.
    Error,
}

/// Main player core structure exposed to JavaScript.
#[wasm_bindgen]
pub struct PlayerCore {
    state: PlayerState,
    demuxer: Demuxer,
    video_decoder: VideoDecoder,
    audio_decoder: AudioDecoder,
    frame_buffer: FrameBufferManager,
    subtitle_parser: SubtitleParser,
}

#[wasm_bindgen]
impl PlayerCore {
    /// Creates a new PlayerCore instance.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            state: PlayerState::Idle,
            demuxer: Demuxer::new(),
            video_decoder: VideoDecoder::default(),
            audio_decoder: AudioDecoder::default(),
            frame_buffer: FrameBufferManager::default(),
            subtitle_parser: SubtitleParser::new(),
        }
    }

    /// Returns the current player state.
    #[wasm_bindgen(getter)]
    pub fn state(&self) -> PlayerState {
        self.state
    }

    /// Loads media data into the player.
    ///
    /// # Arguments
    /// * `data` - Raw container file data (MP4, MKV, etc.)
    #[wasm_bindgen]
    pub fn load(&mut self, data: Vec<u8>) -> std::result::Result<(), JsValue> {
        self.state = PlayerState::Loading;

        self.demuxer.init(data).map_err(|e| -> JsValue { e.into() })?;

        self.state = PlayerState::Ready;
        Ok(())
    }

    /// Starts playback.
    #[wasm_bindgen]
    pub fn play(&mut self) -> std::result::Result<(), JsValue> {
        if self.state != PlayerState::Ready && self.state != PlayerState::Paused {
            return Err(JsValue::from_str("Cannot play: invalid state"));
        }
        self.state = PlayerState::Playing;
        Ok(())
    }

    /// Pauses playback.
    #[wasm_bindgen]
    pub fn pause(&mut self) -> std::result::Result<(), JsValue> {
        if self.state != PlayerState::Playing {
            return Err(JsValue::from_str("Cannot pause: not playing"));
        }
        self.state = PlayerState::Paused;
        Ok(())
    }

    /// Seeks to a specific timestamp.
    ///
    /// # Arguments
    /// * `timestamp_ms` - Target timestamp in milliseconds.
    #[wasm_bindgen]
    pub fn seek(&mut self, timestamp_ms: u64) -> std::result::Result<(), JsValue> {
        self.demuxer
            .seek(timestamp_ms)
            .map_err(|e| -> JsValue { e.into() })?;
        self.frame_buffer.clear();
        Ok(())
    }

    /// Resets the player to idle state.
    #[wasm_bindgen]
    pub fn reset(&mut self) {
        self.state = PlayerState::Idle;
        self.demuxer = Demuxer::new();
        self.video_decoder = VideoDecoder::default();
        self.audio_decoder = AudioDecoder::default();
        self.frame_buffer.clear();
    }

    /// Returns the detected container format.
    #[wasm_bindgen]
    pub fn format(&self) -> Option<String> {
        self.demuxer.format().map(|f| format!("{:?}", f))
    }

    /// Returns buffer statistics as JSON.
    #[wasm_bindgen]
    pub fn buffer_stats(&self) -> String {
        let stats = self.frame_buffer.stats();
        serde_json::to_string(&serde_json::json!({
            "videoFrames": stats.video_frames,
            "videoCapacity": stats.video_capacity,
            "audioFrames": stats.audio_frames,
            "audioCapacity": stats.audio_capacity,
        }))
        .unwrap_or_else(|_| "{}".to_string())
    }

    /// Loads subtitles from text content.
    #[wasm_bindgen]
    pub fn load_subtitles(&self, data: &str) -> std::result::Result<String, JsValue> {
        let track = self
            .subtitle_parser
            .parse(data, None)
            .map_err(|e| -> JsValue { e.into() })?;

        serde_json::to_string(&serde_json::json!({
            "format": format!("{:?}", track.format),
            "cueCount": track.cue_count(),
        }))
        .map_err(|e| JsValue::from_str(&e.to_string()))
    }
}

impl Default for PlayerCore {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        let v = version();
        assert!(!v.is_empty());
        assert_eq!(v, "0.1.0");
    }

    #[test]
    fn test_player_core_new() {
        let player = PlayerCore::new();
        assert_eq!(player.state(), PlayerState::Idle);
    }

    // Note: Tests below require wasm32 target due to JsValue return types
    #[test]
    #[cfg(target_arch = "wasm32")]
    fn test_player_core_state_transitions() {
        let mut player = PlayerCore::new();

        // Initial state
        assert_eq!(player.state(), PlayerState::Idle);

        // Load with valid MP4 data
        let mut data = vec![0, 0, 0, 20];
        data.extend_from_slice(b"ftyp");
        data.extend_from_slice(b"isom");
        data.extend_from_slice(&[0, 0, 0, 0]);

        let result = player.load(data);
        assert!(result.is_ok());
        assert_eq!(player.state(), PlayerState::Ready);

        // Play
        let result = player.play();
        assert!(result.is_ok());
        assert_eq!(player.state(), PlayerState::Playing);

        // Pause
        let result = player.pause();
        assert!(result.is_ok());
        assert_eq!(player.state(), PlayerState::Paused);

        // Play again
        let result = player.play();
        assert!(result.is_ok());
        assert_eq!(player.state(), PlayerState::Playing);
    }

    #[test]
    #[cfg(target_arch = "wasm32")]
    fn test_player_core_invalid_state_transitions() {
        let mut player = PlayerCore::new();

        // Cannot play from Idle
        let result = player.play();
        assert!(result.is_err());

        // Cannot pause when not playing
        let result = player.pause();
        assert!(result.is_err());
    }

    #[test]
    #[cfg(target_arch = "wasm32")]
    fn test_player_core_reset() {
        let mut player = PlayerCore::new();

        // Load and start playing
        let mut data = vec![0, 0, 0, 20];
        data.extend_from_slice(b"ftyp");
        data.extend_from_slice(b"isom");
        data.extend_from_slice(&[0, 0, 0, 0]);
        player.load(data).unwrap();
        player.play().unwrap();

        // Reset
        player.reset();
        assert_eq!(player.state(), PlayerState::Idle);
    }

    #[test]
    #[cfg(target_arch = "wasm32")]
    fn test_player_core_format() {
        let mut player = PlayerCore::new();

        // No format before load
        assert!(player.format().is_none());

        // Load MP4
        let mut data = vec![0, 0, 0, 20];
        data.extend_from_slice(b"ftyp");
        data.extend_from_slice(b"isom");
        data.extend_from_slice(&[0, 0, 0, 0]);
        player.load(data).unwrap();

        assert!(player.format().is_some());
        assert!(player.format().unwrap().contains("Mp4"));
    }

    #[test]
    fn test_player_core_buffer_stats() {
        let player = PlayerCore::new();
        let stats = player.buffer_stats();

        assert!(stats.contains("videoFrames"));
        assert!(stats.contains("audioFrames"));
    }

    #[test]
    fn test_player_core_default() {
        let player = PlayerCore::default();
        assert_eq!(player.state(), PlayerState::Idle);
    }
}
