import { GitState } from '../engine/types';
import { shortHash } from '../engine/utils';

interface StagingVisualProps {
  state: GitState;
}

export default function StagingVisual({ state }: StagingVisualProps) {
  if (!state.initialized) return null;

  const headCommit = (() => {
    if (state.detachedHead) return state.commits[state.HEAD] || null;
    const branch = state.branches[state.currentBranch];
    if (!branch) return null;
    return state.commits[branch.commitHash] || null;
  })();

  const committedFiles = headCommit?.files || {};
  const workingFiles = Object.keys(state.workingDirectory);
  const stagedFiles = Object.entries(state.stagingArea);
  
  // Calculate stats
  const untrackedCount = workingFiles.filter(f => 
    committedFiles[f] === undefined && state.stagingArea[f] === undefined
  ).length;
  
  const modifiedCount = workingFiles.filter(f => {
    const compare = state.stagingArea[f] !== undefined ? state.stagingArea[f] : committedFiles[f];
    return compare !== undefined && compare !== '__DELETED__' && state.workingDirectory[f] !== compare;
  }).length;

  const stagedCount = stagedFiles.length;
  const commitCount = Object.keys(state.commits).length;

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-[#0d1117] border-t border-gray-800">
      {/* Git Workflow Pipeline */}
      <div className="flex items-center gap-1 flex-1">
        {/* Working Directory */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1a1e2e] border border-gray-800">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-[10px] text-gray-400">Working</span>
          <span className={`text-[10px] font-bold ${workingFiles.length > 0 ? 'text-blue-400' : 'text-gray-600'}`}>
            {workingFiles.length}
          </span>
        </div>

        <span className="text-gray-700 text-xs">→</span>

        {/* Staging Area */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
          stagedCount > 0 
            ? 'bg-green-900/20 border-green-800/50' 
            : 'bg-[#1a1e2e] border-gray-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${stagedCount > 0 ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-[10px] text-gray-400">Staged</span>
          <span className={`text-[10px] font-bold ${stagedCount > 0 ? 'text-green-400' : 'text-gray-600'}`}>
            {stagedCount}
          </span>
        </div>

        <span className="text-gray-700 text-xs">→</span>

        {/* Repository */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1a1e2e] border border-gray-800">
          <div className="w-2 h-2 rounded-full bg-purple-400" />
          <span className="text-[10px] text-gray-400">Commits</span>
          <span className="text-[10px] font-bold text-purple-400">{commitCount}</span>
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-3">
        {untrackedCount > 0 && (
          <span className="text-[10px] text-gray-500">
            <span className="text-gray-400 font-bold">{untrackedCount}</span> untracked
          </span>
        )}
        {modifiedCount > 0 && (
          <span className="text-[10px] text-yellow-500">
            <span className="text-yellow-400 font-bold">{modifiedCount}</span> modified
          </span>
        )}
        {headCommit && (
          <span className="text-[10px] text-gray-600 font-mono">
            HEAD: {shortHash(headCommit.hash)}
          </span>
        )}
      </div>
    </div>
  );
}
