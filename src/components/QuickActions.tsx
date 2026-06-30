import { GitState } from '../engine/types';

interface QuickActionsProps {
  state: GitState;
  onCommand: (cmd: string) => void;
}

interface Workflow {
  name: string;
  icon: string;
  description: string;
  commands: string[];
}

const WORKFLOWS: Workflow[] = [
  {
    name: 'Quick Start',
    icon: '🚀',
    description: 'Initialize and create first commit',
    commands: [
      'git init',
      'touch README.md',
      'echo "# My Project" > README.md',
      'git add .',
      'git commit -m "Initial commit"',
    ],
  },
  {
    name: 'Feature Branch',
    icon: '🌿',
    description: 'Create and work on a feature branch',
    commands: [
      'git checkout -b feature/new-feature',
      'touch feature.js',
      'echo "// New feature code" > feature.js',
      'git add .',
      'git commit -m "Add new feature"',
      'git checkout main',
      'git merge feature/new-feature',
    ],
  },
  {
    name: 'Stash Workflow',
    icon: '📦',
    description: 'Save and restore work in progress',
    commands: [
      'touch work-in-progress.txt',
      'echo "WIP content" > work-in-progress.txt',
      'git add .',
      'git stash -m "WIP: saving progress"',
      'git stash list',
      'git stash pop',
    ],
  },
  {
    name: 'Undo Changes',
    icon: '↩️',
    description: 'Reset and revert commits',
    commands: [
      'touch oops.txt',
      'echo "mistake" > oops.txt',
      'git add .',
      'git commit -m "Oops, wrong commit"',
      'git revert HEAD',
      'git log --oneline',
    ],
  },
  {
    name: 'Remote Setup',
    icon: '🌐',
    description: 'Configure remote and push',
    commands: [
      'git remote add origin https://github.com/user/repo.git',
      'git remote -v',
      'git push -u origin main',
    ],
  },
  {
    name: 'Tagging',
    icon: '🏷️',
    description: 'Create and manage tags',
    commands: [
      'git tag v1.0.0',
      'git tag -a v1.1.0 -m "Release 1.1"',
      'git tag',
      'git show v1.0.0',
    ],
  },
];

export default function QuickActions({ state, onCommand }: QuickActionsProps) {
  const executeWorkflow = (workflow: Workflow) => {
    workflow.commands.forEach((cmd, i) => {
      setTimeout(() => {
        onCommand(cmd);
      }, i * 400);
    });
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-3 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">⚡</span>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick Workflows</span>
      </div>

      {WORKFLOWS.map((workflow) => {
        // Determine if workflow is applicable
        const needsInit = !state.initialized && workflow.commands[0] !== 'git init';
        const needsCommits = workflow.name !== 'Quick Start' && Object.keys(state.commits).length === 0;
        const isDisabled = needsInit || (needsCommits && workflow.name !== 'Quick Start' && workflow.commands[0] !== 'git init');

        return (
          <button
            key={workflow.name}
            onClick={() => executeWorkflow(workflow)}
            disabled={isDisabled}
            className={`w-full text-left p-3 rounded-xl border transition-all duration-200 group ${
              isDisabled
                ? 'border-gray-800 bg-gray-900/30 opacity-50 cursor-not-allowed'
                : 'border-gray-800 bg-[#1a1e2e] hover:border-blue-700/50 hover:bg-[#1e2338] cursor-pointer hover:shadow-lg hover:shadow-blue-900/10'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{workflow.icon}</span>
              <span className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors">
                {workflow.name}
              </span>
            </div>
            <p className="text-[10px] text-gray-500 mb-2 ml-6">
              {workflow.description}
            </p>
            <div className="ml-6 space-y-0.5">
              {workflow.commands.slice(0, 3).map((cmd, i) => (
                <div key={i} className="text-[10px] font-mono text-gray-600 truncate">
                  <span className="text-gray-700">$</span> {cmd}
                </div>
              ))}
              {workflow.commands.length > 3 && (
                <div className="text-[10px] text-gray-700">
                  +{workflow.commands.length - 3} more commands...
                </div>
              )}
            </div>
          </button>
        );
      })}

      {/* Common single commands */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">🔧</span>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick Commands</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { cmd: 'git status', label: 'Status', icon: '📊' },
            { cmd: 'git log --oneline', label: 'Log', icon: '📜' },
            { cmd: 'git diff', label: 'Diff', icon: '🔍' },
            { cmd: 'git branch -v', label: 'Branches', icon: '🌿' },
            { cmd: 'ls', label: 'List Files', icon: '📁' },
            { cmd: 'git stash list', label: 'Stashes', icon: '📦' },
            { cmd: 'git reflog', label: 'Reflog', icon: '🔄' },
            { cmd: 'help', label: 'Help', icon: '❓' },
          ].map(({ cmd, label, icon }) => (
            <button
              key={cmd}
              onClick={() => onCommand(cmd)}
              disabled={!state.initialized && cmd.startsWith('git') && cmd !== 'git init'}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-gray-800 bg-[#161b22] hover:bg-gray-800 hover:border-gray-700 transition-all text-xs text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="text-xs">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
