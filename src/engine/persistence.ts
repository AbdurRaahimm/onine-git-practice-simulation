import { GitState } from './types';

const STORAGE_KEYS = {
  GIT_STATE: 'gitsim-git-state',
  COMMAND_HISTORY: 'gitsim-command-history',
  ACHIEVEMENTS: 'gitsim-unlocked-achievements',
  THEME: 'gitsim-terminal-theme',
  DARK_MODE: 'gitsim-dark-mode',
  TOUR_SEEN: 'gitsim-tour-seen',
  ONBOARDING_DONE: 'gitsim-onboarding-done',
  SIDEBAR_OPEN: 'gitsim-sidebar-open',
  RIGHT_TAB: 'gitsim-right-tab',
  LAST_SESSION: 'gitsim-last-session',
} as const;

export interface PersistedState {
  gitState: GitState | null;
  commandHistory: string[];
  unlockedAchievements: string[];
  terminalTheme: string;
  isDarkMode: boolean;
  tourSeen: boolean;
  sidebarOpen: boolean;
  rightTab: string;
  lastSessionTimestamp: number;
}

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function loadPersistedState(): PersistedState {
  return {
    gitState: safeGet<GitState | null>(STORAGE_KEYS.GIT_STATE, null),
    commandHistory: safeGet<string[]>(STORAGE_KEYS.COMMAND_HISTORY, []),
    unlockedAchievements: safeGet<string[]>(STORAGE_KEYS.ACHIEVEMENTS, []),
    terminalTheme: safeGet<string>(STORAGE_KEYS.THEME, 'midnight'),
    isDarkMode: safeGet<boolean>(STORAGE_KEYS.DARK_MODE, true),
    tourSeen: safeGet<boolean>(STORAGE_KEYS.TOUR_SEEN, false),
    sidebarOpen: safeGet<boolean>(STORAGE_KEYS.SIDEBAR_OPEN, true),
    rightTab: safeGet<string>(STORAGE_KEYS.RIGHT_TAB, 'graph'),
    lastSessionTimestamp: safeGet<number>(STORAGE_KEYS.LAST_SESSION, 0),
  };
}

export function saveGitState(state: GitState): void {
  // Convert Set to array for JSON serialization
  const serializable = {
    ...state,
    directories: state.directories instanceof Set ? Array.from(state.directories) : (state.directories || []),
  };
  safeSet(STORAGE_KEYS.GIT_STATE, serializable);
  safeSet(STORAGE_KEYS.LAST_SESSION, Date.now());
}

export function saveCommandHistory(history: string[]): void {
  safeSet(STORAGE_KEYS.COMMAND_HISTORY, history);
}

export function saveAchievements(ids: string[]): void {
  safeSet(STORAGE_KEYS.ACHIEVEMENTS, ids);
}

export function saveTerminalTheme(theme: string): void {
  safeSet(STORAGE_KEYS.THEME, theme);
}

export function saveDarkMode(isDark: boolean): void {
  safeSet(STORAGE_KEYS.DARK_MODE, isDark);
}

export function saveTourSeen(seen: boolean): void {
  safeSet(STORAGE_KEYS.TOUR_SEEN, seen);
}

export function saveSidebarOpen(open: boolean): void {
  safeSet(STORAGE_KEYS.SIDEBAR_OPEN, open);
}

export function saveRightTab(tab: string): void {
  safeSet(STORAGE_KEYS.RIGHT_TAB, tab);
}

export function clearAllPersistedState(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    try { localStorage.removeItem(key); } catch { /* skip */ }
  });
}

export function getSessionDuration(): string {
  const last = safeGet<number>(STORAGE_KEYS.LAST_SESSION, 0);
  if (!last) return 'First session';
  const diff = Date.now() - last;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
