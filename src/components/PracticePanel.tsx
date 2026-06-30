import { useState } from 'react';
import { GitState } from '../engine/types';
import { GIT_LEVELS, GitLevel } from '../engine/levels';
import { 
  Play, 
  CheckCircle, 
  HelpCircle, 
  Download, 
  Upload, 
  History, 
  Award, 
  Compass, 
  Terminal,
  Activity
} from 'lucide-react';

interface PracticePanelProps {
  state: GitState;
  onImportState: (state: GitState) => void;
  onRunCommand: (cmd: string) => void;
  commandHistory: string[];
}

export default function PracticePanel({ 
  state, 
  onImportState, 
  onRunCommand,
  commandHistory 
}: PracticePanelProps) {
  const [activeTab, setActiveTab] = useState<'levels' | 'history' | 'backup'>('levels');
  const [currentLevel, setCurrentLevel] = useState<GitLevel | null>(null);
  const [validationResult, setValidationResult] = useState<{ success: boolean; message: string } | null>(null);

  // Export state to JSON file
  const handleExport = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `gitsim-snapshot-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert('Failed to export state: ' + err);
    }
  };

  // Import state from JSON file
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (typeof parsed === 'object' && parsed !== null) {
          onImportState(parsed as GitState);
          alert('Git State Snapshot imported successfully!');
        } else {
          alert('Invalid Git State JSON format.');
        }
      } catch (err) {
        alert('Failed to parse Git State Snapshot: ' + err);
      }
    };
    reader.readAsText(file);
  };

  const handleVerifyLevel = () => {
    if (!currentLevel) return;
    const result = currentLevel.validate(state);
    setValidationResult(result);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Sub-tab Navigation */}
      <div className="flex border-b border-gray-800/80 shrink-0 bg-[#161b22]/50">
        {[
          { id: 'levels', label: 'Lessons', icon: <Compass size={13} /> },
          { id: 'history', label: 'History', icon: <History size={13} /> },
          { id: 'backup', label: 'Sync / Save', icon: <Activity size={13} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setValidationResult(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === tab.id
                ? 'text-green-400 border-green-400 bg-green-950/10'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {activeTab === 'levels' && (
          <div className="space-y-4">
            {!currentLevel ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Award size={14} className="text-amber-500" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Practice Challenges</span>
                </div>
                {GIT_LEVELS.map(level => (
                  <button
                    key={level.id}
                    onClick={() => {
                      setCurrentLevel(level);
                      setValidationResult(null);
                    }}
                    className="w-full text-left p-3.5 rounded-xl border border-gray-800/80 bg-[#161b22]/40 hover:bg-[#1e2433] hover:border-blue-800/40 transition-all flex flex-col gap-1 hover:shadow-lg hover:shadow-blue-950/10"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        level.difficulty === 'Beginner' ? 'bg-green-950 text-green-400' :
                        level.difficulty === 'Intermediate' ? 'bg-yellow-950 text-yellow-400' :
                        'bg-red-950 text-red-400'
                      }`}>
                        {level.difficulty}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">Goal-driven</span>
                    </div>
                    <span className="text-xs font-bold text-gray-200 mt-1">{level.title}</span>
                    <span className="text-[10px] text-gray-500">{level.subtitle}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Back button */}
                <button
                  onClick={() => {
                    setCurrentLevel(null);
                    setValidationResult(null);
                  }}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 bg-[#1a1e2e] px-2 py-1 rounded border border-gray-800"
                >
                  ← Back to Lessons
                </button>

                <div className="p-3.5 rounded-xl border border-gray-800/80 bg-[#161b22]/40 space-y-3">
                  <div>
                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{currentLevel.difficulty} Challenge</span>
                    <h3 className="text-sm font-bold text-gray-100">{currentLevel.title}</h3>
                    <p className="text-[11px] text-gray-500 mt-1">{currentLevel.description}</p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Objectives:</span>
                    <div className="bg-[#090d13] p-3 rounded-lg border border-gray-800 font-mono text-[11px] text-gray-300">
                      {currentLevel.goalDescription}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Suggested Steps:</span>
                    <ul className="space-y-1.5 pl-1.5">
                      {currentLevel.instructions.map((step, i) => (
                        <li key={i} className="text-[11px] text-gray-400 flex items-start gap-1.5">
                          <span className="text-green-500 shrink-0 mt-0.5">•</span>
                          <span className="font-mono bg-gray-900 px-1 py-0.5 rounded text-gray-300">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {currentLevel.hint && (
                    <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-900/30 flex items-start gap-2">
                      <HelpCircle size={14} className="text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-blue-300 leading-relaxed">{currentLevel.hint}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-gray-800/80">
                    <button
                      onClick={handleVerifyLevel}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      <CheckCircle size={14} />
                      Verify State
                    </button>
                  </div>

                  {/* Validation results */}
                  {validationResult && (
                    <div className={`p-3 rounded-xl border ${
                      validationResult.success 
                        ? 'bg-green-950/30 border-green-800 text-green-300' 
                        : 'bg-red-950/30 border-red-800 text-red-300'
                    } text-[11px] flex items-start gap-2.5`}>
                      <span className="text-base">{validationResult.success ? '🎉' : '❌'}</span>
                      <p className="leading-relaxed font-semibold">{validationResult.message}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Terminal size={14} className="text-gray-500" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Command Log</span>
            </div>
            
            {commandHistory.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">No commands run in this session yet.</p>
            ) : (
              <div className="space-y-1.5">
                {commandHistory.map((cmd, i) => (
                  <div 
                    key={i} 
                    onClick={() => onRunCommand(cmd)}
                    className="flex items-center justify-between p-2 rounded-lg border border-gray-800/60 bg-[#161b22]/20 hover:bg-[#1e2433] hover:border-green-800/30 transition-colors group cursor-pointer"
                  >
                    <span className="font-mono text-[11px] text-gray-300 truncate max-w-[180px]">
                      <span className="text-gray-600 mr-1">$</span> {cmd}
                    </span>
                    <button className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[9px] bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded font-mono font-bold transition-all">
                      <Play size={8} /> Run
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl border border-gray-800/80 bg-[#161b22]/40 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-gray-200">Export State Snapshot</h4>
                <p className="text-[10px] text-gray-500 mt-1">Save your currently simulated workspace repository structure and history locally on your computer.</p>
                <button
                  onClick={handleExport}
                  className="mt-3 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <Download size={13} />
                  Download Backup JSON
                </button>
              </div>

              <div className="border-t border-gray-800/80 pt-4">
                <h4 className="text-xs font-bold text-gray-200">Import Snapshot</h4>
                <p className="text-[10px] text-gray-500 mt-1">Load an exported snapshot file or custom scenarios to instantly recreate the visual Git graph.</p>
                <label className="mt-3 flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer w-fit border border-gray-700">
                  <Upload size={13} />
                  Select File
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
