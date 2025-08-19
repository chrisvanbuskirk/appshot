import { describe, it, expect } from 'vitest';
import {
  IPHONE_PRESETS,
  IPAD_PRESETS,
  MAC_PRESETS,
  APPLE_WATCH_PRESETS,
  getRequiredPresets,
  getPresetById,
  validateResolution,
  recommendPreset
} from '../src/core/app-store-specs.js';

describe('App Store Specifications', () => {
  describe('Preset Structure', () => {
    it('should have valid iPhone presets', () => {
      expect(IPHONE_PRESETS.length).toBeGreaterThan(0);
      
      // Check iPhone 6.9" (primary requirement)
      const iphone69 = IPHONE_PRESETS.find(p => p.id === 'iphone-6-9');
      expect(iphone69).toBeDefined();
      expect(iphone69?.resolutions.portrait).toBe('1290x2796');
      expect(iphone69?.resolutions.landscape).toBe('2796x1290');
      expect(iphone69?.required).toBe(true);
    });
    
    it('should have valid iPad presets', () => {
      expect(IPAD_PRESETS.length).toBeGreaterThan(0);
      
      // Check iPad 13" (primary requirement)
      const ipad13 = IPAD_PRESETS.find(p => p.id === 'ipad-13');
      expect(ipad13).toBeDefined();
      expect(ipad13?.resolutions.portrait).toBe('2064x2752');
      expect(ipad13?.resolutions.landscape).toBe('2752x2064');
      expect(ipad13?.required).toBe(true);
    });
    
    it('should have valid Mac presets with 16:10 aspect ratio', () => {
      expect(MAC_PRESETS.length).toBeGreaterThan(0);
      
      for (const preset of MAC_PRESETS) {
        if (preset.resolutions.landscape) {
          const [width, height] = preset.resolutions.landscape.split('x').map(Number);
          const aspectRatio = width / height;
          expect(aspectRatio).toBeCloseTo(1.6, 1); // 16:10 = 1.6
        }
      }
    });
    
    it('should have valid Apple Watch presets', () => {
      expect(APPLE_WATCH_PRESETS.length).toBeGreaterThan(0);
      
      // Check Watch Ultra
      const watchUltra = APPLE_WATCH_PRESETS.find(p => p.id === 'watch-ultra');
      expect(watchUltra).toBeDefined();
      expect(watchUltra?.resolutions.portrait).toBe('410x502');
      
      // All watch presets should only have portrait
      for (const preset of APPLE_WATCH_PRESETS) {
        expect(preset.resolutions.portrait).toBeDefined();
        expect(preset.resolutions.landscape).toBeUndefined();
      }
    });
  });
  
  describe('getRequiredPresets', () => {
    it('should return only required presets', () => {
      const required = getRequiredPresets();
      
      expect(required.iphone.length).toBeGreaterThan(0);
      expect(required.ipad.length).toBeGreaterThan(0);
      expect(required.mac.length).toBeGreaterThan(0);
      expect(required.watch.length).toBeGreaterThan(0);
      
      // All returned presets should be marked as required
      for (const category of Object.values(required)) {
        for (const preset of category) {
          expect(preset.required).toBe(true);
        }
      }
    });
  });
  
  describe('getPresetById', () => {
    it('should find presets by ID', () => {
      const iphone69 = getPresetById('iphone-6-9');
      expect(iphone69).toBeDefined();
      expect(iphone69?.displaySize).toBe('6.9"');
      
      const ipad13 = getPresetById('ipad-13');
      expect(ipad13).toBeDefined();
      expect(ipad13?.displaySize).toBe('13"');
      
      const watchUltra = getPresetById('watch-ultra');
      expect(watchUltra).toBeDefined();
      expect(watchUltra?.displaySize).toBe('Apple Watch');
    });
    
    it('should return undefined for invalid ID', () => {
      const invalid = getPresetById('invalid-preset-id');
      expect(invalid).toBeUndefined();
    });
  });
  
  describe('validateResolution', () => {
    it('should validate iPhone resolutions', () => {
      // Valid iPhone 6.9" portrait
      expect(validateResolution(1290, 2796, 'iphone')).toBe(true);
      
      // Valid iPhone 6.9" landscape
      expect(validateResolution(2796, 1290, 'iphone')).toBe(true);
      
      // Invalid resolution
      expect(validateResolution(1000, 2000, 'iphone')).toBe(false);
    });
    
    it('should validate iPad resolutions', () => {
      // Valid iPad 13" portrait
      expect(validateResolution(2064, 2752, 'ipad')).toBe(true);
      
      // Valid iPad 13" landscape
      expect(validateResolution(2752, 2064, 'ipad')).toBe(true);
      
      // Invalid resolution
      expect(validateResolution(1024, 768, 'ipad')).toBe(true); // This is actually valid for 9.7"
      expect(validateResolution(1000, 1000, 'ipad')).toBe(false);
    });
    
    it('should validate Mac resolutions', () => {
      // Valid Mac resolutions
      expect(validateResolution(2880, 1800, 'mac')).toBe(true);
      expect(validateResolution(2560, 1600, 'mac')).toBe(true);
      expect(validateResolution(1440, 900, 'mac')).toBe(true);
      expect(validateResolution(1280, 800, 'mac')).toBe(true);
      
      // Invalid resolution
      expect(validateResolution(1920, 1080, 'mac')).toBe(false); // Not 16:10 aspect ratio
    });
    
    it('should validate Watch resolutions', () => {
      // Valid Watch Ultra
      expect(validateResolution(410, 502, 'watch')).toBe(true);
      
      // Valid Watch Series 10
      expect(validateResolution(416, 496, 'watch')).toBe(true);
      
      // Invalid resolution
      expect(validateResolution(500, 600, 'watch')).toBe(false);
    });
  });
  
  describe('recommendPreset', () => {
    it('should recommend exact matching preset', () => {
      const preset = recommendPreset(1290, 2796, 'iphone');
      expect(preset).toBeDefined();
      expect(preset?.id).toBe('iphone-6-9');
    });
    
    it('should recommend preset for landscape orientation', () => {
      const preset = recommendPreset(2796, 1290, 'iphone');
      expect(preset).toBeDefined();
      expect(preset?.id).toBe('iphone-6-9');
    });
    
    it('should return undefined for no match', () => {
      const preset = recommendPreset(123, 456, 'iphone');
      expect(preset).toBeUndefined();
    });
  });
  
  describe('Fallback Chains', () => {
    it('should have valid fallback references', () => {
      for (const preset of IPHONE_PRESETS) {
        if (preset.fallback) {
          const fallbackPreset = getPresetById(preset.fallback);
          expect(fallbackPreset).toBeDefined();
        }
      }
      
      for (const preset of IPAD_PRESETS) {
        if (preset.fallback) {
          const fallbackPreset = getPresetById(preset.fallback);
          expect(fallbackPreset).toBeDefined();
        }
      }
    });
  });
  
  describe('Alternative Resolutions', () => {
    it('should have multiple resolution options for same display size', () => {
      // iPhone 6.9" has two resolution options
      const iphone69Presets = IPHONE_PRESETS.filter(p => p.displaySize === '6.9"');
      expect(iphone69Presets.length).toBe(2);
      
      // Check both resolutions are different
      const resolutions = iphone69Presets.map(p => p.resolutions.portrait);
      expect(new Set(resolutions).size).toBe(2);
    });
    
    it('should have multiple iPad 11" alternatives', () => {
      const ipad11Presets = IPAD_PRESETS.filter(p => p.displaySize === '11"');
      expect(ipad11Presets.length).toBeGreaterThan(1);
    });
  });
});