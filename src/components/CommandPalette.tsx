import { useState, useRef, useEffect } from 'react';
import { Search, ArrowRight, Clock, Star, Terminal, GitBranch, Zap, BookOpen } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute: (cmd: string) => void;
}

interface PaletteItem {
  id: string;
  label: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  action: string;
  keywords: string[];
}

const PALETTE_ITEMS: PaletteItem[] = [
  // Git Init & Setup
  { id: 'init', label: 'Initialize Repository', description: 'Create a new .git directory', category: 'Setup', icon: <GitBranch size={13} />, action: 'git init', keywords: ['init', 'create', 'new', 'start', 'setup'] },
  { id: 'clone', label: 'Clone Repository', description: 'Clone from a remote URL', category: 'Setup', icon: <GitBranch size={13} />, action: 'git clone https://github.com/user/repo.git', keywords: ['clone', 'download', 'copy'] },
  
  // Workflow
  { id: 'add-all', label: 'Stage All Changes', description: 'Add all modified and new files', category: 'Workflow', icon: <Zap size={13} />, action: 'git add .', keywords: ['add', 'stage', 'all', 'track'] },
  { id: 'commit', label: 'Commit Changes', description: 'Save staged changes with message', category: 'Workflow', icon: <Zap size={13} />, action: 'git commit -m "update: changes"', keywords: ['commit', 'save', 'message'] },
  { id: 'status', label: 'Check Status', description: 'Show working tree status', category: 'Workflow', icon: <Zap size={13} />, action: 'git status', keywords: ['status', 'check', 'state'] },
  { id: 'diff', label: 'Show Diff', description: 'Display unstaged changes', category: 'Workflow', icon: <Zap size={13} />, action: 'git diff', keywords: ['diff', 'changes', 'compare'] },
  { id: 'diff-staged', label: 'Show Staged Diff', description: 'Display staged changes', category: 'Workflow', icon: <Zap size={13} />, action: 'git diff --staged', keywords: ['diff', 'staged', 'cached'] },

  // Branching
  { id: 'branch-list', label: 'List Branches', description: 'Show all branches', category: 'Branching', icon: <GitBranch size={13} />, action: 'git branch -v', keywords: ['branch', 'list', 'show', 'branches'] },
  { id: 'new-feature', label: 'New Feature Branch', description: 'Create and switch to feature/feature-name', category: 'Branching', icon: <GitBranch size={13} />, action: 'git checkout -b feature/feature-name', keywords: ['feature', 'branch', 'new', 'create'] },
  { id: 'new-hotfix', label: 'New Hotfix Branch', description: 'Create and switch to hotfix/fix-name', category: 'Branching', icon: <GitBranch size={13} />, action: 'git checkout -b hotfix/fix-name', keywords: ['hotfix', 'fix', 'bug', 'urgent'] },
  { id: 'merge', label: 'Merge Branch', description: 'Merge current branch into main', category: 'Branching', icon: <GitBranch size={13} />, action: 'git merge', keywords: ['merge', 'combine', 'join'] },
  { id: 'rebase', label: 'Rebase Branch', description: 'Rebase current branch onto main', category: 'Branching', icon: <GitBranch size={13} />, action: 'git rebase main', keywords: ['rebase', 'linear', 'replay'] },

  // History
  { id: 'log', label: 'View Commit Log', description: 'Show detailed commit history', category: 'History', icon: <Clock size={13} />, action: 'git log', keywords: ['log', 'history', 'commits'] },
  { id: 'log-oneline', label: 'Compact Log', description: 'Show one-line commit history', category: 'History', icon: <Clock size={13} />, action: 'git log --oneline', keywords: ['log', 'oneline', 'compact', 'short'] },
  { id: 'log-graph', label: 'Graph Log', description: 'Show graphical branch history', category: 'History', icon: <Clock size={13} />, action: 'git log --oneline --graph --all', keywords: ['log', 'graph', 'visual', 'branches'] },
  { id: 'reflog', label: 'Reference Log', description: 'Show all HEAD movements', category: 'History', icon: <Clock size={13} />, action: 'git reflog', keywords: ['reflog', 'reference', 'head', 'movements'] },

  // Remote
  { id: 'push', label: 'Push to Remote', description: 'Upload commits to remote', category: 'Remote', icon: <ArrowRight size={13} />, action: 'git push', keywords: ['push', 'upload', 'remote'] },
  { id: 'pull', label: 'Pull from Remote', description: 'Download and merge from remote', category: 'Remote', icon: <ArrowRight size={13} />, action: 'git pull', keywords: ['pull', 'download', 'remote'] },
  { id: 'fetch', label: 'Fetch from Remote', description: 'Download without merging', category: 'Remote', icon: <ArrowRight size={13} />, action: 'git fetch', keywords: ['fetch', 'download', 'update'] },
  { id: 'remote-add', label: 'Add Remote', description: 'Add a new remote origin', category: 'Remote', icon: <ArrowRight size={13} />, action: 'git remote add origin https://github.com/user/repo.git', keywords: ['remote', 'add', 'origin', 'url'] },

  // Undo
  { id: 'restore', label: 'Restore File', description: 'Discard working directory changes', category: 'Undo', icon: <Terminal size={13} />, action: 'git restore', keywords: ['restore', 'discard', 'undo', 'revert'] },
  { id: 'unstage', label: 'Unstage File', description: 'Remove file from staging area', category: 'Undo', icon: <Terminal size={13} />, action: 'git restore --staged', keywords: ['unstage', 'remove', 'restore', 'staged'] },
  { id: 'reset-soft', label: 'Soft Reset', description: 'Undo commit, keep changes staged', category: 'Undo', icon: <Terminal size={13} />, action: 'git reset --soft HEAD~1', keywords: ['reset', 'soft', 'undo', 'commit'] },
  { id: 'reset-hard', label: 'Hard Reset', description: 'Undo everything to last commit', category: 'Undo', icon: <Terminal size={13} />, action: 'git reset --hard HEAD', keywords: ['reset', 'hard', 'destroy', 'clean'] },
  { id: 'revert', label: 'Revert Commit', description: 'Create inverse commit', category: 'Undo', icon: <Terminal size={13} />, action: 'git revert HEAD', keywords: ['revert', 'undo', 'inverse', 'commit'] },

  // Stash
  { id: 'stash', label: 'Stash Changes', description: 'Save dirty state temporarily', category: 'Stash', icon: <Star size={13} />, action: 'git stash', keywords: ['stash', 'save', 'temporary', 'hide'] },
  { id: 'stash-pop', label: 'Pop Stash', description: 'Apply and remove last stash', category: 'Stash', icon: <Star size={13} />, action: 'git stash pop', keywords: ['stash', 'pop', 'restore', 'apply'] },
  { id: 'stash-list', label: 'List Stashes', description: 'Show all stash entries', category: 'Stash', icon: <Star size={13} />, action: 'git stash list', keywords: ['stash', 'list', 'show'] },

  // Tags
  { id: 'tag', label: 'Create Tag', description: 'Lightweight tag on current commit', category: 'Tags', icon: <Star size={13} />, action: 'git tag v1.0.0', keywords: ['tag', 'version', 'release'] },
  { id: 'tag-annotated', label: 'Annotated Tag', description: 'Tag with message and metadata', category: 'Tags', icon: <Star size={13} />, action: 'git tag -a v1.0.0 -m "Release v1.0"', keywords: ['tag', 'annotated', 'release', 'version'] },

  // Files & Directories
  { id: 'files-list', label: 'List Files', description: 'Show files in working directory', category: 'Files', icon: <Terminal size={13} />, action: 'ls -la', keywords: ['ls', 'files', 'list', 'directory'] },
  { id: 'tree', label: 'Directory Tree', description: 'Visual tree of all files and folders', category: 'Files', icon: <Terminal size={13} />, action: 'tree', keywords: ['tree', 'structure', 'files', 'folders'] },
  { id: 'mkdir', label: 'Create Directory', description: 'Create a nested directory tree', category: 'Files', icon: <Terminal size={13} />, action: 'mkdir -p src/components', keywords: ['mkdir', 'directory', 'folder', 'create'] },
  { id: 'cp', label: 'Copy File', description: 'Copy a file to another location', category: 'Files', icon: <Terminal size={13} />, action: 'cp', keywords: ['cp', 'copy', 'duplicate'] },
  { id: 'find-files', label: 'Find Files', description: 'Search for files by name pattern', category: 'Files', icon: <Terminal size={13} />, action: 'find . -name "*.js"', keywords: ['find', 'search', 'glob', 'pattern'] },

  // Text Processing
  { id: 'grep-search', label: 'Search in Files', description: 'Grep for a pattern inside files', category: 'Text', icon: <Terminal size={13} />, action: 'grep', keywords: ['grep', 'search', 'find', 'text', 'pattern'] },
  { id: 'sort-file', label: 'Sort File', description: 'Sort lines of a file', category: 'Text', icon: <Terminal size={13} />, action: 'sort', keywords: ['sort', 'order', 'lines'] },
  { id: 'sed-replace', label: 'Find & Replace', description: 'Replace text in a file using sed', category: 'Text', icon: <Terminal size={13} />, action: 'sed "s/old/new/g"', keywords: ['sed', 'replace', 'substitute'] },
  { id: 'wc-count', label: 'Count Lines', description: 'Count lines, words, chars in a file', category: 'Text', icon: <Terminal size={13} />, action: 'wc', keywords: ['wc', 'count', 'lines', 'words'] },

  // Git Advanced
  { id: 'git-clean', label: 'Clean Untracked', description: 'Remove untracked files from working tree', category: 'Git Advanced', icon: <GitBranch size={13} />, action: 'git clean -n', keywords: ['clean', 'untracked', 'remove'] },
  { id: 'git-shortlog', label: 'Shortlog', description: 'Summarized commit log grouped by author', category: 'Git Advanced', icon: <GitBranch size={13} />, action: 'git shortlog -sn', keywords: ['shortlog', 'summary', 'author', 'count'] },
  { id: 'git-describe', label: 'Describe', description: 'Describe commit using most recent tag', category: 'Git Advanced', icon: <GitBranch size={13} />, action: 'git describe', keywords: ['describe', 'tag', 'version'] },
  { id: 'git-count', label: 'Count Objects', description: 'Count objects in the repository', category: 'Git Advanced', icon: <GitBranch size={13} />, action: 'git count-objects', keywords: ['count', 'objects', 'size'] },
  { id: 'git-fsck', label: 'Check Integrity', description: 'Verify repository health', category: 'Git Advanced', icon: <GitBranch size={13} />, action: 'git fsck', keywords: ['fsck', 'check', 'integrity', 'health'] },
  { id: 'git-gc', label: 'Garbage Collection', description: 'Optimize repository storage', category: 'Git Advanced', icon: <GitBranch size={13} />, action: 'git gc', keywords: ['gc', 'garbage', 'optimize', 'prune'] },

  // Shell
  { id: 'alias', label: 'Create Alias', description: 'Create a command shortcut', category: 'Shell', icon: <Terminal size={13} />, action: 'alias', keywords: ['alias', 'shortcut', 'abbreviation'] },
  { id: 'env', label: 'Environment', description: 'Show environment variables', category: 'Shell', icon: <Terminal size={13} />, action: 'env', keywords: ['env', 'environment', 'variables'] },
  { id: 'man', label: 'Manual Page', description: 'Show manual for a command', category: 'Shell', icon: <BookOpen size={13} />, action: 'man git', keywords: ['man', 'manual', 'help', 'docs'] },
  { id: 'clear', label: 'Clear Terminal', description: 'Clear all terminal output', category: 'Shell', icon: <Terminal size={13} />, action: 'clear', keywords: ['clear', 'clean', 'reset'] },
  { id: 'help', label: 'Show Help', description: 'Display all available commands', category: 'Shell', icon: <BookOpen size={13} />, action: 'help', keywords: ['help', 'commands', 'usage'] },
];

export default function CommandPalette({ isOpen, onClose, onExecute }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredItems = PALETTE_ITEMS.filter(item => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.keywords.some(k => k.includes(q)) ||
      item.action.toLowerCase().includes(q)
    );
  });

  // Group by category
  const groupedItems: { category: string; items: PaletteItem[] }[] = [];
  const seenCategories = new Set<string>();
  for (const item of filteredItems) {
    if (!seenCategories.has(item.category)) {
      seenCategories.add(item.category);
      groupedItems.push({
        category: item.category,
        items: filteredItems.filter(i => i.category === item.category),
      });
    }
  }

  const flatItems = filteredItems;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(flatItems.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatItems[selectedIndex];
      if (item) {
        onExecute(item.action);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#161b22] border border-gray-700 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          <Search size={16} className="text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, actions, workflows..."
            className="flex-1 bg-transparent text-sm text-gray-200 outline-none placeholder-gray-600"
          />
          <kbd className="text-[9px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded border border-gray-700 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
          {flatItems.length === 0 ? (
            <div className="py-8 text-center text-gray-600 text-xs">
              No commands match your search
            </div>
          ) : (
            groupedItems.map(group => (
              <div key={group.category}>
                <div className="px-4 py-1.5 text-[9px] font-bold text-gray-600 uppercase tracking-widest bg-[#0d1117]/50">
                  {group.category}
                </div>
                {group.items.map(item => {
                  const globalIdx = flatItems.indexOf(item);
                  const isSelected = globalIdx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-green-900/20 border-l-2 border-green-500'
                          : 'border-l-2 border-transparent hover:bg-gray-800/30'
                      }`}
                      onClick={() => {
                        onExecute(item.action);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                    >
                      <span className={`shrink-0 ${isSelected ? 'text-green-400' : 'text-gray-600'}`}>
                        {item.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-semibold ${isSelected ? 'text-green-400' : 'text-gray-300'}`}>
                          {item.label}
                        </span>
                        <p className="text-[10px] text-gray-600 truncate mt-0.5">{item.description}</p>
                      </div>
                      <code className="text-[9px] font-mono text-gray-700 bg-gray-900 px-1.5 py-0.5 rounded truncate max-w-[160px]">
                        {item.action}
                      </code>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-800 bg-[#0d1117]/50">
          <div className="flex items-center gap-1 text-[9px] text-gray-600">
            <kbd className="bg-gray-800 text-gray-500 px-1 py-0.5 rounded border border-gray-700 font-mono">↑↓</kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-gray-600">
            <kbd className="bg-gray-800 text-gray-500 px-1 py-0.5 rounded border border-gray-700 font-mono">Enter</kbd>
            <span>Execute</span>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-gray-600">
            <kbd className="bg-gray-800 text-gray-500 px-1 py-0.5 rounded border border-gray-700 font-mono">Esc</kbd>
            <span>Close</span>
          </div>
          <span className="text-[9px] text-gray-700 ml-auto">{flatItems.length} commands</span>
        </div>
      </div>
    </div>
  );
}
