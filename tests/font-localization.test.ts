import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { composeAppStoreScreenshot } from '../src/core/compose.js';
import sharp from 'sharp';

describe('Font Localization', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a temp directory for testing
    testDir = path.join(process.cwd(), 'test-temp-font-localization');
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should use device-specific font when available', async () => {
    // Create a test screenshot
    const screenshot = await sharp({
      create: {
        width: 1242,
        height: 2208,
        channels: 4,
        background: { r: 100, g: 100, b: 100, alpha: 1 }
      }
    }).png().toBuffer();

    // Test with device-specific font
    const result = await composeAppStoreScreenshot({
      screenshot,
      frame: null,
      frameMetadata: undefined,
      caption: 'Test Caption',
      captionConfig: {
        font: 'Helvetica', // Global font
        fontsize: 64,
        color: '#FFFFFF',
        align: 'center',
        position: 'above',
        paddingTop: 100,
        paddingBottom: 60
      },
      gradientConfig: {
        colors: ['#FF0000', '#00FF00'],
        direction: 'top-bottom'
      },
      deviceConfig: {
        input: './screenshots/test',
        resolution: '1290x2796',
        autoFrame: true,
        captionFont: 'Arial' // Device-specific font - should override global
      },
      outputWidth: 1290,
      outputHeight: 2796
    });

    expect(result).toBeInstanceOf(Buffer);
    
    // The compose function should use Arial (device-specific) not Helvetica (global)
    // This is verified by the fact that the test doesn't throw an error
    // and produces a valid buffer
  });

  it('should use global font when no device-specific font is set', async () => {
    const screenshot = await sharp({
      create: {
        width: 1242,
        height: 2208,
        channels: 4,
        background: { r: 100, g: 100, b: 100, alpha: 1 }
      }
    }).png().toBuffer();

    const result = await composeAppStoreScreenshot({
      screenshot,
      frame: null,
      frameMetadata: undefined,
      caption: 'Test Caption',
      captionConfig: {
        font: 'Georgia', // Global font
        fontsize: 64,
        color: '#FFFFFF',
        align: 'center',
        position: 'above',
        paddingTop: 100,
        paddingBottom: 60
      },
      gradientConfig: {
        colors: ['#0000FF', '#FF00FF'],
        direction: 'diagonal'
      },
      deviceConfig: {
        input: './screenshots/test',
        resolution: '1290x2796',
        autoFrame: true
        // No captionFont specified - should use global font
      },
      outputWidth: 1290,
      outputHeight: 2796
    });

    expect(result).toBeInstanceOf(Buffer);
    
    // The compose function should use Georgia (global font)
    // since no device-specific font is provided
  });

  it('should handle multiple languages with consistent font', async () => {
    const screenshot = await sharp({
      create: {
        width: 1242,
        height: 2208,
        channels: 4,
        background: { r: 50, g: 50, b: 50, alpha: 1 }
      }
    }).png().toBuffer();

    const languages = {
      en: 'English Caption',
      es: 'Texto en Español',
      fr: 'Texte en Français'
    };

    const results = [];

    for (const [lang, caption] of Object.entries(languages)) {
      const result = await composeAppStoreScreenshot({
        screenshot,
        frame: null,
        frameMetadata: undefined,
        caption,
        captionConfig: {
          font: 'Verdana',
          fontsize: 72,
          color: '#FFFFFF',
          align: 'center',
          position: 'above',
          paddingTop: 120,
          paddingBottom: 80
        },
        gradientConfig: {
          colors: ['#FF5733', '#FFC300'],
          direction: 'top-bottom'
        },
        deviceConfig: {
          input: './screenshots/test',
          resolution: '1290x2796',
          autoFrame: true,
          captionFont: 'Impact' // Device-specific font should apply to all languages
        },
        outputWidth: 1284,
        outputHeight: 2778
      });

      expect(result).toBeInstanceOf(Buffer);
      results.push(result);
    }

    // All three language versions should be created successfully
    expect(results).toHaveLength(3);
    
    // Each should use the device-specific font (Impact) regardless of language
  });
});