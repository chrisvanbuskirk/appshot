import fs from 'fs';
import path from 'path';
import pc from 'picocolors';
import { PIDManager } from '../utils/pid-manager.js';
import { ProcessingQueue } from './processing-queue.js';
import { createComposeBridge } from './compose-bridge.js';
import { deviceManager } from './device-manager.js';
import { screenshotRouter } from './screenshot-router.js';
import { loadConfig } from '../core/files.js';
import { AppshotConfig } from '../types.js';
import { UnifiedDevice } from '../types/device.js';

export interface WatchOptions {
  directories: string[];
  devices?: string[];
  process?: boolean;
  frameOnly?: boolean;
  verbose?: boolean;
}

export interface WatchStats {
  startTime: Date;
  processed: number;
  failed: number;
  duplicates: number;
  watching: string[];
}

export class WatchService {
  private pidManager: PIDManager;
  private queue: ProcessingQueue;
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private stats: WatchStats;
  private config?: AppshotConfig;
  private devices?: UnifiedDevice[];
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private running = false;
  private shuttingDown = false;

  constructor() {
    this.pidManager = new PIDManager('.appshot/watch.pid');
    this.queue = new ProcessingQueue(this.processScreenshot.bind(this));
    this.stats = {
      startTime: new Date(),
      processed: 0,
      failed: 0,
      duplicates: 0,
      watching: []
    };
  }

  async start(options: WatchOptions): Promise<void> {
    // Check if already running
    const existingPid = await this.pidManager.readPID();
    if (existingPid && await this.pidManager.isProcessRunning(existingPid)) {
      throw new Error(`Watch service is already running (PID: ${existingPid})`);
    }

    // Clean up any stale PID file
    await this.pidManager.cleanupStale();

    // Write our PID
    await this.pidManager.writePID();
    this.running = true;

    // Load configuration
    this.config = await loadConfig();

    // Load devices if specified
    if (options.devices && options.devices.length > 0) {
      const allDevices = await deviceManager.listAllDevices();
      this.devices = options.devices.map(name => {
        const device = allDevices.find(d =>
          d.name.toLowerCase().includes(name.toLowerCase())
        );
        if (!device) {
          console.warn(pc.yellow(`⚠️  Device not found: ${name}`));
        }
        return device;
      }).filter(Boolean) as UnifiedDevice[];
    }

    // Start watching directories
    for (const dir of options.directories) {
      await this.watchDirectory(dir, options);
    }

    // Set up graceful shutdown
    this.setupShutdownHandlers();

    // Update stats
    this.stats.watching = options.directories;

    console.log(pc.green('✅ Watch service started'));
    console.log(pc.dim(`   PID: ${process.pid}`));
    console.log(pc.dim(`   Watching: ${options.directories.join(', ')}`));

    if (this.devices && this.devices.length > 0) {
      console.log(pc.dim(`   Devices: ${this.devices.map(d => d.name).join(', ')}`));
    }

    if (options.process) {
      console.log(pc.dim(`   Processing: ${options.frameOnly ? 'Frame only' : 'Full (frame + gradient + caption)'}`));
    }

    // Keep process alive
    await this.keepAlive();
  }

  async stop(): Promise<void> {
    if (!this.running) return;

    console.log(pc.cyan('🛑 Stopping watch service...'));
    this.shuttingDown = true;

    // Stop all watchers
    for (const [dir, watcher] of this.watchers.entries()) {
      watcher.close();
      console.log(pc.dim(`   Stopped watching: ${dir}`));
    }
    this.watchers.clear();

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Flush the queue
    await this.queue.flush();

    // Clean up PID file
    await this.pidManager.cleanup();

    this.running = false;
    console.log(pc.green('✅ Watch service stopped'));

    // Print final stats
    this.printStats();
  }

  async getStatus(): Promise<WatchStats | null> {
    const pid = await this.pidManager.readPID();
    if (!pid || !(await this.pidManager.isProcessRunning(pid))) {
      return null;
    }

    // For external status checks, we can only return basic info
    // Real stats are in the running process
    return {
      startTime: new Date(), // Approximate
      processed: 0,
      failed: 0,
      duplicates: 0,
      watching: [] // Would need IPC to get real data
    };
  }

  private async watchDirectory(dir: string, options: WatchOptions): Promise<void> {
    // Ensure directory exists
    try {
      const stat = await fs.promises.stat(dir);
      if (!stat.isDirectory()) {
        throw new Error(`Not a directory: ${dir}`);
      }
    } catch {
      throw new Error(`Cannot watch directory: ${dir}`);
    }

    // Create watcher
    const watcher = fs.watch(dir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      // Only process image files
      const ext = path.extname(filename).toLowerCase();
      if (!['.png', '.jpg', '.jpeg'].includes(ext)) return;

      // Skip files in processed directories
      if (filename.includes('final/') || filename.includes('.appshot/')) return;

      const filepath = path.join(dir, filename);

      // Debounce file events (files can trigger multiple events)
      this.debounceFileEvent(filepath, async () => {
        if (options.verbose) {
          console.log(pc.dim(`📸 Detected: ${filename}`));
        }

        // Check if file exists and is complete
        try {
          await fs.promises.stat(filepath);

          // Wait a bit to ensure file is fully written
          await new Promise(resolve => setTimeout(resolve, 500));

          // Add to processing queue
          const added = await this.queue.add(filepath);

          if (added) {
            console.log(pc.cyan(`📥 Queued: ${filename}`));
          } else {
            this.stats.duplicates++;
            if (options.verbose) {
              console.log(pc.dim(`⏭️  Skipped duplicate: ${filename}`));
            }
          }
        } catch {
          // File might have been deleted or moved
          if (options.verbose) {
            console.log(pc.dim(`   File no longer exists: ${filename}`));
          }
        }
      });
    });

    this.watchers.set(dir, watcher);
  }

  private debounceFileEvent(filepath: string, callback: () => void): void {
    // Clear existing timer for this file
    const existingTimer = this.debounceTimers.get(filepath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(filepath);
      callback();
    }, 1000); // 1 second debounce

    this.debounceTimers.set(filepath, timer);
  }

  private async processScreenshot(filepath: string): Promise<void> {
    console.log(pc.cyan(`🎨 Processing: ${path.basename(filepath)}`));

    try {
      // Determine device from path or use first configured device
      let device: UnifiedDevice | undefined;

      if (this.devices && this.devices.length > 0) {
        // Try to match device from path
        const pathLower = filepath.toLowerCase();
        device = this.devices.find(d =>
          pathLower.includes(d.category) ||
          pathLower.includes(d.name.toLowerCase())
        );

        // Fall back to first device if no match
        if (!device) {
          device = this.devices[0];
        }
      }

      // If we have a device and processing is enabled
      if (device && this.config) {
        const composeBridge = createComposeBridge(this.config);

        const result = await composeBridge.processDeviceScreenshot({
          screenshotPath: filepath,
          device,
          processOptions: {
            frameOnly: false, // Use full processing in watch mode
            format: 'png'
          }
        });

        if (result.success) {
          console.log(pc.green(`✅ Processed: ${path.basename(result.outputPath)}`));
          this.stats.processed++;
        } else {
          console.log(pc.red(`❌ Failed: ${result.error}`));
          this.stats.failed++;
        }
      } else {
        // Just route to appropriate directory
        if (device) {
          const targetPath = await screenshotRouter.routeAndMove(
            device,
            filepath
          );
          console.log(pc.green(`✅ Moved to: ${targetPath}`));
          this.stats.processed++;
        } else {
          console.log(pc.yellow(`⚠️  No device detected for: ${path.basename(filepath)}`));
          this.stats.failed++;
        }
      }
    } catch (error) {
      console.error(pc.red(`❌ Error processing ${path.basename(filepath)}:`), error);
      this.stats.failed++;
      throw error; // Re-throw for queue retry logic
    }
  }

  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      if (this.shuttingDown) return;

      console.log(pc.cyan(`\n📍 Received ${signal}, shutting down gracefully...`));
      await this.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Handle uncaught errors
    process.on('uncaughtException', async (error) => {
      console.error(pc.red('❌ Uncaught exception:'), error);
      await this.stop();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error(pc.red('❌ Unhandled rejection at:'), promise, 'reason:', reason);
      await this.stop();
      process.exit(1);
    });
  }

  private async keepAlive(): Promise<void> {
    // Keep the process running
    while (this.running && !this.shuttingDown) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private printStats(): void {
    const runtime = Math.round((Date.now() - this.stats.startTime.getTime()) / 1000);
    const minutes = Math.floor(runtime / 60);
    const seconds = runtime % 60;

    console.log(pc.cyan('\n📊 Watch Statistics:'));
    console.log(pc.dim(`   Runtime: ${minutes}m ${seconds}s`));
    console.log(pc.green(`   Processed: ${this.stats.processed}`));

    if (this.stats.duplicates > 0) {
      console.log(pc.yellow(`   Duplicates: ${this.stats.duplicates}`));
    }

    if (this.stats.failed > 0) {
      console.log(pc.red(`   Failed: ${this.stats.failed}`));
    }

    const queueStats = this.queue.getStats();
    if (queueStats.pending > 0) {
      console.log(pc.yellow(`   Pending: ${queueStats.pending}`));
    }
  }

  static async isRunning(): Promise<boolean> {
    const pidManager = new PIDManager('.appshot/watch.pid');
    return await pidManager.isCurrentProcessRunning();
  }

  static async getCurrentPID(): Promise<number | null> {
    const pidManager = new PIDManager('.appshot/watch.pid');
    return await pidManager.readPID();
  }
}

export const watchService = new WatchService();