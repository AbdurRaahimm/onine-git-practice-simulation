import { GitState } from '../engine/types';

interface StatsDashboardProps {
  state: GitState;
  commandHistory: string[];
  unlockedAchievements: number;
  totalAchievements: number;
  isDarkMode: boolean;
}

export default function StatsDashboard({
  state,
  commandHistory,
  unlockedAchievements,
  totalAchievements,
  isDarkMode,
}: StatsDashboardProps) {
  // Compute stats
  const commitCount = Object.keys(state.commits).length;
  const branchCount = Object.values(state.branches).filter(b => !b.isRemote).length;
  const tagCount = Object.keys(state.tags).length;
  const remoteCount = Object.keys(state.remotes).length;
  const stashCount = state.stash.length;
  const commandCount = commandHistory.length;

  // Command frequency analysis
  const cmdFreq: Record<string, number> = {};
  commandHistory.forEach(cmd => {
    const parts = cmd.split(' ');
    const key = parts[0] === 'git' ? `git ${parts[1] || ''}`.trim() : parts[0];
    cmdFreq[key] = (cmdFreq[key] || 0) + 1;
  });
  const topCommands = Object.entries(cmdFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  // Unique files created
  const headCommit = (() => {
    if (state.detachedHead) return state.commits[state.HEAD] || null;
    const branch = state.branches[state.currentBranch];
    return branch ? state.commits[branch.commitHash] || null : null;
  })();
  const fileCount = headCommit ? Object.keys(headCommit.files).length : 0;
  const workingFileCount = Object.keys(state.workingDirectory).length;

  // Merge commits count
  const mergeCount = Object.values(state.commits).filter(c => c.parentHashes.length > 1).length;

  // Learning milestones
  const milestones = [
    { label: 'Repository Initialized', done: state.initialized, icon: '📁' },
    { label: 'First Commit Made', done: commitCount >= 1, icon: '💾' },
    { label: 'Branch Created', done: branchCount >= 2, icon: '🌿' },
    { label: 'Files Committed', done: fileCount >= 1, icon: '📄' },
    { label: 'Merge Performed', done: mergeCount >= 1, icon: '🤝' },
    { label: 'Tag Created', done: tagCount >= 1, icon: '🏷️' },
    { label: 'Remote Configured', done: remoteCount >= 1, icon: '🌐' },
    { label: 'Stash Used', done: stashCount >= 1 || commandHistory.some(h => h.startsWith('git stash')), icon: '📦' },
    { label: 'Rebase Performed', done: commandHistory.some(h => h.startsWith('git rebase')), icon: '🔄' },
    { label: '5+ Commits', done: commitCount >= 5, icon: '📈' },
    { label: '10+ Commands', done: commandCount >= 10, icon: '⚡' },
    { label: '50+ Commands', done: commandCount >= 50, icon: '🔥' },
  ];

  const milestonesDone = milestones.filter(m => m.done).length;
  const milestonePercent = Math.round((milestonesDone / milestones.length) * 100);

  const card = isDarkMode
    ? 'bg-[#161b22]/60 border-gray-800'
    : 'bg-white border-slate-200 shadow-sm';
  const textMain = isDarkMode ? 'text-gray-200' : 'text-slate-800';
  const textSub = isDarkMode ? 'text-gray-500' : 'text-slate-500';
  const textMuted = isDarkMode ? 'text-gray-600' : 'text-slate-400';
  const bgBar = isDarkMode ? 'bg-gray-800' : 'bg-slate-200';

  return (
    <div className={`h-full overflow-y-auto custom-scrollbar p-3.5 space-y-4 ${isDarkMode ? 'bg-[#0d1117]' : 'bg-[#f8fafc]'}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-sm">📊</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Learning Analytics</span>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Commits', value: commitCount, color: 'text-green-400', icon: '💾' },
          { label: 'Branches', value: branchCount, color: 'text-blue-400', icon: '🌿' },
          { label: 'Commands', value: commandCount, color: 'text-purple-400', icon: '⌨️' },
          { label: 'Files', value: workingFileCount, color: 'text-amber-400', icon: '📄' },
          { label: 'Tags', value: tagCount, color: 'text-pink-400', icon: '🏷️' },
          { label: 'Stashes', value: stashCount, color: 'text-cyan-400', icon: '📦' },
        ].map(stat => (
          <div key={stat.label} className={`p-2.5 rounded-xl border ${card}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs">{stat.icon}</span>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${textMuted}`}>{stat.label}</span>
            </div>
            <span className={`text-lg font-black ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Achievement Progress */}
      <div className={`p-3.5 rounded-xl border ${card}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${textSub}`}>Achievements</span>
          <span className="text-xs font-mono text-green-400">{unlockedAchievements}/{totalAchievements}</span>
        </div>
        <div className={`h-2 rounded-full overflow-hidden ${bgBar}`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
            style={{ width: `${totalAchievements > 0 ? (unlockedAchievements / totalAchievements) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Top Commands Frequency */}
      {topCommands.length > 0 && (
        <div className={`p-3.5 rounded-xl border ${card}`}>
          <span className={`text-[10px] font-bold uppercase tracking-wider block mb-3 ${textSub}`}>
            Most Used Commands
          </span>
          <div className="space-y-2">
            {topCommands.map(([cmd, count]) => {
              const maxCount = topCommands[0][1];
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={cmd}>
                  <div className="flex items-center justify-between mb-0.5">
                    <code className={`text-[10px] font-mono ${textMain}`}>{cmd}</code>
                    <span className={`text-[10px] font-bold font-mono ${textMuted}`}>{count}x</span>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${bgBar}`}>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Learning Milestones */}
      <div className={`p-3.5 rounded-xl border ${card}`}>
        <div className="flex items-center justify-between mb-3">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${textSub}`}>Learning Milestones</span>
          <span className={`text-xs font-mono ${milestonePercent === 100 ? 'text-green-400' : 'text-gray-500'}`}>
            {milestonesDone}/{milestones.length}
          </span>
        </div>
        <div className={`h-1.5 rounded-full overflow-hidden mb-3 ${bgBar}`}>
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              milestonePercent === 100
                ? 'bg-gradient-to-r from-yellow-500 to-amber-400'
                : 'bg-gradient-to-r from-green-500 to-emerald-400'
            }`}
            style={{ width: `${milestonePercent}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {milestones.map(m => (
            <div
              key={m.label}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border ${
                m.done
                  ? isDarkMode
                    ? 'bg-green-950/20 border-green-800/40'
                    : 'bg-green-50 border-green-200'
                  : isDarkMode
                  ? 'bg-gray-900/20 border-gray-800/30'
                  : 'bg-slate-100 border-slate-200'
              }`}
            >
              <span className="text-[10px]">{m.done ? '✅' : m.icon}</span>
              <span className={`text-[9px] font-medium truncate ${m.done ? 'text-green-400' : textMuted}`}>
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Repository Health */}
      <div className={`p-3.5 rounded-xl border ${card}`}>
        <span className={`text-[10px] font-bold uppercase tracking-wider block mb-3 ${textSub}`}>
          Repository Health
        </span>
        <div className="space-y-2">
          {[
            { label: 'Clean Working Tree', ok: Object.keys(state.workingDirectory).length === 0 || Object.values(state.commits).length > 0 },
            { label: 'Has Remote', ok: remoteCount > 0 },
            { label: 'Multiple Branches', ok: branchCount >= 2 },
            { label: 'Tags Created', ok: tagCount > 0 },
            { label: 'No Detached HEAD', ok: !state.detachedHead },
          ].map(check => (
            <div key={check.label} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                check.ok ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-600'
              }`}>
                {check.ok ? '✓' : '·'}
              </div>
              <span className={`text-[10px] ${check.ok ? 'text-green-400' : textMuted}`}>{check.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
