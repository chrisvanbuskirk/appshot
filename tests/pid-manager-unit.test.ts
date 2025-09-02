import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PIDManager } from '../src/utils/pid-manager.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('PID Manager Unit Tests', () => {
  let pidManager: PIDManager;
  let testPidFile: string;

  beforeEach(async () => {
    // Use a real temp file for testing
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'appshot-test-'));
    testPidFile = path.join(tempDir, 'test.pid');
    pidManager = new PIDManager(testPidFile);
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.unlink(testPidFile);
      await fs.rmdir(path.dirname(testPidFile));
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should write and read PID', async () => {
    const testPid = 12345;
    
    await pidManager.writePID(testPid);
    const readPid = await pidManager.readPID();
    
    expect(readPid).toBe(testPid);
  });

  it('should return null for non-existent PID file', async () => {
    const nonExistentManager = new PIDManager('/tmp/does-not-exist/test.pid');
    const pid = await nonExistentManager.readPID();
    
    expect(pid).toBeNull();
  });

  it('should detect current process as running', async () => {
    await pidManager.writePID(process.pid);
    const isRunning = await pidManager.isCurrentProcessRunning();
    
    expect(isRunning).toBe(true);
  });

  it('should detect non-existent process as not running', async () => {
    const isRunning = await pidManager.isProcessRunning(999999);
    
    expect(isRunning).toBe(false);
  });

  it('should cleanup PID file', async () => {
    await pidManager.writePID(12345);
    
    // Verify file exists
    const exists1 = await fs.access(testPidFile).then(() => true).catch(() => false);
    expect(exists1).toBe(true);
    
    await pidManager.cleanup();
    
    // Verify file is deleted
    const exists2 = await fs.access(testPidFile).then(() => true).catch(() => false);
    expect(exists2).toBe(false);
  });

  it('should clean up stale PID', async () => {
    // Write a non-existent PID
    await pidManager.writePID(999999);
    
    const wasStale = await pidManager.cleanupStale();
    
    expect(wasStale).toBe(true);
    
    // Verify file was removed
    const exists = await fs.access(testPidFile).then(() => true).catch(() => false);
    expect(exists).toBe(false);
  });

  it('should not clean up active PID', async () => {
    // Write current process PID
    await pidManager.writePID(process.pid);
    
    const wasStale = await pidManager.cleanupStale();
    
    expect(wasStale).toBe(false);
    
    // Verify file still exists
    const exists = await fs.access(testPidFile).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('should handle invalid PID content gracefully', async () => {
    await fs.writeFile(testPidFile, 'not-a-number', 'utf8');
    
    const pid = await pidManager.readPID();
    
    expect(pid).toBeNull();
  });
});