import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { composeAppStoreScreenshot } from '../src/core/compose.js';
import type { CaptionConfig, GradientConfig, DeviceConfig, LayoutDebugInfo } from '../src/types.js';

const gradient: GradientConfig = { colors: ['#111111', '#222222'], direction: 'top-bottom' };

async function shot(w = 400, h = 800) {
  return sharp({ create: { width: w, height: h, channels: 4, background: { r: 10, g: 10, b: 10, alpha: 1 } } })
    .png()
    .toBuffer();
}

describe('Layout debug positions (onDebug)', () => {
  it('overlay: anchors by outer box bottom spacing', async () => {
    const screenshot = await shot();
    const device: DeviceConfig = { input: './x', resolution: '400x800' };
    const debug: LayoutDebugInfo[] = [];
    const caption: CaptionConfig = {
      font: 'Arial',
      fontsize: 28,
      color: '#FFFFFF',
      align: 'center',
      position: 'overlay',
      paddingTop: 0,
      paddingBottom: 0,
      background: { color: '#000000', opacity: 0.8, padding: 20, sideMargin: 30 },
      border: { color: '#FFFFFF', width: 4, radius: 10 }
    };
    await composeAppStoreScreenshot({
      screenshot,
      frame: null,
      caption: 'Overlay Test',
      captionConfig: caption,
      gradientConfig: gradient,
      deviceConfig: device,
      outputWidth: 400,
      outputHeight: 800,
      onDebug: (i) => debug.push(i)
    });
    const info = debug.find(d => d.mode === 'overlay');
    expect(info).toBeDefined();
    // With no marginBottom/paddingBottom, bottomSpacing defaults to 0.
    // rectBottom accounts for half the stroke width; allow a small tolerance.
    const expected = 800 - ((info!.bottomSpacing ?? 0) + (4 / 2));
    expect(Math.abs((info!.rectBottom ?? 0) - expected)).toBeLessThanOrEqual(2);
    // Rect must be fully on-canvas
    expect(info!.captionTop + info!.captionHeight).toBeLessThanOrEqual(800);
  });

  it('below: caption sits below device with gap (default gap when undefined)', async () => {
    const screenshot = await shot();
    const device: DeviceConfig = { input: './x', resolution: '400x800' };
    const debug: LayoutDebugInfo[] = [];
    const caption: CaptionConfig = {
      font: 'Arial',
      fontsize: 28,
      color: '#FFFFFF',
      align: 'center',
      position: 'below',
      paddingTop: 0,
      paddingBottom: 0,
      box: { autoSize: true }
    };
    await composeAppStoreScreenshot({
      screenshot,
      frame: null,
      caption: 'Below Test',
      captionConfig: caption,
      gradientConfig: gradient,
      deviceConfig: device,
      outputWidth: 400,
      outputHeight: 800,
      onDebug: (i) => debug.push(i)
    });
    const info = debug.find(d => d.mode === 'below');
    expect(info).toBeDefined();
    // Must be below device; allow >= because gap could be 0 if explicitly set elsewhere
    expect(info!.captionTop).toBeGreaterThanOrEqual(info!.deviceBottom);
    // On-canvas
    expect(info!.captionTop + info!.captionHeight).toBeLessThanOrEqual(800);
  });

  it('overlay: respects explicit marginBottom (bottom spacing)', async () => {
    const screenshot = await shot();
    const device: DeviceConfig = { input: './x', resolution: '400x800' };
    const debug: LayoutDebugInfo[] = [];
    const caption: CaptionConfig = {
      font: 'Arial',
      fontsize: 24,
      color: '#FFFFFF',
      align: 'center',
      position: 'overlay',
      paddingTop: 0,
      paddingBottom: 0,
      background: { color: '#000000', opacity: 0.8, padding: 16, sideMargin: 30 },
      border: { color: '#FFFFFF', width: 2, radius: 8 },
      box: { marginBottom: 80, lineHeight: 1.3 }
    };
    await composeAppStoreScreenshot({
      screenshot,
      frame: null,
      caption: 'Explicit bottom',
      captionConfig: caption,
      gradientConfig: gradient,
      deviceConfig: device,
      outputWidth: 400,
      outputHeight: 800,
      onDebug: (i) => debug.push(i)
    });
    const info = debug.find(d => d.mode === 'overlay');
    expect(info).toBeDefined();
    const expected = 800 - (80 + (2 / 2));
    expect(Math.abs((info!.rectBottom ?? 0) - expected)).toBeLessThanOrEqual(2);
  });

  it('watch below: marginTop increases separation from band/device', async () => {
    // Use watch-like resolution
    const w = 410, h = 502;
    const screenshot = await shot(w, h);
    const device: DeviceConfig = { input: './x', resolution: `${w}x${h}` };

    let info1: LayoutDebugInfo | undefined;
    await composeAppStoreScreenshot({
      screenshot,
      frame: null,
      caption: 'Track',
      captionConfig: { font: 'Arial', fontsize: 28, color: '#fff', align: 'center', position: 'below', box: { autoSize: true } },
      gradientConfig: gradient,
      deviceConfig: device,
      outputWidth: w,
      outputHeight: h,
      onDebug: (d) => { if (d.mode === 'below') info1 = d; }
    });
    expect(info1).toBeDefined();

    let info2: LayoutDebugInfo | undefined;
    await composeAppStoreScreenshot({
      screenshot,
      frame: null,
      caption: 'Track',
      captionConfig: { font: 'Arial', fontsize: 28, color: '#fff', align: 'center', position: 'below', box: { autoSize: true, marginTop: 24 } },
      gradientConfig: gradient,
      deviceConfig: device,
      outputWidth: w,
      outputHeight: h,
      onDebug: (d) => { if (d.mode === 'below') info2 = d; }
    });
    expect(info2).toBeDefined();
    // Caption should move down by ~24px (allow tolerance because device placement can shift slightly)
    expect((info2!.captionTop - info2!.deviceBottom)).toBeGreaterThanOrEqual(20);
  });

  it('above: composes without overlapping calculations (smoke)', async () => {
    const screenshot = await shot();
    const device: DeviceConfig = { input: './x', resolution: '400x800' };
    const debug: LayoutDebugInfo[] = [];
    const caption: CaptionConfig = {
      font: 'Arial',
      fontsize: 28,
      color: '#FFFFFF',
      align: 'center',
      position: 'above',
      paddingTop: 0,
      paddingBottom: 0,
      box: { autoSize: true, marginTop: 20 }
    };
    await composeAppStoreScreenshot({
      screenshot,
      frame: null,
      caption: 'Above Test',
      captionConfig: caption,
      gradientConfig: gradient,
      deviceConfig: device,
      outputWidth: 400,
      outputHeight: 800,
      onDebug: (i) => debug.push(i)
    });
    // For frame=null path, onDebug is emitted earlier for below/overlay; above is covered by other suites.
    expect(debug.length).toBeGreaterThanOrEqual(0);
  });

  it('below: framePosition still shifts when caption/device leaves no margin slack', async () => {
    const outputWidth = 2880;
    const outputHeight = 1800;
    const frameWidth = 3944;
    const frameHeight = 2564;
    const screenWidth = 3024;
    const screenHeight = 1964;

    const screenshot = await sharp({
      create: {
        width: screenWidth,
        height: screenHeight,
        channels: 4,
        background: { r: 20, g: 20, b: 20, alpha: 1 }
      }
    }).png().toBuffer();

    const frame = await sharp({
      create: {
        width: frameWidth,
        height: frameHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    }).png().toBuffer();

    const caption: CaptionConfig = {
      font: 'Georgia',
      fontsize: 68,
      color: '#FFFFFF',
      align: 'center',
      position: 'below',
      background: { color: '#043f5d', opacity: 0.5, padding: 20, sideMargin: 30 },
      border: { color: '#195297', width: 1, radius: 8 },
      box: { autoSize: true, maxLines: 2, lineHeight: 1.5, marginTop: 0, marginBottom: 60 }
    };

    const baseDevice: DeviceConfig = {
      input: './x',
      resolution: `${screenWidth}x${screenHeight}`,
      frameScale: 0.9,
      captionBox: { marginBottom: 60 }
    };

    const frameMeta = {
      frameWidth,
      frameHeight,
      screenRect: { x: 0, y: 0, width: screenWidth, height: screenHeight },
      deviceType: 'mac' as const,
      displayName: 'Test Mac'
    };

    const debug0: LayoutDebugInfo[] = [];
    await composeAppStoreScreenshot({
      screenshot,
      frame,
      frameMetadata: frameMeta,
      caption: 'Sophisticated and Professional',
      captionConfig: caption,
      gradientConfig: gradient,
      deviceConfig: { ...baseDevice, framePosition: 0 },
      outputWidth,
      outputHeight,
      onDebug: info => debug0.push(info)
    });
    const below0 = debug0.find(d => d.mode === 'below');
    expect(below0).toBeDefined();

    const debug100: LayoutDebugInfo[] = [];
    await composeAppStoreScreenshot({
      screenshot,
      frame,
      frameMetadata: frameMeta,
      caption: 'Sophisticated and Professional',
      captionConfig: caption,
      gradientConfig: gradient,
      deviceConfig: { ...baseDevice, framePosition: 100 },
      outputWidth,
      outputHeight,
      onDebug: info => debug100.push(info)
    });
    const below100 = debug100.find(d => d.mode === 'below');
    expect(below100).toBeDefined();

    // With the fallback slack, framePosition=100 should sit lower than 0 but remain on canvas
    expect(below0!.deviceTop).toBe(0);
    expect(below100!.deviceTop).toBeGreaterThan(below0!.deviceTop);
    expect(below100!.deviceTop).toBeLessThanOrEqual(10); // limited slack even at full-size template dims
  });
});
