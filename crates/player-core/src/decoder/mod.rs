//! Decoder module for video and audio decoding.
//!
//! This module provides functionality to decode compressed video and audio
//! streams into raw frames that can be rendered.

use crate::error::{PlayerError, Result};
use serde::{Deserialize, Serialize};

/// Supported video codecs.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum VideoCodec {
    /// H.264 / AVC.
    H264,
    /// H.265 / HEVC.
    H265,
    /// VP8.
    Vp8,
    /// VP9.
    Vp9,
    /// AV1.
    Av1,
}

/// Supported audio codecs.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AudioCodec {
    /// AAC.
    Aac,
    /// MP3.
    Mp3,
    /// Opus.
    Opus,
    /// Vorbis.
    Vorbis,
}

/// A decoded video frame.
#[derive(Debug, Clone)]
pub struct VideoFrame {
    /// Frame width in pixels.
    pub width: u32,
    /// Frame height in pixels.
    pub height: u32,
    /// Presentation timestamp in milliseconds.
    pub pts_ms: u64,
    /// Pixel format.
    pub format: PixelFormat,
    /// Raw pixel data.
    pub data: Vec<u8>,
}

/// A decoded audio frame.
#[derive(Debug, Clone)]
pub struct AudioFrame {
    /// Number of audio channels.
    pub channels: u8,
    /// Sample rate in Hz.
    pub sample_rate: u32,
    /// Presentation timestamp in milliseconds.
    pub pts_ms: u64,
    /// Sample format.
    pub format: SampleFormat,
    /// Raw audio samples.
    pub data: Vec<u8>,
}

/// Pixel format for video frames.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PixelFormat {
    /// YUV420 planar.
    Yuv420p,
    /// RGBA.
    Rgba,
    /// RGB.
    Rgb,
}

/// Sample format for audio frames.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SampleFormat {
    /// 16-bit signed integer.
    S16,
    /// 32-bit float.
    F32,
}

/// Configuration for the decoder.
#[derive(Debug, Clone)]
pub struct DecoderConfig {
    /// Whether to use hardware acceleration if available.
    pub hardware_acceleration: bool,
    /// Number of decode threads (0 = auto).
    pub threads: u32,
}

impl Default for DecoderConfig {
    fn default() -> Self {
        Self {
            hardware_acceleration: true,
            threads: 0,
        }
    }
}

/// Video decoder for decoding compressed video frames.
#[derive(Debug)]
pub struct VideoDecoder {
    /// Codec being used.
    codec: Option<VideoCodec>,
    /// Decoder configuration.
    config: DecoderConfig,
    /// Whether the decoder has been initialized.
    initialized: bool,
}

impl Default for VideoDecoder {
    fn default() -> Self {
        Self::new(DecoderConfig::default())
    }
}

impl VideoDecoder {
    /// Creates a new video decoder with the given configuration.
    pub fn new(config: DecoderConfig) -> Self {
        Self {
            codec: None,
            config,
            initialized: false,
        }
    }

    /// Initializes the decoder for a specific codec.
    ///
    /// # Arguments
    /// * `codec` - The video codec to decode.
    /// * `extra_data` - Codec-specific initialization data (e.g., SPS/PPS for H.264).
    ///
    /// # Errors
    /// Returns an error if the codec is not supported or initialization fails.
    pub fn init(&mut self, codec: VideoCodec, extra_data: Option<&[u8]>) -> Result<()> {
        // Stub implementation
        let _ = extra_data;

        self.codec = Some(codec);
        self.initialized = true;

        Ok(())
    }

    /// Decodes a compressed video packet.
    ///
    /// # Arguments
    /// * `data` - Compressed video data.
    /// * `pts_ms` - Presentation timestamp in milliseconds.
    ///
    /// # Returns
    /// Decoded video frame, or `None` if more data is needed.
    ///
    /// # Errors
    /// Returns an error if decoding fails.
    pub fn decode(&mut self, data: &[u8], pts_ms: u64) -> Result<Option<VideoFrame>> {
        if !self.initialized {
            return Err(PlayerError::decoder("Decoder not initialized"));
        }

        if data.is_empty() {
            return Err(PlayerError::decoder("Empty packet data"));
        }

        // Stub implementation - returns a placeholder frame
        Ok(Some(VideoFrame {
            width: 1920,
            height: 1080,
            pts_ms,
            format: PixelFormat::Yuv420p,
            data: vec![0; 1920 * 1080 * 3 / 2], // YUV420p size
        }))
    }

    /// Flushes any buffered frames from the decoder.
    ///
    /// # Returns
    /// Vector of remaining decoded frames.
    pub fn flush(&mut self) -> Result<Vec<VideoFrame>> {
        if !self.initialized {
            return Err(PlayerError::decoder("Decoder not initialized"));
        }

        // Stub implementation
        Ok(Vec::new())
    }

    /// Returns the current codec.
    pub fn codec(&self) -> Option<VideoCodec> {
        self.codec
    }

    /// Returns whether the decoder is initialized.
    pub fn is_initialized(&self) -> bool {
        self.initialized
    }

    /// Returns the decoder configuration.
    pub fn config(&self) -> &DecoderConfig {
        &self.config
    }
}

/// Audio decoder for decoding compressed audio frames.
#[derive(Debug)]
pub struct AudioDecoder {
    /// Codec being used.
    codec: Option<AudioCodec>,
    /// Decoder configuration.
    config: DecoderConfig,
    /// Whether the decoder has been initialized.
    initialized: bool,
}

impl Default for AudioDecoder {
    fn default() -> Self {
        Self::new(DecoderConfig::default())
    }
}

impl AudioDecoder {
    /// Creates a new audio decoder with the given configuration.
    pub fn new(config: DecoderConfig) -> Self {
        Self {
            codec: None,
            config,
            initialized: false,
        }
    }

    /// Initializes the decoder for a specific codec.
    pub fn init(&mut self, codec: AudioCodec, extra_data: Option<&[u8]>) -> Result<()> {
        let _ = extra_data;

        self.codec = Some(codec);
        self.initialized = true;

        Ok(())
    }

    /// Decodes a compressed audio packet.
    pub fn decode(&mut self, data: &[u8], pts_ms: u64) -> Result<Option<AudioFrame>> {
        if !self.initialized {
            return Err(PlayerError::decoder("Decoder not initialized"));
        }

        if data.is_empty() {
            return Err(PlayerError::decoder("Empty packet data"));
        }

        // Stub implementation
        Ok(Some(AudioFrame {
            channels: 2,
            sample_rate: 48000,
            pts_ms,
            format: SampleFormat::F32,
            data: vec![0; 4096],
        }))
    }

    /// Flushes any buffered frames from the decoder.
    pub fn flush(&mut self) -> Result<Vec<AudioFrame>> {
        if !self.initialized {
            return Err(PlayerError::decoder("Decoder not initialized"));
        }

        Ok(Vec::new())
    }

    /// Returns the current codec.
    pub fn codec(&self) -> Option<AudioCodec> {
        self.codec
    }

    /// Returns whether the decoder is initialized.
    pub fn is_initialized(&self) -> bool {
        self.initialized
    }

    /// Returns the decoder configuration.
    pub fn config(&self) -> &DecoderConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_video_decoder_new() {
        let decoder = VideoDecoder::default();
        assert!(!decoder.is_initialized());
        assert!(decoder.codec().is_none());
    }

    #[test]
    fn test_video_decoder_init() {
        let mut decoder = VideoDecoder::default();
        let result = decoder.init(VideoCodec::H264, None);
        assert!(result.is_ok());
        assert!(decoder.is_initialized());
        assert_eq!(decoder.codec(), Some(VideoCodec::H264));
    }

    #[test]
    fn test_video_decoder_decode_without_init() {
        let mut decoder = VideoDecoder::default();
        let result = decoder.decode(&[1, 2, 3], 0);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("not initialized"));
    }

    #[test]
    fn test_video_decoder_decode_empty_data() {
        let mut decoder = VideoDecoder::default();
        decoder.init(VideoCodec::H264, None).unwrap();
        let result = decoder.decode(&[], 0);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Empty packet"));
    }

    #[test]
    fn test_video_decoder_decode_success() {
        let mut decoder = VideoDecoder::default();
        decoder.init(VideoCodec::H264, None).unwrap();
        let result = decoder.decode(&[0, 0, 0, 1, 0x67], 1000);
        assert!(result.is_ok());
        let frame = result.unwrap().unwrap();
        assert_eq!(frame.pts_ms, 1000);
        assert_eq!(frame.width, 1920);
        assert_eq!(frame.height, 1080);
    }

    #[test]
    fn test_audio_decoder_new() {
        let decoder = AudioDecoder::default();
        assert!(!decoder.is_initialized());
        assert!(decoder.codec().is_none());
    }

    #[test]
    fn test_audio_decoder_init() {
        let mut decoder = AudioDecoder::default();
        let result = decoder.init(AudioCodec::Aac, None);
        assert!(result.is_ok());
        assert!(decoder.is_initialized());
        assert_eq!(decoder.codec(), Some(AudioCodec::Aac));
    }

    #[test]
    fn test_audio_decoder_decode_success() {
        let mut decoder = AudioDecoder::default();
        decoder.init(AudioCodec::Opus, None).unwrap();
        let result = decoder.decode(&[1, 2, 3, 4], 500);
        assert!(result.is_ok());
        let frame = result.unwrap().unwrap();
        assert_eq!(frame.pts_ms, 500);
        assert_eq!(frame.channels, 2);
        assert_eq!(frame.sample_rate, 48000);
    }

    #[test]
    fn test_decoder_config_default() {
        let config = DecoderConfig::default();
        assert!(config.hardware_acceleration);
        assert_eq!(config.threads, 0);
    }

    #[test]
    fn test_video_codec_serialization() {
        let codec = VideoCodec::H265;
        let json = serde_json::to_string(&codec).unwrap();
        let deserialized: VideoCodec = serde_json::from_str(&json).unwrap();
        assert_eq!(codec, deserialized);
    }

    #[test]
    fn test_pixel_format_serialization() {
        let format = PixelFormat::Rgba;
        let json = serde_json::to_string(&format).unwrap();
        let deserialized: PixelFormat = serde_json::from_str(&json).unwrap();
        assert_eq!(format, deserialized);
    }
}
