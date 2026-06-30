import { useState } from 'react';
import { 
  ArrowRight, 
  ArrowLeft, 
  Info, 
  Layers, 
  HelpCircle, 
  GitPullRequest, 
  Database, 
  Globe, 
  FileText 
} from 'lucide-react';

interface CommandInfo {
  command: string;
  from: string;
  to: string;
  direction: 'right' | 'left' | 'both';
  description: string;
  details: string[];
  example: string;
}

const LIFECYCLE_COMMANDS: CommandInfo[] = [
  {
    command: 'git add',
    from: 'Working Directory',
    to: 'Staging Area',
    direction: 'right',
    description: 'Stages modifications or newly created untracked files, preparing them to be committed.',
    details: [
      'Creates a snapshot blob of the file content.',
      'Updates the Git Index file with file path and blob hash.',
      'Use "git add ." to stage everything, or "git add -p" to stage files line-by-line (hunks).'
    ],
    example: 'git add index.js'
  },
  {
    command: 'git commit',
    from: 'Staging Area',
    to: 'Local Repository',
    direction: 'right',
    description: 'Saves the staged snapshot as a permanent revision history record (commit object).',
    details: [
      'Generates a unique 40-character SHA-1/SHA-256 commit hash.',
      'Records author, timestamp, parent commit, and files tree snapshot.',
      'Use "--amend" to replace the latest commit instead of creating a new one.'
    ],
    example: 'git commit -m "feat: add secure auth"'
  },
  {
    command: 'git checkout',
    from: 'Local Repository',
    to: 'Working Directory',
    direction: 'left',
    description: 'Updates files in the working directory to match the version in the index or specified commit/branch.',
    details: [
      'Moves the HEAD pointer to point to the selected branch or commit hash.',
      'Clears the staging area of unstaged differences when switching branch.',
      'Can also restore individual files with "git checkout <commit> -- <file>".'
    ],
    example: 'git checkout feature-login'
  },
  {
    command: 'git restore',
    from: 'Staging Area',
    to: 'Working Directory',
    direction: 'left',
    description: 'Discards local uncommitted changes or unstages files.',
    details: [
      'Use "--staged" to copy files from HEAD back into the staging area (unstaging).',
      'Use without flags to copy from the staging area/HEAD to the working directory (discarding local changes).'
    ],
    example: 'git restore --staged README.md'
  },
  {
    command: 'git push',
    from: 'Local Repository',
    to: 'Remote Repository',
    direction: 'right',
    description: 'Uploads local branch commits to the remote repository, updating remote-tracking branches.',
    details: [
      'Transfers objects (commits, trees, blobs) to the remote server.',
      'Updates the remote reference pointer to match your local pointer.',
      'Use "-u" (or "--set-upstream") to link your local branch to the remote branch.'
    ],
    example: 'git push -u origin main'
  },
  {
    command: 'git fetch',
    from: 'Remote Repository',
    to: 'Local Repository',
    direction: 'left',
    description: 'Downloads commits, files, and refs from a remote repository without merging them into your working files.',
    details: [
      'Keeps your remote-tracking references (like origin/main) perfectly updated.',
      'Completely safe: does not modify your current working branch or files.',
      'Always run before rebase or merge workflows.'
    ],
    example: 'git fetch origin'
  },
  {
    command: 'git pull',
    from: 'Remote Repository',
    to: 'Working Directory',
    direction: 'left',
    description: 'Fetches commits from the remote repository and immediately integrates/merges them into your active branch.',
    details: [
      'Effectively combines "git fetch" followed by "git merge".',
      'Can cause merge conflicts if remote changes overlap with uncommitted local work.',
      'Use "git pull --rebase" to fetch and linearize history instead.'
    ],
    example: 'git pull origin main'
  },
  {
    command: 'git stash',
    from: 'Working Directory',
    to: 'Stash Storage',
    direction: 'both',
    description: 'Saves your dirty working directory state and index state temporarily, resetting to clean HEAD.',
    details: [
      'Pushes your current uncommitted changes onto a local stash stack.',
      'Use "git stash pop" to apply and remove the latest stashed change.',
      'Use "git stash list" to inspect all stashed work states.'
    ],
    example: 'git stash save "WIP backend"'
  }
];

const GLOSSARY_ITEMS = [
  {
    term: 'HEAD Pointer',
    definition: 'An active reference pointer telling Git which commit or branch you are currently working on. It acts as the "You are here" label in your commit history.',
    context: 'Points to a branch ref (e.g., refs/heads/main) or directly to a commit hash (Detached HEAD).'
  },
  {
    term: 'Detached HEAD',
    definition: 'A state where HEAD points directly to a specific commit hash rather than a named branch. Any new commits made here will not belong to any branch and can easily be lost.',
    context: 'Triggered by "git checkout <commit-hash>". Safely recover by creating a new branch.'
  },
  {
    term: 'Index / Staging Area',
    definition: 'A crucial intermediate buffer file where Git stores snapshots of your changes before they are bundled into a formal commit. It allows fine-grained control over what goes into your next save-point.',
    context: 'Files are placed here using "git add" and saved to history via "git commit".'
  },
  {
    term: 'Rebase vs Merge',
    definition: 'Merge joins two branches by creating a special "Merge Commit" with two parents, preserving complete chronological truth. Rebase replays your commits sequentially on top of another base, creating a perfectly linear history.',
    context: 'Rebase rewrites commit hashes (since timestamps/parents change), while Merge keeps original hashes intact.'
  },
  {
    term: 'Fast-Forward Merge',
    definition: 'A type of merge that occurs when there have been no new commits on the base branch since the feature branch split off. Git simply moves the branch pointer forward without creating a merge commit.',
    context: 'Can be prevented by using "git merge --no-ff" if you wish to enforce a merge commit history.'
  },
  {
    term: 'Origin',
    definition: 'The default alias name Git assigns to the remote repository from which your local repository was originally cloned or set up.',
    context: 'Configure or view remotes using the "git remote -v" command.'
  }
];

export default function LifecycleMap() {
  const [selectedCommand, setSelectedCommand] = useState<CommandInfo | null>(LIFECYCLE_COMMANDS[0]);
  const [activeSubTab, setActiveSubTab] = useState<'map' | 'glossary'>('map');

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-3.5 space-y-4 bg-[#0d1117]">
      {/* Tab select */}
      <div className="flex gap-1 bg-[#161b22] p-1 rounded-lg shrink-0">
        <button
          onClick={() => setActiveSubTab('map')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold rounded-md transition-all ${
            activeSubTab === 'map'
              ? 'bg-[#1f2937] text-green-400 shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Layers size={12} />
          Lifecycle Map
        </button>
        <button
          onClick={() => setActiveSubTab('glossary')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold rounded-md transition-all ${
            activeSubTab === 'glossary'
              ? 'bg-[#1f2937] text-green-400 shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <HelpCircle size={12} />
          Git Concepts
        </button>
      </div>

      {activeSubTab === 'map' ? (
        <div className="space-y-4">
          {/* Visual Diagram */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Git Areas Workflow</span>
            
            <div className="grid grid-cols-4 gap-1 bg-[#090d13] p-2.5 rounded-xl border border-gray-800 text-center">
              {/* Working Directory */}
              <div className="p-2 rounded-lg bg-red-950/10 border border-red-900/30">
                <FileText size={16} className="mx-auto text-red-400 mb-1" />
                <span className="text-[9px] font-bold text-red-400 block">Working Dir</span>
                <span className="text-[8px] text-gray-500 block">Unsaved Files</span>
              </div>

              {/* Staging Area */}
              <div className="p-2 rounded-lg bg-green-950/10 border border-green-900/30">
                <Layers size={16} className="mx-auto text-green-400 mb-1" />
                <span className="text-[9px] font-bold text-green-400 block">Staging (Index)</span>
                <span className="text-[8px] text-gray-500 block">Pre-Commit</span>
              </div>

              {/* Local Repo */}
              <div className="p-2 rounded-lg bg-purple-950/10 border border-purple-900/30">
                <Database size={16} className="mx-auto text-purple-400 mb-1" />
                <span className="text-[9px] font-bold text-purple-400 block">Local Repo</span>
                <span className="text-[8px] text-gray-500 block">Commits (HEAD)</span>
              </div>

              {/* Remote Repo */}
              <div className="p-2 rounded-lg bg-blue-950/10 border border-blue-900/30">
                <Globe size={16} className="mx-auto text-blue-400 mb-1" />
                <span className="text-[9px] font-bold text-blue-400 block">Remote Repo</span>
                <span className="text-[8px] text-gray-500 block">GitHub / GitLab</span>
              </div>
            </div>
          </div>

          {/* Flow Directions indicator */}
          {selectedCommand && (
            <div className="p-3 bg-gray-900/40 rounded-xl border border-gray-800 flex items-center justify-center gap-3">
              <span className="text-xs font-mono font-bold text-gray-400">{selectedCommand.from}</span>
              {selectedCommand.direction === 'right' ? (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono text-green-400 font-bold">{selectedCommand.command}</span>
                  <ArrowRight size={14} className="text-green-400 animate-gentle-pulse" />
                </div>
              ) : selectedCommand.direction === 'left' ? (
                <div className="flex items-center gap-1">
                  <ArrowLeft size={14} className="text-blue-400 animate-gentle-pulse" />
                  <span className="text-[10px] font-mono text-blue-400 font-bold">{selectedCommand.command}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <ArrowLeft size={12} className="text-amber-400" />
                  <span className="text-[10px] font-mono text-amber-400 font-bold">{selectedCommand.command}</span>
                  <ArrowRight size={12} className="text-amber-400" />
                </div>
              )}
              <span className="text-xs font-mono font-bold text-gray-400">{selectedCommand.to}</span>
            </div>
          )}

          {/* Interactive Command Selector Grid */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Interactive Command Lifecycle</span>
            <div className="grid grid-cols-2 gap-1.5">
              {LIFECYCLE_COMMANDS.map(cmd => {
                const isSelected = selectedCommand?.command === cmd.command;
                return (
                  <button
                    key={cmd.command}
                    onClick={() => setSelectedCommand(cmd)}
                    className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-green-950/20 border-green-700/60 text-green-400 shadow-md shadow-green-950/10 font-bold'
                        : 'bg-[#161b22]/40 border-gray-800 hover:border-gray-700 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span className="font-mono text-xs">{cmd.command}</span>
                    <Info size={11} className={isSelected ? 'text-green-400' : 'text-gray-600'} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Explainer Panel Card */}
          {selectedCommand && (
            <div className="p-4 rounded-xl border border-gray-800 bg-[#161b22]/40 space-y-3.5">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-green-400">Deep Explainer</span>
                <h3 className="text-sm font-bold text-gray-100 font-mono mt-0.5">{selectedCommand.command}</h3>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{selectedCommand.description}</p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Internal mechanics:</span>
                <ul className="space-y-1.5 pl-1.5">
                  {selectedCommand.details.map((detail, idx) => (
                    <li key={idx} className="text-[10.5px] text-gray-400 flex items-start gap-1.5 leading-relaxed">
                      <span className="text-green-500 font-bold select-none mt-0.5">✓</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1 bg-[#090d13] p-2.5 rounded-lg border border-gray-850 font-mono text-[10.5px]">
                <span className="text-[8.5px] font-bold text-gray-600 uppercase block">Practical Example:</span>
                <span className="text-green-400">$ <span className="text-gray-300">{selectedCommand.example}</span></span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <GitPullRequest size={13} className="text-green-400" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Concept Glossary</span>
          </div>

          <div className="space-y-3.5">
            {GLOSSARY_ITEMS.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-gray-850 bg-[#161b22]/30 space-y-1.5">
                <h4 className="text-xs font-bold text-green-400 font-mono">{item.term}</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">{item.definition}</p>
                <div className="text-[9.5px] text-gray-600 bg-gray-900/40 px-2 py-1 rounded border border-gray-850 font-medium">
                  💡 {item.context}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
