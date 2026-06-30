import { useState } from 'react';
import { AlertTriangle, CheckCircle, GitMerge } from 'lucide-react';

interface ConflictResolverProps {
  isDarkMode: boolean;
}

interface ConflictFile {
  name: string;
  oursContent: string;
  theirsContent: string;
  resolved: boolean;
  resolution: 'ours' | 'theirs' | 'manual' | null;
  manualContent: string;
}

const CONFLICT_SCENARIOS = [
  {
    name: 'Simple Line Conflict',
    description: 'Two branches modified the same line in a file differently.',
    file: {
      name: 'README.md',
      oursContent: '# Welcome to My Project\n\nThis is the main branch version.\nAll features are stable.',
      theirsContent: '# Welcome to My Project\n\nThis is the feature branch version.\nNew experimental features added!',
    },
  },
  {
    name: 'Multi-file Conflict',
    description: 'Multiple files have conflicting changes across branches.',
    file: {
      name: 'app.js',
      oursContent: 'const app = {\n  name: "MyApp",\n  version: "1.0.0",\n  port: 3000\n};\n\nmodule.exports = app;',
      theirsContent: 'const app = {\n  name: "MyApp",\n  version: "2.0.0-beta",\n  port: 8080,\n  debug: true\n};\n\nexport default app;',
    },
  },
  {
    name: 'Delete vs Modify Conflict',
    description: 'One branch deleted a file while the other modified it.',
    file: {
      name: 'config.json',
      oursContent: '{\n  "theme": "dark",\n  "language": "en",\n  "notifications": true\n}',
      theirsContent: '', // deleted
    },
  },
];

export default function ConflictResolver({ isDarkMode }: ConflictResolverProps) {
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);
  const [conflictState, setConflictState] = useState<ConflictFile | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const startScenario = (idx: number) => {
    const scenario = CONFLICT_SCENARIOS[idx];
    setSelectedScenario(idx);
    setConflictState({
      name: scenario.file.name,
      oursContent: scenario.file.oursContent,
      theirsContent: scenario.file.theirsContent,
      resolved: false,
      resolution: null,
      manualContent: generateConflictMarker(
        scenario.file.name,
        scenario.file.oursContent,
        scenario.file.theirsContent
      ),
    });
    setShowExplanation(false);
  };

  const resolveConflict = (resolution: 'ours' | 'theirs' | 'manual') => {
    if (!conflictState) return;
    setConflictState({
      ...conflictState,
      resolved: true,
      resolution,
    });
    setShowExplanation(true);
  };

  const card = isDarkMode ? 'bg-[#161b22]/60 border-gray-800' : 'bg-white border-slate-200 shadow-sm';
  const textMain = isDarkMode ? 'text-gray-200' : 'text-slate-800';
  const textSub = isDarkMode ? 'text-gray-500' : 'text-slate-500';
  const textMuted = isDarkMode ? 'text-gray-600' : 'text-slate-400';

  return (
    <div className={`h-full overflow-y-auto custom-scrollbar p-3.5 space-y-4 ${isDarkMode ? 'bg-[#0d1117]' : 'bg-[#f8fafc]'}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-amber-400" />
        <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Conflict Simulator</span>
      </div>

      <p className={`text-[10px] leading-relaxed ${textMuted}`}>
        Practice resolving merge conflicts safely. Choose a scenario below to simulate a real-world merge conflict and learn the resolution workflow.
      </p>

      {/* Scenario Selector */}
      {selectedScenario === null && (
        <div className="space-y-2">
          {CONFLICT_SCENARIOS.map((scenario, idx) => (
            <button
              key={idx}
              onClick={() => startScenario(idx)}
              className={`w-full text-left p-3.5 rounded-xl border ${card} hover:border-amber-700/50 hover:bg-amber-950/10 transition-all`}
            >
              <div className="flex items-center gap-2 mb-1">
                <GitMerge size={13} className="text-amber-400" />
                <span className={`text-xs font-bold ${textMain}`}>{scenario.name}</span>
              </div>
              <p className={`text-[10px] ${textMuted}`}>{scenario.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* Active Conflict Resolution */}
      {selectedScenario !== null && conflictState && (
        <div className="space-y-3">
          {/* Back button */}
          <button
            onClick={() => { setSelectedScenario(null); setConflictState(null); }}
            className={`text-xs ${textSub} hover:text-white flex items-center gap-1 px-2 py-1 rounded border ${isDarkMode ? 'border-gray-800 hover:bg-gray-800' : 'border-slate-200 hover:bg-slate-100'}`}
          >
            ← Back to scenarios
          </button>

          {/* Conflict Header */}
          <div className={`p-3 rounded-xl border ${conflictState.resolved ? 'bg-green-950/20 border-green-800/50' : 'bg-amber-950/20 border-amber-800/50'}`}>
            <div className="flex items-center gap-2">
              {conflictState.resolved ? (
                <CheckCircle size={14} className="text-green-400" />
              ) : (
                <AlertTriangle size={14} className="text-amber-400" />
              )}
              <span className={`text-xs font-bold ${conflictState.resolved ? 'text-green-400' : 'text-amber-400'}`}>
                {conflictState.resolved ? 'Conflict Resolved!' : `CONFLICT in ${conflictState.name}`}
              </span>
            </div>
          </div>

          {/* Conflict Markers View */}
          {!conflictState.resolved && (
            <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'border-gray-800' : 'border-slate-200'}`}>
              <div className={`px-3 py-1.5 text-[10px] font-mono font-bold border-b ${
                isDarkMode ? 'bg-gray-900 border-gray-800 text-gray-400' : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
                {conflictState.name}
              </div>
              <pre className={`p-3 text-[10.5px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap ${
                isDarkMode ? 'bg-[#090d13] text-gray-300' : 'bg-white text-slate-700'
              }`}>
                {conflictState.manualContent}
              </pre>
            </div>
          )}

          {/* Resolution Options */}
          {!conflictState.resolved && (
            <div className="space-y-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${textSub}`}>Resolution Strategy</span>
              
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => resolveConflict('ours')}
                  className={`p-3 rounded-xl border text-center transition-all hover:scale-[1.02] ${
                    isDarkMode ? 'bg-blue-950/20 border-blue-800/50 hover:border-blue-700' : 'bg-blue-50 border-blue-200 hover:border-blue-400'
                  }`}
                >
                  <span className="text-lg block mb-1">🔵</span>
                  <span className="text-[10px] font-bold text-blue-400 block">Keep Ours</span>
                  <span className={`text-[9px] ${textMuted} block mt-0.5`}>main branch version</span>
                </button>

                <button
                  onClick={() => resolveConflict('theirs')}
                  className={`p-3 rounded-xl border text-center transition-all hover:scale-[1.02] ${
                    isDarkMode ? 'bg-purple-950/20 border-purple-800/50 hover:border-purple-700' : 'bg-purple-50 border-purple-200 hover:border-purple-400'
                  }`}
                >
                  <span className="text-lg block mb-1">🟣</span>
                  <span className="text-[10px] font-bold text-purple-400 block">Keep Theirs</span>
                  <span className={`text-[9px] ${textMuted} block mt-0.5`}>feature branch version</span>
                </button>

                <button
                  onClick={() => resolveConflict('manual')}
                  className={`p-3 rounded-xl border text-center transition-all hover:scale-[1.02] ${
                    isDarkMode ? 'bg-amber-950/20 border-amber-800/50 hover:border-amber-700' : 'bg-amber-50 border-amber-200 hover:border-amber-400'
                  }`}
                >
                  <span className="text-lg block mb-1">✏️</span>
                  <span className="text-[10px] font-bold text-amber-400 block">Manual Edit</span>
                  <span className={`text-[9px] ${textMuted} block mt-0.5`}>merge both changes</span>
                </button>
              </div>
            </div>
          )}

          {/* Resolution Explanation */}
          {conflictState.resolved && showExplanation && (
            <div className="space-y-3">
              <div className={`p-3.5 rounded-xl border ${card} space-y-2`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${textSub}`}>
                  What happened:
                </span>
                {conflictState.resolution === 'ours' && (
                  <div className="space-y-2">
                    <p className={`text-[11px] leading-relaxed ${textMain}`}>
                      You chose <strong className="text-blue-400">--ours</strong> strategy. Git discarded the feature branch changes and kept the main branch version.
                    </p>
                    <div className={`p-2 rounded-lg font-mono text-[10px] ${isDarkMode ? 'bg-gray-900 text-green-400' : 'bg-slate-100 text-green-700'}`}>
                      $ git checkout --ours {conflictState.name}<br/>
                      $ git add {conflictState.name}<br/>
                      $ git commit -m "Resolve conflict: keep main version"
                    </div>
                  </div>
                )}
                {conflictState.resolution === 'theirs' && (
                  <div className="space-y-2">
                    <p className={`text-[11px] leading-relaxed ${textMain}`}>
                      You chose <strong className="text-purple-400">--theirs</strong> strategy. Git kept the feature branch changes and discarded the main branch version.
                    </p>
                    <div className={`p-2 rounded-lg font-mono text-[10px] ${isDarkMode ? 'bg-gray-900 text-green-400' : 'bg-slate-100 text-green-700'}`}>
                      $ git checkout --theirs {conflictState.name}<br/>
                      $ git add {conflictState.name}<br/>
                      $ git commit -m "Resolve conflict: keep feature version"
                    </div>
                  </div>
                )}
                {conflictState.resolution === 'manual' && (
                  <div className="space-y-2">
                    <p className={`text-[11px] leading-relaxed ${textMain}`}>
                      You chose <strong className="text-amber-400">manual editing</strong>. This is the most common real-world approach. You open the file, remove conflict markers, keep the desired content, then stage and commit.
                    </p>
                    <div className={`p-2 rounded-lg font-mono text-[10px] ${isDarkMode ? 'bg-gray-900 text-green-400' : 'bg-slate-100 text-green-700'}`}>
                      1. Open the file in your editor<br/>
                      2. Remove {"<<<<<<<"} and {">>>>>>>"} markers<br/>
                      3. Keep the correct content<br/>
                      4. $ git add {conflictState.name}<br/>
                      5. $ git commit -m "Resolve merge conflict"
                    </div>
                  </div>
                )}
              </div>

              {/* Key tips */}
              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-blue-950/10 border-blue-800/30' : 'bg-blue-50 border-blue-200'}`}>
                <span className="text-[10px] font-bold text-blue-400 block mb-1.5">💡 Pro Tips:</span>
                <ul className="space-y-1">
                  <li className={`text-[10px] ${textSub}`}>• Always review both sides before resolving</li>
                  <li className={`text-[10px] ${textSub}`}>• Use <code className="text-cyan-400">git diff</code> to see conflict markers</li>
                  <li className={`text-[10px] ${textSub}`}>• Use <code className="text-cyan-400">git merge --abort</code> to undo the entire merge</li>
                  <li className={`text-[10px] ${textSub}`}>• IDE tools like VS Code have visual merge conflict helpers</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function generateConflictMarker(_filename: string, ours: string, theirs: string): string {
  if (!theirs) {
    return `<<<<<<< HEAD (modified in main)
${ours}
=======
(deleted in feature branch)
>>>>>>> feature-branch`;
  }
  return `<<<<<<< HEAD (main branch)
${ours}
=======
${theirs}
>>>>>>> feature-branch`;
}
