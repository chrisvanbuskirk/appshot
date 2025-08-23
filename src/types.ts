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

export interface CaptionConfig {
  font: string;
  fontsize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  paddingTop: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  position?: 'overlay' | 'above';  // Default: 'above'
  box?: CaptionBoxConfig;          // Caption box configuration
}

export interface DeviceStyleConfig {
  framePosition?: 'top' | 'center' | 'bottom' | number;  // Vertical position (0-100)
  frameScale?: number;        // Scale multiplier (0.5-2.0)
  captionSize?: number;       // Device-specific caption size override
  captionPosition?: 'above' | 'overlay';  // Device-specific position
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
}

export interface AppshotConfig {
  output: string;
  frames: string;
  gradient: GradientConfig;
  caption: CaptionConfig;
  devices: {
    [key: string]: DeviceConfig;
  };
  defaultLanguage?: string;  // Optional override for system language
  useEmbeddedFonts?: boolean;  // Use embedded fonts when available
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