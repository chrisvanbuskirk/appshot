import fs from 'fs/promises';
import path from 'path';

export class PIDManager {
  constructor(private pidFile: string) {}

  async writePID(pid?: number): Promise<void> {
    const pidToWrite = pid || process.pid;
    const dir = path.dirname(this.pidFile);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write PID to file
    await fs.writeFile(this.pidFile, pidToWrite.toString(), 'utf8');
  }

  async readPID(): Promise<number | null> {
    try {
      const content = await fs.readFile(this.pidFile, 'utf8');
      const pid = parseInt(content.trim(), 10);

      if (isNaN(pid)) {
        return null;
      }

      return pid;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null; // File doesn't exist
      }
      throw error;
    }
  }

  async isProcessRunning(pid: number): Promise<boolean> {
    try {
      // Send signal 0 to check if process exists
      process.kill(pid, 0);
      return true;
    } catch (error: any) {
      if (error.code === 'ESRCH') {
        return false; // Process doesn't exist
      }
      if (error.code === 'EPERM') {
        return true; // Process exists but we don't have permission
      }
      throw error;
    }
  }

  async isCurrentProcessRunning(): Promise<boolean> {
    const pid = await this.readPID();
    if (!pid) return false;
    return this.isProcessRunning(pid);
  }

  async cleanup(): Promise<void> {
    try {
      await fs.unlink(this.pidFile);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async cleanupStale(): Promise<boolean> {
    const pid = await this.readPID();
    if (!pid) return false;

    const running = await this.isProcessRunning(pid);
    if (!running) {
      await this.cleanup();
      return true; // Was stale, now cleaned
    }

    return false; // Not stale
  }
}