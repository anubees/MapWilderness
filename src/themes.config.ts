/**
 * Preview theme definitions — each entry supplies CSS token overrides for the theme switcher.
 * Base styles live in styles.css; themes.css only needs [data-theme] selectors if required.
 */
export interface ThemeTokens {
  scheme: 'dark' | 'light';
  bg: string;
  bgMid: string;
  bgEnd: string;
  bgGlowAccent: string;
  bgGlowSky: string;
  panel: string;
  panelStrong: string;
  text: string;
  muted: string;
  accent: string;
  accentStrong: string;
  sky: string;
  sunset: string;
  warning: string;
  ring: string;
  shadow: string;
  headerBg: string;
  headerBorder: string;
  surfaceBorder: string;
  surfaceBorderStrong: string;
  surfaceBorderLight: string;
  mapBgStart: string;
  mapBgEnd: string;
  mapInset: string;
  navBg: string;
  navActiveBg: string;
  leafletBg: string;
  onAccent: string;
  brandGlow: string;
}

export interface AppThemeDefinition {
  id: string;
  name: string;
  themeColor: string;
  tokens: ThemeTokens;
}

/** Parses a #rgb or #rrggbb hex string into [r, g, b]. */
function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map(c => c + c).join('') : value;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/** Builds an rgba() string from a hex color and alpha. */
function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Factory for a dark AppThemeDefinition with derived token values. */
function darkTheme(
  id: string,
  name: string,
  themeColor: string,
  bg: string,
  bgMid: string,
  bgEnd: string,
  panel: string,
  panelStrong: string,
  text: string,
  muted: string,
  accent: string,
  accentStrong: string,
  sky: string,
  sunset: string,
  warning?: string
): AppThemeDefinition {
  const warn = warning ?? sunset;
  return {
    id,
    name,
    themeColor,
    tokens: {
      scheme: 'dark',
      bg,
      bgMid,
      bgEnd,
      bgGlowAccent: rgba(accent, 0.14),
      bgGlowSky: rgba(sky, 0.12),
      panel,
      panelStrong,
      text,
      muted,
      accent,
      accentStrong,
      sky,
      sunset,
      warning: warn,
      ring: rgba(accent, 0.35),
      shadow: '0 24px 80px rgba(0, 0, 0, 0.36)',
      headerBg: rgba(bg, 0.92),
      headerBorder: rgba(accent, 0.1),
      surfaceBorder: rgba(accent, 0.12),
      surfaceBorderStrong: rgba(accent, 0.18),
      surfaceBorderLight: 'rgba(255, 255, 255, 0.05)',
      mapBgStart: panelStrong,
      mapBgEnd: bg,
      mapInset: rgba(bgEnd, 0.32),
      navBg: rgba(panel, 0.94),
      navActiveBg: rgba(accent, 0.15),
      leafletBg: bgEnd,
      onAccent: bg,
      brandGlow: rgba(accent, 0.22)
    }
  };
}

/** Factory for a light AppThemeDefinition with derived token values. */
function lightTheme(
  id: string,
  name: string,
  themeColor: string,
  bg: string,
  bgMid: string,
  bgEnd: string,
  text: string,
  muted: string,
  accent: string,
  accentStrong: string,
  sky: string,
  sunset: string,
  warning?: string
): AppThemeDefinition {
  const warn = warning ?? sunset;
  const panel = '#ffffff';
  const panelStrong = bgMid;
  return {
    id,
    name,
    themeColor,
    tokens: {
      scheme: 'light',
      bg,
      bgMid,
      bgEnd,
      bgGlowAccent: rgba(accent, 0.12),
      bgGlowSky: rgba(sky, 0.14),
      panel,
      panelStrong,
      text,
      muted,
      accent,
      accentStrong,
      sky,
      sunset,
      warning: warn,
      ring: rgba(accent, 0.28),
      shadow: '0 20px 60px rgba(21, 37, 48, 0.12)',
      headerBg: 'rgba(255, 255, 255, 0.9)',
      headerBorder: rgba(text, 0.08),
      surfaceBorder: rgba(text, 0.1),
      surfaceBorderStrong: rgba(text, 0.14),
      surfaceBorderLight: rgba(text, 0.05),
      mapBgStart: '#f4f8fb',
      mapBgEnd: bg,
      mapInset: rgba(text, 0.08),
      navBg: 'rgba(255, 255, 255, 0.95)',
      navActiveBg: rgba(accent, 0.12),
      leafletBg: bgEnd,
      onAccent: '#ffffff',
      brandGlow: rgba(accent, 0.2)
    }
  };
}

/** All preview themes — cycle with the header button. */
export const APP_THEME_DEFINITIONS: AppThemeDefinition[] = [
  darkTheme('forest-night', 'Forest Night', '#061318', '#061318', '#0b1b24', '#071016', '#0d2229', '#14333d', '#f1fbfd', '#a9c2c9', '#52d593', '#2db872', '#68d8ff', '#f7c873'),
  lightTheme('alpine-dawn', 'Alpine Dawn', '#dce8ef', '#e8f0f5', '#dce8ef', '#cfdde6', '#152530', '#5a7080', '#2a9d6a', '#1f7a52', '#4895c7', '#d4893a', '#c9782a'),
  darkTheme('desert-sun', 'Desert Sun', '#1a1208', '#1a1208', '#241808', '#120c06', '#2a1c10', '#362410', '#fdf3e7', '#c4a88a', '#e8a84a', '#c98a2e', '#e06b4f', '#f0b85c'),
  darkTheme('pine-moss', 'Pine Moss', '#0a1810', '#0a1810', '#0f2218', '#071008', '#122818', '#183220', '#ecf8ef', '#9dbaa4', '#6bb87a', '#4a9a5a', '#82b88e', '#c4a86a'),
  darkTheme('canyon-red', 'Canyon Red', '#1a0e0a', '#1a0e0a', '#241410', '#120806', '#2a1610', '#361c14', '#fdf0eb', '#c4a098', '#e06b4f', '#c04e38', '#d4897a', '#f0a060'),
  darkTheme('midnight-lake', 'Midnight Lake', '#061018', '#061018', '#0a1824', '#040c14', '#0c1e2c', '#122838', '#edf6fc', '#94b0c4', '#4895c7', '#3278a8', '#68b4dc', '#7ab8d4', '#e8b060'),
  darkTheme('misty-sage', 'Misty Sage', '#121816', '#121816', '#181e1a', '#0c100e', '#1a221e', '#222c28', '#eef2ee', '#9aa8a0', '#8ca88c', '#6e8a6e', '#88a8b0', '#b8a878'),
  darkTheme('ember-sunset', 'Ember Sunset', '#180e0a', '#180e0a', '#221410', '#100806', '#2a1814', '#361e18', '#fdf0ec', '#c4a098', '#f07850', '#d05838', '#e87898', '#f0a060'),
  lightTheme('snow-peak', 'Snow Peak', '#e8eef2', '#e8eef2', '#dfe7ec', '#d4dde4', '#1a2430', '#607080', '#4895c7', '#3278a8', '#68b4dc', '#d4893a', '#c9782a'),
  darkTheme('nordic-frost', 'Nordic Frost', '#0c1218', '#0c1218', '#121a22', '#080e14', '#141c24', '#1a2430', '#e8eef4', '#8a9aa8', '#a0bed2', '#7a9eb8', '#88b0c8', '#b8a878'),
  darkTheme('deep-ocean', 'Deep Ocean', '#040c14', '#040c14', '#081824', '#020810', '#0c2030', '#102838', '#e8f4fc', '#88a8bc', '#3a9ec8', '#2a80a8', '#58c0e8', '#78b8d8'),
  darkTheme('lavender-dusk', 'Lavender Dusk', '#14101c', '#14101c', '#1c1428', '#0c0814', '#241c34', '#2c2440', '#f4f0fc', '#b0a0c4', '#a888d8', '#8868c0', '#9888e8', '#c8a878'),
  lightTheme('golden-hour', 'Golden Hour', '#f5ebe0', '#f5ebe0', '#ede0d0', '#e4d4c0', '#2a2018', '#7a6858', '#c97828', '#a86018', '#4895c7', '#e8a840', '#d89030'),
  darkTheme('rainforest', 'Rainforest', '#061408', '#061408', '#0a1c10', '#040c06', '#0e2414', '#142c1a', '#ecf8ee', '#88b090', '#3cb868', '#2a9848', '#58c888', '#d8b858'),
  darkTheme('volcanic-ash', 'Volcanic Ash', '#141414', '#141414', '#1c1c1c', '#0c0c0c', '#242424', '#2c2c2c', '#f0f0f0', '#989898', '#e87848', '#c85828', '#a89890', '#d89058'),
  lightTheme('glacier-blue', 'Glacier Blue', '#e4eef5', '#e4eef5', '#d8e8f0', '#ccdde8', '#142028', '#587080', '#3898c8', '#2878a8', '#68b8e8', '#d89048', '#c87830'),
  darkTheme('maple-autumn', 'Maple Autumn', '#180e08', '#180e08', '#221408', '#100804', '#2c1810', '#382018', '#fdf0e8', '#c4a090', '#e87838', '#c85820', '#d89868', '#f0a850'),
  darkTheme('starlit-sky', 'Starlit Sky', '#080818', '#080818', '#0c1028', '#040410', '#101430', '#181838', '#ececfc', '#9898b8', '#7878e8', '#5858c8', '#9898f8', '#c8a878'),
  lightTheme('wildflower-meadow', 'Wildflower Meadow', '#eef4e8', '#eef4e8', '#e4ecd8', '#d8e4cc', '#1a2818', '#607058', '#58a848', '#408830', '#6898c8', '#d8a848', '#c89038'),
  darkTheme('obsidian', 'Obsidian', '#080808', '#080808', '#101010', '#040404', '#181818', '#202020', '#f4f4f4', '#888888', '#d0d0d0', '#a8a8a8', '#989898', '#c8a878'),
  darkTheme('copper-canyon', 'Copper Canyon', '#1a1008', '#1a1008', '#241808', '#100804', '#301c10', '#3c2414', '#fdf0e4', '#c4a088', '#d87840', '#b85828', '#e09868', '#f0b058'),
  darkTheme('emerald-cave', 'Emerald Cave', '#061810', '#061810', '#0a2018', '#040c08', '#0e281c', '#143024', '#ecf8f2', '#88b0a0', '#38c890', '#28a870', '#58d8b0', '#a8c878'),
  lightTheme('birch-grove', 'Birch Grove', '#f0f2ec', '#f0f2ec', '#e8eae4', '#dce0d8', '#1c2418', '#687060', '#6a9858', '#507840', '#7898b8', '#c8a858', '#b09040'),
  darkTheme('storm-gray', 'Storm Gray', '#101418', '#101418', '#181c22', '#080c10', '#202428', '#282c32', '#eceef2', '#9098a4', '#6898c8', '#4878a8', '#88b0d8', '#d8a858'),
  lightTheme('terracotta-wilderness', 'Terracotta Wilderness', '#f2e8e0', '#f2e8e0', '#e8dcd0', '#dcd0c4', '#281c14', '#786860', '#c86840', '#a84828', '#6898b8', '#d89058', '#c07840'),
  darkTheme('aurora-borealis', 'Aurora Borealis', '#081018', '#081018', '#0c1820', '#040810', '#102028', '#142830', '#ecf8f4', '#88b0a8', '#48d8a8', '#28b888', '#78a8e8', '#a878d8'),
  lightTheme('sandstone-mesa', 'Sandstone Mesa', '#f0e8dc', '#f0e8dc', '#e8dcc8', '#e0d0bc', '#2a2018', '#786858', '#d89048', '#b87030', '#6898c8', '#e8a858', '#d09040'),
  darkTheme('mossy-boulder', 'Mossy Boulder', '#141810', '#141810', '#1c2018', '#0c100c', '#242820', '#2c3028', '#eef2ec', '#98a090', '#98a878', '#788858', '#88a8a0', '#c8b878'),
  lightTheme('cherry-blossom', 'Cherry Blossom', '#f8eef0', '#f8eef0', '#f0e4e8', '#e8d8de', '#281820', '#786068', '#e87898', '#c85878', '#7898c8', '#f0a878', '#d89058'),
  darkTheme('twilight-pines', 'Twilight Pines', '#0c1018', '#0c1018', '#101828', '#080c14', '#142030', '#182838', '#eceef8', '#9098b0', '#6888d8', '#4868b8', '#8898e8', '#d8a878')
];
