export interface ThemeColors {
  // Shell
  bgApp: string;
  bgPanel: string;
  bgSurface: string;
  bgElevated: string;
  bgInput: string;
  bgHover: string;

  // Borders
  border: string;
  borderSubtle: string;
  borderActive: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textHeading: string;

  // Terminal
  termBg: string;
  termHeaderBg: string;
  termText: string;
  termPrompt: string;
  termInput: string;
  termSuccess: string;
  termError: string;
  termWarning: string;
  termInfo: string;
  termSystem: string;
  termCaret: string;
  termSuggBg: string;

  // Accent
  accent: string;
  accentHover: string;
  accentMuted: string;

  // Semantic
  success: string;
  error: string;
  warning: string;
  info: string;

  // Scrollbar
  scrollThumb: string;
  scrollTrack: string;
}

export interface AppTheme {
  id: string;
  name: string;
  family: 'dark' | 'light';
  temperature: 'warm' | 'neutral' | 'cool';
  eyeSafetyRating: 1 | 2 | 3 | 4 | 5;       // 5 = best for long sessions
  description: string;
  preview: [string, string, string, string];   // 4 swatch colors
  colors: ThemeColors;
}

export const THEMES: AppTheme[] = [
  // ─────────── DARK THEMES ───────────
  {
    id: 'midnight',
    name: 'Midnight Breeze',
    family: 'dark',
    temperature: 'cool',
    eyeSafetyRating: 4,
    description: 'Deep blue-black with green accents. Default balanced theme.',
    preview: ['#0d1117', '#161b22', '#22c55e', '#64748b'],
    colors: {
      bgApp: '#0a0e17', bgPanel: '#0d1117', bgSurface: '#161b22', bgElevated: '#1c2333',
      bgInput: '#0d1117', bgHover: '#1e2a3a',
      border: '#1e293b', borderSubtle: '#1a2234', borderActive: '#2d4a22',
      textPrimary: '#e2e8f0', textSecondary: '#94a3b8', textMuted: '#64748b', textHeading: '#f1f5f9',
      termBg: '#0d1117', termHeaderBg: '#161b22', termText: '#c9d1d9',
      termPrompt: '#4ade80', termInput: '#e2e8f0', termSuccess: '#4ade80', termError: '#f87171',
      termWarning: '#fbbf24', termInfo: '#60a5fa', termSystem: '#c084fc', termCaret: '#4ade80',
      termSuggBg: '#1c2333',
      accent: '#22c55e', accentHover: '#16a34a', accentMuted: '#14532d',
      success: '#4ade80', error: '#f87171', warning: '#fbbf24', info: '#60a5fa',
      scrollThumb: '#2d3748', scrollTrack: 'transparent',
    },
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    family: 'dark',
    temperature: 'warm',
    eyeSafetyRating: 5,
    description: 'Iconic warm palette by Ethan Schoonover. Scientifically tuned contrast.',
    preview: ['#002b36', '#073642', '#b58900', '#839496'],
    colors: {
      bgApp: '#002b36', bgPanel: '#073642', bgSurface: '#0a3f4e', bgElevated: '#0d4b5a',
      bgInput: '#073642', bgHover: '#0a4050',
      border: '#1a5c6b', borderSubtle: '#134959', borderActive: '#2aa198',
      textPrimary: '#839496', textSecondary: '#657b83', textMuted: '#586e75', textHeading: '#93a1a1',
      termBg: '#002b36', termHeaderBg: '#073642', termText: '#839496',
      termPrompt: '#859900', termInput: '#93a1a1', termSuccess: '#859900', termError: '#dc322f',
      termWarning: '#b58900', termInfo: '#268bd2', termSystem: '#d33682', termCaret: '#859900',
      termSuggBg: '#073642',
      accent: '#2aa198', accentHover: '#35bdb4', accentMuted: '#144d49',
      success: '#859900', error: '#dc322f', warning: '#b58900', info: '#268bd2',
      scrollThumb: '#1a5c6b', scrollTrack: 'transparent',
    },
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin Mocha',
    family: 'dark',
    temperature: 'warm',
    eyeSafetyRating: 5,
    description: 'Soothing pastel palette. Extremely gentle on eyes for long sessions.',
    preview: ['#1e1e2e', '#313244', '#cba6f7', '#cdd6f4'],
    colors: {
      bgApp: '#1e1e2e', bgPanel: '#181825', bgSurface: '#313244', bgElevated: '#45475a',
      bgInput: '#1e1e2e', bgHover: '#3b3d54',
      border: '#45475a', borderSubtle: '#313244', borderActive: '#89b4fa',
      textPrimary: '#cdd6f4', textSecondary: '#bac2de', textMuted: '#6c7086', textHeading: '#f5e0dc',
      termBg: '#1e1e2e', termHeaderBg: '#181825', termText: '#cdd6f4',
      termPrompt: '#a6e3a1', termInput: '#cdd6f4', termSuccess: '#a6e3a1', termError: '#f38ba8',
      termWarning: '#f9e2af', termInfo: '#89b4fa', termSystem: '#cba6f7', termCaret: '#a6e3a1',
      termSuggBg: '#313244',
      accent: '#cba6f7', accentHover: '#b48ef0', accentMuted: '#3b2d5e',
      success: '#a6e3a1', error: '#f38ba8', warning: '#f9e2af', info: '#89b4fa',
      scrollThumb: '#45475a', scrollTrack: 'transparent',
    },
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    family: 'dark',
    temperature: 'cool',
    eyeSafetyRating: 4,
    description: 'Inspired by neon Tokyo lights. Rich blues with soft purple tones.',
    preview: ['#1a1b26', '#24283b', '#7aa2f7', '#a9b1d6'],
    colors: {
      bgApp: '#1a1b26', bgPanel: '#16161e', bgSurface: '#24283b', bgElevated: '#2f3349',
      bgInput: '#1a1b26', bgHover: '#292e42',
      border: '#3b4261', borderSubtle: '#2f3549', borderActive: '#7aa2f7',
      textPrimary: '#a9b1d6', textSecondary: '#787c99', textMuted: '#565a6e', textHeading: '#c0caf5',
      termBg: '#1a1b26', termHeaderBg: '#16161e', termText: '#a9b1d6',
      termPrompt: '#9ece6a', termInput: '#c0caf5', termSuccess: '#9ece6a', termError: '#f7768e',
      termWarning: '#e0af68', termInfo: '#7aa2f7', termSystem: '#bb9af7', termCaret: '#9ece6a',
      termSuggBg: '#24283b',
      accent: '#7aa2f7', accentHover: '#6690e8', accentMuted: '#283457',
      success: '#9ece6a', error: '#f7768e', warning: '#e0af68', info: '#7aa2f7',
      scrollThumb: '#3b4261', scrollTrack: 'transparent',
    },
  },
  {
    id: 'rose-pine',
    name: 'Rosé Pine',
    family: 'dark',
    temperature: 'warm',
    eyeSafetyRating: 5,
    description: 'Delicate and muted rose-gold tones. Superb for late-night coding.',
    preview: ['#191724', '#1f1d2e', '#eb6f92', '#e0def4'],
    colors: {
      bgApp: '#191724', bgPanel: '#1f1d2e', bgSurface: '#26233a', bgElevated: '#2a283e',
      bgInput: '#1f1d2e', bgHover: '#2a2840',
      border: '#393552', borderSubtle: '#2a283e', borderActive: '#c4a7e7',
      textPrimary: '#e0def4', textSecondary: '#908caa', textMuted: '#6e6a86', textHeading: '#e0def4',
      termBg: '#191724', termHeaderBg: '#1f1d2e', termText: '#e0def4',
      termPrompt: '#9ccfd8', termInput: '#e0def4', termSuccess: '#9ccfd8', termError: '#eb6f92',
      termWarning: '#f6c177', termInfo: '#c4a7e7', termSystem: '#eb6f92', termCaret: '#9ccfd8',
      termSuggBg: '#26233a',
      accent: '#c4a7e7', accentHover: '#b496d9', accentMuted: '#332d4e',
      success: '#9ccfd8', error: '#eb6f92', warning: '#f6c177', info: '#c4a7e7',
      scrollThumb: '#393552', scrollTrack: 'transparent',
    },
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox Dark',
    family: 'dark',
    temperature: 'warm',
    eyeSafetyRating: 5,
    description: 'Retro groovy warm palette. Minimal blue light, ideal for sensitive eyes.',
    preview: ['#282828', '#3c3836', '#fe8019', '#ebdbb2'],
    colors: {
      bgApp: '#282828', bgPanel: '#1d2021', bgSurface: '#3c3836', bgElevated: '#504945',
      bgInput: '#282828', bgHover: '#45403d',
      border: '#504945', borderSubtle: '#3c3836', borderActive: '#fe8019',
      textPrimary: '#ebdbb2', textSecondary: '#a89984', textMuted: '#7c6f64', textHeading: '#fbf1c7',
      termBg: '#282828', termHeaderBg: '#1d2021', termText: '#ebdbb2',
      termPrompt: '#b8bb26', termInput: '#ebdbb2', termSuccess: '#b8bb26', termError: '#fb4934',
      termWarning: '#fabd2f', termInfo: '#83a598', termSystem: '#d3869b', termCaret: '#b8bb26',
      termSuggBg: '#3c3836',
      accent: '#fe8019', accentHover: '#d65d0e', accentMuted: '#4a2e12',
      success: '#b8bb26', error: '#fb4934', warning: '#fabd2f', info: '#83a598',
      scrollThumb: '#504945', scrollTrack: 'transparent',
    },
  },
  {
    id: 'everforest',
    name: 'Everforest',
    family: 'dark',
    temperature: 'warm',
    eyeSafetyRating: 5,
    description: 'Nature-inspired green tones. Lowest blue light emission of all themes.',
    preview: ['#2d353b', '#343f44', '#a7c080', '#d3c6aa'],
    colors: {
      bgApp: '#2d353b', bgPanel: '#272e33', bgSurface: '#343f44', bgElevated: '#3d484d',
      bgInput: '#2d353b', bgHover: '#3a454a',
      border: '#475258', borderSubtle: '#3d484d', borderActive: '#a7c080',
      textPrimary: '#d3c6aa', textSecondary: '#9da9a0', textMuted: '#7a8478', textHeading: '#e1d8c5',
      termBg: '#2d353b', termHeaderBg: '#272e33', termText: '#d3c6aa',
      termPrompt: '#a7c080', termInput: '#d3c6aa', termSuccess: '#a7c080', termError: '#e67e80',
      termWarning: '#dbbc7f', termInfo: '#7fbbb3', termSystem: '#d699b6', termCaret: '#a7c080',
      termSuggBg: '#343f44',
      accent: '#a7c080', accentHover: '#8fb573', accentMuted: '#3a4a32',
      success: '#a7c080', error: '#e67e80', warning: '#dbbc7f', info: '#7fbbb3',
      scrollThumb: '#475258', scrollTrack: 'transparent',
    },
  },
  {
    id: 'kanagawa',
    name: 'Kanagawa',
    family: 'dark',
    temperature: 'warm',
    eyeSafetyRating: 4,
    description: 'Inspired by Hokusai\'s Great Wave. Ink-wash painting aesthetics.',
    preview: ['#1f1f28', '#2a2a37', '#7e9cd8', '#dcd7ba'],
    colors: {
      bgApp: '#1f1f28', bgPanel: '#16161d', bgSurface: '#2a2a37', bgElevated: '#363646',
      bgInput: '#1f1f28', bgHover: '#2e2e3e',
      border: '#363646', borderSubtle: '#2a2a37', borderActive: '#7e9cd8',
      textPrimary: '#dcd7ba', textSecondary: '#938aa9', textMuted: '#727169', textHeading: '#e6e1c7',
      termBg: '#1f1f28', termHeaderBg: '#16161d', termText: '#dcd7ba',
      termPrompt: '#98bb6c', termInput: '#dcd7ba', termSuccess: '#98bb6c', termError: '#e82424',
      termWarning: '#e6c384', termInfo: '#7e9cd8', termSystem: '#957fb8', termCaret: '#98bb6c',
      termSuggBg: '#2a2a37',
      accent: '#7e9cd8', accentHover: '#6a89c5', accentMuted: '#2a3550',
      success: '#98bb6c', error: '#e82424', warning: '#e6c384', info: '#7e9cd8',
      scrollThumb: '#363646', scrollTrack: 'transparent',
    },
  },
  {
    id: 'nord',
    name: 'Nord Frost',
    family: 'dark',
    temperature: 'cool',
    eyeSafetyRating: 4,
    description: 'Arctic blue palette inspired by polar landscapes. Clean and minimal.',
    preview: ['#2e3440', '#3b4252', '#88c0d0', '#eceff4'],
    colors: {
      bgApp: '#2e3440', bgPanel: '#292e39', bgSurface: '#3b4252', bgElevated: '#434c5e',
      bgInput: '#2e3440', bgHover: '#3f4758',
      border: '#4c566a', borderSubtle: '#434c5e', borderActive: '#88c0d0',
      textPrimary: '#d8dee9', textSecondary: '#a3b1c4', textMuted: '#6d7a8a', textHeading: '#eceff4',
      termBg: '#2e3440', termHeaderBg: '#292e39', termText: '#d8dee9',
      termPrompt: '#a3be8c', termInput: '#eceff4', termSuccess: '#a3be8c', termError: '#bf616a',
      termWarning: '#ebcb8b', termInfo: '#88c0d0', termSystem: '#b48ead', termCaret: '#a3be8c',
      termSuggBg: '#3b4252',
      accent: '#88c0d0', accentHover: '#7bb4c4', accentMuted: '#2e4450',
      success: '#a3be8c', error: '#bf616a', warning: '#ebcb8b', info: '#88c0d0',
      scrollThumb: '#4c566a', scrollTrack: 'transparent',
    },
  },
  // ─────────── LIGHT THEMES ───────────
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    family: 'light',
    temperature: 'warm',
    eyeSafetyRating: 5,
    description: 'Warm cream background with scientifically calibrated contrast. Zero eye strain.',
    preview: ['#fdf6e3', '#eee8d5', '#268bd2', '#657b83'],
    colors: {
      bgApp: '#fdf6e3', bgPanel: '#f5efdc', bgSurface: '#eee8d5', bgElevated: '#e8e2cf',
      bgInput: '#fdf6e3', bgHover: '#e8e2cf',
      border: '#d6ceb8', borderSubtle: '#e0dac6', borderActive: '#268bd2',
      textPrimary: '#586e75', textSecondary: '#657b83', textMuted: '#93a1a1', textHeading: '#073642',
      termBg: '#fdf6e3', termHeaderBg: '#eee8d5', termText: '#586e75',
      termPrompt: '#859900', termInput: '#073642', termSuccess: '#859900', termError: '#dc322f',
      termWarning: '#b58900', termInfo: '#268bd2', termSystem: '#6c71c4', termCaret: '#268bd2',
      termSuggBg: '#eee8d5',
      accent: '#268bd2', accentHover: '#1a6da8', accentMuted: '#cde4f3',
      success: '#859900', error: '#dc322f', warning: '#b58900', info: '#268bd2',
      scrollThumb: '#ccc5ad', scrollTrack: 'transparent',
    },
  },
  {
    id: 'github-light',
    name: 'GitHub Light',
    family: 'light',
    temperature: 'neutral',
    eyeSafetyRating: 3,
    description: 'Classic GitHub light palette. Clean, familiar, highly readable.',
    preview: ['#ffffff', '#f6f8fa', '#0969da', '#1f2328'],
    colors: {
      bgApp: '#f6f8fa', bgPanel: '#ffffff', bgSurface: '#f0f3f6', bgElevated: '#e8ecf0',
      bgInput: '#ffffff', bgHover: '#eaeef2',
      border: '#d0d7de', borderSubtle: '#e0e6eb', borderActive: '#0969da',
      textPrimary: '#1f2328', textSecondary: '#656d76', textMuted: '#8b949e', textHeading: '#0d1117',
      termBg: '#ffffff', termHeaderBg: '#f6f8fa', termText: '#24292f',
      termPrompt: '#1a7f37', termInput: '#1f2328', termSuccess: '#1a7f37', termError: '#cf222e',
      termWarning: '#9a6700', termInfo: '#0969da', termSystem: '#8250df', termCaret: '#0969da',
      termSuggBg: '#f6f8fa',
      accent: '#0969da', accentHover: '#0550ae', accentMuted: '#ddf4ff',
      success: '#1a7f37', error: '#cf222e', warning: '#9a6700', info: '#0969da',
      scrollThumb: '#c0c8d0', scrollTrack: 'transparent',
    },
  },
  {
    id: 'sepia',
    name: 'Warm Sepia',
    family: 'light',
    temperature: 'warm',
    eyeSafetyRating: 5,
    description: 'Paper-like warm tint. The gentlest light theme for extended reading.',
    preview: ['#f4ecd8', '#ece4cf', '#8b6914', '#4a4237'],
    colors: {
      bgApp: '#f4ecd8', bgPanel: '#f8f1e0', bgSurface: '#ece4cf', bgElevated: '#e3dbc6',
      bgInput: '#f4ecd8', bgHover: '#e6dec8',
      border: '#d4cbb5', borderSubtle: '#ddd5c0', borderActive: '#8b6914',
      textPrimary: '#4a4237', textSecondary: '#6b6255', textMuted: '#9a9080', textHeading: '#2e2820',
      termBg: '#f4ecd8', termHeaderBg: '#ece4cf', termText: '#4a4237',
      termPrompt: '#5f7a2e', termInput: '#2e2820', termSuccess: '#5f7a2e', termError: '#b8372d',
      termWarning: '#8b6914', termInfo: '#3a6ea5', termSystem: '#7a5cad', termCaret: '#5f7a2e',
      termSuggBg: '#ece4cf',
      accent: '#8b6914', accentHover: '#755610', accentMuted: '#f0e5c8',
      success: '#5f7a2e', error: '#b8372d', warning: '#8b6914', info: '#3a6ea5',
      scrollThumb: '#c8bfa8', scrollTrack: 'transparent',
    },
  },
];

export function getThemeById(id: string): AppTheme {
  return THEMES.find(t => t.id === id) || THEMES[0];
}

export function applyThemeToDOM(theme: AppTheme): void {
  const root = document.documentElement;
  const c = theme.colors;
  const entries: [string, string][] = [
    ['--bg-app', c.bgApp], ['--bg-panel', c.bgPanel], ['--bg-surface', c.bgSurface],
    ['--bg-elevated', c.bgElevated], ['--bg-input', c.bgInput], ['--bg-hover', c.bgHover],
    ['--border', c.border], ['--border-subtle', c.borderSubtle], ['--border-active', c.borderActive],
    ['--text-primary', c.textPrimary], ['--text-secondary', c.textSecondary],
    ['--text-muted', c.textMuted], ['--text-heading', c.textHeading],
    ['--term-bg', c.termBg], ['--term-header-bg', c.termHeaderBg], ['--term-text', c.termText],
    ['--term-prompt', c.termPrompt], ['--term-input', c.termInput],
    ['--term-success', c.termSuccess], ['--term-error', c.termError],
    ['--term-warning', c.termWarning], ['--term-info', c.termInfo],
    ['--term-system', c.termSystem], ['--term-caret', c.termCaret],
    ['--term-sugg-bg', c.termSuggBg],
    ['--accent', c.accent], ['--accent-hover', c.accentHover], ['--accent-muted', c.accentMuted],
    ['--success', c.success], ['--error', c.error], ['--warning', c.warning], ['--info', c.info],
    ['--scroll-thumb', c.scrollThumb], ['--scroll-track', c.scrollTrack],
  ];
  entries.forEach(([key, val]) => root.style.setProperty(key, val));
}
