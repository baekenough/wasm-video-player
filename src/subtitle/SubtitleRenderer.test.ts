/**
 * SubtitleRenderer Tests
 *
 * TDD tests for subtitle rendering on canvas.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SubtitleRenderer } from './SubtitleRenderer';
import type { SubtitleEntry } from './types';

/**
 * Create a mock canvas context for testing
 */
function createMockContext(): CanvasRenderingContext2D {
  return {
    fillText: vi.fn(),
    strokeText: vi.fn(),
    clearRect: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 100 }),
    save: vi.fn(),
    restore: vi.fn(),
    font: '',
    fillStyle: '',
    strokeStyle: '',
    textAlign: 'start' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    lineWidth: 1,
    lineJoin: 'miter' as CanvasLineJoin,
    miterLimit: 10,
  } as unknown as CanvasRenderingContext2D;
}

/**
 * Create a mock canvas element
 */
function createMockCanvas(ctx: CanvasRenderingContext2D): HTMLCanvasElement {
  const canvas = {
    width: 800,
    height: 600,
    getContext: vi.fn().mockReturnValue(ctx),
  } as unknown as HTMLCanvasElement;
  return canvas;
}

describe('SubtitleRenderer', () => {
  let ctx: CanvasRenderingContext2D;
  let canvas: HTMLCanvasElement;
  let renderer: SubtitleRenderer;

  beforeEach(() => {
    ctx = createMockContext();
    canvas = createMockCanvas(ctx);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('creates renderer with default options', () => {
      renderer = new SubtitleRenderer(canvas);

      expect(renderer).toBeDefined();
    });

    it('creates renderer with custom options', () => {
      renderer = new SubtitleRenderer(canvas, {
        fontSize: 32,
        fontFamily: 'Arial',
        color: '#ff0000',
      });

      expect(renderer).toBeDefined();
    });
  });

  describe('render', () => {
    beforeEach(() => {
      renderer = new SubtitleRenderer(canvas);
    });

    it('renders text on canvas', () => {
      const entries: SubtitleEntry[] = [{ startTime: 0, endTime: 1000, text: 'Hello' }];

      renderer.render(entries);

      expect(ctx.fillText).toHaveBeenCalledWith('Hello', expect.any(Number), expect.any(Number));
    });

    it('clears canvas before rendering', () => {
      const entries: SubtitleEntry[] = [{ startTime: 0, endTime: 1000, text: 'Hello' }];

      renderer.render(entries);

      expect(ctx.clearRect).toHaveBeenCalled();
    });

    it('renders nothing for empty entries', () => {
      renderer.render([]);

      expect(ctx.fillText).not.toHaveBeenCalled();
    });

    it('handles multi-line text', () => {
      const entries: SubtitleEntry[] = [{ startTime: 0, endTime: 1000, text: 'Line 1\nLine 2' }];

      renderer.render(entries);

      expect(ctx.fillText).toHaveBeenCalledTimes(2);
    });

    it('renders multiple entries', () => {
      const entries: SubtitleEntry[] = [
        { startTime: 0, endTime: 1000, text: 'First' },
        { startTime: 0, endTime: 1000, text: 'Second' },
      ];

      renderer.render(entries);

      expect(ctx.fillText).toHaveBeenCalledWith('First', expect.any(Number), expect.any(Number));
      expect(ctx.fillText).toHaveBeenCalledWith('Second', expect.any(Number), expect.any(Number));
    });

    it('applies text outline for visibility', () => {
      renderer = new SubtitleRenderer(canvas, { outlineWidth: 2 });
      const entries: SubtitleEntry[] = [{ startTime: 0, endTime: 1000, text: 'Hello' }];

      renderer.render(entries);

      expect(ctx.strokeText).toHaveBeenCalled();
    });
  });

  describe('font settings', () => {
    it('applies font settings', () => {
      renderer = new SubtitleRenderer(canvas, { fontSize: 32, fontFamily: 'Arial' });
      const entries: SubtitleEntry[] = [{ startTime: 0, endTime: 1000, text: 'Test' }];

      renderer.render(entries);

      expect(ctx.font).toContain('32px');
      expect(ctx.font).toContain('Arial');
    });

    it('applies default font when not specified', () => {
      renderer = new SubtitleRenderer(canvas);
      const entries: SubtitleEntry[] = [{ startTime: 0, endTime: 1000, text: 'Test' }];

      renderer.render(entries);

      expect(ctx.font).toContain('24px');
      expect(ctx.font).toContain('Arial');
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      renderer = new SubtitleRenderer(canvas);
    });

    it('clears the canvas', () => {
      renderer.clear();

      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
    });
  });

  describe('setOptions', () => {
    beforeEach(() => {
      renderer = new SubtitleRenderer(canvas);
    });

    it('updates options dynamically', () => {
      renderer.setOptions({ fontSize: 48, color: '#ff0000' });
      renderer.render([{ startTime: 0, endTime: 1000, text: 'Test' }]);

      expect(ctx.font).toContain('48px');
    });

    it('merges with existing options', () => {
      renderer = new SubtitleRenderer(canvas, { fontSize: 24, fontFamily: 'Helvetica' });
      renderer.setOptions({ fontSize: 48 });
      renderer.render([{ startTime: 0, endTime: 1000, text: 'Test' }]);

      expect(ctx.font).toContain('48px');
      expect(ctx.font).toContain('Helvetica');
    });
  });

  describe('getOptions', () => {
    it('returns current options', () => {
      renderer = new SubtitleRenderer(canvas, { fontSize: 32 });

      const options = renderer.getOptions();

      expect(options.fontSize).toBe(32);
    });
  });

  describe('resize handling', () => {
    beforeEach(() => {
      renderer = new SubtitleRenderer(canvas);
    });

    it('handles canvas resize', () => {
      // Simulate resize by updating mock canvas dimensions
      (canvas as { width: number }).width = 1920;
      (canvas as { height: number }).height = 1080;

      const entries: SubtitleEntry[] = [{ startTime: 0, endTime: 1000, text: 'Test' }];
      renderer.render(entries);

      // Should render at new canvas dimensions
      expect(ctx.fillText).toHaveBeenCalled();
    });
  });

  describe('text positioning', () => {
    beforeEach(() => {
      renderer = new SubtitleRenderer(canvas);
    });

    it('centers text horizontally', () => {
      const entries: SubtitleEntry[] = [{ startTime: 0, endTime: 1000, text: 'Test' }];

      renderer.render(entries);

      expect(ctx.textAlign).toBe('center');
    });

    it('positions text near bottom', () => {
      renderer = new SubtitleRenderer(canvas, { bottomMargin: 40 });
      const entries: SubtitleEntry[] = [{ startTime: 0, endTime: 1000, text: 'Test' }];

      renderer.render(entries);

      const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
      const yPosition = calls[0][2];

      // Y position should be near bottom (600 - 40 = 560)
      expect(yPosition).toBeGreaterThan(canvas.height / 2);
    });
  });

  describe('HTML tag handling', () => {
    beforeEach(() => {
      renderer = new SubtitleRenderer(canvas);
    });

    it('strips HTML tags for basic rendering', () => {
      const entries: SubtitleEntry[] = [
        { startTime: 0, endTime: 1000, text: '<i>Italic</i> and <b>bold</b>' },
      ];

      renderer.render(entries);

      const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
      // Should strip tags for canvas rendering
      expect(calls[0][0]).toBe('Italic and bold');
    });
  });

  describe('dispose', () => {
    it('cleans up resources', () => {
      renderer = new SubtitleRenderer(canvas);

      renderer.dispose();

      // After dispose, render should not throw but should not render
      expect(() => renderer.render([])).not.toThrow();
    });
  });
});
