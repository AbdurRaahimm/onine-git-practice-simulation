import { useState } from 'react';
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

const TOUR_STEPS = [
  {
    title: 'Welcome to GitSandbox! 🎉',
    content: 'This is your personal interactive Git laboratory. Practice Git commands safely with a real simulation engine, visual graph, and instant feedback.',
    icon: '🚀',
    highlight: 'terminal',
  },
  {
    title: 'The Terminal 🖥️',
    content: 'Type any Git command here just like in a real terminal. It supports autocomplete (Tab), command history (↑↓), and Ctrl+K opens the command palette for quick access.',
    icon: '⌨️',
    highlight: 'terminal',
  },
  {
    title: 'Visual Git Graph 📊',
    content: 'The Graph tab shows your commit history as a beautiful visual timeline. Click any node to inspect commit details, or click branch labels to checkout instantly.',
    icon: '🌿',
    highlight: 'graph',
  },
  {
    title: 'File Explorer 📁',
    content: 'The left sidebar shows all files with their status indicators: U=Untracked, M=Modified, A=Added(Staged), D=Deleted. Collapse it with the arrow button.',
    icon: '📂',
    highlight: 'explorer',
  },
  {
    title: 'Visual Diff & Editor ✏️',
    content: 'The Diff tab shows real-time file comparisons. The Editor tab lets you edit files visually without using touch/echo commands.',
    icon: '🔍',
    highlight: 'diff',
  },
  {
    title: 'Learning Path 🎓',
    content: 'Visit the Lessons tab for guided challenges that verify your work. The Flow Map explains Git internals. Check your Stats and Achievements to track progress!',
    icon: '🏆',
    highlight: 'lessons',
  },
  {
    title: 'Quick Actions ⚡',
    content: 'The Presets tab has pre-built workflow templates. Click any to auto-run a sequence of commands. Use the Config tab to set your theme and Git profile.',
    icon: '🎯',
    highlight: 'actions',
  },
  {
    title: 'Keyboard Shortcuts ⌨️',
    content: 'Alt+1-8 switches tabs. Ctrl+K opens the Command Palette. Ctrl+L clears the terminal. Press ? anytime to see all shortcuts.',
    icon: '⌨️',
    highlight: 'shortcuts',
  },
  {
    title: 'Ready to Start! 🎉',
    content: 'Try typing "git init" in the terminal to begin, or click "Quick Start" in the Presets tab. Your progress is tracked with achievements. Happy learning!',
    icon: '✨',
    highlight: 'none',
  },
];

export default function OnboardingTour({ isOpen, onClose, isDarkMode }: OnboardingTourProps) {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className={`w-full max-w-md mx-4 rounded-2xl border overflow-hidden shadow-2xl ${
        isDarkMode
          ? 'bg-[#161b22] border-gray-700 shadow-black/50'
          : 'bg-white border-slate-200 shadow-slate-200/50'
      }`}>
        {/* Progress Bar */}
        <div className={`h-1 ${isDarkMode ? 'bg-gray-800' : 'bg-slate-200'}`}>
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-green-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Step {step + 1} of {TOUR_STEPS.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5 space-y-4">
          <div className="text-center">
            <span className="text-4xl block mb-3">{current.icon}</span>
            <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {current.title}
            </h2>
          </div>
          <p className={`text-sm leading-relaxed text-center ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
            {current.content}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-5 pb-5">
          <button
            onClick={() => setStep(prev => Math.max(0, prev - 1))}
            disabled={isFirst}
            className={`flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg transition-all ${
              isFirst
                ? 'opacity-30 cursor-not-allowed text-gray-600'
                : isDarkMode
                ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ChevronLeft size={14} />
            Previous
          </button>

          {/* Dots */}
          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === step
                    ? 'bg-green-400 w-4'
                    : i < step
                    ? 'bg-green-800'
                    : isDarkMode ? 'bg-gray-700' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>

          {isLast ? (
            <button
              onClick={onClose}
              className="flex items-center gap-1 text-xs font-bold px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-500 hover:to-emerald-500 transition-all shadow-lg shadow-green-900/30"
            >
              <Sparkles size={14} />
              Get Started!
            </button>
          ) : (
            <button
              onClick={() => setStep(prev => Math.min(TOUR_STEPS.length - 1, prev + 1))}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg text-green-400 hover:text-green-300 hover:bg-green-900/20 transition-all"
            >
              Next
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* Skip link */}
        <div className={`text-center pb-4 ${isDarkMode ? '' : ''}`}>
          <button
            onClick={onClose}
            className={`text-[10px] ${isDarkMode ? 'text-gray-700 hover:text-gray-500' : 'text-slate-400 hover:text-slate-600'} transition-colors`}
          >
            Skip tour
          </button>
        </div>
      </div>
    </div>
  );
}
