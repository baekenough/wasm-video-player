/**
 * SrtParser Tests
 *
 * TDD tests for SRT subtitle parser.
 */

import { describe, it, expect } from 'vitest';
import { SrtParser } from './SrtParser';

describe('SrtParser', () => {
  describe('parse', () => {
    it('parses basic SRT content', () => {
      const srt = `1
00:00:01,000 --> 00:00:04,000
Hello, world!

2
00:00:05,500 --> 00:00:08,000
Second subtitle
`;
      const track = SrtParser.parse(srt);

      expect(track.format).toBe('srt');
      expect(track.entries).toHaveLength(2);
      expect(track.entries[0].text).toBe('Hello, world!');
      expect(track.entries[1].text).toBe('Second subtitle');
    });

    it('parses timestamp correctly', () => {
      const srt = `1
01:23:45,678 --> 02:34:56,789
Text
`;
      const track = SrtParser.parse(srt);

      expect(track.entries[0].startTime).toBe(5025678); // 1*3600*1000 + 23*60*1000 + 45*1000 + 678
      expect(track.entries[0].endTime).toBe(9296789); // 2*3600*1000 + 34*60*1000 + 56*1000 + 789
    });

    it('parses multiline entry', () => {
      const srt = `1
00:00:01,000 --> 00:00:04,000
Line one
Line two
Line three
`;
      const track = SrtParser.parse(srt);

      expect(track.entries[0].text).toBe('Line one\nLine two\nLine three');
    });

    it('handles HTML tags', () => {
      const srt = `1
00:00:01,000 --> 00:00:04,000
<i>Italic</i> and <b>bold</b>
`;
      const track = SrtParser.parse(srt);

      expect(track.entries[0].text).toContain('<i>');
      expect(track.entries[0].text).toContain('<b>');
      expect(track.entries[0].text).toBe('<i>Italic</i> and <b>bold</b>');
    });

    it('skips malformed entries', () => {
      const srt = `1
00:00:01,000 --> 00:00:04,000
Valid entry

invalid timestamp
No timestamp here

2
00:00:05,000 --> 00:00:08,000
Another valid
`;
      const track = SrtParser.parse(srt);

      expect(track.entries).toHaveLength(2);
      expect(track.entries[0].text).toBe('Valid entry');
      expect(track.entries[1].text).toBe('Another valid');
    });

    it('handles empty content', () => {
      const track = SrtParser.parse('');

      expect(track.entries).toHaveLength(0);
      expect(track.format).toBe('srt');
    });

    it('handles Windows line endings (CRLF)', () => {
      const srt = '1\r\n00:00:01,000 --> 00:00:04,000\r\nHello\r\n\r\n';
      const track = SrtParser.parse(srt);

      expect(track.entries).toHaveLength(1);
      expect(track.entries[0].text).toBe('Hello');
    });

    it('handles mixed line endings', () => {
      const srt = '1\n00:00:01,000 --> 00:00:04,000\r\nLine1\nLine2\r\n\n';
      const track = SrtParser.parse(srt);

      expect(track.entries).toHaveLength(1);
      expect(track.entries[0].text).toBe('Line1\nLine2');
    });

    it('parses period as millisecond separator', () => {
      const srt = `1
00:00:01.000 --> 00:00:04.000
Text
`;
      const track = SrtParser.parse(srt);

      expect(track.entries[0].startTime).toBe(1000);
      expect(track.entries[0].endTime).toBe(4000);
    });

    it('handles entry without trailing newline', () => {
      const srt = `1
00:00:01,000 --> 00:00:04,000
Text`;
      const track = SrtParser.parse(srt);

      expect(track.entries).toHaveLength(1);
      expect(track.entries[0].text).toBe('Text');
    });

    it('handles entries with position metadata', () => {
      // Some SRT files include positioning
      const srt = `1
00:00:01,000 --> 00:00:04,000 X1:100 X2:200 Y1:100 Y2:200
Text with position
`;
      const track = SrtParser.parse(srt);

      expect(track.entries).toHaveLength(1);
      expect(track.entries[0].text).toBe('Text with position');
    });

    it('trims whitespace from text', () => {
      const srt = `1
00:00:01,000 --> 00:00:04,000
  Text with spaces
`;
      const track = SrtParser.parse(srt);

      expect(track.entries[0].text).toBe('Text with spaces');
    });

    it('handles special UTF-8 characters', () => {
      const srt = `1
00:00:01,000 --> 00:00:04,000
Hello, world!
`;
      const track = SrtParser.parse(srt);

      expect(track.entries[0].text).toBe('Hello, world!');
    });

    it('handles Korean characters', () => {
      const srt = `1
00:00:01,000 --> 00:00:04,000
안녕하세요
`;
      const track = SrtParser.parse(srt);

      expect(track.entries[0].text).toBe('안녕하세요');
    });

    it('handles zero timestamp', () => {
      const srt = `1
00:00:00,000 --> 00:00:02,000
First subtitle
`;
      const track = SrtParser.parse(srt);

      expect(track.entries[0].startTime).toBe(0);
    });
  });

  describe('parseTimestamp', () => {
    it('parses standard format', () => {
      expect(SrtParser.parseTimestamp('00:00:01,000')).toBe(1000);
      expect(SrtParser.parseTimestamp('00:01:00,000')).toBe(60000);
      expect(SrtParser.parseTimestamp('01:00:00,000')).toBe(3600000);
    });

    it('parses with period separator', () => {
      expect(SrtParser.parseTimestamp('00:00:01.500')).toBe(1500);
    });

    it('returns null for invalid timestamp', () => {
      expect(SrtParser.parseTimestamp('invalid')).toBeNull();
      expect(SrtParser.parseTimestamp('')).toBeNull();
      expect(SrtParser.parseTimestamp('00:00')).toBeNull();
    });
  });
});
