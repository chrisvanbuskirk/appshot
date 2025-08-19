import { Command } from 'commander';
import pc from 'picocolors';

const deviceSpecs = {
  iphone: {
    '15-pro-max': { resolution: '1290x2796', displayName: 'iPhone 15 Pro Max' },
    '15-pro': { resolution: '1179x2556', displayName: 'iPhone 15 Pro' },
    '15': { resolution: '1179x2556', displayName: 'iPhone 15' },
    '14-pro-max': { resolution: '1290x2796', displayName: 'iPhone 14 Pro Max' },
    '14-pro': { resolution: '1179x2556', displayName: 'iPhone 14 Pro' },
    'se-3rd': { resolution: '750x1334', displayName: 'iPhone SE (3rd gen)' }
  },
  ipad: {
    'pro-12.9': { resolution: '2048x2732', displayName: 'iPad Pro 12.9"' },
    'pro-11': { resolution: '1668x2388', displayName: 'iPad Pro 11"' },
    'air-5th': { resolution: '1640x2360', displayName: 'iPad Air (5th gen)' },
    'mini-6th': { resolution: '1488x2266', displayName: 'iPad mini (6th gen)' },
    '10th': { resolution: '1640x2360', displayName: 'iPad (10th gen)' }
  },
  mac: {
    'macbook-pro-16': { resolution: '3456x2234', displayName: 'MacBook Pro 16"' },
    'macbook-pro-14': { resolution: '3024x1964', displayName: 'MacBook Pro 14"' },
    'macbook-air-15': { resolution: '2880x1864', displayName: 'MacBook Air 15"' },
    'macbook-air-13': { resolution: '2560x1664', displayName: 'MacBook Air 13"' },
    'imac-24': { resolution: '4480x2520', displayName: 'iMac 24"' }
  },
  watch: {
    'ultra-2': { resolution: '410x502', displayName: 'Apple Watch Ultra 2' },
    'series-9-45mm': { resolution: '396x484', displayName: 'Apple Watch Series 9 (45mm)' },
    'series-9-41mm': { resolution: '352x430', displayName: 'Apple Watch Series 9 (41mm)' },
    'se-44mm': { resolution: '368x448', displayName: 'Apple Watch SE (44mm)' },
    'se-40mm': { resolution: '324x394', displayName: 'Apple Watch SE (40mm)' }
  }
};

export default function specsCmd() {
  return new Command('specs')
    .description('Show device specifications and resolutions')
    .option('--device <name>', 'filter by device type (iphone|ipad|mac|watch)')
    .option('--json', 'output as JSON')
    .action((opts) => {
      try {
        if (opts.json) {
          const output = opts.device ? { [opts.device]: deviceSpecs[opts.device as keyof typeof deviceSpecs] } : deviceSpecs;
          console.log(JSON.stringify(output, null, 2));
          return;
        }

        console.log(pc.bold('\nDevice Specifications\n'));

        const devices = opts.device
          ? [opts.device as keyof typeof deviceSpecs]
          : Object.keys(deviceSpecs) as (keyof typeof deviceSpecs)[];

        for (const device of devices) {
          if (!deviceSpecs[device]) {
            console.log(pc.red(`Unknown device: ${device}`));
            continue;
          }

          console.log(pc.cyan(device.toUpperCase()));

          for (const [_model, spec] of Object.entries(deviceSpecs[device])) {
            console.log(`  ${spec.displayName.padEnd(30)} ${pc.dim(spec.resolution)}`);
          }
          console.log();
        }

        console.log(pc.dim('Use these resolutions in your appshot.json configuration'));
      } catch (error) {
        console.error(pc.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}