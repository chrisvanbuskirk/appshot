export interface GradientConfig {
  colors: string[];
  direction: 'top-bottom' | 'bottom-top' | 'left-right' | 'right-left' | 'diagonal';
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
}

export interface DeviceConfig {
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