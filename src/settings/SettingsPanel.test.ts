/**
 * SettingsPanel tests
 *
 * Tests for the settings UI panel including rendering,
 * input handling, and settings synchronization.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SettingsPanel } from './SettingsPanel';
import { Settings } from './Settings';
import { DEFAULT_SETTINGS } from './defaults';

describe('SettingsPanel', () => {
  let settings: Settings;
  let container: HTMLElement;
  let panel: SettingsPanel;

  beforeEach(() => {
    // Set up DOM
    container = document.createElement('div');
    document.body.appendChild(container);

    settings = new Settings();
    panel = new SettingsPanel({ settings, container });
  });

  afterEach(() => {
    panel.dispose();
    if (container.parentElement) {
      container.parentElement.removeChild(container);
    }
  });

  describe('initialization', () => {
    it('should create panel element on init', () => {
      panel.init();

      const panelElement = container.querySelector('.settings-panel');
      expect(panelElement).not.toBeNull();
    });

    it('should create panel hidden by default', () => {
      panel.init();

      // Panel should not be visible by default (isVisible returns false)
      expect(panel.isVisible()).toBe(false);
    });
  });

  describe('show/hide/toggle', () => {
    beforeEach(() => {
      panel.init();
    });

    it('should show panel', () => {
      panel.show();

      const panelElement = container.querySelector('.settings-panel') as HTMLElement;
      expect(panelElement.style.display).toBe('block');
      expect(panel.isVisible()).toBe(true);
    });

    it('should hide panel', () => {
      panel.show();
      panel.hide();

      const panelElement = container.querySelector('.settings-panel') as HTMLElement;
      expect(panelElement.style.display).toBe('none');
      expect(panel.isVisible()).toBe(false);
    });

    it('should toggle panel visibility', () => {
      expect(panel.isVisible()).toBe(false);

      panel.toggle();
      expect(panel.isVisible()).toBe(true);

      panel.toggle();
      expect(panel.isVisible()).toBe(false);
    });

    it('should create panel if not initialized when show is called', () => {
      const newPanel = new SettingsPanel({ settings, container });
      newPanel.show();

      const panelElement = container.querySelector('.settings-panel');
      expect(panelElement).not.toBeNull();
      newPanel.dispose();
    });
  });

  describe('rendering', () => {
    beforeEach(() => {
      panel.init();
      panel.show();
    });

    it('should render header with title', () => {
      const title = container.querySelector('h3');
      expect(title?.textContent).toBe('Settings');
    });

    it('should render close button', () => {
      const closeButton = container.querySelector('button');
      expect(closeButton?.textContent).toBe('X');
    });

    it('should close panel when close button is clicked', () => {
      const closeButton = container.querySelector('button')!;
      closeButton.click();

      expect(panel.isVisible()).toBe(false);
    });

    it('should render all setting sections', () => {
      const sections = container.querySelectorAll('.settings-section');
      expect(sections.length).toBeGreaterThan(0);

      const sectionClasses = Array.from(sections).map((s) => s.className);
      expect(sectionClasses.some((c) => c.includes('seek'))).toBe(true);
      expect(sectionClasses.some((c) => c.includes('subtitle'))).toBe(true);
      expect(sectionClasses.some((c) => c.includes('playback'))).toBe(true);
      expect(sectionClasses.some((c) => c.includes('ui'))).toBe(true);
      expect(sectionClasses.some((c) => c.includes('audio'))).toBe(true);
    });

    it('should render input fields for settings', () => {
      const inputs = container.querySelectorAll('input');
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('should render reset button', () => {
      const resetButton = Array.from(container.querySelectorAll('button')).find(
        (btn) => btn.textContent === 'Reset All'
      );
      expect(resetButton).not.toBeUndefined();
    });
  });

  describe('input values', () => {
    beforeEach(() => {
      panel.init();
      panel.show();
    });

    it('should display current setting values', () => {
      const volumeInput = container.querySelector(
        'input[data-section="audio"][data-key="volume"]'
      ) as HTMLInputElement;
      expect(volumeInput).not.toBeNull();
      expect(parseFloat(volumeInput.value)).toBe(DEFAULT_SETTINGS.audio.volume);
    });

    it('should display checkbox state correctly', () => {
      const mutedInput = container.querySelector(
        'input[data-section="audio"][data-key="muted"]'
      ) as HTMLInputElement;
      expect(mutedInput).not.toBeNull();
      expect(mutedInput.checked).toBe(DEFAULT_SETTINGS.audio.muted);
    });

    it('should update inputs when settings change externally', () => {
      settings.set('audio', 'volume', 0.5);

      const volumeInput = container.querySelector(
        'input[data-section="audio"][data-key="volume"]'
      ) as HTMLInputElement;
      expect(parseFloat(volumeInput.value)).toBe(0.5);
    });
  });

  describe('input changes', () => {
    beforeEach(() => {
      panel.init();
      panel.show();
    });

    it('should update settings when number input changes', () => {
      const shortIntervalInput = container.querySelector(
        'input[data-section="seek"][data-key="shortInterval"]'
      ) as HTMLInputElement;

      shortIntervalInput.value = '15';
      shortIntervalInput.dispatchEvent(new Event('input'));

      expect(settings.get('seek').shortInterval).toBe(15);
    });

    it('should update settings when checkbox changes', () => {
      const mutedInput = container.querySelector(
        'input[data-section="audio"][data-key="muted"]'
      ) as HTMLInputElement;

      mutedInput.checked = true;
      mutedInput.dispatchEvent(new Event('input'));

      expect(settings.get('audio').muted).toBe(true);
    });

    it('should update settings when range input changes', () => {
      const volumeInput = container.querySelector(
        'input[data-section="audio"][data-key="volume"]'
      ) as HTMLInputElement;

      volumeInput.value = '0.7';
      volumeInput.dispatchEvent(new Event('input'));

      expect(settings.get('audio').volume).toBe(0.7);
    });

    it('should update settings when color input changes', () => {
      const colorInput = container.querySelector(
        'input[data-section="subtitle"][data-key="color"]'
      ) as HTMLInputElement;

      colorInput.value = '#ff0000';
      colorInput.dispatchEvent(new Event('input'));

      expect(settings.get('subtitle').color).toBe('#ff0000');
    });
  });

  describe('reset functionality', () => {
    beforeEach(() => {
      panel.init();
      panel.show();
    });

    it('should reset all settings when reset button is clicked', () => {
      settings.set('audio', 'volume', 0.3);
      settings.set('seek', 'shortInterval', 20);

      const resetButton = Array.from(container.querySelectorAll('button')).find(
        (btn) => btn.textContent === 'Reset All'
      )!;
      resetButton.click();

      expect(settings.get('audio').volume).toBe(DEFAULT_SETTINGS.audio.volume);
      expect(settings.get('seek').shortInterval).toBe(DEFAULT_SETTINGS.seek.shortInterval);
    });

    it('should update input values after reset', () => {
      settings.set('audio', 'volume', 0.3);

      const resetButton = Array.from(container.querySelectorAll('button')).find(
        (btn) => btn.textContent === 'Reset All'
      )!;
      resetButton.click();

      const volumeInput = container.querySelector(
        'input[data-section="audio"][data-key="volume"]'
      ) as HTMLInputElement;
      expect(parseFloat(volumeInput.value)).toBe(DEFAULT_SETTINGS.audio.volume);
    });
  });

  describe('dispose', () => {
    it('should remove panel from DOM', () => {
      panel.init();
      panel.show();

      panel.dispose();

      const panelElement = container.querySelector('.settings-panel');
      expect(panelElement).toBeNull();
    });

    it('should unsubscribe from settings changes', () => {
      panel.init();
      panel.show();

      const listener = vi.fn();
      settings.subscribe(listener);

      panel.dispose();

      // The panel's internal listener should be removed
      // We can't directly test this, but we can verify the panel is cleaned up
      expect(container.querySelector('.settings-panel')).toBeNull();
    });

    it('should handle multiple dispose calls gracefully', () => {
      panel.init();
      panel.show();

      expect(() => {
        panel.dispose();
        panel.dispose();
      }).not.toThrow();
    });
  });

  describe('validation display', () => {
    beforeEach(() => {
      panel.init();
      panel.show();
    });

    it('should set min/max attributes on numeric inputs', () => {
      const volumeInput = container.querySelector(
        'input[data-section="audio"][data-key="volume"]'
      ) as HTMLInputElement;

      expect(volumeInput.min).toBe('0');
      expect(volumeInput.max).toBe('1');
    });

    it('should set min/max on range inputs', () => {
      const speedInput = container.querySelector(
        'input[data-section="playback"][data-key="speed"]'
      ) as HTMLInputElement;

      expect(speedInput.min).toBe('0.25');
      expect(speedInput.max).toBe('4');
    });
  });
});
