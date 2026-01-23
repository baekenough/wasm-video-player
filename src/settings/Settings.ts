/**
 * Settings - Settings state management
 *
 * Manages application settings with observer pattern for reactivity,
 * validation, and persistence support through storage adapters.
 */

import type {
  SettingsData,
  SettingsSection,
  DeepPartial,
  SettingsListener,
  SettingsChangeEvent,
  StorageAdapter,
} from './types';
import { createDefaultSettings, SETTINGS_RANGES } from './defaults';

/**
 * Settings manager class
 */
export class Settings {
  private data: SettingsData;
  private readonly listeners: Set<SettingsListener> = new Set();
  private storageAdapter: StorageAdapter | null = null;

  constructor(initialData?: Partial<SettingsData>) {
    this.data = createDefaultSettings();
    if (initialData) {
      this.mergeData(initialData);
    }
  }

  /**
   * Set storage adapter for persistence
   */
  setStorageAdapter(adapter: StorageAdapter): void {
    this.storageAdapter = adapter;
  }

  /**
   * Get a settings section
   */
  get<K extends SettingsSection>(section: K): SettingsData[K] {
    return { ...this.data[section] };
  }

  /**
   * Get entire settings data (deep copy)
   */
  getAll(): SettingsData {
    return JSON.parse(JSON.stringify(this.data)) as SettingsData;
  }

  /**
   * Set a value in a settings section
   */
  set<K extends SettingsSection, P extends keyof SettingsData[K]>(
    section: K,
    key: P,
    value: SettingsData[K][P]
  ): void {
    const validatedValue = this.validateValue(section, key as string, value);
    const oldValue = this.data[section][key];

    if (oldValue === validatedValue) {
      return;
    }

    // Use type assertion to handle the dynamic property assignment
    const sectionData = this.data[section] as unknown as Record<string, unknown>;
    sectionData[key as string] = validatedValue;

    this.notifyListeners({
      section,
      key: key as string,
      oldValue,
      newValue: validatedValue,
    });
  }

  /**
   * Update multiple settings at once
   */
  update(partial: DeepPartial<SettingsData>): void {
    for (const section of Object.keys(partial) as SettingsSection[]) {
      const sectionData = partial[section];
      if (sectionData) {
        for (const [key, value] of Object.entries(sectionData)) {
          const sectionObj = this.data[section] as unknown as Record<string, unknown>;
          const validatedValue = this.validateValue(section, key, value);
          const oldValue = sectionObj[key];
          if (oldValue !== validatedValue) {
            sectionObj[key] = validatedValue;
            this.notifyListeners({
              section,
              key,
              oldValue,
              newValue: validatedValue,
            });
          }
        }
      }
    }
  }

  /**
   * Reset all settings to defaults
   */
  reset(): void {
    const defaults = createDefaultSettings();

    for (const section of Object.keys(defaults) as SettingsSection[]) {
      const sectionDefaults = defaults[section];
      const currentSection = this.data[section] as unknown as Record<string, unknown>;
      for (const [key, value] of Object.entries(sectionDefaults)) {
        const currentValue = currentSection[key];
        if (currentValue !== value) {
          currentSection[key] = value;
          this.notifyListeners({
            section,
            key,
            oldValue: currentValue,
            newValue: value,
          });
        }
      }
    }
  }

  /**
   * Reset a specific section to defaults
   */
  resetSection<K extends SettingsSection>(section: K): void {
    const defaults = createDefaultSettings();
    const sectionDefaults = defaults[section];
    const currentSection = this.data[section] as unknown as Record<string, unknown>;

    for (const [key, value] of Object.entries(sectionDefaults)) {
      const currentValue = currentSection[key];
      if (currentValue !== value) {
        currentSection[key] = value;
        this.notifyListeners({
          section,
          key,
          oldValue: currentValue,
          newValue: value,
        });
      }
    }
  }

  /**
   * Subscribe to settings changes
   */
  subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Save settings to storage
   */
  async save(): Promise<void> {
    if (!this.storageAdapter) {
      throw new Error('No storage adapter configured');
    }
    await this.storageAdapter.save(this.data);
  }

  /**
   * Load settings from storage
   */
  async load(): Promise<void> {
    if (!this.storageAdapter) {
      throw new Error('No storage adapter configured');
    }

    const loadedData = await this.storageAdapter.load();
    if (loadedData) {
      this.mergeData(loadedData);
    }
  }

  /**
   * Validate a value against defined ranges
   */
  private validateValue<T>(section: string, key: string, value: T): T {
    const sectionRanges = SETTINGS_RANGES[section as keyof typeof SETTINGS_RANGES];
    if (!sectionRanges) {
      return value;
    }

    const range = (sectionRanges as Record<string, { min: number; max: number }>)[key];
    if (!range || typeof value !== 'number') {
      return value;
    }

    return Math.max(range.min, Math.min(range.max, value)) as T;
  }

  /**
   * Merge partial data into current settings
   */
  private mergeData(partial: Partial<SettingsData>): void {
    for (const section of Object.keys(partial) as SettingsSection[]) {
      const sectionData = partial[section];
      if (sectionData && typeof sectionData === 'object') {
        const targetSection = this.data[section] as unknown as Record<string, unknown>;
        for (const [key, value] of Object.entries(sectionData)) {
          const validatedValue = this.validateValue(section, key, value);
          targetSection[key] = validatedValue;
        }
      }
    }
  }

  /**
   * Notify all listeners of a change
   */
  private notifyListeners(event: SettingsChangeEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Settings listener error:', error);
      }
    });
  }
}
