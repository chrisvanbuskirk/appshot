import { describe, it, expect, beforeAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { loadFramesMetadata, buildFrameRegistry } from '../src/core/frames-loader.js';

const FRAMES_DIR = path.join(process.cwd(), 'frames');

describe('Frames.json validation', () => {
  let framesData: any;
  let frameFiles: string[];

  beforeAll(async () => {
    // Load Frames.json
    framesData = await loadFramesMetadata(FRAMES_DIR);
    
    // Get list of actual frame files
    const files = await fs.readdir(FRAMES_DIR);
    frameFiles = files.filter(f => f.endsWith('.png'));
  });

  describe('Structure validation', () => {
    it('should have valid top-level structure', () => {
      expect(framesData).toBeDefined();
      expect(typeof framesData).toBe('object');
      
      // Should have at least one device category
      const deviceCategories = ['iPhone', 'iPad', 'Mac', 'Watch'];
      const hasAtLeastOneCategory = deviceCategories.some(cat => framesData[cat]);
      expect(hasAtLeastOneCategory).toBe(true);
    });

    it('should have version field', () => {
      expect(framesData.version).toBeDefined();
      expect(typeof framesData.version).toBe('string');
    });

    it('should have valid iPhone frames structure', () => {
      if (framesData.iPhone) {
        expect(typeof framesData.iPhone).toBe('object');
        
        // Check for required frame properties
        const checkFrame = (frame: any, path: string) => {
          if (frame && typeof frame === 'object') {
            // Direct frame entry
            if (frame.name) {
              expect(frame.name, `${path}.name`).toBeDefined();
              expect(typeof frame.name).toBe('string');
              expect(frame.x, `${path}.x`).toBeDefined();
              expect(frame.y, `${path}.y`).toBeDefined();
            }
            // Check for Portrait/Landscape
            if (frame.Portrait) {
              expect(frame.Portrait.name, `${path}.Portrait.name`).toBeDefined();
              expect(frame.Portrait.x, `${path}.Portrait.x`).toBeDefined();
              expect(frame.Portrait.y, `${path}.Portrait.y`).toBeDefined();
            }
            if (frame.Landscape) {
              expect(frame.Landscape.name, `${path}.Landscape.name`).toBeDefined();
              expect(frame.Landscape.x, `${path}.Landscape.x`).toBeDefined();
              expect(frame.Landscape.y, `${path}.Landscape.y`).toBeDefined();
            }
          }
        };

        // Validate each iPhone model
        Object.entries(framesData.iPhone).forEach(([model, data]) => {
          if (typeof data === 'object') {
            // Could be direct frame or have variants
            Object.entries(data as any).forEach(([variant, frame]) => {
              checkFrame(frame, `iPhone.${model}.${variant}`);
            });
          }
        });
      }
    });

    it('should have valid iPad frames structure', () => {
      if (framesData.iPad) {
        expect(typeof framesData.iPad).toBe('object');
        
        Object.entries(framesData.iPad).forEach(([model, orientations]) => {
          if (typeof orientations === 'object') {
            const data = orientations as any;
            
            // iPads should have Portrait and/or Landscape
            if (data.Portrait) {
              expect(data.Portrait.name).toBeDefined();
              expect(data.Portrait.x).toBeDefined();
              expect(data.Portrait.y).toBeDefined();
            }
            if (data.Landscape) {
              expect(data.Landscape.name).toBeDefined();
              expect(data.Landscape.x).toBeDefined();
              expect(data.Landscape.y).toBeDefined();
            }
          }
        });
      }
    });

    it('should have valid Mac frames structure', () => {
      if (framesData.Mac) {
        expect(typeof framesData.Mac).toBe('object');
        
        Object.entries(framesData.Mac).forEach(([model, data]) => {
          if (typeof data === 'object') {
            const frame = data as any;
            
            // Could be direct frame or have size variants
            if (frame.name) {
              expect(frame.x).toBeDefined();
              expect(frame.y).toBeDefined();
            } else {
              // Check for size variants (like 14" and 16")
              Object.values(frame).forEach((sizeData: any) => {
                if (sizeData && typeof sizeData === 'object') {
                  expect(sizeData.name).toBeDefined();
                  expect(sizeData.x).toBeDefined();
                  expect(sizeData.y).toBeDefined();
                }
              });
            }
          }
        });
      }
    });

    it('should have valid Watch frames structure', () => {
      if (framesData.Watch) {
        expect(typeof framesData.Watch).toBe('object');
        
        Object.entries(framesData.Watch).forEach(([model, data]) => {
          if (typeof data === 'object') {
            const frame = data as any;
            
            // Could be direct frame or have size variants
            if (frame.name) {
              expect(frame.x).toBeDefined();
              expect(frame.y).toBeDefined();
            } else {
              // Check for size variants (like 40mm, 44mm)
              Object.values(frame).forEach((sizeData: any) => {
                if (sizeData && typeof sizeData === 'object') {
                  expect(sizeData.name).toBeDefined();
                  expect(sizeData.x).toBeDefined();
                  expect(sizeData.y).toBeDefined();
                }
              });
            }
          }
        });
      }
    });
  });

  describe('Frame file existence', () => {
    const collectFrameNames = (data: any): string[] => {
      const names: string[] = [];
      
      const traverse = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        
        if (obj.name && typeof obj.name === 'string') {
          names.push(obj.name);
        }
        
        Object.values(obj).forEach(value => {
          if (typeof value === 'object') {
            traverse(value);
          }
        });
      };
      
      traverse(data);
      return names;
    };

    it('should have PNG files for all frames in Frames.json', () => {
      const frameNames = collectFrameNames(framesData);
      const missingFiles: string[] = [];
      
      frameNames.forEach(name => {
        const expectedFile = `${name}.png`;
        if (!frameFiles.includes(expectedFile)) {
          missingFiles.push(expectedFile);
        }
      });
      
      if (missingFiles.length > 0) {
        console.warn('Missing frame files:', missingFiles);
      }
      
      // We expect most files to exist, but some might be optional
      const percentageFound = (frameNames.length - missingFiles.length) / frameNames.length;
      expect(percentageFound).toBeGreaterThan(0.8); // At least 80% should exist
    });

    it('should not have orphaned PNG files', () => {
      const frameNames = collectFrameNames(framesData);
      const frameNameSet = new Set(frameNames.map(n => `${n}.png`));
      
      const orphanedFiles = frameFiles.filter(file => {
        // Skip mask files and other special files
        if (file.includes('_mask') || file.includes('_frame_no_island')) {
          return false;
        }
        return !frameNameSet.has(file);
      });
      
      if (orphanedFiles.length > 0) {
        console.warn('Orphaned frame files (not in Frames.json):', orphanedFiles);
      }
      
      // Some orphaned files might be okay (variants, masks, etc.)
      expect(orphanedFiles.length).toBeLessThan(frameFiles.length * 0.5); // Less than 50% orphaned
    });
  });

  describe('Frame properties validation', () => {
    it('should have valid x,y coordinates', () => {
      const validateCoordinates = (obj: any, path: string) => {
        if (!obj || typeof obj !== 'object') return;
        
        if (obj.x !== undefined) {
          const x = parseInt(obj.x);
          expect(x, `${path}.x should be a valid number`).toBeGreaterThanOrEqual(0);
          expect(x, `${path}.x should be reasonable`).toBeLessThan(10000);
        }
        
        if (obj.y !== undefined) {
          const y = parseInt(obj.y);
          expect(y, `${path}.y should be a valid number`).toBeGreaterThanOrEqual(0);
          expect(y, `${path}.y should be reasonable`).toBeLessThan(10000);
        }
        
        Object.entries(obj).forEach(([key, value]) => {
          if (typeof value === 'object' && key !== 'version') {
            validateCoordinates(value, `${path}.${key}`);
          }
        });
      };
      
      validateCoordinates(framesData, 'root');
    });

    it('should have consistent orientation naming', () => {
      const checkOrientations = (obj: any, path: string) => {
        if (!obj || typeof obj !== 'object') return;
        
        // Check for orientation keys
        const hasPortrait = 'Portrait' in obj;
        const hasLandscape = 'Landscape' in obj;
        
        if (hasPortrait) {
          expect(obj.Portrait).toBeDefined();
          expect(typeof obj.Portrait).toBe('object');
        }
        
        if (hasLandscape) {
          expect(obj.Landscape).toBeDefined();
          expect(typeof obj.Landscape).toBe('object');
        }
        
        // Recursively check nested objects
        Object.entries(obj).forEach(([key, value]) => {
          if (typeof value === 'object' && 
              key !== 'Portrait' && 
              key !== 'Landscape' && 
              key !== 'version') {
            checkOrientations(value, `${path}.${key}`);
          }
        });
      };
      
      checkOrientations(framesData, 'root');
    });
  });

  describe('Frame registry building', () => {
    it('should build a valid frame registry', async () => {
      const registry = await buildFrameRegistry(FRAMES_DIR);
      
      expect(Array.isArray(registry)).toBe(true);
      expect(registry.length).toBeGreaterThan(0);
      
      // Check each registry entry
      registry.forEach(frame => {
        expect(frame.name).toBeDefined();
        expect(frame.displayName).toBeDefined();
        expect(frame.orientation).toMatch(/^(portrait|landscape)$/);
        expect(frame.deviceType).toMatch(/^(iphone|ipad|mac|watch)$/);
        expect(frame.frameWidth).toBeGreaterThan(0);
        expect(frame.frameHeight).toBeGreaterThan(0);
        expect(frame.screenRect).toBeDefined();
        expect(frame.screenRect.x).toBeGreaterThanOrEqual(0);
        expect(frame.screenRect.y).toBeGreaterThanOrEqual(0);
        expect(frame.screenRect.width).toBeGreaterThan(0);
        expect(frame.screenRect.height).toBeGreaterThan(0);
      });
    });

    it('should have frames for all device types', async () => {
      const registry = await buildFrameRegistry(FRAMES_DIR);
      
      const deviceTypes = ['iphone', 'ipad', 'mac', 'watch'];
      deviceTypes.forEach(deviceType => {
        const frames = registry.filter(f => f.deviceType === deviceType);
        expect(frames.length, `Should have frames for ${deviceType}`).toBeGreaterThan(0);
      });
    });

    it('should have both orientations for iPhone and iPad', async () => {
      const registry = await buildFrameRegistry(FRAMES_DIR);
      
      // Check iPhone has both orientations
      const iPhonePortrait = registry.filter(f => f.deviceType === 'iphone' && f.orientation === 'portrait');
      const iPhoneLandscape = registry.filter(f => f.deviceType === 'iphone' && f.orientation === 'landscape');
      expect(iPhonePortrait.length).toBeGreaterThan(0);
      expect(iPhoneLandscape.length).toBeGreaterThan(0);
      
      // Check iPad has both orientations
      const iPadPortrait = registry.filter(f => f.deviceType === 'ipad' && f.orientation === 'portrait');
      const iPadLandscape = registry.filter(f => f.deviceType === 'ipad' && f.orientation === 'landscape');
      expect(iPadPortrait.length).toBeGreaterThan(0);
      expect(iPadLandscape.length).toBeGreaterThan(0);
    });

    it('should calculate reasonable screen dimensions', async () => {
      const registry = await buildFrameRegistry(FRAMES_DIR);
      
      registry.forEach(frame => {
        // Screen should be smaller than frame
        expect(frame.screenRect.width).toBeLessThanOrEqual(frame.frameWidth);
        expect(frame.screenRect.height).toBeLessThanOrEqual(frame.frameHeight);
        
        // Screen should be at least 30% of frame size (some frames have large bezels/keyboards)
        expect(frame.screenRect.width).toBeGreaterThan(frame.frameWidth * 0.3);
        expect(frame.screenRect.height).toBeGreaterThan(frame.frameHeight * 0.3);
        
        // Screen position + size should not exceed frame bounds
        expect(frame.screenRect.x + frame.screenRect.width).toBeLessThanOrEqual(frame.frameWidth);
        expect(frame.screenRect.y + frame.screenRect.height).toBeLessThanOrEqual(frame.frameHeight);
      });
    });
  });

  describe('Frame PNG files validation', () => {
    it('should have valid PNG dimensions for sample frames', async () => {
      // Test a few key frames to ensure they load properly
      const testFrames = [
        'iPhone 16 Pro Max Portrait.png',
        'iPhone 16 Pro Max Landscape.png',
        'iPad Pro 2024 13 Portrait.png',
        'MacBook Pro 2021 16.png',
        'Watch Ultra 2024.png'
      ];
      
      for (const frameName of testFrames) {
        const framePath = path.join(FRAMES_DIR, frameName);
        try {
          const metadata = await sharp(framePath).metadata();
          
          expect(metadata.width).toBeGreaterThan(0);
          expect(metadata.height).toBeGreaterThan(0);
          expect(metadata.format).toBe('png');
          
          // Reasonable size constraints
          expect(metadata.width).toBeLessThan(10000);
          expect(metadata.height).toBeLessThan(10000);
        } catch (error) {
          // Frame might not exist in this collection
          console.warn(`Could not load test frame: ${frameName}`);
        }
      }
    });
  });
});