//! Error types for the player core.
//!
//! This module defines all error types used throughout the player-core crate.

use thiserror::Error;
use wasm_bindgen::prelude::*;

/// Result type alias for player-core operations.
pub type Result<T> = std::result::Result<T, PlayerError>;

/// Main error type for player-core operations.
#[derive(Error, Debug, Clone)]
pub enum PlayerError {
    /// Error during demuxing operations.
    #[error("Demuxer error: {0}")]
    Demuxer(String),

    /// Error during decoding operations.
    #[error("Decoder error: {0}")]
    Decoder(String),

    /// Error with frame buffer operations.
    #[error("FrameBuffer error: {0}")]
    FrameBuffer(String),

    /// Error parsing or rendering subtitles.
    #[error("Subtitle error: {0}")]
    Subtitle(String),

    /// Invalid or unsupported media format.
    #[error("Invalid format: {0}")]
    InvalidFormat(String),

    /// I/O error during file operations.
    #[error("I/O error: {0}")]
    Io(String),

    /// General internal error.
    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<PlayerError> for JsValue {
    fn from(error: PlayerError) -> Self {
        JsValue::from_str(&error.to_string())
    }
}

impl PlayerError {
    /// Creates a new demuxer error.
    pub fn demuxer(msg: impl Into<String>) -> Self {
        Self::Demuxer(msg.into())
    }

    /// Creates a new decoder error.
    pub fn decoder(msg: impl Into<String>) -> Self {
        Self::Decoder(msg.into())
    }

    /// Creates a new frame buffer error.
    pub fn frame_buffer(msg: impl Into<String>) -> Self {
        Self::FrameBuffer(msg.into())
    }

    /// Creates a new subtitle error.
    pub fn subtitle(msg: impl Into<String>) -> Self {
        Self::Subtitle(msg.into())
    }

    /// Creates a new invalid format error.
    pub fn invalid_format(msg: impl Into<String>) -> Self {
        Self::InvalidFormat(msg.into())
    }

    /// Creates a new I/O error.
    pub fn io(msg: impl Into<String>) -> Self {
        Self::Io(msg.into())
    }

    /// Creates a new internal error.
    pub fn internal(msg: impl Into<String>) -> Self {
        Self::Internal(msg.into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let error = PlayerError::demuxer("test error");
        assert_eq!(error.to_string(), "Demuxer error: test error");
    }

    #[test]
    #[cfg(target_arch = "wasm32")]
    fn test_error_conversion_to_jsvalue() {
        let error = PlayerError::decoder("codec not supported");
        let js_value: JsValue = error.into();
        // JsValue conversion should succeed without panic
        assert!(js_value.is_string());
    }

    #[test]
    fn test_all_error_variants() {
        let errors = vec![
            PlayerError::demuxer("demux failed"),
            PlayerError::decoder("decode failed"),
            PlayerError::frame_buffer("buffer full"),
            PlayerError::subtitle("parse failed"),
            PlayerError::invalid_format("unknown format"),
            PlayerError::io("file not found"),
            PlayerError::internal("unexpected state"),
        ];

        for error in errors {
            // Each error should have a non-empty message
            assert!(!error.to_string().is_empty());
        }
    }

    #[test]
    fn test_error_clone() {
        let original = PlayerError::demuxer("test");
        let cloned = original.clone();
        assert_eq!(original.to_string(), cloned.to_string());
    }
}
