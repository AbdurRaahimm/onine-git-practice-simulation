import { useState, useCallback, useRef, useEffect } from 'react';
import { GitEngine } from './engine/gitEngine';
import { GitState, GitCommit } from './engine/types';
import { ACHIEVEMENTS, checkAchievements } from './engine/achievements';
import {
  loadPersistedState,
  saveGitState,
  saveCommandHistory,
  saveAchievements,
  saveTerminalTheme,
  saveDarkMode,
  saveTourSeen,
  saveSidebarOpen,
  saveRightTab,
  clearAllPersistedState,
  getSessionDuration,
} from './engine/persistence';
import Terminal, { TerminalHandle } from './components/Terminal';
import GitGraph from './components/GitGraph';
import FileExplorer from './components/FileExplorer';
import QuickActions from './components/QuickActions';
import StagingVisual from './components/StagingVisual';
// FileEditor is now built into FileExplorer
import PracticePanel from './components/PracticePanel';
import VisualDiff from './components/VisualDiff';
import ShortcutsPanel from './components/ShortcutsPanel';
import { getThemeById, applyThemeToDOM } from './engine/themes';
import CommitInspector from './components/CommitInspector';
import LifecycleMap from './components/LifecycleMap';
import CommandPalette from './components/CommandPalette';
import ToastSystem, { ToastMessage } from './components/Toast';
import AchievementsPanel from './components/AchievementsPanel';
import StatsDashboard from './components/StatsDashboard';
import ConflictResolver from './components/ConflictResolver';
import OnboardingTour from './components/OnboardingTour';
import { 
  GitBranch, 
  Zap, 
  BarChart3, 
  BookOpen, 
  Menu, 
  X, 
  Award,
  Eye,

  Settings,
  Sun,
  Moon,
  Layers,
  AlertTriangle,
  Trophy,
  Search,
  HelpCircle
} from 'lucide-react';

type RightTab = 'graph' | 'practice' | 'lifecycle' | 'diff' | 'actions' | 'conflicts' | 'stats' | 'achievements' | 'guide' | 'config';

// Load all persisted state once at module level
const persisted = loadPersistedState();

export default function App() {
  // Restore engine from saved state or fresh
  const engineRef = useRef(
    persisted.gitState ? new GitEngine(persisted.gitState) : new GitEngine()
  );
  const terminalRef = useRef<TerminalHandle>(null);
  const [, setVersion] = useState(0);

  // Restore all preferences from localStorage
  const [rightTab, setRightTab] = useState<RightTab>(
    (persisted.rightTab as RightTab) || 'graph'
  );
  const [commandHistory, setCommandHistory] = useState<string[]>(
    persisted.commandHistory
  );
  const [activeThemeId, setActiveThemeId] = useState<string>(
    persisted.terminalTheme || 'midnight'
  );
  const [isDarkMode, setIsDarkMode] = useState(persisted.isDarkMode);
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(
    new Set(persisted.unlockedAchievements)
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(persisted.sidebarOpen);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(!persisted.tourSeen);

  // Auto-save debounce refs
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const histSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const forceUpdate = useCallback(() => {
    setVersion(v => v + 1);
  }, []);

  // Debounced save for git state (expensive)
  const scheduleGitSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveGitState(engineRef.current.getState());
    }, 800);
  }, []);

  // Debounced save for command history
  const scheduleHistorySave = useCallback((history: string[]) => {
    if (histSaveTimerRef.current) clearTimeout(histSaveTimerRef.current);
    histSaveTimerRef.current = setTimeout(() => {
      saveCommandHistory(history);
    }, 500);
  }, []);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleCommandRun = useCallback((cmd: string) => {
    if (terminalRef.current) {
      terminalRef.current.executeCommand(cmd);
      setCommandHistory(prev => {
        if (prev[0] === cmd) return prev;
        const next = [cmd, ...prev.slice(0, 99)];
        scheduleHistorySave(next);
        return next;
      });
      scheduleGitSave();
    }
  }, [scheduleGitSave, scheduleHistorySave]);

  const handleStateChange = useCallback(() => {
    forceUpdate();
    scheduleGitSave();
  }, [forceUpdate, scheduleGitSave]);

  // Persist preferences on change
  useEffect(() => { saveDarkMode(isDarkMode); }, [isDarkMode]);
  useEffect(() => { saveTerminalTheme(activeThemeId); applyThemeToDOM(getThemeById(activeThemeId)); }, [activeThemeId]);
  // Apply theme on mount
  useEffect(() => { applyThemeToDOM(getThemeById(activeThemeId)); }, []);  // eslint-disable-line
  useEffect(() => { saveRightTab(rightTab); }, [rightTab]);
  useEffect(() => { saveSidebarOpen(isSidebarOpen); }, [isSidebarOpen]);
  useEffect(() => {
    saveAchievements(Array.from(unlockedAchievements));
  }, [unlockedAchievements]);

  // Check achievements
  useEffect(() => {
    const state = engineRef.current.getState();
    const newUnlocks = checkAchievements(state, commandHistory, unlockedAchievements);
    if (newUnlocks.length > 0) {
      const newSet = new Set(unlockedAchievements);
      newUnlocks.forEach(ach => {
        newSet.add(ach.id);
        addToast({
          type: 'achievement',
          title: `Achievement: ${ach.title}`,
          message: ach.description,
          icon: ach.icon,
          duration: 5000,
        });
      });
      setUnlockedAchievements(newSet);
    }
  }, [commandHistory, unlockedAchievements, addToast, forceUpdate]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const tabMap: Record<string, RightTab> = {
          '1': 'graph', '2': 'practice', '3': 'lifecycle', '4': 'diff',
          '5': 'actions', '6': 'conflicts', '7': 'stats', '8': 'achievements', '9': 'guide',
        };
        const t = tabMap[e.key];
        if (t) setRightTab(t);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleCommandRun('clear');
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        setRightTab('guide');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCommandRun]);

  // Save git state on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveGitState(engineRef.current.getState());
      saveCommandHistory(commandHistory);
      saveAchievements(Array.from(unlockedAchievements));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [commandHistory, unlockedAchievements]);



  const handleImportState = useCallback((importedState: GitState) => {
    engineRef.current = new GitEngine(importedState);
    saveGitState(importedState);
    addToast({ type: 'success', title: 'Snapshot Imported', message: 'State restored from file' });
    forceUpdate();
  }, [addToast, forceUpdate]);

  const handleGitConfigChange = useCallback((key: string, value: string) => {
    engineRef.current.state.config[key] = value;
    addToast({ type: 'info', title: 'Config Updated', message: `${key} = ${value}` });
    handleStateChange();
  }, [addToast, handleStateChange]);

  const handleSelectCommit = useCallback((hash: string) => {
    const commit = engineRef.current.getState().commits[hash];
    if (commit) setSelectedCommit(commit);
  }, []);

  const handleCheckoutBranch = useCallback((branchName: string) => {
    handleCommandRun(`git checkout ${branchName}`);
  }, [handleCommandRun]);

  const handleCloseTour = useCallback(() => {
    setShowOnboarding(false);
    saveTourSeen(true);
  }, []);

  const handleFullReset = useCallback(() => {
    if (confirm('Reset everything? All saved data, achievements, and history will be permanently lost.')) {
      clearAllPersistedState();
      window.location.reload();
    }
  }, []);

  const state = engineRef.current.getState();

  const rightTabs: { id: RightTab; label: string; icon: React.ReactNode }[] = [
    { id: 'graph', label: 'Graph', icon: <BarChart3 size={13} /> },
    { id: 'practice', label: 'Lessons', icon: <Award size={13} /> },
    { id: 'lifecycle', label: 'Flow', icon: <Layers size={13} /> },
    { id: 'diff', label: 'Diff', icon: <Eye size={13} /> },

    { id: 'actions', label: 'Presets', icon: <Zap size={13} /> },
    { id: 'conflicts', label: 'Merge', icon: <AlertTriangle size={13} /> },
    { id: 'stats', label: 'Stats', icon: <Trophy size={13} /> },
    { id: 'achievements', label: 'Badges', icon: <Award size={13} /> },
    { id: 'guide', label: 'Ref', icon: <BookOpen size={13} /> },
    { id: 'config', label: 'Config', icon: <Settings size={13} /> },
  ];

  const selectTabOnMobile = (tabId: RightTab) => {
    setRightTab(tabId);
    setIsMobileMenuOpen(false);
  };

  const currentTheme = getThemeById(activeThemeId);
  const isLight = currentTheme.family === 'light';

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}
    >
      
      <ToastSystem toasts={toasts} onDismiss={dismissToast} />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onExecute={(cmd) => {
          handleCommandRun(cmd);
          addToast({ type: 'info', title: 'Palette Command', message: cmd });
        }}
      />
      <OnboardingTour isOpen={showOnboarding} onClose={handleCloseTour} isDarkMode={isDarkMode} />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b shrink-0 transition-colors duration-300"
        style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden p-1.5 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-900/30">
              <GitBranch size={16} className="text-white animate-gentle-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent leading-none">
                GitSim Pro
              </h1>
              <p className="text-[10px] text-gray-500 font-medium tracking-wide mt-0.5">
                {getSessionDuration() === 'First session' ? 'Interactive Practice Suite' : `Last visit: ${getSessionDuration()}`}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-4">
          {state.initialized ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-950/20 border border-green-800/40 text-[11px]">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 font-semibold">Active:</span>
                <span className={`font-mono font-bold ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                  {state.detachedHead ? 'DETACHED' : state.currentBranch}
                </span>
              </div>
              <div className="h-4 w-px bg-gray-800" />
              <span className="text-[11px] text-gray-400">Commits: <strong className={`${isDarkMode ? 'text-white' : 'text-slate-800'} font-mono`}>{Object.keys(state.commits).length}</strong></span>
              <span className="text-[11px] text-gray-400">Branches: <strong className={`${isDarkMode ? 'text-white' : 'text-slate-800'} font-mono`}>{Object.values(state.branches).filter(b => !b.isRemote).length}</strong></span>
              <span className="text-[11px] text-yellow-500">🏆 {unlockedAchievements.size}/{ACHIEVEMENTS.length}</span>
              <span className="text-[11px] text-gray-400">Cmds: <strong className={`${isDarkMode ? 'text-white' : 'text-slate-800'} font-mono`}>{commandHistory.length}</strong></span>
            </>
          ) : (
            <span className="text-[11px] text-gray-500 italic">Type "git init" or click Quick Start to begin</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {/* Auto-save indicator */}
          <div className="hidden md:flex items-center gap-1 text-[9px] text-gray-600 mr-2" title="All data is auto-saved to browser storage">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
            <span>Auto-saved</span>
          </div>

          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] transition-all"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            title="Command Palette (Ctrl+K)"
          >
            <Search size={12} />
            <span className="font-mono">Ctrl+K</span>
          </button>

          <button onClick={() => setShowOnboarding(true)} className="p-2 rounded-xl border transition-all" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--info)' }} title="Show Tour">
            <HelpCircle size={15} />
          </button>

          <button onClick={() => {
            const target = isLight ? 'midnight' : 'solarized-light';
            setActiveThemeId(target);
            setIsDarkMode(!isLight);
          }} className="p-2 rounded-xl border transition-all" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }} title="Toggle Light/Dark">
            {isLight ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          <button onClick={handleFullReset} className="text-[11px] font-semibold text-red-400/80 hover:text-red-400 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 px-3 py-1.5 rounded-lg transition-all">
            Reset
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="absolute inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm">
            <div className={`w-4/5 max-w-xs h-full flex flex-col p-4 space-y-3 overflow-y-auto custom-scrollbar border-r ${
              isDarkMode ? 'bg-[#0d1117] border-gray-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Navigator</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 hover:bg-gray-800 rounded"><X size={16} /></button>
              </div>
              <div className="space-y-1">
                {rightTabs.map(tab => (
                  <button key={tab.id} onClick={() => selectTabOnMobile(tab.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    rightTab === tab.id ? 'bg-green-600/20 text-green-400 border border-green-800/40' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                  }`}>
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-800 pt-3">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Files</span>
                <div className="max-h-[200px] overflow-y-auto custom-scrollbar"><FileExplorer engine={engineRef.current} state={state} onStateChange={handleStateChange} onRunCommand={handleCommandRun} /></div>
              </div>
            </div>
          </div>
        )}

        {/* Left Sidebar */}
        <div className={`hidden md:flex flex-col border-r shrink-0 transition-all duration-300 ${
          isSidebarOpen ? 'w-72' : 'w-0 overflow-hidden'
        }`} style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-panel)' }}>
          <FileExplorer engine={engineRef.current} state={state} onStateChange={handleStateChange} onRunCommand={handleCommandRun} />
        </div>

        {!isSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(true)}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-[#161b22] hover:bg-gray-800 border-y border-r border-gray-800/80 text-gray-400 hover:text-white px-1.5 py-3 rounded-r-lg shadow-lg"
            title="Expand">→</button>
        )}

        {/* Terminal */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0a0e17]">
          <div className="flex-1 overflow-hidden">
            <Terminal ref={terminalRef} engine={engineRef.current} onStateChange={handleStateChange} />
          </div>
          <StagingVisual state={state} />
        </div>

        {/* Right Panel */}
        <div className={`hidden md:flex w-[350px] border-l flex-col shrink-0 ${
          isDarkMode ? 'border-gray-800/80 bg-[#0d1117]' : 'border-slate-200 bg-white shadow-lg'
        }`}>
          <div className={`flex border-b shrink-0 overflow-x-auto custom-scrollbar ${
            isDarkMode ? 'border-gray-800/80 bg-[#161b22]/20' : 'border-slate-200 bg-slate-50'
          }`}>
            {rightTabs.map(tab => (
              <button key={tab.id} onClick={() => setRightTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 px-2 text-[9px] font-semibold transition-all border-b-2 whitespace-nowrap ${
                  rightTab === tab.id ? 'text-green-400 border-green-400 bg-green-950/10' : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/10'
                }`}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {rightTab === 'graph' && <GitGraph state={state} onSelectCommit={handleSelectCommit} onCheckoutBranch={handleCheckoutBranch} isDarkMode={isDarkMode} />}
            {rightTab === 'practice' && <PracticePanel state={state} onImportState={handleImportState} onRunCommand={handleCommandRun} commandHistory={commandHistory} />}
            {rightTab === 'lifecycle' && <LifecycleMap />}
            {rightTab === 'diff' && <VisualDiff state={state} />}

            {rightTab === 'actions' && <QuickActions state={state} onCommand={handleCommandRun} />}
            {rightTab === 'conflicts' && <ConflictResolver isDarkMode={isDarkMode} />}
            {rightTab === 'stats' && <StatsDashboard state={state} commandHistory={commandHistory} unlockedAchievements={unlockedAchievements.size} totalAchievements={ACHIEVEMENTS.length} isDarkMode={isDarkMode} />}
            {rightTab === 'achievements' && <AchievementsPanel unlockedIds={unlockedAchievements} isDarkMode={isDarkMode} />}
            {rightTab === 'guide' && <CommandGuide />}
            {rightTab === 'config' && <ShortcutsPanel currentThemeId={activeThemeId} onThemeChange={setActiveThemeId} gitConfig={state.config} onConfigChange={handleGitConfigChange} />}
          </div>
        </div>
      </div>

      <CommitInspector commit={selectedCommit} onClose={() => setSelectedCommit(null)} isDarkMode={isDarkMode} />
    </div>
  );
}

function CommandGuide() {
  const sections = [
    { title: 'Getting Started', icon: '🚀', commands: [
      { cmd: 'git init', desc: 'Initialize a new repository' },
      { cmd: 'git clone <url>', desc: 'Clone a repository' },
      { cmd: 'git config', desc: 'Configure git settings' },
    ]},
    { title: 'Basic Workflow', icon: '📝', commands: [
      { cmd: 'git add <file>', desc: 'Stage file changes' },
      { cmd: 'git add .', desc: 'Stage all changes' },
      { cmd: 'git commit -m "msg"', desc: 'Commit staged changes' },
      { cmd: 'git status', desc: 'Show working tree status' },
      { cmd: 'git diff', desc: 'Show unstaged changes' },
      { cmd: 'git diff --staged', desc: 'Show staged changes' },
    ]},
    { title: 'Branching', icon: '🌿', commands: [
      { cmd: 'git branch', desc: 'List branches' },
      { cmd: 'git checkout <branch>', desc: 'Switch branch' },
      { cmd: 'git checkout -b <name>', desc: 'Create & switch' },
      { cmd: 'git merge <branch>', desc: 'Merge branch' },
      { cmd: 'git rebase <branch>', desc: 'Rebase onto branch' },
    ]},
    { title: 'History', icon: '📜', commands: [
      { cmd: 'git log', desc: 'Show commit log' },
      { cmd: 'git log --oneline', desc: 'Compact log' },
      { cmd: 'git log --graph --all', desc: 'Graph view' },
      { cmd: 'git show <commit>', desc: 'Show commit details' },
      { cmd: 'git blame <file>', desc: 'Line annotations' },
      { cmd: 'git reflog', desc: 'Reference log' },
    ]},
    { title: 'Undo', icon: '↩️', commands: [
      { cmd: 'git restore <file>', desc: 'Discard changes' },
      { cmd: 'git restore --staged', desc: 'Unstage file' },
      { cmd: 'git reset --soft', desc: 'Reset HEAD only' },
      { cmd: 'git reset --hard', desc: 'Reset everything' },
      { cmd: 'git revert <commit>', desc: 'Revert a commit' },
    ]},
    { title: 'Stash', icon: '📦', commands: [
      { cmd: 'git stash', desc: 'Stash changes' },
      { cmd: 'git stash pop', desc: 'Apply & drop stash' },
      { cmd: 'git stash list', desc: 'List stashes' },
    ]},
    { title: 'Remote', icon: '🌐', commands: [
      { cmd: 'git remote add <n> <u>', desc: 'Add remote' },
      { cmd: 'git push', desc: 'Push to remote' },
      { cmd: 'git pull', desc: 'Pull from remote' },
      { cmd: 'git fetch', desc: 'Fetch remote refs' },
    ]},
    { title: 'Tags', icon: '🏷️', commands: [
      { cmd: 'git tag <name>', desc: 'Create tag' },
      { cmd: 'git tag -a <n> -m "m"', desc: 'Annotated tag' },
      { cmd: 'git tag -d <name>', desc: 'Delete tag' },
    ]},
    { title: 'Extras', icon: '⚡', commands: [
      { cmd: 'git cherry-pick <hash>', desc: 'Apply specific commit' },
      { cmd: 'git mv <old> <new>', desc: 'Rename file' },
      { cmd: 'git rm <file>', desc: 'Remove file' },
      { cmd: 'git config --list', desc: 'Show all config' },
    ]},
  ];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-3 space-y-4 bg-[#0d1117]">
      <div className="flex items-center gap-2 mb-1">
        <BookOpen size={14} className="text-gray-400" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Command Reference</span>
      </div>
      {sections.map(section => (
        <div key={section.title}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm">{section.icon}</span>
            <span className="text-[11px] font-semibold text-gray-400">{section.title}</span>
          </div>
          <div className="space-y-0.5">
            {section.commands.map(({ cmd, desc }) => (
              <div key={cmd} className="flex items-start gap-2 px-2 py-1 rounded hover:bg-gray-800/50 group">
                <code className="text-[10px] font-mono text-cyan-400/80 shrink-0 mt-0.5 min-w-[130px]">{cmd}</code>
                <span className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
