export interface ColorSwatch {
  hex: string
  label: string
}

export const EYE_COLORS: ColorSwatch[] = [
  { hex: '#4b3728', label: 'Brown' },
  { hex: '#6b4c2a', label: 'Hazel' },
  { hex: '#2a5c8a', label: 'Blue' },
  { hex: '#3a7a4a', label: 'Green' },
  { hex: '#7a7a7a', label: 'Grey' },
  { hex: '#1a1a1a', label: 'Black' },
  { hex: '#b87333', label: 'Amber' },
  { hex: '#8b4513', label: 'Copper' },
  { hex: '#c0c0c0', label: 'Silver' },
  { hex: '#9b59b6', label: 'Violet' },
  { hex: '#e74c3c', label: 'Red' },
  { hex: '#f0e68c', label: 'Gold' },
  { hex: '#00ced1', label: 'Teal' },
  { hex: '#ff7f50', label: 'Coral' },
  { hex: '#ffffff', label: 'White' },
]

export const HAIR_COLORS: ColorSwatch[] = [
  { hex: '#1a1a1a', label: 'Black' },
  { hex: '#3b1f0e', label: 'Dark Brown' },
  { hex: '#6b3a2a', label: 'Brown' },
  { hex: '#8b5e3c', label: 'Light Brown' },
  { hex: '#c9913b', label: 'Auburn' },
  { hex: '#d4a843', label: 'Blonde' },
  { hex: '#f5deb3', label: 'Platinum' },
  { hex: '#c0c0c0', label: 'Silver' },
  { hex: '#ffffff', label: 'White' },
  { hex: '#7a7a7a', label: 'Grey' },
  { hex: '#c0392b', label: 'Red' },
  { hex: '#e67e22', label: 'Orange' },
  { hex: '#9b59b6', label: 'Purple' },
  { hex: '#2980b9', label: 'Blue' },
  { hex: '#27ae60', label: 'Green' },
]

export const SKIN_COLORS: ColorSwatch[] = [
  { hex: '#fde3c0', label: 'Ivory' },
  { hex: '#f5c79a', label: 'Fair' },
  { hex: '#e0a87c', label: 'Light' },
  { hex: '#c68642', label: 'Medium' },
  { hex: '#a0522d', label: 'Tan' },
  { hex: '#8b4513', label: 'Brown' },
  { hex: '#6b3a1f', label: 'Dark Brown' },
  { hex: '#3b1f0e', label: 'Ebony' },
  { hex: '#c0b080', label: 'Olive' },
  { hex: '#b8a090', label: 'Ashen' },
  { hex: '#708090', label: 'Grey' },
  { hex: '#4a7a5a', label: 'Green' },
  { hex: '#6a5acd', label: 'Lavender' },
  { hex: '#b87333', label: 'Copper' },
  { hex: '#1c1c1c', label: 'Obsidian' },
]

// Aliases for backward compatibility
export const EYE_PALETTE = EYE_COLORS
export const HAIR_PALETTE = HAIR_COLORS
export const SKIN_PALETTE = SKIN_COLORS
