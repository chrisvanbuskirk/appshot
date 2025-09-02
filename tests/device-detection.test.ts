import { describe, it, expect } from 'vitest';
import { DeviceManager } from '../src/services/device-manager.js';

describe('Device Detection', () => {
  const deviceManager = new DeviceManager();

  describe('detectDeviceCategory', () => {
    it('should detect iPhone devices', () => {
      expect(deviceManager.detectDeviceCategory('iPhone 16 Pro')).toBe('iphone');
      expect(deviceManager.detectDeviceCategory('iPhone 15')).toBe('iphone');
      expect(deviceManager.detectDeviceCategory('iPhone 14 Pro Max')).toBe('iphone');
      expect(deviceManager.detectDeviceCategory('iPhone SE (3rd generation)')).toBe('iphone');
    });

    it('should detect iPad devices', () => {
      expect(deviceManager.detectDeviceCategory('iPad Pro 13-inch (M4)')).toBe('ipad');
      expect(deviceManager.detectDeviceCategory('iPad Air 11-inch (M2)')).toBe('ipad');
      expect(deviceManager.detectDeviceCategory('iPad mini (A17 Pro)')).toBe('ipad');
      expect(deviceManager.detectDeviceCategory('iPad (10th generation)')).toBe('ipad');
    });

    it('should detect Apple Watch devices', () => {
      expect(deviceManager.detectDeviceCategory('Apple Watch Series 10 (46mm)')).toBe('watch');
      expect(deviceManager.detectDeviceCategory('Apple Watch Ultra 2 (49mm)')).toBe('watch');
      expect(deviceManager.detectDeviceCategory('Apple Watch Series 9 (45mm)')).toBe('watch');
      expect(deviceManager.detectDeviceCategory('Apple Watch SE')).toBe('watch');
    });

    it('should detect Apple TV devices', () => {
      expect(deviceManager.detectDeviceCategory('Apple TV')).toBe('tv');
      expect(deviceManager.detectDeviceCategory('Apple TV 4K')).toBe('tv');
      expect(deviceManager.detectDeviceCategory('Apple TV HD')).toBe('tv');
    });

    it('should detect Vision Pro', () => {
      expect(deviceManager.detectDeviceCategory('Apple Vision Pro')).toBe('vision');
      expect(deviceManager.detectDeviceCategory('Vision Pro')).toBe('vision');
    });

    it('should detect Mac devices', () => {
      expect(deviceManager.detectDeviceCategory('MacBook Pro')).toBe('mac');
      expect(deviceManager.detectDeviceCategory('MacBook Air')).toBe('mac');
      expect(deviceManager.detectDeviceCategory('Mac Studio')).toBe('mac');
      expect(deviceManager.detectDeviceCategory('iMac')).toBe('mac');
    });

    it('should default to iPhone for unknown devices', () => {
      expect(deviceManager.detectDeviceCategory('Unknown Device')).toBe('iphone');
      expect(deviceManager.detectDeviceCategory('Some Random String')).toBe('iphone');
      expect(deviceManager.detectDeviceCategory('')).toBe('iphone');
    });

    it('should be case insensitive', () => {
      expect(deviceManager.detectDeviceCategory('IPHONE 16 PRO')).toBe('iphone');
      expect(deviceManager.detectDeviceCategory('ipad pro')).toBe('ipad');
      expect(deviceManager.detectDeviceCategory('APPLE WATCH')).toBe('watch');
    });
  });
});