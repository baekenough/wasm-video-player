/**
 * SeekBar tests - Click position calculation and drag handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SeekBar, type SeekBarConfig } from './SeekBar';

describe('SeekBar', () => {
  let seekBar: SeekBar;
  let container: HTMLElement;
  let onSeekMock: ReturnType<typeof vi.fn>;

  const createSeekBarConfig = (): SeekBarConfig => ({
    onSeek: onSeekMock,
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    onSeekMock = vi.fn();
    seekBar = new SeekBar(createSeekBarConfig());
    seekBar.mount(container);

    // Mock getBoundingClientRect on the seek bar element (not container)
    const seekBarElement = container.querySelector('.seek-bar') as HTMLElement;
    vi.spyOn(seekBarElement, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      right: 600,
      width: 500,
      top: 0,
      bottom: 20,
      height: 20,
      x: 100,
      y: 0,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    seekBar.dispose();
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  const createMouseEvent = (
    type: string,
    clientX: number,
    options: Partial<MouseEventInit> = {}
  ): MouseEvent => {
    return new MouseEvent(type, {
      clientX,
      bubbles: true,
      cancelable: true,
      ...options,
    });
  };

  describe('mount/dispose', () => {
    it('should create seek bar elements on mount', () => {
      expect(container.querySelector('.seek-bar')).not.toBeNull();
      expect(container.querySelector('.seek-bar-track')).not.toBeNull();
      expect(container.querySelector('.seek-bar-fill')).not.toBeNull();
      expect(container.querySelector('.seek-bar-handle')).not.toBeNull();
    });

    it('should remove elements on dispose', () => {
      seekBar.dispose();

      expect(container.querySelector('.seek-bar')).toBeNull();
    });

    it('should not throw when disposing twice', () => {
      seekBar.dispose();
      expect(() => seekBar.dispose()).not.toThrow();
    });
  });

  describe('click to seek', () => {
    it('should calculate position from click at start', () => {
      const event = createMouseEvent('click', 100); // Left edge
      container.querySelector('.seek-bar')!.dispatchEvent(event);

      expect(onSeekMock).toHaveBeenCalledWith(0);
    });

    it('should calculate position from click at end', () => {
      const event = createMouseEvent('click', 600); // Right edge
      container.querySelector('.seek-bar')!.dispatchEvent(event);

      expect(onSeekMock).toHaveBeenCalledWith(1);
    });

    it('should calculate position from click at middle', () => {
      const event = createMouseEvent('click', 350); // Middle (250px from left)
      container.querySelector('.seek-bar')!.dispatchEvent(event);

      expect(onSeekMock).toHaveBeenCalledWith(0.5);
    });

    it('should clamp click position to valid range (before start)', () => {
      const event = createMouseEvent('click', 50); // Before left edge
      container.querySelector('.seek-bar')!.dispatchEvent(event);

      expect(onSeekMock).toHaveBeenCalledWith(0);
    });

    it('should clamp click position to valid range (after end)', () => {
      const event = createMouseEvent('click', 700); // After right edge
      container.querySelector('.seek-bar')!.dispatchEvent(event);

      expect(onSeekMock).toHaveBeenCalledWith(1);
    });
  });

  describe('drag to seek', () => {
    it('should start dragging on mousedown', () => {
      const seekBarElement = container.querySelector('.seek-bar')!;

      const mousedownEvent = createMouseEvent('mousedown', 200);
      seekBarElement.dispatchEvent(mousedownEvent);

      expect(seekBar.isDragging()).toBe(true);
    });

    it('should update position during drag', () => {
      const seekBarElement = container.querySelector('.seek-bar')!;

      // Start drag
      const mousedownEvent = createMouseEvent('mousedown', 200);
      seekBarElement.dispatchEvent(mousedownEvent);

      // Move mouse
      const mousemoveEvent = createMouseEvent('mousemove', 350);
      document.dispatchEvent(mousemoveEvent);

      expect(onSeekMock).toHaveBeenCalledWith(0.5);
    });

    it('should stop dragging on mouseup', () => {
      const seekBarElement = container.querySelector('.seek-bar')!;

      // Start drag
      const mousedownEvent = createMouseEvent('mousedown', 200);
      seekBarElement.dispatchEvent(mousedownEvent);

      expect(seekBar.isDragging()).toBe(true);

      // End drag
      const mouseupEvent = createMouseEvent('mouseup', 350);
      document.dispatchEvent(mouseupEvent);

      expect(seekBar.isDragging()).toBe(false);
    });

    it('should call onSeek during drag', () => {
      const seekBarElement = container.querySelector('.seek-bar')!;

      // Start drag
      const mousedownEvent = createMouseEvent('mousedown', 200);
      seekBarElement.dispatchEvent(mousedownEvent);

      onSeekMock.mockClear();

      // Move
      const mousemoveEvent1 = createMouseEvent('mousemove', 300);
      document.dispatchEvent(mousemoveEvent1);

      expect(onSeekMock).toHaveBeenCalledTimes(1);

      // Move again
      const mousemoveEvent2 = createMouseEvent('mousemove', 400);
      document.dispatchEvent(mousemoveEvent2);

      expect(onSeekMock).toHaveBeenCalledTimes(2);
    });

    it('should not update position when not dragging', () => {
      // Move mouse without starting drag
      const mousemoveEvent = createMouseEvent('mousemove', 350);
      document.dispatchEvent(mousemoveEvent);

      expect(onSeekMock).not.toHaveBeenCalled();
    });

    it('should handle drag outside element bounds', () => {
      const seekBarElement = container.querySelector('.seek-bar')!;

      // Start drag
      const mousedownEvent = createMouseEvent('mousedown', 200);
      seekBarElement.dispatchEvent(mousedownEvent);

      onSeekMock.mockClear();

      // Move past right edge
      const mousemoveEvent = createMouseEvent('mousemove', 800);
      document.dispatchEvent(mousemoveEvent);

      expect(onSeekMock).toHaveBeenCalledWith(1);
    });
  });

  describe('setProgress()', () => {
    it('should update visual progress', () => {
      seekBar.setProgress(30, 120);

      const fill = container.querySelector('.seek-bar-fill') as HTMLElement;
      expect(fill.style.width).toBe('25%');
    });

    it('should handle zero duration', () => {
      seekBar.setProgress(30, 0);

      const fill = container.querySelector('.seek-bar-fill') as HTMLElement;
      expect(fill.style.width).toBe('0%');
    });

    it('should clamp progress to 0-100%', () => {
      seekBar.setProgress(150, 100);

      const fill = container.querySelector('.seek-bar-fill') as HTMLElement;
      expect(fill.style.width).toBe('100%');
    });

    it('should handle negative current time', () => {
      seekBar.setProgress(-10, 100);

      const fill = container.querySelector('.seek-bar-fill') as HTMLElement;
      expect(fill.style.width).toBe('0%');
    });

    it('should update handle position', () => {
      seekBar.setProgress(60, 120);

      const handle = container.querySelector('.seek-bar-handle') as HTMLElement;
      expect(handle.style.left).toBe('50%');
    });
  });

  describe('enable/disable', () => {
    it('should not respond to clicks when disabled', () => {
      seekBar.setEnabled(false);

      const event = createMouseEvent('click', 350);
      container.querySelector('.seek-bar')!.dispatchEvent(event);

      expect(onSeekMock).not.toHaveBeenCalled();
    });

    it('should add disabled class when disabled', () => {
      seekBar.setEnabled(false);

      const seekBarElement = container.querySelector('.seek-bar');
      expect(seekBarElement?.classList.contains('seek-bar--disabled')).toBe(true);
    });

    it('should respond again after re-enabling', () => {
      seekBar.setEnabled(false);
      seekBar.setEnabled(true);

      const event = createMouseEvent('click', 350);
      container.querySelector('.seek-bar')!.dispatchEvent(event);

      expect(onSeekMock).toHaveBeenCalled();
    });

    it('should report enabled state', () => {
      expect(seekBar.isEnabled()).toBe(true);

      seekBar.setEnabled(false);
      expect(seekBar.isEnabled()).toBe(false);
    });
  });

  describe('touch events', () => {
    const createTouchEvent = (
      type: string,
      clientX: number
    ): TouchEvent => {
      return new TouchEvent(type, {
        touches: [{ clientX, clientY: 10 }] as unknown as Touch[],
        changedTouches: [{ clientX, clientY: 10 }] as unknown as Touch[],
        bubbles: true,
        cancelable: true,
      });
    };

    it('should handle touchstart for drag', () => {
      const seekBarElement = container.querySelector('.seek-bar')!;

      const touchstartEvent = createTouchEvent('touchstart', 200);
      seekBarElement.dispatchEvent(touchstartEvent);

      expect(seekBar.isDragging()).toBe(true);
    });

    it('should handle touchmove during drag', () => {
      const seekBarElement = container.querySelector('.seek-bar')!;

      // Start touch drag
      const touchstartEvent = createTouchEvent('touchstart', 200);
      seekBarElement.dispatchEvent(touchstartEvent);

      onSeekMock.mockClear();

      // Move touch
      const touchmoveEvent = createTouchEvent('touchmove', 350);
      document.dispatchEvent(touchmoveEvent);

      expect(onSeekMock).toHaveBeenCalledWith(0.5);
    });

    it('should handle touchend to stop drag', () => {
      const seekBarElement = container.querySelector('.seek-bar')!;

      // Start touch drag
      const touchstartEvent = createTouchEvent('touchstart', 200);
      seekBarElement.dispatchEvent(touchstartEvent);

      // End touch
      const touchendEvent = createTouchEvent('touchend', 350);
      document.dispatchEvent(touchendEvent);

      expect(seekBar.isDragging()).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('should have correct ARIA attributes', () => {
      const seekBarElement = container.querySelector('.seek-bar');

      expect(seekBarElement?.getAttribute('role')).toBe('slider');
      expect(seekBarElement?.getAttribute('aria-valuemin')).toBe('0');
      expect(seekBarElement?.getAttribute('aria-valuemax')).toBe('100');
    });

    it('should update ARIA value on progress change', () => {
      seekBar.setProgress(30, 120);

      const seekBarElement = container.querySelector('.seek-bar');
      expect(seekBarElement?.getAttribute('aria-valuenow')).toBe('25');
    });

    it('should be keyboard focusable', () => {
      const seekBarElement = container.querySelector('.seek-bar');
      expect(seekBarElement?.getAttribute('tabindex')).toBe('0');
    });
  });
});
