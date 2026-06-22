/**
 * Header theme preview — cycles APP_THEMES and writes CSS custom properties to :root.
 * Selection is stored in localStorage and applied early via inline script in index.html.
 */
import { APP_THEME_DEFINITIONS, ThemeTokens } from './themes.config';

export interface AppTheme {
  id: string;
  name: string;
  themeColor: string;
}

export const APP_THEMES: AppTheme[] = APP_THEME_DEFINITIONS.map(({ id, name, themeColor }) => ({
  id,
  name,
  themeColor
}));

const STORAGE_KEY = 'mapwilderness-preview-theme';
const LEGACY_STORAGE_KEY = 'wilderness-preview-theme';
const THEME_COUNT = APP_THEMES.length;

/** Reads the saved preview theme id, migrating legacy storage if needed. */
function readStoredThemeId(): string | null {
  const current = localStorage.getItem(STORAGE_KEY);
  if (current) return current;
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy) {
    localStorage.setItem(STORAGE_KEY, legacy);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return legacy;
  }
  return null;
}

/** Maps ThemeTokens fields to CSS custom property names in styles.css. */
const TOKEN_CSS_MAP: Record<keyof Omit<ThemeTokens, 'scheme'>, string> = {
  bg: '--bg',
  bgMid: '--bg-mid',
  bgEnd: '--bg-end',
  bgGlowAccent: '--bg-glow-accent',
  bgGlowSky: '--bg-glow-sky',
  panel: '--panel',
  panelStrong: '--panel-strong',
  text: '--text',
  muted: '--muted',
  accent: '--accent',
  accentStrong: '--accent-strong',
  sky: '--sky',
  sunset: '--sunset',
  warning: '--warning',
  ring: '--ring',
  shadow: '--shadow',
  headerBg: '--header-bg',
  headerBorder: '--header-border',
  surfaceBorder: '--surface-border',
  surfaceBorderStrong: '--surface-border-strong',
  surfaceBorderLight: '--surface-border-light',
  mapBgStart: '--map-bg-start',
  mapBgEnd: '--map-bg-end',
  mapInset: '--map-inset',
  navBg: '--nav-bg',
  navActiveBg: '--nav-active-bg',
  leafletBg: '--leaflet-bg',
  onAccent: '--on-accent',
  brandGlow: '--brand-glow'
};

/** Resolves a theme id to its index in APP_THEMES (defaults to 0). */
function themeIndex(id: string | null): number {
  if (!id) return 0;
  const index = APP_THEMES.findIndex(theme => theme.id === id);
  return index >= 0 ? index : 0;
}

/** Writes ThemeTokens values onto document CSS custom properties. */
function applyThemeTokens(tokens: ThemeTokens): void {
  const root = document.documentElement;
  root.style.colorScheme = tokens.scheme;
  root.dataset.themeMode = tokens.scheme;

  (Object.keys(TOKEN_CSS_MAP) as Array<keyof typeof TOKEN_CSS_MAP>).forEach(key => {
    root.style.setProperty(TOKEN_CSS_MAP[key], tokens[key]);
  });
}

/** Activates a theme by index and updates the header label. */
function applyTheme(index: number): void {
  const definition = APP_THEME_DEFINITIONS[index];
  const theme = APP_THEMES[index];
  document.documentElement.dataset.theme = theme.id;
  applyThemeTokens(definition.tokens);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.themeColor);

  const label = document.getElementById('themeLabel');
  if (label) {
    label.textContent = `${theme.name} · ${index + 1}/${THEME_COUNT}`;
  }

  const switcher = document.querySelector('.theme-switcher');
  if (switcher) {
    switcher.setAttribute(
      'aria-label',
      `Preview theme: ${theme.name}, ${index + 1} of ${THEME_COUNT}`
    );
  }
}

/** Bootstraps the theme from storage and wires prev/next controls. */
export function initThemeSwitcher(): void {
  let index = themeIndex(readStoredThemeId());

  const setTheme = (nextIndex: number): void => {
    index = (nextIndex + APP_THEMES.length) % APP_THEMES.length;
    localStorage.setItem(STORAGE_KEY, APP_THEMES[index].id);
    applyTheme(index);
  };

  applyTheme(index);

  document.getElementById('themePrev')?.addEventListener('click', () => {
    setTheme(index - 1);
  });

  document.getElementById('themeNext')?.addEventListener('click', () => {
    setTheme(index + 1);
  });
}
