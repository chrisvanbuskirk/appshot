export interface GradientConfig {
  colors: string[];
  direction: 'top-bottom' | 'bottom-top' | 'left-right' | 'right-left' | 'diagonal';
}

export interface CaptionBoxConfig {
  autoSize?: boolean;         // Auto-size based on content (default: true)
  maxLines?: number;          // Max lines before truncation (default: 3)
  lineHeight?: number;        // Line height multiplier (default: 1.4)
  minHeight?: number;         // Minimum caption area height
  maxHeight?: number;         // Maximum caption area height
}

export interface CaptionBackgroundConfig {
  color?: string;             // Hex color for background (e.g., "#000000")
  opacity?: number;           // Background opacity (0-1, default: 0.8)
  padding?: number;           // Padding around text within background (default: 20)
}

export interface CaptionBorderConfig {
  color?: string;             // Hex color for border (e.g., "#FFFFFF")
  width?: number;             // Border thickness in pixels (1-10, default: 2)
  radius?: number;            // Border radius for rounded corners (0-30, default: 12)
}

export interface CaptionConfig {
  font: string;
  fontsize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  paddingTop: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  position?: 'overlay' | 'above' | 'below';  // Default: 'above'
  box?: CaptionBoxConfig;          // Caption box configuration
  background?: CaptionBackgroundConfig;  // Caption background styling
  border?: CaptionBorderConfig;    // Caption border styling
}

export interface DeviceStyleConfig {
  framePosition?: 'top' | 'center' | 'bottom' | number;  // Vertical position (0-100)
  frameScale?: number;        // Scale multiplier (0.5-2.0)
  captionSize?: number;       // Device-specific caption size override
  captionPosition?: 'above' | 'below' | 'overlay';  // Device-specific position
  captionBox?: CaptionBoxConfig;  // Device-specific caption box settings
  captionFont?: string;       // Device-specific caption font override
}

export interface DeviceConfig extends DeviceStyleConfig {
  input: string;
  resolution: string;
  frame?: string;
  autoFrame?: boolean;
  preferredFrame?: string;
  partialFrame?: boolean;  // Cut off bottom portion of frame
  frameOffset?: number;     // How much to cut off (percentage, default: 25)
  background?: {            // Device-specific background override
    image?: string;         // Path to background image
    fit?: 'cover' | 'contain' | 'fill' | 'scale-down';
    warnOnMismatch?: boolean;
  };
}

export interface WatchConfig {
  directories?: string[];     // Directories to watch
  devices?: string[];         // Device names to process for
  process?: boolean;          // Auto-process screenshots
  frameOnly?: boolean;        // Frame only mode
  verbose?: boolean;          // Verbose output
  autoStart?: boolean;        // Auto-start on init
}

export interface BackgroundConfig {
  mode?: 'gradient' | 'image' | 'auto';  // auto detects background.png
  image?: string;             // Path to background image
  fit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  color?: string;             // Solid color fallback
  gradient?: GradientConfig;  // Gradient config (used if mode is gradient or as fallback)
  fallback?: 'gradient' | 'solid';  // Fallback if image missing
  warnOnMismatch?: boolean;   // Warn if dimensions don't match
}

export interface AppshotConfig {
  output: string;
  frames: string;
  gradient?: GradientConfig;  // Made optional - deprecated in favor of background
  background?: BackgroundConfig;  // New background system
  caption: CaptionConfig;
  devices: {
    [key: string]: DeviceConfig;
  };
  defaultLanguage?: string;  // Optional override for system language
  useEmbeddedFonts?: boolean;  // Use embedded fonts when available
  watch?: WatchConfig;        // Watch mode configuration
}

export interface CaptionEntry {
  [lang: string]: string;
}

export interface CaptionsFile {
  [filename: string]: string | CaptionEntry;
}

export interface CaptionSuggestions {
  global: string[];
  iphone?: string[];
  ipad?: string[];
  mac?: string[];
  watch?: string[];
  [device: string]: string[] | undefined;
}

export interface CaptionFrequency {
  [caption: string]: number;
}

export interface CaptionHistory {
  suggestions: CaptionSuggestions;
  frequency: CaptionFrequency;
  patterns: string[];
  lastUpdated: string;
}