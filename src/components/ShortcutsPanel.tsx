import { Keyboard, Palette, User, Shield, Star } from 'lucide-react';
import { THEMES, AppTheme } from '../engine/themes';

interface ShortcutsPanelProps {
  currentThemeId: string;
  onThemeChange: (themeId: string) => void;
  gitConfig: Record<string, string>;
  onConfigChange: (key: string, value: string) => void;
}

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], desc: 'Open Command Palette' },
  { keys: ['Alt', '1-9'], desc: 'Switch Right Panel Tabs' },
  { keys: ['Ctrl', 'L'], desc: 'Clear Terminal Output' },
  { keys: ['Tab'], desc: 'Autocomplete Command' },
  { keys: ['↑ / ↓'], desc: 'History / Suggestion Navigation' },
  { keys: ['Esc'], desc: 'Dismiss Overlays & Suggestions' },
  { keys: ['?'], desc: 'Open Command Reference Tab' },
];

function EyeSafetyBadge({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" title={`Eye safety: ${rating}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < rating ? 'bg-green-400' : 'bg-gray-700'}`} />
      ))}
    </div>
  );
}

export default function ShortcutsPanel({
  currentThemeId,
  onThemeChange,
  gitConfig,
  onConfigChange,
}: ShortcutsPanelProps) {
  const darkThemes = THEMES.filter(t => t.family === 'dark');
  const lightThemes = THEMES.filter(t => t.family === 'light');

  const renderThemeCard = (theme: AppTheme) => {
    const isSelected = currentThemeId === theme.id;
    return (
      <button
        key={theme.id}
        onClick={() => onThemeChange(theme.id)}
        className={`w-full text-left p-3 rounded-xl border transition-all duration-200 group ${
          isSelected
            ? 'border-[var(--accent)] shadow-lg ring-1 ring-[var(--accent)]/30'
            : 'border-[var(--border)] hover:border-[var(--text-muted)]'
        }`}
        style={{ backgroundColor: isSelected ? 'var(--bg-elevated)' : 'var(--bg-surface)' }}
      >
        {/* Color Swatches */}
        <div className="flex items-center gap-1.5 mb-2">
          {theme.preview.map((color, i) => (
            <div key={i} className="w-5 h-5 rounded-md border border-black/20" style={{ backgroundColor: color }} />
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <EyeSafetyBadge rating={theme.eyeSafetyRating} />
            {isSelected && (
              <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' }}>
                Active
              </span>
            )}
          </div>
        </div>

        {/* Name & meta */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[11px] font-bold" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
            {theme.name}
          </span>
          {theme.eyeSafetyRating >= 5 && (
            <Star size={10} className="text-yellow-500 fill-yellow-500" />
          )}
        </div>
        <p className="text-[9px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {theme.description}
        </p>

        {/* Tags */}
        <div className="flex gap-1.5 mt-1.5">
          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
            {theme.temperature}
          </span>
          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ backgroundColor: 'var(--bg-panel)', color: theme.eyeSafetyRating >= 4 ? 'var(--success)' : 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
            <Shield size={7} />
            {theme.eyeSafetyRating}/5 eye safe
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-3.5 space-y-5" style={{ backgroundColor: 'var(--bg-panel)' }}>
      
      {/* ── Theme Gallery ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette size={14} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Color Themes
          </span>
        </div>

        {/* Dark Themes */}
        <div>
          <span className="text-[9px] font-bold uppercase tracking-widest block mb-2" style={{ color: 'var(--text-muted)' }}>
            🌙 Dark Themes ({darkThemes.length})
          </span>
          <div className="space-y-2">
            {darkThemes.map(renderThemeCard)}
          </div>
        </div>

        {/* Light Themes */}
        <div className="pt-2">
          <span className="text-[9px] font-bold uppercase tracking-widest block mb-2" style={{ color: 'var(--text-muted)' }}>
            ☀️ Light Themes ({lightThemes.length})
          </span>
          <div className="space-y-2">
            {lightThemes.map(renderThemeCard)}
          </div>
        </div>
      </div>

      {/* ── Keyboard Shortcuts ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Keyboard size={14} style={{ color: 'var(--info)' }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Keyboard Shortcuts</span>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {SHORTCUTS.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg border" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{shortcut.desc}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, ki) => (
                  <kbd key={ki} className="px-1.5 py-0.5 text-[9px] font-bold font-mono rounded shadow" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Git Config ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <User size={14} style={{ color: 'var(--info)' }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Git Config</span>
        </div>
        <div className="p-3.5 rounded-xl border space-y-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>User Name</label>
            <input
              type="text"
              value={gitConfig['user.name'] || ''}
              onChange={e => onConfigChange('user.name', e.target.value)}
              className="w-full border text-xs px-2.5 py-1.5 rounded-lg outline-none transition-colors"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              placeholder="e.g. John Doe"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>User Email</label>
            <input
              type="text"
              value={gitConfig['user.email'] || ''}
              onChange={e => onConfigChange('user.email', e.target.value)}
              className="w-full border text-xs px-2.5 py-1.5 rounded-lg outline-none transition-colors"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              placeholder="e.g. john@example.com"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
