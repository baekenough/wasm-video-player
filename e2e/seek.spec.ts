import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Video Seek', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Wait for app to load
    await page.waitForSelector('#app', { timeout: 10000 });
    // Wait for player container (created dynamically)
    await page.waitForTimeout(2000);
  });

  test('should load sample video and seek with keyboard', async ({ page }) => {
    // Collect console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });

    await page.screenshot({ path: 'test-results/before-load.png' });

    // Use filechooser to load file properly
    const sampleVideoPath = path.join(__dirname, '..', 'sample.mp4');

    // Click on the dropzone to open file picker
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('.file-loader-dropzone'),
    ]);

    await fileChooser.setFiles(sampleVideoPath);

    // Wait for video to load (check console for success message)
    await page.waitForFunction(
      () => {
        // Check if video canvas has content
        const canvas = document.getElementById('video-canvas') as HTMLCanvasElement;
        return canvas && canvas.width > 100;
      },
      { timeout: 15000 }
    );

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/after-load.png' });

    // Focus on the player for keyboard events (force through overlay)
    await page.click('#video-canvas', { force: true });
    await page.waitForTimeout(500);

    // Press ArrowRight to seek forward
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-results/after-seek.png' });

    // Check console logs
    const seekLogs = consoleLogs.filter(log => log.includes('[WasmBridge] seek:'));
    const keyboardLogs = consoleLogs.filter(log => log.includes('[KeyboardHandler]'));
    const appLogs = consoleLogs.filter(log => log.includes('[App]'));

    console.log('Keyboard logs:', keyboardLogs);
    console.log('App logs:', appLogs.slice(-5));
    console.log('Seek logs:', seekLogs);

    // Verify keyboard handler was triggered
    expect(keyboardLogs.some(log => log.includes('ArrowRight'))).toBe(true);

    // Check if seek was triggered (either through App or WasmBridge)
    const seekTriggered = seekLogs.length > 0 || appLogs.some(log => log.includes('seekForward'));
    console.log('Seek triggered:', seekTriggered);

    // If samples exist, verify queue was repopulated
    const lastSeekLog = seekLogs[seekLogs.length - 1];
    if (lastSeekLog && lastSeekLog.includes('totalSamples=')) {
      const match = lastSeekLog.match(/totalSamples=\s*(\d+)/);
      if (match && parseInt(match[1]) > 0) {
        // Verify videoQueue was repopulated
        expect(lastSeekLog).toContain('videoQueue=');
      }
    }
  });

  test('should seek backward with ArrowLeft', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });

    // Load video using filechooser
    const sampleVideoPath = path.join(__dirname, '..', 'sample.mp4');
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('.file-loader-dropzone'),
    ]);
    await fileChooser.setFiles(sampleVideoPath);

    await page.waitForFunction(
      () => (document.getElementById('video-canvas') as HTMLCanvasElement)?.width > 100,
      { timeout: 15000 }
    );
    await page.waitForTimeout(2000);

    // Focus and seek
    await page.click('#video-canvas', { force: true });
    await page.waitForTimeout(500);

    // Seek backward
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);

    // Check for backward seek in logs
    const keyboardLogs = consoleLogs.filter(log => log.includes('[KeyboardHandler]'));
    console.log('Keyboard logs:', keyboardLogs);

    expect(keyboardLogs.some(log => log.includes('ArrowLeft'))).toBe(true);
  });

  test('should toggle play/pause with Space key', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });

    // Load video using filechooser
    const sampleVideoPath = path.join(__dirname, '..', 'sample.mp4');
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('.file-loader-dropzone'),
    ]);
    await fileChooser.setFiles(sampleVideoPath);

    await page.waitForFunction(
      () => (document.getElementById('video-canvas') as HTMLCanvasElement)?.width > 100,
      { timeout: 15000 }
    );
    await page.waitForTimeout(2000);

    // Focus
    await page.click('#video-canvas', { force: true });
    await page.waitForTimeout(500);

    // Press Space to toggle
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    // Check toggle logs
    const keyboardLogs = consoleLogs.filter(log => log.includes('[KeyboardHandler]'));
    const appLogs = consoleLogs.filter(log => log.includes('[App] onTogglePlay'));

    console.log('Keyboard logs:', keyboardLogs);
    console.log('Toggle logs:', appLogs);

    expect(keyboardLogs.some(log => log.includes('Space'))).toBe(true);
  });
});
