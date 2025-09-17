import { describe, it, expect } from 'vitest';
import {
  applyOrder,
  addNumericPrefixes,
  removeNumericPrefixes
} from '../src/services/screenshot-order.js';

const baseConfig = {
  version: '1.0',
  created: '2024-01-01T00:00:00.000Z',
  modified: '2024-01-01T00:00:00.000Z',
  orders: {
    iphone: ['home.png', 'feature.png']
  }
};

describe('screenshot-order utilities', () => {
  it('matches saved order even when files are already prefixed', () => {
    const files = ['02_feature.png', '01_home.png', 'extra.png'];
    const ordered = applyOrder(files, 'iphone', baseConfig);

    expect(ordered).toEqual(['01_home.png', '02_feature.png', 'extra.png']);
  });

  it('falls back to prefix sorting when no config present', () => {
    const files = ['03_extra.png', '01_home.png', 'feature.png'];
    const ordered = applyOrder(files, 'iphone', null);

    expect(ordered[0]).toBe('01_home.png');
    expect(ordered[ordered.length - 1]).toBe('feature.png');
  });

  it('adds and removes numeric prefixes cleanly', () => {
    const withPrefixes = addNumericPrefixes(['home.png', 'feature.png']);
    expect(withPrefixes).toEqual(['01_home.png', '02_feature.png']);

    const stripped = removeNumericPrefixes(withPrefixes);
    expect(stripped).toEqual(['home.png', 'feature.png']);
  });
});
