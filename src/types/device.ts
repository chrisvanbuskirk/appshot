export type DeviceType = 'physical' | 'simulator';
export type DeviceCategory = 'iphone' | 'ipad' | 'watch' | 'mac' | 'vision' | 'tv';
export type DeviceState = 'connected' | 'booted' | 'shutdown' | 'disconnected';

export interface UnifiedDevice {
  id: string;                    // UDID or simulator ID
  name: string;                   // "iPhone 15 Pro (Chris)" or "iPhone 16 Pro Max"
  type: DeviceType;
  category: DeviceCategory;
  displaySize?: string;           // "6.9" | "13" | etc.
  resolution?: string;            // "1320x2868"
  state: DeviceState;
  osVersion?: string;             // "iOS 17.2"
  modelIdentifier?: string;       // "iPhone17,1"
}

export interface SimulatorDevice {
  udid: string;
  name: string;
  state: string;
  isAvailable: boolean;
  deviceTypeIdentifier: string;
  dataPath?: string;
  logPath?: string;
  lastBootedAt?: string;
}

export interface PhysicalDevice {
  identifier: string;
  name: string;
  state: string;
  deviceType: string;
  osVersion: string;
  architecture: string;
}

export interface DeviceMapping {
  [key: string]: {
    category: DeviceCategory;
    displaySize: string;
    appStoreResolution?: string;
  };
}

export interface ScreenshotOptions {
  device: UnifiedDevice;
  output?: string;
  format?: 'png' | 'jpeg' | 'tiff' | 'bmp' | 'gif';
  mask?: 'ignored' | 'alpha' | 'black';
}

export interface AppLaunchOptions {
  device: UnifiedDevice;
  bundleId: string;
  arguments?: string[];
  environment?: Record<string, string>;
}