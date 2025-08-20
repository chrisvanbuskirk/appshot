/**
 * Preset gradients for App Store screenshots
 */

export interface GradientPreset {
  id: string;
  name: string;
  description: string;
  colors: string[];
  direction: 'top-bottom' | 'bottom-top' | 'left-right' | 'right-left' | 'diagonal';
  category: 'warm' | 'cool' | 'vibrant' | 'subtle' | 'monochrome' | 'brand';
}

export const gradientPresets: GradientPreset[] = [
  // Warm Gradients
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm orange to pink sunset',
    colors: ['#FF5733', '#FFC300'],
    direction: 'top-bottom',
    category: 'warm'
  },
  {
    id: 'sunrise',
    name: 'Sunrise',
    description: 'Golden morning glow',
    colors: ['#F37335', '#FDC830'],
    direction: 'diagonal',
    category: 'warm'
  },
  {
    id: 'autumn',
    name: 'Autumn',
    description: 'Fall foliage colors',
    colors: ['#D38312', '#A83279'],
    direction: 'top-bottom',
    category: 'warm'
  },
  {
    id: 'peach',
    name: 'Peach',
    description: 'Soft peach to coral',
    colors: ['#FFCCCC', '#FF6B6B'],
    direction: 'top-bottom',
    category: 'warm'
  },

  // Cool Gradients
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep blue ocean waves',
    colors: ['#0077BE', '#33CCCC'],
    direction: 'top-bottom',
    category: 'cool'
  },
  {
    id: 'arctic',
    name: 'Arctic',
    description: 'Cool ice blue',
    colors: ['#72EDF2', '#5151E5'],
    direction: 'diagonal',
    category: 'cool'
  },
  {
    id: 'mint',
    name: 'Mint',
    description: 'Fresh mint green',
    colors: ['#00B09B', '#96C93D'],
    direction: 'left-right',
    category: 'cool'
  },
  {
    id: 'lavender',
    name: 'Lavender',
    description: 'Soft purple hues',
    colors: ['#9796F0', '#FBC7D4'],
    direction: 'top-bottom',
    category: 'cool'
  },

  // Vibrant Gradients
  {
    id: 'rainbow',
    name: 'Rainbow',
    description: 'Vibrant rainbow spectrum',
    colors: ['#FF0080', '#FF8C00', '#40E0D0'],
    direction: 'left-right',
    category: 'vibrant'
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Electric neon glow',
    colors: ['#FF006E', '#8338EC', '#3A86FF'],
    direction: 'diagonal',
    category: 'vibrant'
  },
  {
    id: 'tropical',
    name: 'Tropical',
    description: 'Tropical paradise',
    colors: ['#FA709A', '#FEE140'],
    direction: 'top-bottom',
    category: 'vibrant'
  },
  {
    id: 'candy',
    name: 'Candy',
    description: 'Sweet candy colors',
    colors: ['#FF61D2', '#FE9090', '#FFCC5C'],
    direction: 'left-right',
    category: 'vibrant'
  },

  // Subtle Gradients
  {
    id: 'pastel',
    name: 'Pastel',
    description: 'Soft pastel blend',
    colors: ['#E8D8F5', '#D6E6FF'],
    direction: 'top-bottom',
    category: 'subtle'
  },
  {
    id: 'mist',
    name: 'Mist',
    description: 'Morning mist',
    colors: ['#E0EAFC', '#CFDEF3'],
    direction: 'top-bottom',
    category: 'subtle'
  },
  {
    id: 'pearl',
    name: 'Pearl',
    description: 'Pearlescent shine',
    colors: ['#F5F5F5', '#E8E8E8', '#F0F0F0'],
    direction: 'diagonal',
    category: 'subtle'
  },
  {
    id: 'cloud',
    name: 'Cloud',
    description: 'Soft cloud white',
    colors: ['#FFFFFF', '#F0F0F0'],
    direction: 'top-bottom',
    category: 'subtle'
  },

  // Monochrome Gradients
  {
    id: 'noir',
    name: 'Noir',
    description: 'Deep black fade',
    colors: ['#000000', '#434343'],
    direction: 'top-bottom',
    category: 'monochrome'
  },
  {
    id: 'graphite',
    name: 'Graphite',
    description: 'Professional gray',
    colors: ['#283048', '#859398'],
    direction: 'diagonal',
    category: 'monochrome'
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    description: 'Dark charcoal gradient',
    colors: ['#1C1C1C', '#494949'],
    direction: 'top-bottom',
    category: 'monochrome'
  },
  {
    id: 'silver',
    name: 'Silver',
    description: 'Metallic silver',
    colors: ['#B8B8B8', '#E8E8E8'],
    direction: 'diagonal',
    category: 'monochrome'
  },

  // Brand-Inspired Gradients
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Instagram brand colors',
    colors: ['#833AB4', '#FD1D1D', '#FCB045'],
    direction: 'diagonal',
    category: 'brand'
  },
  {
    id: 'twitter',
    name: 'Twitter Blue',
    description: 'Twitter brand blue',
    colors: ['#1DA1F2', '#14171A'],
    direction: 'top-bottom',
    category: 'brand'
  },
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Spotify green to black',
    colors: ['#1DB954', '#191414'],
    direction: 'diagonal',
    category: 'brand'
  },
  {
    id: 'apple',
    name: 'Apple',
    description: 'Apple-inspired gradient',
    colors: ['#A1C4FD', '#C2E9FB'],
    direction: 'diagonal',
    category: 'brand'
  }
];

/**
 * Get gradient preset by ID
 */
export function getGradientPreset(id: string): GradientPreset | undefined {
  return gradientPresets.find(g => g.id === id);
}

/**
 * Get gradients by category
 */
export function getGradientsByCategory(category: string): GradientPreset[] {
  return gradientPresets.filter(g => g.category === category);
}

/**
 * Get all gradient categories
 */
export function getGradientCategories(): string[] {
  return [...new Set(gradientPresets.map(g => g.category))];
}