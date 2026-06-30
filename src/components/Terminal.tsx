import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { TerminalLine } from '../engine/types';
import { GitEngine } from '../engine/gitEngine';

interface TerminalProps {
  engine: GitEngine;
  onStateChange: () => void;
}

export interface TerminalHandle {
  executeCommand: (cmd: string) => void;
}

const SUGGESTIONS = [
  // Git - core
  'git init', 'git add .', 'git add', 'git commit -m ""', 'git status',
  'git log', 'git log --oneline', 'git log --oneline --graph --all',
  'git branch', 'git branch -a', 'git branch -v', 'git branch -d',
  'git checkout', 'git checkout -b', 'git switch', 'git switch -c',
  'git merge', 'git rebase', 'git rebase -i',
  'git diff', 'git diff --staged',
  'git stash', 'git stash pop', 'git stash list', 'git stash save',
  'git reset --soft', 'git reset --mixed', 'git reset --hard',
  'git revert', 'git cherry-pick',
  'git tag', 'git tag -a', 'git tag -d',
  'git remote add origin', 'git remote -v',
  'git push', 'git push -u origin', 'git pull', 'git fetch',
  'git clone', 'git show', 'git blame', 'git reflog',
  'git config --list', 'git config user.name', 'git config user.email',
  'git restore', 'git restore --staged',
  'git rm', 'git mv',
  // Git - advanced
  'git clean -n', 'git clean -fd', 'git shortlog -sn', 'git describe',
  'git rev-parse HEAD', 'git rev-parse --abbrev-ref HEAD',
  'git count-objects', 'git fsck', 'git gc',
  // File & directory
  'touch', 'echo', 'cat', 'ls', 'ls -la', 'rm', 'rm -rf',
  'mkdir', 'mkdir -p', 'rmdir', 'cp', 'cp -r', 'mv', 'cd', 'pwd', 'tree',
  'stat', 'file', 'du', 'chmod',
  // Text processing
  'grep', 'grep -i', 'grep -n', 'grep -v', 'grep -c',
  'find . -name', 'head', 'head -n', 'tail', 'tail -n',
  'sort', 'sort -r', 'sort -u', 'uniq', 'uniq -c',
  'wc', 'wc -l', 'wc -w', 'sed', 'diff',
  // Shell utilities
  'alias', 'unalias', 'export', 'env', 'printenv',
  'whoami', 'id', 'date', 'hostname', 'uname -a',
  'which', 'man', 'history', 'clear', 'help',
];

const TerminalComponent = forwardRef<TerminalHandle, TerminalProps>(
  function TerminalInner({ engine, onStateChange }, ref) {
    const [lines, setLines] = useState<TerminalLine[]>([
      { id: 'w1', type: 'system', content: 'Microsoft Windows [Version 10.0.22631.3007]\n(c) Microsoft Corporation. All rights reserved.\n', timestamp: Date.now() },
      { id: 'w2', type: 'info', content: '🚀 GitSim Pro v1.5.0 — VS Code Terminal Shell Environment initialized.\nType "help" for a full command list • Ctrl+K opens Command Palette.', timestamp: Date.now() },
      { id: 'w3', type: 'output', content: '', timestamp: Date.now() },
    ]);
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
    const [activePanelTab, setActivePanelTab] = useState<'terminal' | 'problems' | 'output' | 'ports'>('terminal');
    const [shellType, setShellType] = useState<'bash' | 'powershell' | 'zsh'>('bash');
    
    const terminalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = useCallback(() => {
      if (terminalRef.current) {
        setTimeout(() => { terminalRef.current && (terminalRef.current.scrollTop = terminalRef.current.scrollHeight); }, 10);
      }
    }, []);

    useEffect(() => { scrollToBottom(); }, [lines, scrollToBottom]);
    useEffect(() => { inputRef.current?.focus(); }, []);

    const handleInputChange = (value: string) => {
      setInput(value);
      setHistoryIndex(-1);
      if (value.length > 0) {
        setSuggestions(SUGGESTIONS.filter(s => s.toLowerCase().startsWith(value.toLowerCase()) && s !== value).slice(0, 5));
        setSelectedSuggestion(-1);
      } else {
        setSuggestions([]);
      }
    };

    const executeCommand = useCallback((cmd: string) => {
      if (!cmd.trim()) return;
      setSuggestions([]);
      setSelectedSuggestion(-1);
      const result = engine.execute(cmd);
      if (result.length === 1 && result[0].content === '__CLEAR__') {
        setLines([]);
        setInput('');
        setHistory(prev => [cmd, ...prev]);
        return;
      }
      setLines(prev => [...prev, ...result]);
      setInput('');
      setHistory(prev => [cmd, ...prev]);
      onStateChange();
    }, [engine, onStateChange]);

    useImperativeHandle(ref, () => ({ executeCommand }), [executeCommand]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (selectedSuggestion >= 0 && suggestions[selectedSuggestion]) {
          setInput(suggestions[selectedSuggestion]);
          setSuggestions([]);
          setSelectedSuggestion(-1);
        } else { executeCommand(input); }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (suggestions.length > 0) {
          setInput(suggestions[selectedSuggestion >= 0 ? selectedSuggestion : 0]);
          setSuggestions([]);
          setSelectedSuggestion(-1);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (suggestions.length > 0) setSelectedSuggestion(prev => Math.max(0, prev - 1));
        else if (history.length > 0) {
          const ni = Math.min(historyIndex + 1, history.length - 1);
          setHistoryIndex(ni);
          setInput(history[ni]);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (suggestions.length > 0) setSelectedSuggestion(prev => Math.min(suggestions.length - 1, prev + 1));
        else if (historyIndex > 0) { const ni = historyIndex - 1; setHistoryIndex(ni); setInput(history[ni]); }
        else { setHistoryIndex(-1); setInput(''); }
      } else if (e.key === 'Escape') { setSuggestions([]); setSelectedSuggestion(-1); }
      else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); setLines([]); }
    };

    const getLineClass = (type: TerminalLine['type']) => {
      switch (type) {
        case 'input': return 'theme-term-prompt';
        case 'output': return 'theme-term-text';
        case 'error': return 'theme-term-error';
        case 'success': return 'theme-term-success';
        case 'info': return 'theme-term-info';
        case 'warning': return 'theme-term-warning';
        case 'system': return 'theme-term-system';
        default: return 'theme-term-text';
      }
    };

    const branchName = engine.state.currentBranch;
    const isDetached = engine.state.detachedHead;
    const cwd = engine.state.currentDirectory;

    const killTerminal = () => {
      if (confirm('Do you want to clear session lines and restart terminal?')) {
        setLines([
          { id: 'restart', type: 'info', content: 'Terminal session restarted.', timestamp: Date.now() }
        ]);
        setInput('');
      }
    };

    return (
      <div
        className="flex flex-col h-full theme-term-bg font-mono text-sm relative"
        style={{ backgroundColor: 'var(--term-bg)', fontFamily: "'SF Mono', Monaco, Consolas, monospace" }}
        onClick={() => inputRef.current?.focus()}
      >
        {/* ─── VS Code Terminal Panel Header ─── */}
        <div className="flex items-center justify-between px-4 py-1.5 shrink-0 select-none border-b text-[11px]" style={{ backgroundColor: 'var(--term-header-bg)', borderColor: 'var(--border)' }}>
          {/* Left panel tabs */}
          <div className="flex items-center gap-4">
            {[
              { id: 'problems', label: 'PROBLEMS', badge: '0' },
              { id: 'output', label: 'OUTPUT' },
              { id: 'terminal', label: 'TERMINAL' },
              { id: 'ports', label: 'PORTS' },
            ].map(tab => {
              const isActive = activePanelTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={(e) => { e.stopPropagation(); setActivePanelTab(tab.id as any); }}
                  className="relative py-1 font-bold tracking-wider transition-all border-b-2 hover:text-white"
                  style={{
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    borderColor: isActive ? 'var(--accent)' : 'transparent',
                    fontSize: '10.5px',
                  }}
                >
                  {tab.label}
                  {tab.badge && (
                    <span className="ml-1.5 px-1 py-px rounded-full text-[9px] bg-gray-800 text-gray-400">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right panel terminal actions */}
          <div className="flex items-center gap-3">
            {/* Shell select drop down */}
            <div className="relative flex items-center bg-[#1e1e1e] border border-gray-800 rounded px-1.5 py-0.5 text-[10px]" onClick={e => e.stopPropagation()}>
              <span className="text-gray-500 mr-1.5">🪟</span>
              <select
                value={shellType}
                onChange={e => setShellType(e.target.value as any)}
                className="bg-transparent text-gray-300 outline-none cursor-pointer border-none font-semibold"
                style={{ paddingRight: '4px' }}
              >
                <option value="bash" className="bg-[#1e1e1e]">1: bash</option>
                <option value="zsh" className="bg-[#1e1e1e]">2: zsh</option>
                <option value="powershell" className="bg-[#1e1e1e]">3: powershell</option>
              </select>
            </div>

            {/* Split, Kill, Maximize, Close icons */}
            <div className="flex items-center gap-1.5 text-gray-500">
              {/* Plus icon (Split) */}
              <button className="hover:text-gray-300 p-1 rounded" title="Split Terminal">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M14 1H2a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V2a1 1 0 00-1-1zm-6 13V2h6v12H8z"/></svg>
              </button>
              {/* Trash icon (Kill) */}
              <button onClick={(e) => { e.stopPropagation(); killTerminal(); }} className="hover:text-red-400 p-1 rounded" title="Kill Terminal">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M10 3h3v1h-1v9l-1 1H5l-1-1V4H3V3h3V2l1-1h2l1 1v1zM5 4v9h6V4H5zm1 1h1v7H6V5zm3 0h1v7H9V5z"/></svg>
              </button>
              <div className="w-px h-3 bg-gray-800" />
              {/* Chevron Up (Maximize) */}
              <button className="hover:text-gray-300 p-1 rounded" title="Maximize Panel Size">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 5.7L2.3 11.4l-.7-.7L8 4.3l6.4 6.4-.7.7z"/></svg>
              </button>
              {/* Close Panel (Dismiss) */}
              <button className="hover:text-gray-300 p-1 rounded" title="Close Panel">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M1.293 1.293a1 1 0 011.414 0L8 6.586l5.293-5.293a1 1 0 111.414 1.414L9.414 8l5.293 5.293a1 1 0 01-1.414 1.414L8 9.414l-5.293 5.293a1 1 0 01-1.414-1.414L6.586 8 1.293 2.707a1 1 0 010-1.414z"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* ─── Panel Content ─── */}
        <div className="flex-1 flex flex-col min-h-0">
          {activePanelTab === 'terminal' ? (
            <div ref={terminalRef} className="flex-1 overflow-y-auto p-4 space-y-0.5 custom-scrollbar">
              {lines.map(l => (
                <div key={l.id} className={`${getLineClass(l.type)} whitespace-pre-wrap break-all leading-relaxed`}>
                  {l.content}
                </div>
              ))}

              {/* Shell Prompt Input Line */}
              <div className="flex items-center gap-1.5 mt-1">
                {shellType === 'bash' || shellType === 'zsh' ? (
                  <>
                    {/* UNIX prompt: developer@gitsim-pc:~/project (main) $ */}
                    <span className="font-bold text-green-400 shrink-0">developer@gitsim:</span>
                    <span className="font-bold text-blue-400 shrink-0">~/project{cwd !== '.' ? '/' + cwd : ''}</span>
                    {engine.state.initialized && (
                      <span className="text-purple-400 font-bold shrink-0">
                        ({isDetached ? 'detached' : branchName})
                      </span>
                    )}
                    <span className="text-gray-400 shrink-0">$</span>
                  </>
                ) : (
                  <>
                    {/* Powershell prompt: PS C:\Users\developer\project> */}
                    <span className="text-sky-400 font-bold shrink-0">PS</span>
                    <span className="text-gray-300 shrink-0">C:\Users\developer\project{cwd !== '.' ? '\\' + cwd.replace(/\//g, '\\') : ''}</span>
                    {engine.state.initialized && (
                      <span className="text-green-400 font-bold shrink-0">
                        [{isDetached ? 'DETACHED' : branchName}]
                      </span>
                    )}
                    <span className="text-gray-400 shrink-0">&gt;</span>
                  </>
                )}

                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent outline-none border-none font-mono"
                  style={{ color: 'var(--term-input)', caretColor: 'var(--term-caret)' }}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>

              {/* Autocomplete dropdown suggestions */}
              {suggestions.length > 0 && (
                <div className="ml-16 mt-1 border rounded-lg overflow-hidden shadow-xl max-w-sm z-30 relative" style={{ backgroundColor: 'var(--term-sugg-bg)', borderColor: 'var(--border)' }}>
                  {suggestions.map((s, i) => (
                    <div
                      key={s}
                      className="px-3 py-1.5 text-xs cursor-pointer transition-colors"
                      style={{
                        backgroundColor: i === selectedSuggestion ? 'var(--accent-muted)' : 'transparent',
                        color: i === selectedSuggestion ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                      onClick={() => { setInput(s); setSuggestions([]); inputRef.current?.focus(); }}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activePanelTab === 'problems' ? (
            <div className="flex-1 p-5 text-gray-500 flex flex-col items-center justify-center text-xs">
              <span>No problems have been detected in the workspace.</span>
            </div>
          ) : activePanelTab === 'output' ? (
            <div className="flex-1 p-5 font-mono text-xs text-gray-400 overflow-y-auto">
              <span>[info] GitSim Pro build environment active.</span><br />
              <span>[info] Watching workspace files for modification events...</span>
            </div>
          ) : (
            <div className="flex-1 p-5 font-mono text-xs text-gray-400 overflow-y-auto">
              <table className="w-full max-w-md text-left">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500">
                    <th className="pb-1">Local Address</th>
                    <th className="pb-1">Process</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 text-green-400">localhost:3000</td>
                    <td className="py-2">gitsim-dev-server</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default TerminalComponent;
