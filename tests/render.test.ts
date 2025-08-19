import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { renderGradient, addCaption, compositeScreenshot } from '../src/core/render.js';

describe('render', () => {
  describe('renderGradient', () => {
    it('should create gradient buffer', async () => {
      const gradient = await renderGradient(100, 100, {
        colors: ['#FF0000', '#00FF00'],
        direction: 'top-bottom'
      });
      
      expect(gradient).toBeInstanceOf(Buffer);
      
      const metadata = await sharp(gradient).metadata();
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(100);
      expect(metadata.format).toBe('png');
    });

    it('should support different gradient directions', async () => {
      const directions = ['top-bottom', 'bottom-top', 'left-right', 'right-left', 'diagonal'] as const;
      
      for (const direction of directions) {
        const gradient = await renderGradient(50, 50, {
          colors: ['#000000', '#FFFFFF'],
          direction
        });
        
        expect(gradient).toBeInstanceOf(Buffer);
        const metadata = await sharp(gradient).metadata();
        expect(metadata.width).toBe(50);
        expect(metadata.height).toBe(50);
      }
    }, 60000); // Increase timeout for Windows CI

    it('should handle multiple colors', async () => {
      const gradient = await renderGradient(100, 100, {
        colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'],
        direction: 'diagonal'
      });
      
      expect(gradient).toBeInstanceOf(Buffer);
    });
  });

  describe('addCaption', () => {
    it('should add text to image', async () => {
      // Create a simple colored image
      const baseImage = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 255, g: 0, b: 0 }
        }
      }).png().toBuffer();
      
      const result = await addCaption(baseImage, 'Test Caption', {
        font: 'Arial',
        fontsize: 24,
        color: '#FFFFFF',
        align: 'center',
        paddingTop: 50
      });
      
      expect(result).toBeInstanceOf(Buffer);
      
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(200);
    });

    it('should handle empty text', async () => {
      const baseImage = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 0, g: 0, b: 255 }
        }
      }).png().toBuffer();
      
      const result = await addCaption(baseImage, '', {
        font: 'Arial',
        fontsize: 24,
        color: '#FFFFFF',
        align: 'center',
        paddingTop: 50
      });
      
      // Should return original image when text is empty
      expect(result).toEqual(baseImage);
    });

    it('should support different text alignments', async () => {
      const baseImage = await sharp({
        create: {
          width: 300,
          height: 100,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      }).png().toBuffer();
      
      const alignments = ['left', 'center', 'right'] as const;
      
      for (const align of alignments) {
        const result = await addCaption(baseImage, 'Aligned Text', {
          font: 'Arial',
          fontsize: 20,
          color: '#000000',
          align,
          paddingTop: 30,
          paddingLeft: 20,
          paddingRight: 20
        });
        
        expect(result).toBeInstanceOf(Buffer);
      }
    });
  });

  describe('compositeScreenshot', () => {
    it('should return original when no frame provided', async () => {
      const screenshot = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 255, b: 0 }
        }
      }).png().toBuffer();
      
      const result = await compositeScreenshot(screenshot, null);
      expect(result).toEqual(screenshot);
    });

    it('should composite screenshot into frame', async () => {
      const screenshot = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 0 }
        }
      }).png().toBuffer();
      
      const frame = await sharp({
        create: {
          width: 300,
          height: 400,
          channels: 3,
          background: { r: 0, g: 0, b: 0 }
        }
      }).png().toBuffer();
      
      const result = await compositeScreenshot(screenshot, frame, {
        screenX: 50,
        screenY: 50,
        screenWidth: 200,
        screenHeight: 300
      });
      
      expect(result).toBeInstanceOf(Buffer);
      
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(400);
    });
  });
});