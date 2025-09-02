import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import pc from 'picocolors';
import fs from 'fs/promises';
import path from 'path';
import {
  UnifiedDevice,
  DeviceCategory,
  DeviceState,
  SimulatorDevice,
  ScreenshotOptions,
  AppLaunchOptions,
  DeviceMapping
} from '../types/device.js';

const exec = promisify(execCallback);

// Device name to category mapping
const DEVICE_MAPPING: DeviceMapping = {
  // iPhone simulators
  'iPhone 16 Pro Max': { category: 'iphone', displaySize: '6.9', appStoreResolution: '1320x2868' },
  'iPhone 16 Pro': { category: 'iphone', displaySize: '6.3', appStoreResolution: '1206x2622' },
  'iPhone 16 Plus': { category: 'iphone', displaySize: '6.7', appStoreResolution: '1290x2796' },
  'iPhone 16': { category: 'iphone', displaySize: '6.1', appStoreResolution: '1179x2556' },
  'iPhone 16e': { category: 'iphone', displaySize: '6.1', appStoreResolution: '1179x2556' },
  'iPhone 15 Pro Max': { category: 'iphone', displaySize: '6.7', appStoreResolution: '1290x2796' },
  'iPhone 15 Pro': { category: 'iphone', displaySize: '6.1', appStoreResolution: '1179x2556' },
  'iPhone 15 Plus': { category: 'iphone', displaySize: '6.7', appStoreResolution: '1290x2796' },
  'iPhone 15': { category: 'iphone', displaySize: '6.1', appStoreResolution: '1179x2556' },
  'iPhone 14 Pro Max': { category: 'iphone', displaySize: '6.7', appStoreResolution: '1290x2796' },
  'iPhone 14 Pro': { category: 'iphone', displaySize: '6.1', appStoreResolution: '1179x2556' },
  'iPhone 14 Plus': { category: 'iphone', displaySize: '6.7', appStoreResolution: '1290x2796' },
  'iPhone 14': { category: 'iphone', displaySize: '6.1', appStoreResolution: '1170x2532' },
  'iPhone 13 Pro Max': { category: 'iphone', displaySize: '6.7', appStoreResolution: '1284x2778' },
  'iPhone 13 Pro': { category: 'iphone', displaySize: '6.1', appStoreResolution: '1170x2532' },
  'iPhone 13': { category: 'iphone', displaySize: '6.1', appStoreResolution: '1170x2532' },
  'iPhone 13 mini': { category: 'iphone', displaySize: '5.4', appStoreResolution: '1080x2340' },
  'iPhone SE (3rd generation)': { category: 'iphone', displaySize: '4.7', appStoreResolution: '750x1334' },

  // iPad simulators
  'iPad Pro 13-inch (M4)': { category: 'ipad', displaySize: '13', appStoreResolution: '2064x2752' },
  'iPad Pro 11-inch (M4)': { category: 'ipad', displaySize: '11', appStoreResolution: '1668x2388' },
  'iPad Pro 12.9-inch (6th generation)': { category: 'ipad', displaySize: '12.9', appStoreResolution: '2048x2732' },
  'iPad Pro 11-inch (4th generation)': { category: 'ipad', displaySize: '11', appStoreResolution: '1668x2388' },
  'iPad Air 13-inch (M2)': { category: 'ipad', displaySize: '13', appStoreResolution: '2064x2752' },
  'iPad Air 11-inch (M2)': { category: 'ipad', displaySize: '11', appStoreResolution: '1668x2388' },
  'iPad (10th generation)': { category: 'ipad', displaySize: '10.9', appStoreResolution: '1640x2360' },
  'iPad mini (A17 Pro)': { category: 'ipad', displaySize: '8.3', appStoreResolution: '1488x2266' },
  'iPad mini (6th generation)': { category: 'ipad', displaySize: '8.3', appStoreResolution: '1488x2266' },

  // Apple Watch simulators
  'Apple Watch Series 10 (46mm)': { category: 'watch', displaySize: '46mm', appStoreResolution: '396x484' },
  'Apple Watch Series 10 (42mm)': { category: 'watch', displaySize: '42mm', appStoreResolution: '368x448' },
  'Apple Watch Ultra 2 (49mm)': { category: 'watch', displaySize: '49mm', appStoreResolution: '410x502' },
  'Apple Watch Series 9 (45mm)': { category: 'watch', displaySize: '45mm', appStoreResolution: '396x484' },
  'Apple Watch Series 9 (41mm)': { category: 'watch', displaySize: '41mm', appStoreResolution: '352x430' },

  // Apple TV
  'Apple TV': { category: 'tv', displaySize: 'HD', appStoreResolution: '1920x1080' },
  'Apple TV 4K': { category: 'tv', displaySize: '4K', appStoreResolution: '3840x2160' },

  // Vision Pro
  'Apple Vision Pro': { category: 'vision', displaySize: 'Vision', appStoreResolution: '3840x2160' }
};

export class DeviceManager {
  private simulatorService = new SimulatorService();

  async listAllDevices(): Promise<UnifiedDevice[]> {
    return this.simulatorService.listSimulators();
  }

  async listSimulators(): Promise<UnifiedDevice[]> {
    return this.simulatorService.listSimulators();
  }

  async bootSimulator(device: UnifiedDevice): Promise<void> {
    if (device.type !== 'simulator') {
      throw new Error('Can only boot simulators');
    }
    await this.simulatorService.bootDevice(device.id);
  }

  async shutdownSimulator(device: UnifiedDevice): Promise<void> {
    if (device.type !== 'simulator') {
      throw new Error('Can only shutdown simulators');
    }
    await this.simulatorService.shutdownDevice(device.id);
  }

  async captureScreenshot(options: ScreenshotOptions): Promise<Buffer> {
    if (options.device.type !== 'simulator') {
      throw new Error('Screenshot capture is only supported for simulators');
    }
    return this.simulatorService.captureScreenshot(options);
  }

  async launchApp(options: AppLaunchOptions): Promise<void> {
    if (options.device.type !== 'simulator') {
      throw new Error('App launch is only supported for simulators');
    }
    await this.simulatorService.launchApp(options);
  }

  async installApp(device: UnifiedDevice, appPath: string): Promise<void> {
    if (device.type !== 'simulator') {
      throw new Error('App installation is only supported for simulators');
    }
    await this.simulatorService.installApp(device.id, appPath);
  }

  detectDeviceCategory(deviceName: string): DeviceCategory {
    // Check mapping first
    const mapping = DEVICE_MAPPING[deviceName];
    if (mapping) {
      return mapping.category;
    }

    // Fallback to name-based detection
    const nameLower = deviceName.toLowerCase();
    if (nameLower.includes('iphone')) return 'iphone';
    if (nameLower.includes('ipad')) return 'ipad';
    if (nameLower.includes('watch')) return 'watch';
    if (nameLower.includes('tv')) return 'tv';
    if (nameLower.includes('vision')) return 'vision';
    if (nameLower.includes('mac')) return 'mac';

    return 'iphone'; // Default fallback
  }
}

class SimulatorService {
  async listSimulators(): Promise<UnifiedDevice[]> {
    try {
      const { stdout } = await exec('xcrun simctl list devices available -j');
      const data = JSON.parse(stdout);
      const devices: UnifiedDevice[] = [];

      for (const runtime in data.devices) {
        const runtimeDevices = data.devices[runtime] as SimulatorDevice[];

        for (const device of runtimeDevices) {
          if (!device.isAvailable) continue;

          const deviceName = device.name;
          const mapping = DEVICE_MAPPING[deviceName] || {};

          // Extract OS version from runtime ID
          const osVersionMatch = runtime.match(/iOS-(\d+-\d+)/);
          const osVersion = osVersionMatch ? osVersionMatch[1].replace('-', '.') : 'Unknown';

          devices.push({
            id: device.udid,
            name: deviceName,
            type: 'simulator',
            category: mapping.category || this.detectCategory(deviceName),
            displaySize: mapping.displaySize,
            resolution: mapping.appStoreResolution,
            state: this.mapSimulatorState(device.state),
            osVersion: `iOS ${osVersion}`,
            modelIdentifier: device.deviceTypeIdentifier
          });
        }
      }

      return devices;
    } catch (error) {
      console.error(pc.red('Failed to list simulators:'), error);
      return [];
    }
  }

  private detectCategory(deviceName: string): DeviceCategory {
    const nameLower = deviceName.toLowerCase();
    if (nameLower.includes('iphone')) return 'iphone';
    if (nameLower.includes('ipad')) return 'ipad';
    if (nameLower.includes('watch')) return 'watch';
    if (nameLower.includes('tv')) return 'tv';
    if (nameLower.includes('vision')) return 'vision';
    return 'iphone';
  }

  private mapSimulatorState(state: string): DeviceState {
    switch (state.toLowerCase()) {
    case 'booted':
      return 'booted';
    case 'shutdown':
      return 'shutdown';
    default:
      return 'shutdown';
    }
  }

  async bootDevice(deviceId: string): Promise<void> {
    console.log(pc.cyan(`Booting simulator ${deviceId}...`));
    await exec(`xcrun simctl boot ${deviceId}`);

    // Wait for boot to complete
    await this.waitForBoot(deviceId);
    console.log(pc.green('✅ Simulator booted'));
  }

  async shutdownDevice(deviceId: string): Promise<void> {
    console.log(pc.cyan(`Shutting down simulator ${deviceId}...`));
    await exec(`xcrun simctl shutdown ${deviceId}`);
    console.log(pc.green('✅ Simulator shutdown'));
  }

  private async waitForBoot(deviceId: string, maxWait = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      try {
        const { stdout } = await exec('xcrun simctl list devices -j');
        const data = JSON.parse(stdout);

        for (const runtime in data.devices) {
          const devices = data.devices[runtime] as SimulatorDevice[];
          const device = devices.find(d => d.udid === deviceId);

          if (device && device.state === 'Booted') {
            return;
          }
        }
      } catch {
        // Ignore errors during boot check
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Simulator boot timeout');
  }

  async captureScreenshot(options: ScreenshotOptions): Promise<Buffer> {
    const tempFile = path.join('/tmp', `appshot-${Date.now()}.${options.format || 'png'}`);

    try {
      // Build command
      let cmd = `xcrun simctl io ${options.device.id} screenshot`;

      if (options.format && options.format !== 'png') {
        cmd += ` --type=${options.format}`;
      }

      if (options.mask) {
        cmd += ` --mask=${options.mask}`;
      }

      cmd += ` "${tempFile}"`;

      await exec(cmd);

      // Read the file
      const screenshot = await fs.readFile(tempFile);

      // Clean up
      await fs.unlink(tempFile).catch(() => {});

      return screenshot;
    } catch (error) {
      // Clean up on error
      await fs.unlink(tempFile).catch(() => {});
      throw error;
    }
  }

  async launchApp(options: AppLaunchOptions): Promise<void> {
    let cmd = `xcrun simctl launch ${options.device.id} ${options.bundleId}`;

    if (options.arguments && options.arguments.length > 0) {
      cmd += ` ${options.arguments.join(' ')}`;
    }

    await exec(cmd);
  }

  async installApp(deviceId: string, appPath: string): Promise<void> {
    await exec(`xcrun simctl install ${deviceId} "${appPath}"`);
  }
}

// Physical device support has been removed.
// Screenshots from physical devices don't automatically transfer to Mac,
// making the feature impractical for automated workflows.

export const deviceManager = new DeviceManager();