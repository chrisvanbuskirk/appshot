/**
 * Shared validation utilities for command security
 */

import { templates } from '../templates/registry.js';

// Maximum lengths to prevent DoS
const MAX_DEVICE_LIST_LENGTH = 100;
const MAX_LANGUAGE_LIST_LENGTH = 200;
const MAX_PATH_LENGTH = 500;
const MAX_CAPTION_LENGTH = 500;
const MAX_DEVICES = 10;
const MAX_LANGUAGES = 30;

/**
 * Sanitize and validate device names
 */
export function sanitizeDevices(devices: string): string {
  // Bounds checking - prevent DoS
  if (devices.length > MAX_DEVICE_LIST_LENGTH) {
    throw new Error('Device list too long');
  }

  // Only allow alphanumeric characters, commas, and hyphens
  const sanitized = devices.replace(/[^a-zA-Z0-9,_-]/g, '');

  // Validate each device is in allowed list
  const validDevices = ['iphone', 'ipad', 'watch', 'mac'];
  const deviceList = sanitized.split(',').map(d => d.trim().toLowerCase());

  // Limit array size to prevent DoS
  if (deviceList.length > MAX_DEVICES) {
    throw new Error(`Too many devices specified (max ${MAX_DEVICES})`);
  }

  const validated = deviceList.filter(d => validDevices.includes(d));
  if (validated.length === 0) {
    throw new Error('No valid devices specified');
  }

  return validated.join(',');
}

/**
 * Sanitize and validate language codes
 */
export function sanitizeLanguages(langs: string): string {
  // Bounds checking - prevent DoS
  if (langs.length > MAX_LANGUAGE_LIST_LENGTH) {
    throw new Error('Language list too long');
  }

  // Only allow language codes (2-3 letters, optional country code)
  const sanitized = langs.replace(/[^a-zA-Z,_-]/g, '');

  // Basic validation for language codes
  const langList = sanitized.split(',').map(l => l.trim().toLowerCase());

  // Limit array size to prevent DoS
  if (langList.length > MAX_LANGUAGES) {
    throw new Error(`Too many languages specified (max ${MAX_LANGUAGES})`);
  }

  const validated = langList.filter(l => /^[a-z]{2,3}(-[a-z]{2})?$/.test(l));
  if (validated.length === 0) {
    throw new Error('No valid language codes specified');
  }

  return validated.join(',');
}

/**
 * Sanitize file paths
 */
export function sanitizePath(outputPath: string): string {
  // Bounds checking - prevent DoS
  if (outputPath.length > MAX_PATH_LENGTH) {
    throw new Error('Path too long');
  }

  // Remove any dangerous characters from paths
  // Allow only alphanumeric, spaces, hyphens, underscores, dots, and forward slashes
  const sanitized = outputPath.replace(/[^a-zA-Z0-9 \-_./]/g, '');

  // Prevent directory traversal
  if (sanitized.includes('..')) {
    throw new Error('Directory traversal not allowed');
  }

  return sanitized;
}

/**
 * Validate template ID against registry
 */
export function validateTemplateId(templateId: string): boolean {
  // Prevent excessively long template IDs
  if (templateId.length > 50) {
    return false;
  }

  // Only accept known template IDs
  return templates.some((t: any) => t.id === templateId);
}

/**
 * Sanitize and validate device array
 */
export function validateDeviceArray(devices: string[]): string[] {
  // Limit array size
  if (devices.length > MAX_DEVICES) {
    throw new Error(`Too many devices specified (max ${MAX_DEVICES})`);
  }

  const validDevices = ['iphone', 'ipad', 'watch', 'mac'];
  const validated = devices
    .map(d => d.toLowerCase())
    .filter(d => validDevices.includes(d));

  if (validated.length === 0) {
    throw new Error('No valid devices in array');
  }

  return validated;
}

/**
 * Sanitize caption text
 */
export function sanitizeCaption(caption: string): string {
  // Bounds checking
  if (caption.length > MAX_CAPTION_LENGTH) {
    throw new Error('Caption too long');
  }

  // Remove control characters but preserve newlines (0x0A) and tabs (0x09)
  return caption.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Validate JSON string
 */
export function validateJson(jsonString: string): any {
  // Bounds checking
  if (jsonString.length > 10000) {
    throw new Error('JSON string too long');
  }

  try {
    return JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid JSON');
  }
}

/**
 * Validate command arguments array length
 */
export function validateArguments(args: string[]): void {
  // Prevent excessive arguments (DoS)
  if (args.length > 100) {
    throw new Error('Too many arguments');
  }

  // Check each argument length
  for (const arg of args) {
    if (arg.length > 1000) {
      throw new Error('Argument too long');
    }
  }
}