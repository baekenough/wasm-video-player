//! Subtitle module for parsing and rendering subtitles.
//!
//! This module provides functionality to parse various subtitle formats
//! (SRT, ASS/SSA, VTT) and prepare them for rendering.

use crate::error::{PlayerError, Result};
use serde::{Deserialize, Serialize};

/// Supported subtitle formats.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SubtitleFormat {
    /// SubRip format (.srt).
    Srt,
    /// Advanced SubStation Alpha (.ass/.ssa).
    Ass,
    /// WebVTT format (.vtt).
    Vtt,
}

/// A single subtitle cue (entry).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubtitleCue {
    /// Unique identifier for the cue.
    pub id: String,
    /// Start time in milliseconds.
    pub start_ms: u64,
    /// End time in milliseconds.
    pub end_ms: u64,
    /// Subtitle text content.
    pub text: String,
    /// Optional styling information.
    pub style: Option<SubtitleStyle>,
}

/// Styling information for a subtitle.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SubtitleStyle {
    /// Font family name.
    pub font_family: Option<String>,
    /// Font size in pixels.
    pub font_size: Option<u32>,
    /// Font color as CSS color string.
    pub color: Option<String>,
    /// Background color as CSS color string.
    pub background_color: Option<String>,
    /// Whether text is bold.
    pub bold: bool,
    /// Whether text is italic.
    pub italic: bool,
    /// Whether text is underlined.
    pub underline: bool,
}

/// Parsed subtitle track.
#[derive(Debug, Clone)]
pub struct SubtitleTrack {
    /// Track format.
    pub format: SubtitleFormat,
    /// Language code (e.g., "en", "ko").
    pub language: Option<String>,
    /// Track title/label.
    pub title: Option<String>,
    /// All cues in the track.
    pub cues: Vec<SubtitleCue>,
}

impl SubtitleTrack {
    /// Creates a new empty subtitle track.
    pub fn new(format: SubtitleFormat) -> Self {
        Self {
            format,
            language: None,
            title: None,
            cues: Vec::new(),
        }
    }

    /// Returns cues that should be visible at the given timestamp.
    pub fn cues_at(&self, timestamp_ms: u64) -> Vec<&SubtitleCue> {
        self.cues
            .iter()
            .filter(|cue| timestamp_ms >= cue.start_ms && timestamp_ms < cue.end_ms)
            .collect()
    }

    /// Adds a cue to the track.
    pub fn add_cue(&mut self, cue: SubtitleCue) {
        self.cues.push(cue);
    }

    /// Returns the total number of cues.
    pub fn cue_count(&self) -> usize {
        self.cues.len()
    }
}

/// Parser for subtitle files.
#[derive(Debug, Default)]
pub struct SubtitleParser;

impl SubtitleParser {
    /// Creates a new subtitle parser.
    pub fn new() -> Self {
        Self
    }

    /// Parses a subtitle file from its contents.
    ///
    /// # Arguments
    /// * `data` - Raw subtitle file contents.
    /// * `format` - Expected subtitle format (auto-detected if None).
    ///
    /// # Errors
    /// Returns an error if parsing fails.
    pub fn parse(&self, data: &str, format: Option<SubtitleFormat>) -> Result<SubtitleTrack> {
        if data.is_empty() {
            return Err(PlayerError::subtitle("Empty subtitle data"));
        }

        let detected_format = format.unwrap_or_else(|| self.detect_format(data));

        match detected_format {
            SubtitleFormat::Srt => self.parse_srt(data),
            SubtitleFormat::Vtt => self.parse_vtt(data),
            SubtitleFormat::Ass => self.parse_ass(data),
        }
    }

    /// Detects the subtitle format from content.
    fn detect_format(&self, data: &str) -> SubtitleFormat {
        let trimmed = data.trim();

        if trimmed.starts_with("WEBVTT") {
            return SubtitleFormat::Vtt;
        }

        if trimmed.starts_with("[Script Info]") || trimmed.contains("[V4+ Styles]") {
            return SubtitleFormat::Ass;
        }

        // Default to SRT
        SubtitleFormat::Srt
    }

    /// Parses SRT format subtitles.
    fn parse_srt(&self, data: &str) -> Result<SubtitleTrack> {
        let mut track = SubtitleTrack::new(SubtitleFormat::Srt);

        // Simple SRT parser
        let blocks: Vec<&str> = data.split("\n\n").filter(|s| !s.trim().is_empty()).collect();

        for (index, block) in blocks.iter().enumerate() {
            let lines: Vec<&str> = block.lines().collect();
            if lines.len() < 3 {
                continue;
            }

            // Parse timing line (format: "00:00:01,000 --> 00:00:04,000")
            let timing_line = lines[1];
            if let Some((start_ms, end_ms)) = self.parse_srt_timing(timing_line) {
                let text = lines[2..].join("\n");
                track.add_cue(SubtitleCue {
                    id: format!("{}", index + 1),
                    start_ms,
                    end_ms,
                    text,
                    style: None,
                });
            }
        }

        Ok(track)
    }

    /// Parses SRT timing string to milliseconds.
    fn parse_srt_timing(&self, timing: &str) -> Option<(u64, u64)> {
        let parts: Vec<&str> = timing.split("-->").collect();
        if parts.len() != 2 {
            return None;
        }

        let start = self.parse_srt_timestamp(parts[0].trim())?;
        let end = self.parse_srt_timestamp(parts[1].trim())?;
        Some((start, end))
    }

    /// Parses a single SRT timestamp to milliseconds.
    fn parse_srt_timestamp(&self, ts: &str) -> Option<u64> {
        // Format: "HH:MM:SS,mmm" or "HH:MM:SS.mmm"
        let normalized = ts.replace(',', ".");
        let parts: Vec<&str> = normalized.split(':').collect();
        if parts.len() != 3 {
            return None;
        }

        let hours: u64 = parts[0].parse().ok()?;
        let minutes: u64 = parts[1].parse().ok()?;

        let sec_parts: Vec<&str> = parts[2].split('.').collect();
        let seconds: u64 = sec_parts[0].parse().ok()?;
        let millis: u64 = if sec_parts.len() > 1 {
            sec_parts[1].parse().ok()?
        } else {
            0
        };

        Some(hours * 3600000 + minutes * 60000 + seconds * 1000 + millis)
    }

    /// Parses VTT format subtitles (stub).
    fn parse_vtt(&self, _data: &str) -> Result<SubtitleTrack> {
        // Stub implementation
        Ok(SubtitleTrack::new(SubtitleFormat::Vtt))
    }

    /// Parses ASS format subtitles (stub).
    fn parse_ass(&self, _data: &str) -> Result<SubtitleTrack> {
        // Stub implementation
        Ok(SubtitleTrack::new(SubtitleFormat::Ass))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_subtitle_track_new() {
        let track = SubtitleTrack::new(SubtitleFormat::Srt);
        assert_eq!(track.format, SubtitleFormat::Srt);
        assert!(track.cues.is_empty());
        assert!(track.language.is_none());
    }

    #[test]
    fn test_subtitle_track_cues_at() {
        let mut track = SubtitleTrack::new(SubtitleFormat::Srt);

        track.add_cue(SubtitleCue {
            id: "1".to_string(),
            start_ms: 1000,
            end_ms: 3000,
            text: "First subtitle".to_string(),
            style: None,
        });

        track.add_cue(SubtitleCue {
            id: "2".to_string(),
            start_ms: 2500,
            end_ms: 5000,
            text: "Second subtitle".to_string(),
            style: None,
        });

        // Before first subtitle
        assert!(track.cues_at(500).is_empty());

        // Only first subtitle
        assert_eq!(track.cues_at(1500).len(), 1);
        assert_eq!(track.cues_at(1500)[0].id, "1");

        // Both subtitles (overlapping)
        assert_eq!(track.cues_at(2700).len(), 2);

        // Only second subtitle
        assert_eq!(track.cues_at(4000).len(), 1);
        assert_eq!(track.cues_at(4000)[0].id, "2");

        // After all subtitles
        assert!(track.cues_at(6000).is_empty());
    }

    #[test]
    fn test_parser_empty_data() {
        let parser = SubtitleParser::new();
        let result = parser.parse("", None);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Empty"));
    }

    #[test]
    fn test_parser_detect_format_srt() {
        let parser = SubtitleParser::new();
        let srt_data = "1\n00:00:01,000 --> 00:00:04,000\nHello";
        assert_eq!(parser.detect_format(srt_data), SubtitleFormat::Srt);
    }

    #[test]
    fn test_parser_detect_format_vtt() {
        let parser = SubtitleParser::new();
        let vtt_data = "WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nHello";
        assert_eq!(parser.detect_format(vtt_data), SubtitleFormat::Vtt);
    }

    #[test]
    fn test_parser_detect_format_ass() {
        let parser = SubtitleParser::new();
        let ass_data = "[Script Info]\nTitle: Test";
        assert_eq!(parser.detect_format(ass_data), SubtitleFormat::Ass);
    }

    #[test]
    fn test_parse_srt_basic() {
        let parser = SubtitleParser::new();
        let srt_data = r#"1
00:00:01,000 --> 00:00:04,000
Hello, World!

2
00:00:05,500 --> 00:00:08,000
Second subtitle
with multiple lines
"#;

        let result = parser.parse(srt_data, Some(SubtitleFormat::Srt));
        assert!(result.is_ok());

        let track = result.unwrap();
        assert_eq!(track.format, SubtitleFormat::Srt);
        assert_eq!(track.cue_count(), 2);

        assert_eq!(track.cues[0].start_ms, 1000);
        assert_eq!(track.cues[0].end_ms, 4000);
        assert_eq!(track.cues[0].text, "Hello, World!");

        assert_eq!(track.cues[1].start_ms, 5500);
        assert_eq!(track.cues[1].end_ms, 8000);
        assert!(track.cues[1].text.contains("multiple lines"));
    }

    #[test]
    fn test_parse_srt_timestamp() {
        let parser = SubtitleParser::new();

        // Standard format
        assert_eq!(parser.parse_srt_timestamp("00:00:01,000"), Some(1000));
        assert_eq!(parser.parse_srt_timestamp("00:01:30,500"), Some(90500));
        assert_eq!(parser.parse_srt_timestamp("01:30:45,123"), Some(5445123));

        // With dot instead of comma
        assert_eq!(parser.parse_srt_timestamp("00:00:01.000"), Some(1000));

        // Invalid formats
        assert!(parser.parse_srt_timestamp("invalid").is_none());
        assert!(parser.parse_srt_timestamp("00:00").is_none());
    }

    #[test]
    fn test_subtitle_style_default() {
        let style = SubtitleStyle::default();
        assert!(style.font_family.is_none());
        assert!(style.font_size.is_none());
        assert!(!style.bold);
        assert!(!style.italic);
    }

    #[test]
    fn test_subtitle_cue_serialization() {
        let cue = SubtitleCue {
            id: "1".to_string(),
            start_ms: 1000,
            end_ms: 3000,
            text: "Test".to_string(),
            style: None,
        };

        let json = serde_json::to_string(&cue).unwrap();
        let deserialized: SubtitleCue = serde_json::from_str(&json).unwrap();

        assert_eq!(cue.id, deserialized.id);
        assert_eq!(cue.start_ms, deserialized.start_ms);
        assert_eq!(cue.end_ms, deserialized.end_ms);
        assert_eq!(cue.text, deserialized.text);
    }
}
