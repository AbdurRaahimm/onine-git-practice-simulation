import { GitState } from '../engine/types';
import { shortHash } from '../engine/utils';
import { GitBranch, Tag, Globe, Archive } from 'lucide-react';

interface BranchPanelProps {
  state: GitState;
}

export default function BranchPanel({ state }: BranchPanelProps) {
  if (!state.initialized) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 p-4">
        <div className="text-center">
          <GitBranch size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No repository</p>
        </div>
      </div>
    );
  }

  const localBranches = Object.values(state.branches).filter(b => !b.isRemote);
  const remoteBranches = Object.values(state.branches).filter(b => b.isRemote);
  const tags = Object.values(state.tags);
  const remotes = Object.values(state.remotes);
  const stashCount = state.stash.length;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-3 space-y-5">
      {/* HEAD */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <span className="text-[10px]">⭐</span>
          </div>
          <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">HEAD</span>
        </div>
        <div className="bg-[#1a1e2e] rounded-lg p-2.5 border border-gray-800">
          {state.detachedHead ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400 font-mono">DETACHED</span>
              <span className="text-xs text-gray-500">@</span>
              <span className="text-xs text-gray-400 font-mono">{shortHash(state.HEAD)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <GitBranch size={12} className="text-green-400" />
              <span className="text-xs text-green-400 font-mono font-bold">{state.currentBranch}</span>
            </div>
          )}
        </div>
      </div>

      {/* Local Branches */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <GitBranch size={14} className="text-blue-400" />
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
            Branches ({localBranches.length})
          </span>
        </div>
        <div className="space-y-1">
          {localBranches.map(branch => {
            const isCurrent = branch.name === state.currentBranch && !state.detachedHead;
            const commit = state.commits[branch.commitHash];
            return (
              <div
                key={branch.name}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors ${
                  isCurrent 
                    ? 'bg-green-900/20 border border-green-800/50' 
                    : 'hover:bg-gray-800/50'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-green-400' : 'bg-gray-600'}`} />
                <span className={`text-xs font-mono flex-1 ${isCurrent ? 'text-green-400 font-bold' : 'text-gray-400'}`}>
                  {branch.name}
                </span>
                {commit && (
                  <span className="text-[10px] text-gray-600 font-mono">
                    {shortHash(commit.hash)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Remote Branches */}
      {remoteBranches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Globe size={14} className="text-purple-400" />
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              Remote ({remoteBranches.length})
            </span>
          </div>
          <div className="space-y-1">
            {remoteBranches.map(branch => (
              <div key={branch.name} className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-gray-800/50">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span className="text-xs font-mono text-purple-300">{branch.name}</span>
                <span className="text-[10px] text-gray-600 font-mono ml-auto">
                  {shortHash(branch.commitHash)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Tag size={14} className="text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Tags ({tags.length})
            </span>
          </div>
          <div className="space-y-1">
            {tags.map(tag => (
              <div key={tag.name} className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-gray-800/50">
                <span className="text-amber-500 text-xs">🏷</span>
                <span className="text-xs font-mono text-amber-300">{tag.name}</span>
                <span className="text-[10px] text-gray-600 font-mono ml-auto">
                  {shortHash(tag.commitHash)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remotes */}
      {remotes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Globe size={14} className="text-cyan-400" />
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              Remotes ({remotes.length})
            </span>
          </div>
          <div className="space-y-1">
            {remotes.map(remote => (
              <div key={remote.name} className="px-2.5 py-1.5 rounded hover:bg-gray-800/50">
                <span className="text-xs font-mono text-cyan-300">{remote.name}</span>
                <span className="text-[10px] text-gray-600 ml-2 break-all">{remote.url}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stash */}
      {stashCount > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Archive size={14} className="text-orange-400" />
            <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">
              Stash ({stashCount})
            </span>
          </div>
          <div className="space-y-1">
            {state.stash.map((entry, i) => (
              <div key={i} className="px-2.5 py-1.5 rounded hover:bg-gray-800/50">
                <span className="text-xs font-mono text-orange-300">stash@{`{${i}}`}</span>
                <p className="text-[10px] text-gray-500 mt-0.5 truncate">{entry.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
