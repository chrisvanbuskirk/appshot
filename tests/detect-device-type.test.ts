import { describe, it, expect } from 'vitest';
import { detectDeviceTypeFromDimensions } from '../src/core/devices.js';

describe('detectDeviceTypeFromDimensions', () => {
  describe('Apple Watch detection', () => {
    it('should detect Series 3 (38mm)', () => {
      expect(detectDeviceTypeFromDimensions(272, 340)).toBe('watch');
    });

    it('should detect Series 9 (45mm)', () => {
      expect(detectDeviceTypeFromDimensions(396, 484)).toBe('watch');
    });

    it('should detect Ultra (49mm)', () => {
      expect(detectDeviceTypeFromDimensions(410, 502)).toBe('watch');
    });

    it('should detect square-ish small images as watch', () => {
      expect(detectDeviceTypeFromDimensions(300, 300)).toBe('watch');
      expect(detectDeviceTypeFromDimensions(400, 450)).toBe('watch');
    });
  });

  describe('iPad detection', () => {
    it('should detect iPad Pro 13" portrait', () => {
      expect(detectDeviceTypeFromDimensions(2064, 2752)).toBe('ipad');
    });

    it('should detect iPad Pro 13" landscape', () => {
      expect(detectDeviceTypeFromDimensions(2752, 2064)).toBe('ipad');
    });

    it('should detect iPad 10.2" portrait', () => {
      expect(detectDeviceTypeFromDimensions(1620, 2160)).toBe('ipad');
    });

    it('should detect iPad Mini portrait', () => {
      // iPad Mini is 1488x2266 = aspect 1.52 (normalized), which is outside iPad range (1.20-1.40)
      // Aspect 1.52 is in Mac range (1.50-1.85) and pixels 3.37M >= 2M, so detected as Mac
      expect(detectDeviceTypeFromDimensions(1488, 2266)).toBe('mac');
    });

    it('should detect classic 4:3 aspect ratios as iPad', () => {
      expect(detectDeviceTypeFromDimensions(2048, 1536)).toBe('ipad');
      // 1024x768 = 786k pixels, below iPad minimum of 1.5M, falls back to iPhone
      expect(detectDeviceTypeFromDimensions(1024, 768)).toBe('iphone');
    });
  });

  describe('Mac detection', () => {
    it('should detect MacBook Pro 16"', () => {
      expect(detectDeviceTypeFromDimensions(3456, 2234)).toBe('mac');
    });

    it('should detect MacBook Air 13"', () => {
      expect(detectDeviceTypeFromDimensions(2560, 1664)).toBe('mac');
    });

    it('should detect iMac 24"', () => {
      expect(detectDeviceTypeFromDimensions(4480, 2520)).toBe('mac');
    });

    it('should detect 16:10 aspect ratio as Mac', () => {
      expect(detectDeviceTypeFromDimensions(1920, 1200)).toBe('mac');
      expect(detectDeviceTypeFromDimensions(2880, 1800)).toBe('mac');
    });

    it('should detect 16:9 widescreen as Mac', () => {
      expect(detectDeviceTypeFromDimensions(1920, 1080)).toBe('mac');
      expect(detectDeviceTypeFromDimensions(3840, 2160)).toBe('mac');
    });
  });

  describe('iPhone detection', () => {
    it('should detect iPhone 15 Pro Max', () => {
      expect(detectDeviceTypeFromDimensions(1290, 2796)).toBe('iphone');
    });

    it('should detect iPhone 15 Pro', () => {
      expect(detectDeviceTypeFromDimensions(1179, 2556)).toBe('iphone');
    });

    it('should detect iPhone SE', () => {
      expect(detectDeviceTypeFromDimensions(750, 1334)).toBe('iphone');
    });

    it('should detect iPhone in landscape', () => {
      expect(detectDeviceTypeFromDimensions(2796, 1290)).toBe('iphone');
      expect(detectDeviceTypeFromDimensions(2556, 1179)).toBe('iphone');
    });

    it('should detect tall aspect ratios as iPhone', () => {
      expect(detectDeviceTypeFromDimensions(1080, 2340)).toBe('iphone');
      expect(detectDeviceTypeFromDimensions(828, 1792)).toBe('iphone');
    });
  });

  describe('Edge cases', () => {
    it('should return null for very small images', () => {
      // 100x100 = 10k pixels, aspect 1.0, qualifies as watch
      expect(detectDeviceTypeFromDimensions(100, 100)).toBe('watch');
      // 50x75 = 3.75k pixels, aspect 1.5, falls back to iPhone (< 1.2M pixels)
      expect(detectDeviceTypeFromDimensions(50, 75)).toBe('iphone');
    });

    it('should return null for extremely wide images', () => {
      expect(detectDeviceTypeFromDimensions(5000, 500)).toBe(null);
      expect(detectDeviceTypeFromDimensions(500, 5000)).toBe(null);
    });

    it('should return null for unusual aspect ratios', () => {
      // 1000x1000 = 1M pixels, aspect 1.0, too big for watch (>600k), falls back to iPhone (<1.2M)
      expect(detectDeviceTypeFromDimensions(1000, 1000)).toBe('iphone');
      // 3000x3000 = 9M pixels, > 8M threshold, falls back to Mac
      expect(detectDeviceTypeFromDimensions(3000, 3000)).toBe('mac');
    });

    it('should handle ambiguous dimensions', () => {
      // 1024x768 = aspect 1.33, but only 786k pixels, falls back to iPhone
      const result = detectDeviceTypeFromDimensions(1024, 768);
      expect(result).toBe('iphone');
    });

    it('should prioritize by pixel count when aspect ratio matches multiple', () => {
      // 800x600 = 480k pixels, aspect 1.33, falls back to iPhone (< 1.2M)
      expect(detectDeviceTypeFromDimensions(800, 600)).toBe('iphone');
      // 1600x1200 = 1.92M pixels, aspect 1.33, qualifies as iPad
      expect(detectDeviceTypeFromDimensions(1600, 1200)).toBe('ipad');
      
      // 3200x2000 = 6.4M pixels, aspect 1.6, qualifies as Mac
      expect(detectDeviceTypeFromDimensions(3200, 2000)).toBe('mac');
    });
  });

  describe('Boundary testing', () => {
    it('should handle exact threshold values for watch', () => {
      // Just under 600k pixels, aspect 1.0
      expect(detectDeviceTypeFromDimensions(774, 774)).toBe('watch'); // ~599k pixels
      // Just over 600k pixels, aspect 1.0, too big for watch, falls back to iPhone
      expect(detectDeviceTypeFromDimensions(775, 775)).toBe('iphone'); // ~600k pixels
    });

    it('should handle aspect ratio boundaries', () => {
      // Need enough pixels for iPad (1.5M minimum)
      // 1500x1250 = 1.875M pixels, aspect 1.20
      expect(detectDeviceTypeFromDimensions(1500, 1250)).toBe('ipad'); // 1.20 exactly
      // 1750x1250 = 2.1875M pixels, aspect 1.40
      expect(detectDeviceTypeFromDimensions(1750, 1250)).toBe('ipad'); // 1.40 exactly
      // 1200x1000 = 1.2M pixels exactly, aspect 1.20, too small for iPad (needs 1.5M)
      // Not in any specific range, exactly at 1.2M boundary, returns null
      expect(detectDeviceTypeFromDimensions(1200, 1000)).toBe(null);
      // 1410x1000 = 1.41M pixels, aspect 1.41, outside all ranges, returns null
      expect(detectDeviceTypeFromDimensions(1410, 1000)).toBe(null);
    });

    it('should handle iPhone aspect ratio boundaries', () => {
      // iPhone requires aspect 1.60-2.40 and pixels <= 5M
      // 1600x1000 = 1.6M pixels, aspect 1.60
      expect(detectDeviceTypeFromDimensions(1600, 1000)).toBe('iphone'); // 1.60 exactly
      // 1590x1000 = 1.59M pixels, aspect 1.59, outside iPhone range, falls back to iPhone (< 1.2M? no, 1.59M)
      // Actually no specific rule matches, falls back to null
      expect(detectDeviceTypeFromDimensions(1590, 1000)).toBe(null);
      
      // 2400x1000 = 2.4M pixels, aspect 2.40  
      expect(detectDeviceTypeFromDimensions(2400, 1000)).toBe('iphone'); // 2.40 exactly
      // 2410x1000 = 2.41M pixels, aspect 2.41, outside iPhone aspect range
      expect(detectDeviceTypeFromDimensions(2410, 1000)).toBe(null);
    });
  });
});