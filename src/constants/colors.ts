/**
 * Color palette for the Storyteller app
 * Warm palette: Peach, light yellow, and warm beige with dark text
 */
export const colors = {
  // Primary colors - Peach tones
  primary: '#FF9F7A', // Warm peach
  primaryDark: '#E8845F',
  primaryLight: '#FFB896',
  
  // Secondary colors - Light yellow
  secondary: '#FFF4A3', // Light yellow
  secondaryDark: '#FFEC70',
  secondaryLight: '#FFF8C9',
  
  // Accent colors - Warm beige
  accent: '#E8D5B7', // Warm beige
  accentDark: '#D4C09A',
  accentLight: '#F2E6D4',
  
  // Neutral colors - Warm tones
  background: '#FFFEF9', // Off-white with warm tint
  surface: '#FFFBF5', // Very light warm beige
  surfaceDark: '#F5F0E8', // Light warm beige
  
  // Text colors - Dark on light
  text: '#2C2416', // Dark brown/charcoal
  textSecondary: '#5A4E42', // Medium brown
  textTertiary: '#8B7D6B', // Light brown
  textInverse: '#2C2416', // Dark text for light backgrounds
  
  // Status colors - Warm variants
  success: '#7FB069', // Warm green
  successLight: '#E8F5E3',
  error: '#D87C7C', // Warm red
  errorLight: '#F5E3E3',
  warning: '#E6A85C', // Warm orange
  warningLight: '#F5E8D3',
  info: '#8B9FB5', // Warm blue-gray
  infoLight: '#E3E8ED',
  
  // Border colors - Warm neutrals
  border: '#E8D5B7', // Warm beige border
  borderLight: '#F2E6D4', // Light beige
  borderDark: '#D4C09A', // Medium beige
  
  // Overlay
  overlay: 'rgba(44, 36, 22, 0.5)', // Dark overlay
  overlayLight: 'rgba(44, 36, 22, 0.3)',
  
  // Story themes colors (warm variants for visual categorization)
  themeHorror: '#C67C7C', // Muted warm red
  themeComedy: '#E6A85C', // Warm orange
  themeDrama: '#B8959F', // Warm mauve
  themeSciFi: '#9FB5C7', // Cool blue-gray (slight warm tint)
  themeFantasy: '#D4A5C7', // Warm purple-pink
  themeRomance: '#E8B5B5', // Warm pink
  themeThriller: '#8B7D6B', // Warm gray-brown
  themeMystery: '#A6967F', // Warm taupe
} as const;

export type ColorKey = keyof typeof colors;
