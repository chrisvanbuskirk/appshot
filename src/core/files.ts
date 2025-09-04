import { promises as fs } from 'fs';
import path from 'path';
import type { AppshotConfig, CaptionsFile } from '../types.js';

export async function loadConfig(configFile?: string): Promise<AppshotConfig> {
  // If a custom config file is specified, use it directly
  // Otherwise, use the default .appshot/config.json
  let configPath: string;

  if (configFile && configFile !== 'appshot.json') {
    // Custom config file specified
    configPath = path.isAbsolute(configFile)
      ? configFile
      : path.join(process.cwd(), configFile);
  } else {
    // Default to .appshot/config.json
    configPath = path.join(process.cwd(), '.appshot', 'config.json');
  }

  try {
    const content = await fs.readFile(configPath, 'utf8');
    return JSON.parse(content) as AppshotConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Configuration not found: ${configPath}\n${!configFile ? 'Run "appshot init" first.' : 'Check that the config file exists.'}`);
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

export async function saveConfig(config: AppshotConfig, configFile?: string): Promise<void> {
  const configPath = configFile && configFile !== 'appshot.json'
    ? (path.isAbsolute(configFile) ? configFile : path.join(process.cwd(), configFile))
    : path.join(process.cwd(), '.appshot', 'config.json');

  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

