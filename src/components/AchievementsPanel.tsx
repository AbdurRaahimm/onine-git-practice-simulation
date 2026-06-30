import { ACHIEVEMENTS, Achievement, getRarityColor, getRarityBorder } from '../engine/achievements';

interface AchievementsPanelProps {
  unlockedIds: Set<string>;
  isDarkMode: boolean;
}

export default function AchievementsPanel({ unlockedIds, isDarkMode }: AchievementsPanelProps) {
  const categories = [
    { id: 'basics', label: 'Basics', icon: '📘' },
    { id: 'branching', label: 'Branching', icon: '🌿' },
    { id: 'advanced', label: 'Advanced', icon: '🔬' },
    { id: 'collaboration', label: 'Collaboration', icon: '🌐' },
    { id: 'mastery', label: 'Mastery', icon: '👑' },
  ];

  const totalUnlocked = unlockedIds.size;
  const totalAchievements = ACHIEVEMENTS.length;
  const progressPercent = Math.round((totalUnlocked / totalAchievements) * 100);

  return (
    <div className={`h-full overflow-y-auto custom-scrollbar p-3.5 space-y-5 ${isDarkMode ? 'bg-[#0d1117]' : 'bg-white'}`}>
      {/* Header Stats */}
      <div className={`p-4 rounded-xl border ${
        isDarkMode ? 'border-gray-800 bg-gradient-to-br from-[#161b22] to-[#0d1117]' : 'border-slate-200 bg-gradient-to-br from-slate-50 to-white'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Achievement Progress</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-green-400">{totalUnlocked}</span>
              <span className="text-sm text-gray-500">/ {totalAchievements}</span>
            </div>
          </div>
          <div className="text-3xl">🏆</div>
        </div>
        {/* Progress Bar */}
        <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-slate-200'}`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-[10px] text-gray-500 mt-1.5 block">{progressPercent}% Complete</span>
      </div>

      {/* Achievements by Category */}
      {categories.map(cat => {
        const catAchievements = ACHIEVEMENTS.filter(a => a.category === cat.id);
        const catUnlocked = catAchievements.filter(a => unlockedIds.has(a.id)).length;

        return (
          <div key={cat.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{cat.icon}</span>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{cat.label}</span>
              </div>
              <span className="text-[10px] text-gray-600 font-mono">{catUnlocked}/{catAchievements.length}</span>
            </div>

            <div className="space-y-1.5">
              {catAchievements.map(achievement => {
                const isUnlocked = unlockedIds.has(achievement.id);
                return (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    isUnlocked={isUnlocked}
                    isDarkMode={isDarkMode}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AchievementCard({
  achievement,
  isUnlocked,
  isDarkMode,
}: {
  achievement: Achievement;
  isUnlocked: boolean;
  isDarkMode: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
        isUnlocked
          ? `${isDarkMode ? 'bg-[#161b22]/80' : 'bg-slate-50'} ${getRarityBorder(achievement.rarity)} shadow-md`
          : isDarkMode
          ? 'bg-gray-900/30 border-gray-800/50 opacity-50'
          : 'bg-slate-100/50 border-slate-200 opacity-50'
      }`}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
        isUnlocked
          ? isDarkMode ? 'bg-gray-800' : 'bg-white shadow-sm'
          : isDarkMode ? 'bg-gray-900' : 'bg-slate-200'
      }`}>
        {isUnlocked ? achievement.icon : '🔒'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold ${isUnlocked ? 'text-gray-200' : 'text-gray-600'}`}>
            {achievement.title}
          </span>
          <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
            getRarityColor(achievement.rarity)
          } ${getRarityBorder(achievement.rarity)}`}>
            {achievement.rarity}
          </span>
        </div>
        <p className={`text-[10px] mt-0.5 ${isUnlocked ? 'text-gray-500' : 'text-gray-700'}`}>
          {achievement.description}
        </p>
      </div>

      {/* Checkmark */}
      {isUnlocked && (
        <div className="text-green-400 shrink-0">✓</div>
      )}
    </div>
  );
}
