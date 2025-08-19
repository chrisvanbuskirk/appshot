/**
 * Official App Store Screenshot Specifications
 * Source: https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications
 */

export interface DevicePreset {
  id: string;
  name: string;
  displaySize: string;
  devices: string[];
  resolutions: {
    portrait?: string;
    landscape?: string;
  };
  required?: boolean;
  fallback?: string;
  notes?: string;
}

export const IPHONE_PRESETS: DevicePreset[] = [
  {
    id: 'iphone-6-9',
    name: 'iPhone 6.9" Display',
    displaySize: '6.9"',
    devices: ['iPhone 16 Pro Max', 'iPhone 16 Plus', 'iPhone 15 Pro Max', 'iPhone 15 Plus', 'iPhone 14 Pro Max'],
    resolutions: {
      portrait: '1290x2796',
      landscape: '2796x1290'
    },
    required: true,
    notes: 'Primary iPhone screenshots'
  },
  {
    id: 'iphone-6-9-alt',
    name: 'iPhone 6.9" Display (Alternative)',
    displaySize: '6.9"',
    devices: ['iPhone 16 Pro Max', 'iPhone 16 Plus', 'iPhone 15 Pro Max', 'iPhone 15 Plus', 'iPhone 14 Pro Max'],
    resolutions: {
      portrait: '1320x2868',
      landscape: '2868x1320'
    }
  },
  {
    id: 'iphone-6-5',
    name: 'iPhone 6.5" Display',
    displaySize: '6.5"',
    devices: ['iPhone 14 Plus', 'iPhone 13 Pro Max', 'iPhone 12 Pro Max', 'iPhone 11 Pro Max', 'iPhone 11', 'iPhone XS Max', 'iPhone XR'],
    resolutions: {
      portrait: '1284x2778',
      landscape: '2778x1284'
    },
    required: true,
    fallback: 'iphone-6-9',
    notes: 'Required if 6.9" screenshots not provided'
  },
  {
    id: 'iphone-6-5-alt',
    name: 'iPhone 6.5" Display (Alternative)',
    displaySize: '6.5"',
    devices: ['iPhone 14 Plus', 'iPhone 13 Pro Max', 'iPhone 12 Pro Max', 'iPhone 11 Pro Max', 'iPhone 11', 'iPhone XS Max', 'iPhone XR'],
    resolutions: {
      portrait: '1242x2688',
      landscape: '2688x1242'
    }
  },
  {
    id: 'iphone-6-3',
    name: 'iPhone 6.3" Display',
    displaySize: '6.3"',
    devices: ['iPhone 16 Pro', 'iPhone 16', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro'],
    resolutions: {
      portrait: '1179x2556',
      landscape: '2556x1179'
    },
    fallback: 'iphone-6-5'
  },
  {
    id: 'iphone-6-3-alt',
    name: 'iPhone 6.3" Display (Alternative)',
    displaySize: '6.3"',
    devices: ['iPhone 16 Pro', 'iPhone 16', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro'],
    resolutions: {
      portrait: '1206x2622',
      landscape: '2622x1206'
    }
  },
  {
    id: 'iphone-6-1',
    name: 'iPhone 6.1" Display',
    displaySize: '6.1"',
    devices: ['iPhone 16e', 'iPhone 14', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 mini', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 mini', 'iPhone 11 Pro', 'iPhone XS', 'iPhone X'],
    resolutions: {
      portrait: '1170x2532',
      landscape: '2532x1170'
    },
    fallback: 'iphone-6-5'
  },
  {
    id: 'iphone-6-1-alt1',
    name: 'iPhone 6.1" Display (Alternative 1)',
    displaySize: '6.1"',
    devices: ['iPhone 11 Pro', 'iPhone XS', 'iPhone X'],
    resolutions: {
      portrait: '1125x2436',
      landscape: '2436x1125'
    }
  },
  {
    id: 'iphone-6-1-alt2',
    name: 'iPhone 6.1" Display (Alternative 2)',
    displaySize: '6.1"',
    devices: ['iPhone 12', 'iPhone 13'],
    resolutions: {
      portrait: '1080x2340',
      landscape: '2340x1080'
    }
  },
  {
    id: 'iphone-5-5',
    name: 'iPhone 5.5" Display',
    displaySize: '5.5"',
    devices: ['iPhone 8 Plus', 'iPhone 7 Plus', 'iPhone 6S Plus', 'iPhone 6 Plus'],
    resolutions: {
      portrait: '1242x2208',
      landscape: '2208x1242'
    },
    fallback: 'iphone-6-1'
  },
  {
    id: 'iphone-4-7',
    name: 'iPhone 4.7" Display',
    displaySize: '4.7"',
    devices: ['iPhone SE (3rd/2nd gen)', 'iPhone 8', 'iPhone 7', 'iPhone 6S', 'iPhone 6'],
    resolutions: {
      portrait: '750x1334',
      landscape: '1334x750'
    },
    fallback: 'iphone-5-5'
  },
  {
    id: 'iphone-4',
    name: 'iPhone 4" Display',
    displaySize: '4"',
    devices: ['iPhone SE (1st gen)', 'iPhone 5S', 'iPhone 5C', 'iPhone 5'],
    resolutions: {
      portrait: '640x1136',
      landscape: '1136x640'
    },
    fallback: 'iphone-4-7'
  },
  {
    id: 'iphone-3-5',
    name: 'iPhone 3.5" Display',
    displaySize: '3.5"',
    devices: ['iPhone 4S', 'iPhone 4'],
    resolutions: {
      portrait: '640x960',
      landscape: '960x640'
    },
    fallback: 'iphone-4'
  }
];

export const IPAD_PRESETS: DevicePreset[] = [
  {
    id: 'ipad-13',
    name: 'iPad 13" Display',
    displaySize: '13"',
    devices: ['iPad Pro (M4)', 'iPad Pro (6th-1st gen)', 'iPad Air (M3, M2)'],
    resolutions: {
      portrait: '2064x2752',
      landscape: '2752x2064'
    },
    required: true,
    notes: 'Primary iPad screenshots'
  },
  {
    id: 'ipad-13-alt',
    name: 'iPad 13" Display (Alternative)',
    displaySize: '13"',
    devices: ['iPad Pro'],
    resolutions: {
      portrait: '2048x2732',
      landscape: '2732x2048'
    },
    required: true
  },
  {
    id: 'ipad-12-9',
    name: 'iPad 12.9" Display',
    displaySize: '12.9"',
    devices: ['iPad Pro (2nd generation)'],
    resolutions: {
      portrait: '2048x2732',
      landscape: '2732x2048'
    },
    fallback: 'ipad-13'
  },
  {
    id: 'ipad-11',
    name: 'iPad 11" Display',
    displaySize: '11"',
    devices: ['iPad Pro (M4)', 'iPad Pro (4th-1st gen)', 'iPad Air (M3, M2)', 'iPad Air (5th, 4th gen)', 'iPad (A16)', 'iPad (10th gen)', 'iPad mini (A17 Pro)', 'iPad mini (6th gen)'],
    resolutions: {
      portrait: '1488x2266',
      landscape: '2266x1488'
    },
    fallback: 'ipad-13'
  },
  {
    id: 'ipad-11-alt1',
    name: 'iPad 11" Display (Alternative 1)',
    displaySize: '11"',
    devices: ['iPad Pro', 'iPad Air'],
    resolutions: {
      portrait: '1668x2420',
      landscape: '2420x1668'
    }
  },
  {
    id: 'ipad-11-alt2',
    name: 'iPad 11" Display (Alternative 2)',
    displaySize: '11"',
    devices: ['iPad Air'],
    resolutions: {
      portrait: '1668x2388',
      landscape: '2388x1668'
    }
  },
  {
    id: 'ipad-11-alt3',
    name: 'iPad 11" Display (Alternative 3)',
    displaySize: '11"',
    devices: ['iPad'],
    resolutions: {
      portrait: '1640x2360',
      landscape: '2360x1640'
    }
  },
  {
    id: 'ipad-10-5',
    name: 'iPad 10.5" Display',
    displaySize: '10.5"',
    devices: ['iPad Pro', 'iPad Air (3rd gen)', 'iPad (9th-7th gen)'],
    resolutions: {
      portrait: '1668x2224',
      landscape: '2224x1668'
    },
    fallback: 'ipad-12-9'
  },
  {
    id: 'ipad-9-7',
    name: 'iPad 9.7" Display',
    displaySize: '9.7"',
    devices: ['iPad Pro', 'iPad Air', 'iPad Air 2', 'iPad', 'iPad 2', 'iPad (6th-3rd gen)', 'iPad mini (5th gen)', 'iPad mini 4', 'iPad mini 3', 'iPad mini 2'],
    resolutions: {
      portrait: '1536x2048',
      landscape: '2048x1536'
    },
    fallback: 'ipad-10-5'
  },
  {
    id: 'ipad-9-7-alt',
    name: 'iPad 9.7" Display (Alternative)',
    displaySize: '9.7"',
    devices: ['iPad', 'iPad 2'],
    resolutions: {
      portrait: '768x1024',
      landscape: '1024x768'
    }
  }
];

export const MAC_PRESETS: DevicePreset[] = [
  {
    id: 'mac-2880',
    name: 'Mac (Retina)',
    displaySize: 'Mac',
    devices: ['MacBook Pro', 'MacBook Air'],
    resolutions: {
      landscape: '2880x1800'
    },
    required: true,
    notes: '16:10 aspect ratio required'
  },
  {
    id: 'mac-2560',
    name: 'Mac (Large)',
    displaySize: 'Mac',
    devices: ['iMac', 'MacBook Pro'],
    resolutions: {
      landscape: '2560x1600'
    },
    required: true,
    notes: '16:10 aspect ratio required'
  },
  {
    id: 'mac-1440',
    name: 'Mac (Medium)',
    displaySize: 'Mac',
    devices: ['MacBook Air'],
    resolutions: {
      landscape: '1440x900'
    },
    notes: '16:10 aspect ratio required'
  },
  {
    id: 'mac-1280',
    name: 'Mac (Standard)',
    displaySize: 'Mac',
    devices: ['MacBook'],
    resolutions: {
      landscape: '1280x800'
    },
    notes: '16:10 aspect ratio required'
  }
];

export const APPLE_TV_PRESETS: DevicePreset[] = [
  {
    id: 'appletv-4k',
    name: 'Apple TV 4K',
    displaySize: 'Apple TV',
    devices: ['Apple TV 4K'],
    resolutions: {
      landscape: '3840x2160'
    },
    required: true
  },
  {
    id: 'appletv-hd',
    name: 'Apple TV HD',
    displaySize: 'Apple TV',
    devices: ['Apple TV HD'],
    resolutions: {
      landscape: '1920x1080'
    },
    required: true
  }
];

export const VISION_PRO_PRESETS: DevicePreset[] = [
  {
    id: 'visionpro',
    name: 'Apple Vision Pro',
    displaySize: 'Apple Vision Pro',
    devices: ['Apple Vision Pro'],
    resolutions: {
      landscape: '3840x2160'
    },
    required: true
  }
];

export const APPLE_WATCH_PRESETS: DevicePreset[] = [
  {
    id: 'watch-ultra',
    name: 'Apple Watch Ultra',
    displaySize: 'Apple Watch',
    devices: ['Apple Watch Ultra 2', 'Apple Watch Ultra'],
    resolutions: {
      portrait: '410x502'
    },
    required: true,
    notes: 'Must use same size across all localizations'
  },
  {
    id: 'watch-series10',
    name: 'Apple Watch Series 10',
    displaySize: 'Apple Watch',
    devices: ['Apple Watch Series 10'],
    resolutions: {
      portrait: '416x496'
    },
    required: true,
    notes: 'Must use same size across all localizations'
  },
  {
    id: 'watch-series9',
    name: 'Apple Watch Series 9/8/7',
    displaySize: 'Apple Watch',
    devices: ['Apple Watch Series 9', 'Apple Watch Series 8', 'Apple Watch Series 7'],
    resolutions: {
      portrait: '396x484'
    },
    required: true,
    notes: 'Must use same size across all localizations'
  },
  {
    id: 'watch-series6',
    name: 'Apple Watch Series 6/5/4/SE',
    displaySize: 'Apple Watch',
    devices: ['Apple Watch Series 6', 'Apple Watch Series 5', 'Apple Watch Series 4', 'Apple Watch SE'],
    resolutions: {
      portrait: '368x448'
    },
    required: true,
    notes: 'Must use same size across all localizations'
  },
  {
    id: 'watch-series3',
    name: 'Apple Watch Series 3',
    displaySize: 'Apple Watch',
    devices: ['Apple Watch Series 3'],
    resolutions: {
      portrait: '312x390'
    },
    notes: 'Must use same size across all localizations'
  }
];

export const ALL_PRESETS = {
  iphone: IPHONE_PRESETS,
  ipad: IPAD_PRESETS,
  mac: MAC_PRESETS,
  appletv: APPLE_TV_PRESETS,
  visionpro: VISION_PRO_PRESETS,
  watch: APPLE_WATCH_PRESETS
};

/**
 * Get required presets for App Store submission
 */
export function getRequiredPresets() {
  return {
    iphone: IPHONE_PRESETS.filter(p => p.required),
    ipad: IPAD_PRESETS.filter(p => p.required),
    mac: MAC_PRESETS.filter(p => p.required),
    appletv: APPLE_TV_PRESETS.filter(p => p.required),
    visionpro: VISION_PRO_PRESETS.filter(p => p.required),
    watch: APPLE_WATCH_PRESETS.filter(p => p.required)
  };
}

/**
 * Get preset by ID
 */
export function getPresetById(id: string): DevicePreset | undefined {
  for (const category of Object.values(ALL_PRESETS)) {
    const preset = category.find(p => p.id === id);
    if (preset) return preset;
  }
  return undefined;
}

/**
 * Validate if resolution matches App Store requirements
 */
export function validateResolution(width: number, height: number, deviceType: string): boolean {
  const presets = ALL_PRESETS[deviceType as keyof typeof ALL_PRESETS];
  if (!presets) return false;

  for (const preset of presets) {
    const portrait = preset.resolutions.portrait?.split('x').map(Number);
    const landscape = preset.resolutions.landscape?.split('x').map(Number);

    if (portrait && portrait[0] === width && portrait[1] === height) return true;
    if (landscape && landscape[0] === width && landscape[1] === height) return true;
  }

  return false;
}

/**
 * Get recommended preset for given resolution
 */
export function recommendPreset(width: number, height: number, deviceType: string): DevicePreset | undefined {
  const presets = ALL_PRESETS[deviceType as keyof typeof ALL_PRESETS];
  if (!presets) return undefined;

  for (const preset of presets) {
    const portrait = preset.resolutions.portrait?.split('x').map(Number);
    const landscape = preset.resolutions.landscape?.split('x').map(Number);

    if (portrait && portrait[0] === width && portrait[1] === height) return preset;
    if (landscape && landscape[0] === width && landscape[1] === height) return preset;
  }

  return undefined;
}