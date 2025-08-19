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