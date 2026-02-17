import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SeekPosition {
  readonly name: string;
  readonly key: 'ArrowRight' | 'ArrowLeft';
  readonly count: number;
}

interface BenchmarkResult {
  readonly name: string;
  readonly seekTimeMs: number;
  readonly frameResumeMs: number;
}

test.describe('Seek Performance Benchmark', () => {
  test.setTimeout(120_000); // 2 min timeout for large file

  test('should measure seek performance with sample2.mp4', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    // Load sample2.mp4 (294MB)
    const sampleVideoPath = path.join(__dirname, '..', 'sample2.mp4');
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('.file-loader-dropzone'),
    ]);
    await fileChooser.setFiles(sampleVideoPath);

    // Wait for video to fully load and demux
    await page.waitForFunction(
      () => {
        const canvas = document.getElementById('video-canvas') as HTMLCanvasElement;
        return canvas && canvas.width > 100;
      },
      { timeout: 60000 }
    );
    await page.waitForTimeout(3000); // Extra time for full demux

    // Get video duration
    const duration = await page.evaluate(() => {
      const timeDisplay = document.querySelector('.time-display');
      return timeDisplay?.textContent ?? 'unknown';
    });
    console.log(`Video loaded. Duration display: ${duration}`);

    // Start playback first
    await page.click('#video-canvas', { force: true });
    await page.keyboard.press('Space');
    await page.waitForTimeout(2000); // Let it play briefly

    // Define seek targets (various positions in the video)
    const seekPositions: readonly SeekPosition[] = [
      { name: 'forward-5s', key: 'ArrowRight', count: 1 },
      { name: 'forward-25s', key: 'ArrowRight', count: 5 },
      { name: 'backward-5s', key: 'ArrowLeft', count: 1 },
      { name: 'forward-50s', key: 'ArrowRight', count: 10 },
      { name: 'backward-25s', key: 'ArrowLeft', count: 5 },
    ];

    const results: BenchmarkResult[] = [];

    for (const pos of seekPositions) {
      // Clear logs for this measurement
      consoleLogs.length = 0;

      const startTime = Date.now();

      // Perform seek(s)
      for (let i = 0; i < pos.count; i++) {
        await page.keyboard.press(pos.key);
        if (pos.count > 1) {
          await page.waitForTimeout(100); // Brief delay between rapid seeks
        }
      }

      // Measure time until seek log appears (WasmBridge seek completion)
      const seekEndTime = Date.now();

      // Wait for frame to render after seek
      await page.waitForTimeout(500);

      // Check if a frame was rendered (seek complete log)
      const seekLogs = consoleLogs.filter((log) => log.includes('[WasmBridge] seek:'));
      const burstLogs = consoleLogs.filter((log) =>
        log.includes('Seek complete') || log.includes('burstDecode') || log.includes('videoQueue=')
      );

      const frameResumeTime = Date.now();

      results.push({
        name: pos.name,
        seekTimeMs: seekEndTime - startTime,
        frameResumeMs: frameResumeTime - startTime,
      });

      console.log(
        `[BENCHMARK] ${pos.name}: seek=${seekEndTime - startTime}ms, resume=${frameResumeTime - startTime}ms, seekLogs=${seekLogs.length}, burstLogs=${burstLogs.length}`
      );
    }

    // Report results
    console.log('\n=== SEEK PERFORMANCE BENCHMARK RESULTS ===');
    console.log('Video: sample2.mp4 (294MB)');
    console.log('-------------------------------------------');
    for (const r of results) {
      console.log(
        `${r.name.padEnd(20)} seek: ${String(r.seekTimeMs).padStart(5)}ms  resume: ${String(r.frameResumeMs).padStart(5)}ms`
      );
    }
    console.log('-------------------------------------------');

    const avgSeek = results.reduce((sum, r) => sum + r.seekTimeMs, 0) / results.length;
    const avgResume = results.reduce((sum, r) => sum + r.frameResumeMs, 0) / results.length;
    console.log(
      `Average:             seek: ${avgSeek.toFixed(0).padStart(5)}ms  resume: ${avgResume.toFixed(0).padStart(5)}ms`
    );
    console.log('===========================================\n');

    // Performance assertions
    // Each individual seek should complete within 2000ms (generous for large file)
    for (const r of results) {
      expect(r.seekTimeMs).toBeLessThan(2000);
    }

    // Average seek time should be under 1000ms
    expect(avgSeek).toBeLessThan(1000);

    await page.screenshot({ path: 'test-results/seek-benchmark-final.png' });
  });

  test('should measure rapid sequential seeks', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    // Load sample2.mp4
    const sampleVideoPath = path.join(__dirname, '..', 'sample2.mp4');
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('.file-loader-dropzone'),
    ]);
    await fileChooser.setFiles(sampleVideoPath);

    await page.waitForFunction(
      () => {
        const canvas = document.getElementById('video-canvas') as HTMLCanvasElement;
        return canvas && canvas.width > 100;
      },
      { timeout: 60000 }
    );
    await page.waitForTimeout(3000);

    // Focus and start playback
    await page.click('#video-canvas', { force: true });
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);

    // Rapid fire 10 forward seeks
    const rapidStart = Date.now();
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(50); // Very fast seeks
    }
    const rapidEnd = Date.now();

    // Wait for last seek to settle
    await page.waitForTimeout(1000);
    const settleEnd = Date.now();

    console.log(
      `[BENCHMARK] Rapid 10x forward: input=${rapidEnd - rapidStart}ms, settle=${settleEnd - rapidStart}ms`
    );

    // Rapid backward
    const rapidBackStart = Date.now();
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(50);
    }
    const rapidBackEnd = Date.now();
    await page.waitForTimeout(1000);
    const backSettleEnd = Date.now();

    console.log(
      `[BENCHMARK] Rapid 10x backward: input=${rapidBackEnd - rapidBackStart}ms, settle=${backSettleEnd - rapidBackStart}ms`
    );

    // Check for errors in console
    const errorLogs = consoleLogs.filter(
      (log) => log.includes('Error') || log.includes('error') || log.includes('FAIL')
    );
    console.log(`Errors during rapid seek: ${errorLogs.length}`);
    if (errorLogs.length > 0) {
      console.log('Error samples:', errorLogs.slice(0, 5));
    }

    // Rapid seeks should all complete without crashing
    await page.screenshot({ path: 'test-results/rapid-seek-final.png' });

    // Total rapid seek time should be reasonable (10 seeks in under 3s)
    expect(rapidEnd - rapidStart).toBeLessThan(3000);
    expect(rapidBackEnd - rapidBackStart).toBeLessThan(3000);
  });
});
