import { useState, useEffect } from 'react';
import { GitState } from '../engine/types';
import { Save, FilePlus, Code, Trash2 } from 'lucide-react';

interface FileEditorProps {
  state: GitState;
  onSave: (path: string, content: string) => void;
  onDelete: (path: string) => void;
}

export default function FileEditor({ state, onSave, onDelete }: FileEditorProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (selectedFile !== null) {
      setContent(state.workingDirectory[selectedFile] || '');
    } else {
      setContent('');
    }
  }, [selectedFile, state.workingDirectory]);

  const handleSave = () => {
    if (!selectedFile) return;
    onSave(selectedFile, content);
  };

  const handleCreateFile = () => {
    if (!newFileName.trim()) return;
    const path = newFileName.trim();
    onSave(path, '');
    setSelectedFile(path);
    setNewFileName('');
    setIsCreating(false);
  };

  const handleDelete = (path: string) => {
    if (confirm(`Are you sure you want to delete ${path}?`)) {
      onDelete(path);
      if (selectedFile === path) {
        setSelectedFile(null);
      }
    }
  };

  const files = Object.keys(state.workingDirectory);

  if (!state.initialized) return null;

  return (
    <div className="bg-[#0d1117] border border-gray-800/80 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#161b22] border-b border-gray-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <Code size={14} className="text-green-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">File Sandbox Editor</span>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1 text-[10px] bg-green-600/25 hover:bg-green-600/40 text-green-400 px-2 py-1 rounded transition-colors"
        >
          <FilePlus size={10} />
          New File
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-1/3 border-r border-gray-800/80 bg-[#0d1117]/80 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {files.map(path => {
            const isSelected = selectedFile === path;
            return (
              <div
                key={path}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                  isSelected ? 'bg-gray-800/60' : 'hover:bg-gray-800/30'
                }`}
                onClick={() => setSelectedFile(path)}
              >
                <span className="text-xs font-mono text-gray-300 truncate max-w-[120px]">
                  📄 {path}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(path);
                  }}
                  className="text-gray-600 hover:text-red-400 p-0.5 rounded transition-colors"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            );
          })}

          {files.length === 0 && !isCreating && (
            <p className="text-[11px] text-gray-500 text-center py-6">No files created yet.</p>
          )}

          {isCreating && (
            <div className="p-2 border border-green-800/50 rounded-lg bg-green-950/10 space-y-2 mt-1">
              <input
                type="text"
                placeholder="file.txt"
                value={newFileName}
                onChange={e => setNewFileName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 text-xs px-2 py-1.5 rounded text-gray-300 outline-none"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateFile();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
              />
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-[10px] text-gray-500 hover:text-gray-300 px-1.5 py-0.5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFile}
                  className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded"
                >
                  Create
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Editor workspace */}
        <div className="flex-1 bg-[#090d13] flex flex-col min-w-0">
          {selectedFile ? (
            <>
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#0d1117] border-b border-gray-800/80">
                <span className="text-[11px] font-mono text-gray-400 truncate">{selectedFile}</span>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                >
                  <Save size={10} />
                  Save
                </button>
              </div>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                className="flex-1 bg-[#090d13] p-3 text-xs font-mono text-gray-300 outline-none resize-none custom-scrollbar"
                placeholder="Write file content here..."
                spellCheck={false}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4 text-center">
              <p className="text-xs">Select or create a file to start editing visually</p>
              <p className="text-[10px] text-gray-600 mt-1">Changes are saved to the current working directory</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
