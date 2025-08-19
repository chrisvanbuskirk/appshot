import { promises as fs } from 'fs';
import path from 'path';
import type { AppshotConfig, CaptionsFile } from '../types.js';

export async function loadConfig(): Promise<AppshotConfig> {
  const configPath = path.join(process.cwd(), '.appshot', 'config.json');

  try {
    const content = await fs.readFile(configPath, 'utf8');
    return JSON.parse(content) as AppshotConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('Configuration not found. Run "appshot init" first.\n(Looking for .appshot/config.json)');
    }
    throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function loadCaptions(captionsPath: string): Promise<CaptionsFile> {
  try {
    const content = await fs.readFile(captionsPath, 'utf8');
    return JSON.parse(content) as CaptionsFile;
  } catch {
    // Return empty object if file doesn't exist or is invalid
    return {};
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

