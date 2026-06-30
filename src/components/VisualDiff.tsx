import { GitState } from '../engine/types';
import { diffStrings } from '../engine/utils';
import { Code, CornerDownRight } from 'lucide-react';

interface VisualDiffProps {
  state: GitState;
}

export default function VisualDiff({ state }: VisualDiffProps) {
  if (!state.initialized) {
    return null;
  }

  const headCommit = (() => {
    if (state.detachedHead) {
      return state.commits[state.HEAD] || null;
    }
    const branch = state.branches[state.currentBranch];
    if (!branch) return null;
    return state.commits[branch.commitHash] || null;
  })();

  const committedFiles = headCommit?.files || {};
  
  // Find modified files
  const modifiedFiles: { path: string; oldContent: string; newContent: string; status: 'modified' | 'untracked' | 'deleted' }[] = [];

  // 1. Modified & Untracked
  for (const [path, content] of Object.entries(state.workingDirectory)) {
    const committedContent = committedFiles[path];
    const stagedContent = state.stagingArea[path];
    const compareWith = stagedContent !== undefined ? stagedContent : committedContent;

    if (compareWith === undefined) {
      modifiedFiles.push({
        path,
        oldContent: '',
        newContent: content,
        status: 'untracked',
      });
    } else if (compareWith !== '__DELETED__' && content !== compareWith) {
      modifiedFiles.push({
        path,
        oldContent: compareWith,
        newContent: content,
        status: 'modified',
      });
    }
  }

  // 2. Deleted files
  for (const path of Object.keys(committedFiles)) {
    if (state.workingDirectory[path] === undefined && state.stagingArea[path] !== '__DELETED__') {
      modifiedFiles.push({
        path,
        oldContent: committedFiles[path],
        newContent: '',
        status: 'deleted',
      });
    }
  }

  if (modifiedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center border border-gray-800 mb-3 text-lg">
          ✨
        </div>
        <p className="text-xs font-semibold text-gray-400">Working tree clean</p>
        <p className="text-[10px] text-gray-600 mt-1">No unstaged file modifications detected in your directory.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-3.5 space-y-4">
      <div className="flex items-center gap-2 mb-1 shrink-0">
        <Code size={14} className="text-gray-400" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Unstaged Visual Diff</span>
      </div>

      <div className="space-y-4">
        {modifiedFiles.map(file => {
          const diffLines = diffStrings(file.oldContent, file.newContent);

          return (
            <div key={file.path} className="border border-gray-800/80 rounded-xl overflow-hidden bg-[#090d13]">
              {/* Header */}
              <div className="flex items-center justify-between px-3.5 py-2 bg-[#161b22] border-b border-gray-800/80">
                <div className="flex items-center gap-1.5 min-w-0">
                  <CornerDownRight size={12} className="text-gray-500 shrink-0" />
                  <span className="text-xs font-mono font-bold text-gray-300 truncate">{file.path}</span>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  file.status === 'untracked' ? 'bg-gray-800 text-gray-400' :
                  file.status === 'deleted' ? 'bg-red-950 text-red-400' :
                  'bg-yellow-950 text-yellow-400'
                }`}>
                  {file.status}
                </span>
              </div>

              {/* Code comparison lines */}
              <div className="p-3 font-mono text-[11px] leading-relaxed overflow-x-auto custom-scrollbar whitespace-pre">
                {diffLines.length === 0 ? (
                  <div className="text-gray-600 italic">No content changes</div>
                ) : (
                  diffLines.map((line, idx) => {
                    const isAdded = line.startsWith('+');
                    const isRemoved = line.startsWith('-');
                    
                    return (
                      <div
                        key={idx}
                        className={`flex gap-3 px-1.5 py-0.5 -mx-3 ${
                          isAdded ? 'bg-green-950/20 text-green-400' :
                          isRemoved ? 'bg-red-950/20 text-red-400' :
                          'text-gray-400'
                        }`}
                      >
                        <span className="w-5 select-none text-right shrink-0 opacity-40 font-semibold">
                          {isAdded ? '+' : isRemoved ? '-' : ' '}
                        </span>
                        <span className="break-all whitespace-pre">{line.substring(1)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
