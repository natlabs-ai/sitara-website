// Gold/bronze color palette
export const COLORS = {
  gold: '#bfa76f',
  goldHover: '#a9915c',
  goldBgSoft: 'rgba(191,167,111,.10)',
  goldShadow: 'rgba(191,167,111,.28)',
} as const;

export type ThemeColor = keyof typeof COLORS;

// Export for backward compatibility with existing code
export const GOLD = COLORS.gold;
export const GOLD_HOVER = COLORS.goldHover;
export const GOLD_BG_SOFT = COLORS.goldBgSoft;
