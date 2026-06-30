import { X, Calendar, User, GitCommit as CommitIcon, FileText } from 'lucide-react';
import { GitCommit } from '../engine/types';
import { shortHash, formatTimestamp } from '../engine/utils';

interface CommitInspectorProps {
  commit: GitCommit | null;
  onClose: () => void;
  isDarkMode: boolean;
}

export default function CommitInspector({ commit, onClose, isDarkMode }: CommitInspectorProps) {
  if (!commit) return null;

  const fileEntries = Object.entries(commit.files);

  return (
    <div className={`fixed inset-y-0 right-0 w-96 z-50 shadow-2xl flex flex-col border-l transition-all duration-300 ${
      isDarkMode 
        ? 'bg-[#0d1117] border-gray-800 text-gray-200' 
        : 'bg-white border-gray-200 text-gray-800'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center gap-2">
          <CommitIcon size={16} className="text-green-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Commit Details</span>
        </div>
        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg transition-colors ${
            isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-900'
          }`}
        >
          <X size={16} />
        </button>
      </div>

      {/* Metadata */}
      <div className="p-4 space-y-3.5 border-b border-gray-800/50 shrink-0">
        <div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
            isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
          }`}>
            {shortHash(commit.hash)}
          </span>
          <h3 className="text-sm font-bold mt-2 leading-snug">{commit.message}</h3>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <User size={13} />
            <span>Author: <strong className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{commit.author}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar size={13} />
            <span className="truncate">{formatTimestamp(commit.timestamp)}</span>
          </div>
        </div>
      </div>

      {/* Files Snapshot inside Commit */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        <div>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Committed Files ({fileEntries.length})</span>
          
          {fileEntries.length === 0 ? (
            <p className="text-xs text-gray-500 italic">Empty commit (no tracked files)</p>
          ) : (
            <div className="space-y-3">
              {fileEntries.map(([path, content]) => (
                <div 
                  key={path} 
                  className={`border rounded-xl overflow-hidden ${
                    isDarkMode ? 'border-gray-800 bg-[#090d13]' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 border-b text-xs font-mono font-semibold ${
                    isDarkMode ? 'border-gray-800 bg-gray-900/50 text-gray-400' : 'border-gray-200 bg-gray-100 text-gray-600'
                  }`}>
                    <FileText size={12} />
                    <span>{path}</span>
                  </div>
                  <pre className={`p-3 text-[10.5px] font-mono overflow-x-auto custom-scrollbar whitespace-pre-wrap leading-relaxed ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {content || <span className="italic opacity-40">No content (empty file)</span>}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
