import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import {
  detectOrientation,
  getImageDimensions,
  findBestFrame,
  loadFrame,
  autoSelectFrame,
  frameRegistry
} from '../src/core/devices.js';

describe('devices', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'appshot-device-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('detectOrientation', () => {
    it('should detect portrait orientation', () => {
      expect(detectOrientation(1080, 1920)).toBe('portrait');
      expect(detectOrientation(750, 1334)).toBe('portrait');
      expect(detectOrientation(1000, 2000)).toBe('portrait');
    });

    it('should detect landscape orientation', () => {
      expect(detectOrientation(1920, 1080)).toBe('landscape');
      expect(detectOrientation(1334, 750)).toBe('landscape');
      expect(detectOrientation(2000, 1000)).toBe('landscape');
    });

    it('should treat square as portrait', () => {
      expect(detectOrientation(1000, 1000)).toBe('portrait');
    });
  });

  describe('getImageDimensions', () => {
    it('should get dimensions and orientation from portrait image', async () => {
      const imagePath = path.join(tempDir, 'portrait.png');
      await sharp({
        create: {
          width: 1284,
          height: 2778,
          channels: 3,
          background: { r: 255, g: 0, b: 0 }
        }
      }).toFile(imagePath);

      const result = await getImageDimensions(imagePath);
      expect(result.width).toBe(1284);
      expect(result.height).toBe(2778);
      expect(result.orientation).toBe('portrait');
    });

    it('should get dimensions and orientation from landscape image', async () => {
      const imagePath = path.join(tempDir, 'landscape.png');
      await sharp({
        create: {
          width: 2778,
          height: 1284,
          channels: 3,
          background: { r: 0, g: 255, b: 0 }
        }
      }).toFile(imagePath);

      const result = await getImageDimensions(imagePath);
      expect(result.width).toBe(2778);
      expect(result.height).toBe(1284);
      expect(result.orientation).toBe('landscape');
    });
  });

  describe('findBestFrame', () => {
    it('should find portrait iPhone frame for portrait screenshot', () => {
      const frame = findBestFrame(1290, 2796, 'iphone');
      expect(frame).not.toBeNull();
      expect(frame?.orientation).toBe('portrait');
      expect(frame?.deviceType).toBe('iphone');
    });

    it('should find landscape iPhone frame for landscape screenshot', () => {
      const frame = findBestFrame(2796, 1290, 'iphone');
      expect(frame).not.toBeNull();
      expect(frame?.orientation).toBe('landscape');
      expect(frame?.deviceType).toBe('iphone');
    });

    it('should find portrait iPad frame for portrait screenshot', () => {
      const frame = findBestFrame(2048, 2732, 'ipad');
      expect(frame).not.toBeNull();
      expect(frame?.orientation).toBe('portrait');
      expect(frame?.deviceType).toBe('ipad');
    });

    it('should find landscape iPad frame for landscape screenshot', () => {
      const frame = findBestFrame(2732, 2048, 'ipad');
      expect(frame).not.toBeNull();
      expect(frame?.orientation).toBe('landscape');
      expect(frame?.deviceType).toBe('ipad');
    });

    it('should always find landscape frame for Mac', () => {
      const frame = findBestFrame(3456, 2234, 'mac');
      expect(frame).not.toBeNull();
      expect(frame?.orientation).toBe('landscape');
      expect(frame?.deviceType).toBe('mac');
    });

    it('should always find portrait frame for Watch', () => {
      const frame = findBestFrame(410, 502, 'watch');
      expect(frame).not.toBeNull();
      expect(frame?.orientation).toBe('portrait');
      expect(frame?.deviceType).toBe('watch');
    });

    it('should prefer specified frame if it matches orientation', () => {
      const frame = findBestFrame(1179, 2556, 'iphone', 'iphone-15-pro-portrait');
      expect(frame).not.toBeNull();
      expect(frame?.name).toBe('iphone-15-pro-portrait');
    });

    it('should ignore preferred frame if orientation does not match', () => {
      const frame = findBestFrame(2556, 1179, 'iphone', 'iphone-15-pro-portrait');
      expect(frame).not.toBeNull();
      expect(frame?.orientation).toBe('landscape');
      expect(frame?.name).not.toBe('iphone-15-pro-portrait');
    });

    it('should find frame with closest aspect ratio', () => {
      // iPhone SE aspect ratio is different from Pro models
      const frame = findBestFrame(750, 1334, 'iphone');
      expect(frame).not.toBeNull();
      expect(frame?.name).toBe('iphone-se-portrait');
    });

    it('should return null if no frames match device type', () => {
      // @ts-ignore - testing invalid device type
      const frame = findBestFrame(1000, 2000, 'android');
      expect(frame).toBeNull();
    });
  });

  describe('loadFrame', () => {
    it('should load frame from disk', async () => {
      const framesDir = path.join(tempDir, 'frames');
      await fs.mkdir(framesDir);
      
      const framePath = path.join(framesDir, 'test-frame.png');
      const frameBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 0, g: 0, b: 255 }
        }
      }).png().toBuffer();
      
      await fs.writeFile(framePath, frameBuffer);
      
      const loaded = await loadFrame(framesDir, 'test-frame');
      expect(loaded).not.toBeNull();
      expect(loaded).toBeInstanceOf(Buffer);
    });

    it('should return null if frame does not exist', async () => {
      const loaded = await loadFrame(tempDir, 'nonexistent-frame');
      expect(loaded).toBeNull();
    });
  });

  describe('autoSelectFrame', () => {
    it('should auto-select portrait frame for portrait screenshot', async () => {
      const screenshotPath = path.join(tempDir, 'screenshot.png');
      await sharp({
        create: {
          width: 1284,
          height: 2778,
          channels: 3,
          background: { r: 255, g: 255, b: 0 }
        }
      }).toFile(screenshotPath);

      const framesDir = path.join(tempDir, 'frames');
      await fs.mkdir(framesDir);

      const { frame, metadata } = await autoSelectFrame(
        screenshotPath,
        framesDir,
        'iphone'
      );

      expect(metadata).not.toBeNull();
      expect(metadata?.orientation).toBe('portrait');
      expect(metadata?.deviceType).toBe('iphone');
      expect(frame).toBeNull(); // Frame file doesn't exist, but metadata should be selected
    });

    it('should auto-select landscape frame for landscape screenshot', async () => {
      const screenshotPath = path.join(tempDir, 'screenshot.png');
      await sharp({
        create: {
          width: 2778,
          height: 1284,
          channels: 3,
          background: { r: 255, g: 255, b: 0 }
        }
      }).toFile(screenshotPath);

      const framesDir = path.join(tempDir, 'frames');
      await fs.mkdir(framesDir);

      const { frame, metadata } = await autoSelectFrame(
        screenshotPath,
        framesDir,
        'iphone'
      );

      expect(metadata).not.toBeNull();
      expect(metadata?.orientation).toBe('landscape');
      expect(metadata?.deviceType).toBe('iphone');
    });

    it('should use preferred frame if specified and matching', async () => {
      const screenshotPath = path.join(tempDir, 'screenshot.png');
      await sharp({
        create: {
          width: 1179,
          height: 2556,
          channels: 3,
          background: { r: 255, g: 255, b: 0 }
        }
      }).toFile(screenshotPath);

      const framesDir = path.join(tempDir, 'frames');
      await fs.mkdir(framesDir);

      const { metadata } = await autoSelectFrame(
        screenshotPath,
        framesDir,
        'iphone',
        'iphone-15-pro-portrait'
      );

      expect(metadata).not.toBeNull();
      expect(metadata?.name).toBe('iphone-15-pro-portrait');
    });

    it('should load actual frame file if it exists', async () => {
      const screenshotPath = path.join(tempDir, 'screenshot.png');
      await sharp({
        create: {
          width: 1284,
          height: 2778,
          channels: 3,
          background: { r: 255, g: 255, b: 0 }
        }
      }).toFile(screenshotPath);

      const framesDir = path.join(tempDir, 'frames');
      await fs.mkdir(framesDir);

      // Create a frame file that matches what would be selected
      const selectedFrame = findBestFrame(1284, 2778, 'iphone');
      if (selectedFrame) {
        const framePath = path.join(framesDir, `${selectedFrame.name}.png`);
        const frameBuffer = await sharp({
          create: {
            width: selectedFrame.frameWidth,
            height: selectedFrame.frameHeight,
            channels: 3,
            background: { r: 0, g: 0, b: 0 }
          }
        }).png().toBuffer();
        await fs.writeFile(framePath, frameBuffer);
      }

      const { frame, metadata } = await autoSelectFrame(
        screenshotPath,
        framesDir,
        'iphone'
      );

      expect(metadata).not.toBeNull();
      expect(frame).not.toBeNull();
      expect(frame).toBeInstanceOf(Buffer);
    });

    it('should handle errors gracefully', async () => {
      const { frame, metadata } = await autoSelectFrame(
        '/nonexistent/path.png',
        '/nonexistent/frames',
        'iphone'
      );

      expect(frame).toBeNull();
      expect(metadata).toBeNull();
    });
  });

  describe('frameRegistry', () => {
    it('should have frames for all device types', () => {
      const deviceTypes = ['iphone', 'ipad', 'mac', 'watch'];
      
      for (const deviceType of deviceTypes) {
        const frames = frameRegistry.filter(f => f.deviceType === deviceType);
        expect(frames.length).toBeGreaterThan(0);
      }
    });

    it('should have both orientations for iPhone', () => {
      const iPhoneFrames = frameRegistry.filter(f => f.deviceType === 'iphone');
      const portrait = iPhoneFrames.filter(f => f.orientation === 'portrait');
      const landscape = iPhoneFrames.filter(f => f.orientation === 'landscape');
      
      expect(portrait.length).toBeGreaterThan(0);
      expect(landscape.length).toBeGreaterThan(0);
    });

    it('should have both orientations for iPad', () => {
      const iPadFrames = frameRegistry.filter(f => f.deviceType === 'ipad');
      const portrait = iPadFrames.filter(f => f.orientation === 'portrait');
      const landscape = iPadFrames.filter(f => f.orientation === 'landscape');
      
      expect(portrait.length).toBeGreaterThan(0);
      expect(landscape.length).toBeGreaterThan(0);
    });

    it('should have valid screen rectangles', () => {
      for (const frame of frameRegistry) {
        expect(frame.screenRect.x).toBeGreaterThanOrEqual(0);
        expect(frame.screenRect.y).toBeGreaterThanOrEqual(0);
        expect(frame.screenRect.width).toBeGreaterThan(0);
        expect(frame.screenRect.height).toBeGreaterThan(0);
        
        // Screen should fit within frame
        expect(frame.screenRect.x + frame.screenRect.width).toBeLessThanOrEqual(frame.frameWidth);
        expect(frame.screenRect.y + frame.screenRect.height).toBeLessThanOrEqual(frame.frameHeight);
      }
    });

    it('should have matching orientation between frame and screen dimensions', () => {
      for (const frame of frameRegistry) {
        const frameOrientation = frame.frameWidth > frame.frameHeight ? 'landscape' : 'portrait';
        const screenOrientation = frame.screenRect.width > frame.screenRect.height ? 'landscape' : 'portrait';
        
        expect(frameOrientation).toBe(frame.orientation);
        expect(screenOrientation).toBe(frame.orientation);
      }
    });
  });
});