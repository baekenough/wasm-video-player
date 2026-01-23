/**
 * SettingsPanel - Settings UI Panel
 *
 * Provides a user interface for adjusting player settings.
 * Changes are applied immediately via the observer pattern.
 */

import type { Settings } from './Settings';
import type { SettingsData, SettingsSection } from './types';
import { SETTINGS_RANGES } from './defaults';

/**
 * Settings panel configuration
 */
export interface SettingsPanelConfig {
  /** Settings instance to manage */
  settings: Settings;
  /** Container element to render into */
  container: HTMLElement;
}

/**
 * Label configuration for settings fields
 */
interface FieldLabel {
  section: string;
  key: string;
  label: string;
  type: 'number' | 'text' | 'color' | 'checkbox' | 'range';
  step?: number;
}

/**
 * Field labels for UI display
 */
const FIELD_LABELS: FieldLabel[] = [
  // Seek settings
  { section: 'seek', key: 'shortInterval', label: 'Short Skip (seconds)', type: 'number' },
  { section: 'seek', key: 'longInterval', label: 'Long Skip (seconds)', type: 'number' },
  // Subtitle settings
  { section: 'subtitle', key: 'enabled', label: 'Show Subtitles', type: 'checkbox' },
  { section: 'subtitle', key: 'fontSize', label: 'Font Size (px)', type: 'number' },
  { section: 'subtitle', key: 'color', label: 'Text Color', type: 'color' },
  { section: 'subtitle', key: 'backgroundColor', label: 'Background Color', type: 'text' },
  { section: 'subtitle', key: 'timingOffset', label: 'Timing Offset (ms)', type: 'number' },
  // Playback settings
  { section: 'playback', key: 'autoPlay', label: 'Auto Play', type: 'checkbox' },
  { section: 'playback', key: 'loop', label: 'Loop', type: 'checkbox' },
  { section: 'playback', key: 'speed', label: 'Playback Speed', type: 'range', step: 0.25 },
  // UI settings
  { section: 'ui', key: 'controlBarTimeout', label: 'Control Bar Timeout (ms)', type: 'number' },
  // Audio settings
  { section: 'audio', key: 'volume', label: 'Volume', type: 'range', step: 0.1 },
  { section: 'audio', key: 'muted', label: 'Muted', type: 'checkbox' },
];

/**
 * Settings panel UI component
 */
export class SettingsPanel {
  private readonly settings: Settings;
  private readonly container: HTMLElement;
  private panelElement: HTMLElement | null = null;
  private visible: boolean = false;
  private readonly inputElements: Map<string, HTMLInputElement> = new Map();
  private unsubscribe: (() => void) | null = null;

  constructor(config: SettingsPanelConfig) {
    this.settings = config.settings;
    this.container = config.container;
  }

  /**
   * Initialize the panel
   */
  init(): void {
    this.createPanel();
    this.subscribeToSettings();
  }

  /**
   * Show the settings panel
   */
  show(): void {
    if (!this.panelElement) {
      this.createPanel();
    }

    this.panelElement!.style.display = 'block';
    this.visible = true;
    this.updateAllInputs();
  }

  /**
   * Hide the settings panel
   */
  hide(): void {
    if (this.panelElement) {
      this.panelElement.style.display = 'none';
    }
    this.visible = false;
  }

  /**
   * Toggle panel visibility
   */
  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Check if panel is visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Create the panel DOM structure
   */
  private createPanel(): void {
    this.panelElement = document.createElement('div');
    this.panelElement.className = 'settings-panel';
    this.panelElement.style.cssText = `
      position: absolute;
      top: 0;
      right: 0;
      width: 320px;
      max-height: 100%;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 16px;
      display: none;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      z-index: 1000;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    `;

    const title = document.createElement('h3');
    title.textContent = 'Settings';
    title.style.margin = '0';

    const closeButton = document.createElement('button');
    closeButton.textContent = 'X';
    closeButton.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 4px 8px;
    `;
    closeButton.addEventListener('click', () => this.hide());

    header.appendChild(title);
    header.appendChild(closeButton);
    this.panelElement.appendChild(header);

    // Create sections
    const sections = this.groupFieldsBySection();
    for (const [sectionName, fields] of Object.entries(sections)) {
      const sectionElement = this.createSection(sectionName, fields);
      this.panelElement.appendChild(sectionElement);
    }

    // Reset buttons
    const resetContainer = document.createElement('div');
    resetContainer.style.cssText = `
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      gap: 8px;
    `;

    const resetAllButton = document.createElement('button');
    resetAllButton.textContent = 'Reset All';
    resetAllButton.style.cssText = `
      flex: 1;
      padding: 8px;
      background: #444;
      border: none;
      color: white;
      cursor: pointer;
      border-radius: 4px;
    `;
    resetAllButton.addEventListener('click', () => {
      this.settings.reset();
      this.updateAllInputs();
    });

    resetContainer.appendChild(resetAllButton);
    this.panelElement.appendChild(resetContainer);

    this.container.appendChild(this.panelElement);
  }

  /**
   * Group fields by section
   */
  private groupFieldsBySection(): Record<string, FieldLabel[]> {
    const sections: Record<string, FieldLabel[]> = {};
    for (const field of FIELD_LABELS) {
      if (!sections[field.section]) {
        sections[field.section] = [];
      }
      sections[field.section]!.push(field);
    }
    return sections;
  }

  /**
   * Create a section element
   */
  private createSection(sectionName: string, fields: FieldLabel[]): HTMLElement {
    const section = document.createElement('div');
    section.className = `settings-section settings-section-${sectionName}`;
    section.style.marginBottom = '16px';

    const sectionTitle = document.createElement('h4');
    sectionTitle.textContent = this.formatSectionName(sectionName);
    sectionTitle.style.cssText = `
      margin: 0 0 8px 0;
      text-transform: capitalize;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    section.appendChild(sectionTitle);

    for (const field of fields) {
      const fieldElement = this.createField(field);
      section.appendChild(fieldElement);
    }

    return section;
  }

  /**
   * Format section name for display
   */
  private formatSectionName(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /**
   * Create a field element
   */
  private createField(field: FieldLabel): HTMLElement {
    const container = document.createElement('div');
    container.className = 'settings-field';
    container.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    `;

    const label = document.createElement('label');
    label.textContent = field.label;
    label.style.flex = '1';

    const input = this.createInput(field);
    const inputKey = `${field.section}.${field.key}`;
    this.inputElements.set(inputKey, input);

    container.appendChild(label);
    container.appendChild(input);

    return container;
  }

  /**
   * Create input element based on field type
   */
  private createInput(field: FieldLabel): HTMLInputElement {
    const input = document.createElement('input');

    input.dataset['section'] = field.section;
    input.dataset['key'] = field.key;

    const range = this.getRange(field.section, field.key);

    switch (field.type) {
      case 'number':
        input.type = 'number';
        if (range) {
          input.min = String(range.min);
          input.max = String(range.max);
        }
        input.style.width = '80px';
        break;

      case 'checkbox':
        input.type = 'checkbox';
        break;

      case 'color':
        input.type = 'color';
        input.style.width = '60px';
        break;

      case 'text':
        input.type = 'text';
        input.style.width = '120px';
        break;

      case 'range':
        input.type = 'range';
        if (range) {
          input.min = String(range.min);
          input.max = String(range.max);
        }
        if (field.step) {
          input.step = String(field.step);
        }
        input.style.width = '100px';
        break;
    }

    input.style.cssText += `
      background: #333;
      border: 1px solid #555;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
    `;

    // Event handler for value changes
    input.addEventListener('input', () => {
      this.handleInputChange(input, field);
    });

    return input;
  }

  /**
   * Get range for a field if defined
   */
  private getRange(section: string, key: string): { min: number; max: number } | null {
    const sectionRanges = SETTINGS_RANGES[section as keyof typeof SETTINGS_RANGES];
    if (!sectionRanges) {
      return null;
    }
    return (sectionRanges as Record<string, { min: number; max: number }>)[key] ?? null;
  }

  /**
   * Handle input value change
   */
  private handleInputChange(input: HTMLInputElement, field: FieldLabel): void {
    const section = field.section as SettingsSection;
    const key = field.key;

    let value: unknown;
    switch (field.type) {
      case 'checkbox':
        value = input.checked;
        break;
      case 'number':
        value = parseFloat(input.value);
        break;
      case 'range':
        value = parseFloat(input.value);
        break;
      default:
        value = input.value;
    }

    this.settings.set(
      section,
      key as keyof SettingsData[typeof section],
      value as SettingsData[typeof section][keyof SettingsData[typeof section]]
    );
  }

  /**
   * Subscribe to settings changes
   */
  private subscribeToSettings(): void {
    this.unsubscribe = this.settings.subscribe((event) => {
      const inputKey = `${event.section}.${event.key}`;
      const input = this.inputElements.get(inputKey);
      if (input) {
        this.updateInput(input, event.newValue);
      }
    });
  }

  /**
   * Update an input element with a value
   */
  private updateInput(input: HTMLInputElement, value: unknown): void {
    if (input.type === 'checkbox') {
      input.checked = Boolean(value);
    } else {
      input.value = String(value);
    }
  }

  /**
   * Update all input elements with current settings
   */
  private updateAllInputs(): void {
    const allSettings = this.settings.getAll();

    this.inputElements.forEach((input, inputKey) => {
      const [section, key] = inputKey.split('.') as [SettingsSection, string];
      const sectionData = allSettings[section] as unknown as Record<string, unknown>;
      const value = sectionData[key];
      this.updateInput(input, value);
    });
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.panelElement && this.panelElement.parentElement) {
      this.panelElement.parentElement.removeChild(this.panelElement);
    }

    this.panelElement = null;
    this.inputElements.clear();
  }
}
