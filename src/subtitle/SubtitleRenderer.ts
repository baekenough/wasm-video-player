/**
 * SubtitleRenderer - Canvas-based subtitle rendering
 *
 * Renders subtitles on a canvas overlay with configurable styling.
 * Supports multi-line text, outlines, and dynamic option changes.
 */

import type { SubtitleEntry, SubtitleRendererOptions } from './types';
import { DEFAULT_RENDERER_OPTIONS } from './types';

/**
 * Canvas subtitle renderer
 */
export class SubtitleRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private options: Required<SubtitleRendererOptions>;
  private disposed: boolean = false;

  /**
   * Create a subtitle renderer
   *
   * @param canvas - Canvas element to render on
   * @param options - Rendering options
   */
  constructor(canvas: HTMLCanvasElement, options?: SubtitleRendererOptions) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = { ...DEFAULT_RENDERER_OPTIONS, ...options };
  }

  /**
   * Render subtitle entries on canvas
   *
   * @param entries - Subtitle entries to render
   */
  render(entries: SubtitleEntry[]): void {
    if (this.disposed || !this.ctx) {
      return;
    }

    // Clear canvas
    this.clear();

    if (entries.length === 0) {
      return;
    }

    const ctx = this.ctx;

    // Apply font settings
    ctx.font = `${this.options.fontSize}px ${this.options.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Calculate positions
    const centerX = this.canvas.width / 2;
    let currentY = this.canvas.height - this.options.bottomMargin;

    // Collect all lines from all entries
    const allLines: string[] = [];
    for (const entry of entries) {
      const text = this.stripHtmlTags(entry.text);
      const lines = text.split('\n');
      allLines.push(...lines);
    }

    // Calculate line height
    const lineHeight = this.options.fontSize * this.options.lineHeight;

    // Adjust starting Y position
    currentY = this.canvas.height - this.options.bottomMargin;

    // Render lines from bottom to top (last line at bottom)
    for (let i = allLines.length - 1; i >= 0; i--) {
      const line = allLines[i];
      const y = currentY - (allLines.length - 1 - i) * lineHeight;

      this.renderLine(ctx, line, centerX, y);
    }
  }

  /**
   * Render a single line of text with outline
   */
  private renderLine(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
  ): void {
    // Draw outline first (if enabled)
    if (this.options.outlineWidth > 0) {
      ctx.strokeStyle = this.options.outlineColor;
      ctx.lineWidth = this.options.outlineWidth * 2;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(text, x, y);
    }

    // Draw fill text
    ctx.fillStyle = this.options.color;
    ctx.fillText(text, x, y);
  }

  /**
   * Strip HTML tags from text for basic canvas rendering
   *
   * @param text - Text potentially containing HTML tags
   * @returns Plain text without tags
   */
  private stripHtmlTags(text: string): string {
    return text.replace(/<[^>]*>/g, '');
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Update rendering options
   *
   * @param options - New options to merge
   */
  setOptions(options: Partial<SubtitleRendererOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current rendering options
   *
   * @returns Current options
   */
  getOptions(): Required<SubtitleRendererOptions> {
    return { ...this.options };
  }

  /**
   * Dispose renderer and release resources
   */
  dispose(): void {
    this.disposed = true;
    this.clear();
  }
}
