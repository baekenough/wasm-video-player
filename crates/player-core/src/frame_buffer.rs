//! Frame buffer for managing decoded frames.
//!
//! This module provides a thread-safe FIFO buffer for storing decoded video
//! and audio frames, enabling smooth playback through buffering.

use crate::decoder::{AudioFrame, VideoFrame};
use crate::error::{PlayerError, Result};
use std::collections::VecDeque;

/// Configuration for frame buffers.
#[derive(Debug, Clone)]
pub struct FrameBufferConfig {
    /// Maximum number of video frames to buffer.
    pub max_video_frames: usize,
    /// Maximum number of audio frames to buffer.
    pub max_audio_frames: usize,
}

impl Default for FrameBufferConfig {
    fn default() -> Self {
        Self {
            max_video_frames: 30, // ~1 second at 30fps
            max_audio_frames: 50, // ~1 second of audio
        }
    }
}

/// FIFO buffer for video frames.
#[derive(Debug)]
pub struct VideoFrameBuffer {
    /// Internal frame storage.
    frames: VecDeque<VideoFrame>,
    /// Maximum capacity.
    capacity: usize,
}

impl VideoFrameBuffer {
    /// Creates a new video frame buffer with the specified capacity.
    pub fn new(capacity: usize) -> Self {
        Self {
            frames: VecDeque::with_capacity(capacity),
            capacity,
        }
    }

    /// Pushes a frame into the buffer.
    ///
    /// # Errors
    /// Returns an error if the buffer is full.
    pub fn push(&mut self, frame: VideoFrame) -> Result<()> {
        if self.frames.len() >= self.capacity {
            return Err(PlayerError::frame_buffer("Video buffer is full"));
        }
        self.frames.push_back(frame);
        Ok(())
    }

    /// Pops the oldest frame from the buffer.
    ///
    /// # Returns
    /// The oldest frame, or `None` if the buffer is empty.
    pub fn pop(&mut self) -> Option<VideoFrame> {
        self.frames.pop_front()
    }

    /// Peeks at the oldest frame without removing it.
    pub fn peek(&self) -> Option<&VideoFrame> {
        self.frames.front()
    }

    /// Returns the number of frames in the buffer.
    pub fn len(&self) -> usize {
        self.frames.len()
    }

    /// Returns whether the buffer is empty.
    pub fn is_empty(&self) -> bool {
        self.frames.is_empty()
    }

    /// Returns whether the buffer is full.
    pub fn is_full(&self) -> bool {
        self.frames.len() >= self.capacity
    }

    /// Returns the buffer capacity.
    pub fn capacity(&self) -> usize {
        self.capacity
    }

    /// Clears all frames from the buffer.
    pub fn clear(&mut self) {
        self.frames.clear();
    }

    /// Returns the PTS of the oldest frame, if any.
    pub fn front_pts(&self) -> Option<u64> {
        self.frames.front().map(|f| f.pts_ms)
    }

    /// Returns the PTS of the newest frame, if any.
    pub fn back_pts(&self) -> Option<u64> {
        self.frames.back().map(|f| f.pts_ms)
    }
}

impl Default for VideoFrameBuffer {
    fn default() -> Self {
        Self::new(FrameBufferConfig::default().max_video_frames)
    }
}

/// FIFO buffer for audio frames.
#[derive(Debug)]
pub struct AudioFrameBuffer {
    /// Internal frame storage.
    frames: VecDeque<AudioFrame>,
    /// Maximum capacity.
    capacity: usize,
}

impl AudioFrameBuffer {
    /// Creates a new audio frame buffer with the specified capacity.
    pub fn new(capacity: usize) -> Self {
        Self {
            frames: VecDeque::with_capacity(capacity),
            capacity,
        }
    }

    /// Pushes a frame into the buffer.
    pub fn push(&mut self, frame: AudioFrame) -> Result<()> {
        if self.frames.len() >= self.capacity {
            return Err(PlayerError::frame_buffer("Audio buffer is full"));
        }
        self.frames.push_back(frame);
        Ok(())
    }

    /// Pops the oldest frame from the buffer.
    pub fn pop(&mut self) -> Option<AudioFrame> {
        self.frames.pop_front()
    }

    /// Peeks at the oldest frame without removing it.
    pub fn peek(&self) -> Option<&AudioFrame> {
        self.frames.front()
    }

    /// Returns the number of frames in the buffer.
    pub fn len(&self) -> usize {
        self.frames.len()
    }

    /// Returns whether the buffer is empty.
    pub fn is_empty(&self) -> bool {
        self.frames.is_empty()
    }

    /// Returns whether the buffer is full.
    pub fn is_full(&self) -> bool {
        self.frames.len() >= self.capacity
    }

    /// Returns the buffer capacity.
    pub fn capacity(&self) -> usize {
        self.capacity
    }

    /// Clears all frames from the buffer.
    pub fn clear(&mut self) {
        self.frames.clear();
    }
}

impl Default for AudioFrameBuffer {
    fn default() -> Self {
        Self::new(FrameBufferConfig::default().max_audio_frames)
    }
}

/// Combined buffer manager for synchronized A/V playback.
#[derive(Debug)]
pub struct FrameBufferManager {
    /// Video frame buffer.
    pub video: VideoFrameBuffer,
    /// Audio frame buffer.
    pub audio: AudioFrameBuffer,
}

impl FrameBufferManager {
    /// Creates a new frame buffer manager with the given configuration.
    pub fn new(config: FrameBufferConfig) -> Self {
        Self {
            video: VideoFrameBuffer::new(config.max_video_frames),
            audio: AudioFrameBuffer::new(config.max_audio_frames),
        }
    }

    /// Clears both video and audio buffers.
    pub fn clear(&mut self) {
        self.video.clear();
        self.audio.clear();
    }

    /// Returns the total number of frames across both buffers.
    pub fn total_frames(&self) -> usize {
        self.video.len() + self.audio.len()
    }

    /// Returns buffer statistics.
    pub fn stats(&self) -> BufferStats {
        BufferStats {
            video_frames: self.video.len(),
            video_capacity: self.video.capacity(),
            audio_frames: self.audio.len(),
            audio_capacity: self.audio.capacity(),
        }
    }
}

impl Default for FrameBufferManager {
    fn default() -> Self {
        Self::new(FrameBufferConfig::default())
    }
}

/// Statistics about buffer usage.
#[derive(Debug, Clone)]
pub struct BufferStats {
    /// Number of video frames currently buffered.
    pub video_frames: usize,
    /// Video buffer capacity.
    pub video_capacity: usize,
    /// Number of audio frames currently buffered.
    pub audio_frames: usize,
    /// Audio buffer capacity.
    pub audio_capacity: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::decoder::PixelFormat;

    fn create_test_video_frame(pts_ms: u64) -> VideoFrame {
        VideoFrame {
            width: 1920,
            height: 1080,
            pts_ms,
            format: PixelFormat::Yuv420p,
            data: vec![0; 100],
        }
    }

    fn create_test_audio_frame(pts_ms: u64) -> AudioFrame {
        use crate::decoder::SampleFormat;
        AudioFrame {
            channels: 2,
            sample_rate: 48000,
            pts_ms,
            format: SampleFormat::F32,
            data: vec![0; 100],
        }
    }

    #[test]
    fn test_video_buffer_new() {
        let buffer = VideoFrameBuffer::new(10);
        assert!(buffer.is_empty());
        assert!(!buffer.is_full());
        assert_eq!(buffer.len(), 0);
        assert_eq!(buffer.capacity(), 10);
    }

    #[test]
    fn test_video_buffer_push_pop_fifo() {
        let mut buffer = VideoFrameBuffer::new(5);

        // Push frames in order
        buffer.push(create_test_video_frame(100)).unwrap();
        buffer.push(create_test_video_frame(200)).unwrap();
        buffer.push(create_test_video_frame(300)).unwrap();

        assert_eq!(buffer.len(), 3);

        // Pop should return in FIFO order
        assert_eq!(buffer.pop().unwrap().pts_ms, 100);
        assert_eq!(buffer.pop().unwrap().pts_ms, 200);
        assert_eq!(buffer.pop().unwrap().pts_ms, 300);
        assert!(buffer.pop().is_none());
    }

    #[test]
    fn test_video_buffer_full() {
        let mut buffer = VideoFrameBuffer::new(2);

        buffer.push(create_test_video_frame(100)).unwrap();
        buffer.push(create_test_video_frame(200)).unwrap();

        assert!(buffer.is_full());

        // Should fail when full
        let result = buffer.push(create_test_video_frame(300));
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("full"));
    }

    #[test]
    fn test_video_buffer_peek() {
        let mut buffer = VideoFrameBuffer::new(5);

        assert!(buffer.peek().is_none());

        buffer.push(create_test_video_frame(100)).unwrap();
        buffer.push(create_test_video_frame(200)).unwrap();

        // Peek should not remove the frame
        assert_eq!(buffer.peek().unwrap().pts_ms, 100);
        assert_eq!(buffer.peek().unwrap().pts_ms, 100);
        assert_eq!(buffer.len(), 2);
    }

    #[test]
    fn test_video_buffer_pts_tracking() {
        let mut buffer = VideoFrameBuffer::new(5);

        buffer.push(create_test_video_frame(100)).unwrap();
        buffer.push(create_test_video_frame(200)).unwrap();
        buffer.push(create_test_video_frame(300)).unwrap();

        assert_eq!(buffer.front_pts(), Some(100));
        assert_eq!(buffer.back_pts(), Some(300));
    }

    #[test]
    fn test_video_buffer_clear() {
        let mut buffer = VideoFrameBuffer::new(5);

        buffer.push(create_test_video_frame(100)).unwrap();
        buffer.push(create_test_video_frame(200)).unwrap();

        buffer.clear();
        assert!(buffer.is_empty());
        assert_eq!(buffer.len(), 0);
    }

    #[test]
    fn test_audio_buffer_push_pop_fifo() {
        let mut buffer = AudioFrameBuffer::new(5);

        buffer.push(create_test_audio_frame(100)).unwrap();
        buffer.push(create_test_audio_frame(200)).unwrap();
        buffer.push(create_test_audio_frame(300)).unwrap();

        // Pop should return in FIFO order
        assert_eq!(buffer.pop().unwrap().pts_ms, 100);
        assert_eq!(buffer.pop().unwrap().pts_ms, 200);
        assert_eq!(buffer.pop().unwrap().pts_ms, 300);
    }

    #[test]
    fn test_audio_buffer_full() {
        let mut buffer = AudioFrameBuffer::new(2);

        buffer.push(create_test_audio_frame(100)).unwrap();
        buffer.push(create_test_audio_frame(200)).unwrap();

        let result = buffer.push(create_test_audio_frame(300));
        assert!(result.is_err());
    }

    #[test]
    fn test_frame_buffer_manager() {
        let config = FrameBufferConfig {
            max_video_frames: 10,
            max_audio_frames: 20,
        };
        let mut manager = FrameBufferManager::new(config);

        manager.video.push(create_test_video_frame(100)).unwrap();
        manager.audio.push(create_test_audio_frame(100)).unwrap();
        manager.audio.push(create_test_audio_frame(200)).unwrap();

        assert_eq!(manager.total_frames(), 3);

        let stats = manager.stats();
        assert_eq!(stats.video_frames, 1);
        assert_eq!(stats.video_capacity, 10);
        assert_eq!(stats.audio_frames, 2);
        assert_eq!(stats.audio_capacity, 20);
    }

    #[test]
    fn test_frame_buffer_manager_clear() {
        let mut manager = FrameBufferManager::default();

        manager.video.push(create_test_video_frame(100)).unwrap();
        manager.audio.push(create_test_audio_frame(100)).unwrap();

        manager.clear();

        assert!(manager.video.is_empty());
        assert!(manager.audio.is_empty());
        assert_eq!(manager.total_frames(), 0);
    }

    #[test]
    fn test_default_config() {
        let config = FrameBufferConfig::default();
        assert_eq!(config.max_video_frames, 30);
        assert_eq!(config.max_audio_frames, 50);
    }
}
