/**
 * TimeDisplay class tests - Time formatting and display
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TimeDisplay, type TimeDisplayConfig } from './TimeDisplay';

describe('TimeDisplay', () => {
  let timeDisplay: TimeDisplay;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const config: TimeDisplayConfig = {
      container,
    };

    timeDisplay = new TimeDisplay(config);
  });

  afterEach(() => {
    timeDisplay.dispose();
    document.body.removeChild(container);
  });

  describe('initialization', () => {
    it('should create display element on init', () => {
      timeDisplay.init();

      const element = container.querySelector('.time-display');
      expect(element).not.toBeNull();
    });

    it('should create current time element', () => {
      timeDisplay.init();

      const currentTime = container.querySelector('.time-current');
      expect(currentTime).not.toBeNull();
      expect(currentTime?.textContent).toBe('00:00:00');
    });

    it('should create separator element', () => {
      timeDisplay.init();

      const separator = container.querySelector('.time-separator');
      expect(separator).not.toBeNull();
      expect(separator?.textContent).toBe(' / ');
    });

    it('should create total time element', () => {
      timeDisplay.init();

      const totalTime = container.querySelector('.time-total');
      expect(totalTime).not.toBeNull();
      expect(totalTime?.textContent).toBe('00:00:00');
    });

    it('should initialize with zero times', () => {
      timeDisplay.init();

      expect(timeDisplay.getCurrentTime()).toBe(0);
      expect(timeDisplay.getTotalTime()).toBe(0);
    });
  });

  describe('update()', () => {
    it('should update current time display', () => {
      timeDisplay.init();

      timeDisplay.update(125, 3600);

      const currentTime = container.querySelector('.time-current');
      expect(currentTime?.textContent).toBe('00:02:05');
    });

    it('should update total time display', () => {
      timeDisplay.init();

      timeDisplay.update(0, 7265);

      const totalTime = container.querySelector('.time-total');
      expect(totalTime?.textContent).toBe('02:01:05');
    });

    it('should store time values', () => {
      timeDisplay.init();

      timeDisplay.update(100, 200);

      expect(timeDisplay.getCurrentTime()).toBe(100);
      expect(timeDisplay.getTotalTime()).toBe(200);
    });
  });

  describe('time formatting', () => {
    it('should format seconds only', () => {
      timeDisplay.init();

      timeDisplay.update(45, 45);

      const currentTime = container.querySelector('.time-current');
      expect(currentTime?.textContent).toBe('00:00:45');
    });

    it('should format minutes and seconds', () => {
      timeDisplay.init();

      timeDisplay.update(125, 125);

      const currentTime = container.querySelector('.time-current');
      expect(currentTime?.textContent).toBe('00:02:05');
    });

    it('should format hours, minutes and seconds', () => {
      timeDisplay.init();

      timeDisplay.update(3723, 3723);

      const currentTime = container.querySelector('.time-current');
      expect(currentTime?.textContent).toBe('01:02:03');
    });

    it('should pad single digits with zeros', () => {
      timeDisplay.init();

      timeDisplay.update(61, 61);

      const currentTime = container.querySelector('.time-current');
      expect(currentTime?.textContent).toBe('00:01:01');
    });

    it('should handle zero', () => {
      timeDisplay.init();

      timeDisplay.update(0, 0);

      const currentTime = container.querySelector('.time-current');
      const totalTime = container.querySelector('.time-total');
      expect(currentTime?.textContent).toBe('00:00:00');
      expect(totalTime?.textContent).toBe('00:00:00');
    });

    it('should handle negative values as zero', () => {
      timeDisplay.init();

      timeDisplay.update(-10, 100);

      const currentTime = container.querySelector('.time-current');
      expect(currentTime?.textContent).toBe('00:00:00');
    });

    it('should floor fractional seconds', () => {
      timeDisplay.init();

      timeDisplay.update(65.7, 100.9);

      const currentTime = container.querySelector('.time-current');
      const totalTime = container.querySelector('.time-total');
      expect(currentTime?.textContent).toBe('00:01:05');
      expect(totalTime?.textContent).toBe('00:01:40');
    });

    it('should handle large values', () => {
      timeDisplay.init();

      timeDisplay.update(36000, 36000); // 10 hours

      const currentTime = container.querySelector('.time-current');
      expect(currentTime?.textContent).toBe('10:00:00');
    });
  });

  describe('getElement()', () => {
    it('should return null before init', () => {
      expect(timeDisplay.getElement()).toBeNull();
    });

    it('should return element after init', () => {
      timeDisplay.init();

      const element = timeDisplay.getElement();
      expect(element).toBeInstanceOf(HTMLElement);
      expect(element?.className).toBe('time-display');
    });
  });

  describe('dispose()', () => {
    it('should remove element from container', () => {
      timeDisplay.init();

      timeDisplay.dispose();

      expect(container.querySelector('.time-display')).toBeNull();
    });

    it('should set element to null', () => {
      timeDisplay.init();

      timeDisplay.dispose();

      expect(timeDisplay.getElement()).toBeNull();
    });
  });
});
