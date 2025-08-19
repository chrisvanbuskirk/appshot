import sharp from 'sharp';
import type { GradientConfig, CaptionConfig } from '../types.js';

export async function renderGradient(
  width: number,
  height: number,
  config: GradientConfig
): Promise<Buffer> {
  // Create SVG gradient
  const { colors, direction } = config;
  
  let x1 = '0%', y1 = '0%', x2 = '0%', y2 = '100%';
  
  switch (direction) {
    case 'top-bottom':
      x1 = '0%'; y1 = '0%'; x2 = '0%'; y2 = '100%';
      break;
    case 'bottom-top':
      x1 = '0%'; y1 = '100%'; x2 = '0%'; y2 = '0%';
      break;
    case 'left-right':
      x1 = '0%'; y1 = '0%'; x2 = '100%'; y2 = '0%';
      break;
    case 'right-left':
      x1 = '100%'; y1 = '0%'; x2 = '0%'; y2 = '0%';
      break;
    case 'diagonal':
      x1 = '0%'; y1 = '0%'; x2 = '100%'; y2 = '100%';
      break;
  }
  
  const stops = colors.map((color, i) => {
    const offset = (i / (colors.length - 1)) * 100;
    return `<stop offset="${offset}%" stop-color="${color}"/>`;
  }).join('');
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
          ${stops}
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)"/>
    </svg>
  `;
  
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function addCaption(
  image: Buffer,
  text: string,
  config: CaptionConfig
): Promise<Buffer> {
  if (!text) return image;
  
  const metadata = await sharp(image).metadata();
  const width = metadata.width || 1000;
  const height = metadata.height || 1000;
  
  // Create text as SVG
  const textY = config.paddingTop + config.fontsize;
  let textAnchor = 'middle';
  let textX = width / 2;
  
  if (config.align === 'left') {
    textAnchor = 'start';
    textX = config.paddingLeft || 50;
  } else if (config.align === 'right') {
    textAnchor = 'end';
    textX = width - (config.paddingRight || 50);
  }
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text
        x="${textX}"
        y="${textY}"
        font-family="${config.font}"
        font-size="${config.fontsize}"
        fill="${config.color}"
        text-anchor="${textAnchor}"
      >${escapeXml(text)}</text>
    </svg>
  `;
  
  // Composite text over image
  return sharp(image)
    .composite([{
      input: Buffer.from(svg),
      top: 0,
      left: 0
    }])
    .toBuffer();
}

export async function compositeScreenshot(
  screenshot: Buffer,
  frame: Buffer | null,
  frameMetadata?: { screenX: number; screenY: number; screenWidth: number; screenHeight: number }
): Promise<Buffer> {
  if (!frame) return screenshot;
  
  // Default frame metadata (will be customized per device)
  const meta = frameMetadata || {
    screenX: 100,
    screenY: 200,
    screenWidth: 1084,
    screenHeight: 2378
  };
  
  // Resize screenshot to fit frame screen area
  const resizedScreenshot = await sharp(screenshot)
    .resize(meta.screenWidth, meta.screenHeight, { fit: 'fill' })
    .toBuffer();
  
  // Composite screenshot into frame
  return sharp(frame)
    .composite([{
      input: resizedScreenshot,
      left: meta.screenX,
      top: meta.screenY
    }])
    .toBuffer();
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}