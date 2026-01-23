//! Demuxer module for parsing container formats.
//!
//! This module provides functionality to demux video container formats
//! (MP4, MKV, WebM, etc.) and extract audio/video streams.

use crate::error::{PlayerError, Result};
use serde::{Deserialize, Serialize};

/// Supported container formats.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ContainerFormat {
    /// MPEG-4 Part 14 container.
    Mp4,
    /// Matroska container.
    Mkv,
    /// WebM container (subset of Matroska).
    WebM,
    /// Unknown or unsupported format.
    Unknown,
}

/// Information about a media stream.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamInfo {
    /// Stream index within the container.
    pub index: u32,
    /// Stream type.
    pub stream_type: StreamType,
    /// Codec identifier.
    pub codec: String,
    /// Duration in milliseconds.
    pub duration_ms: Option<u64>,
}

/// Type of media stream.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum StreamType {
    /// Video stream.
    Video,
    /// Audio stream.
    Audio,
    /// Subtitle stream.
    Subtitle,
}

/// A demuxed packet containing encoded data.
#[derive(Debug, Clone)]
pub struct Packet {
    /// Stream index this packet belongs to.
    pub stream_index: u32,
    /// Presentation timestamp in milliseconds.
    pub pts_ms: u64,
    /// Decode timestamp in milliseconds.
    pub dts_ms: u64,
    /// Whether this is a keyframe.
    pub is_keyframe: bool,
    /// Encoded data.
    pub data: Vec<u8>,
}

/// Demuxer for parsing container formats and extracting streams.
#[derive(Debug)]
pub struct Demuxer {
    /// The detected container format.
    format: Option<ContainerFormat>,
    /// Information about available streams.
    streams: Vec<StreamInfo>,
    /// Raw container data.
    data: Vec<u8>,
    /// Current read position.
    position: usize,
    /// Whether the demuxer has been initialized.
    initialized: bool,
}

impl Default for Demuxer {
    fn default() -> Self {
        Self::new()
    }
}

impl Demuxer {
    /// Creates a new empty demuxer.
    pub fn new() -> Self {
        Self {
            format: None,
            streams: Vec::new(),
            data: Vec::new(),
            position: 0,
            initialized: false,
        }
    }

    /// Initializes the demuxer with container data.
    ///
    /// # Arguments
    /// * `data` - Raw container file data.
    ///
    /// # Errors
    /// Returns an error if the data is empty or the format cannot be detected.
    pub fn init(&mut self, data: Vec<u8>) -> Result<()> {
        if data.is_empty() {
            return Err(PlayerError::demuxer("Empty data provided"));
        }

        // Detect container format from magic bytes
        let format = self.detect_format(&data)?;

        self.data = data;
        self.format = Some(format);
        self.position = 0;
        self.initialized = true;

        // Parse container structure (stub for now)
        self.parse_streams()?;

        Ok(())
    }

    /// Detects the container format from magic bytes.
    fn detect_format(&self, data: &[u8]) -> Result<ContainerFormat> {
        if data.len() < 12 {
            return Err(PlayerError::invalid_format(
                "Data too short to detect format",
            ));
        }

        // Check for ftyp box (MP4)
        if data.len() >= 8 && &data[4..8] == b"ftyp" {
            return Ok(ContainerFormat::Mp4);
        }

        // Check for EBML header (MKV/WebM)
        if data.len() >= 4 && &data[0..4] == &[0x1A, 0x45, 0xDF, 0xA3] {
            // Further check for WebM vs MKV would require parsing EBML
            return Ok(ContainerFormat::Mkv);
        }

        Ok(ContainerFormat::Unknown)
    }

    /// Parses stream information from the container.
    fn parse_streams(&mut self) -> Result<()> {
        // Stub implementation - actual parsing would depend on format
        // For now, create placeholder stream info
        match self.format {
            Some(ContainerFormat::Mp4) | Some(ContainerFormat::Mkv) | Some(ContainerFormat::WebM) => {
                // Placeholder: assume one video stream
                self.streams.push(StreamInfo {
                    index: 0,
                    stream_type: StreamType::Video,
                    codec: "unknown".to_string(),
                    duration_ms: None,
                });
            }
            _ => {}
        }
        Ok(())
    }

    /// Returns the detected container format.
    pub fn format(&self) -> Option<ContainerFormat> {
        self.format
    }

    /// Returns information about all streams in the container.
    pub fn streams(&self) -> &[StreamInfo] {
        &self.streams
    }

    /// Returns whether the demuxer has been initialized.
    pub fn is_initialized(&self) -> bool {
        self.initialized
    }

    /// Reads the next packet from the container.
    ///
    /// # Returns
    /// `Ok(Some(packet))` if a packet was read, `Ok(None)` if end of stream,
    /// or an error if demuxing fails.
    pub fn read_packet(&mut self) -> Result<Option<Packet>> {
        if !self.initialized {
            return Err(PlayerError::demuxer("Demuxer not initialized"));
        }

        // Stub implementation
        // Real implementation would parse container structure and extract packets
        Ok(None)
    }

    /// Seeks to a position in the container.
    ///
    /// # Arguments
    /// * `timestamp_ms` - Target timestamp in milliseconds.
    ///
    /// # Errors
    /// Returns an error if seeking fails or is not supported.
    pub fn seek(&mut self, timestamp_ms: u64) -> Result<()> {
        if !self.initialized {
            return Err(PlayerError::demuxer("Demuxer not initialized"));
        }

        // Stub implementation
        let _ = timestamp_ms;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_demuxer_new() {
        let demuxer = Demuxer::new();
        assert!(!demuxer.is_initialized());
        assert!(demuxer.format().is_none());
        assert!(demuxer.streams().is_empty());
    }

    #[test]
    fn test_demuxer_reject_empty_data() {
        let mut demuxer = Demuxer::new();
        let result = demuxer.init(vec![]);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Empty data provided"));
    }

    #[test]
    fn test_demuxer_reject_short_data() {
        let mut demuxer = Demuxer::new();
        let result = demuxer.init(vec![0, 1, 2, 3, 4]); // Too short
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("too short"));
    }

    #[test]
    fn test_demuxer_detect_mp4() {
        let mut demuxer = Demuxer::new();
        // Minimal MP4 ftyp box
        let mut data = vec![0, 0, 0, 20]; // box size
        data.extend_from_slice(b"ftyp"); // box type
        data.extend_from_slice(b"isom"); // major brand
        data.extend_from_slice(&[0, 0, 0, 0]); // minor version

        let result = demuxer.init(data);
        assert!(result.is_ok());
        assert_eq!(demuxer.format(), Some(ContainerFormat::Mp4));
        assert!(demuxer.is_initialized());
    }

    #[test]
    fn test_demuxer_detect_mkv() {
        let mut demuxer = Demuxer::new();
        // EBML header magic bytes
        let mut data = vec![0x1A, 0x45, 0xDF, 0xA3];
        data.extend_from_slice(&[0; 20]); // padding

        let result = demuxer.init(data);
        assert!(result.is_ok());
        assert_eq!(demuxer.format(), Some(ContainerFormat::Mkv));
    }

    #[test]
    fn test_demuxer_unknown_format() {
        let mut demuxer = Demuxer::new();
        let data = vec![0xFF; 20]; // Unknown format

        let result = demuxer.init(data);
        assert!(result.is_ok());
        assert_eq!(demuxer.format(), Some(ContainerFormat::Unknown));
    }

    #[test]
    fn test_demuxer_read_packet_without_init() {
        let mut demuxer = Demuxer::new();
        let result = demuxer.read_packet();
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("not initialized"));
    }

    #[test]
    fn test_demuxer_seek_without_init() {
        let mut demuxer = Demuxer::new();
        let result = demuxer.seek(1000);
        assert!(result.is_err());
    }

    #[test]
    fn test_stream_info_serialization() {
        let info = StreamInfo {
            index: 0,
            stream_type: StreamType::Video,
            codec: "h264".to_string(),
            duration_ms: Some(60000),
        };

        let json = serde_json::to_string(&info).unwrap();
        let deserialized: StreamInfo = serde_json::from_str(&json).unwrap();

        assert_eq!(info.index, deserialized.index);
        assert_eq!(info.stream_type, deserialized.stream_type);
        assert_eq!(info.codec, deserialized.codec);
        assert_eq!(info.duration_ms, deserialized.duration_ms);
    }
}
