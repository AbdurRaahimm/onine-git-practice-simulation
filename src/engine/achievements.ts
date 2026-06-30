import { GitState } from './types';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'basics' | 'branching' | 'advanced' | 'collaboration' | 'mastery';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockCondition: (state: GitState, commandHistory: string[]) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_init',
    title: 'Genesis',
    description: 'Initialize your first Git repository',
    icon: '🌱',
    category: 'basics',
    rarity: 'common',
    unlockCondition: (state) => state.initialized,
  },
  {
    id: 'first_commit',
    title: 'First Steps',
    description: 'Make your very first commit',
    icon: '📝',
    category: 'basics',
    rarity: 'common',
    unlockCondition: (state) => Object.keys(state.commits).length >= 1,
  },
  {
    id: 'five_commits',
    title: 'Commit Collector',
    description: 'Reach 5 commits in your repository',
    icon: '📚',
    category: 'basics',
    rarity: 'common',
    unlockCondition: (state) => Object.keys(state.commits).length >= 5,
  },
  {
    id: 'ten_commits',
    title: 'History Maker',
    description: 'Reach 10 commits in your repository',
    icon: '📖',
    category: 'basics',
    rarity: 'rare',
    unlockCondition: (state) => Object.keys(state.commits).length >= 10,
  },
  {
    id: 'first_branch',
    title: 'Branch Pioneer',
    description: 'Create your first branch',
    icon: '🌿',
    category: 'branching',
    rarity: 'common',
    unlockCondition: (state) => Object.values(state.branches).filter(b => !b.isRemote).length >= 2,
  },
  {
    id: 'branch_switch',
    title: 'Branch Hopper',
    description: 'Switch between branches',
    icon: '🔀',
    category: 'branching',
    rarity: 'common',
    unlockCondition: (_s, history) => history.some(h => h.startsWith('git checkout') && !h.includes('-b')),
  },
  {
    id: 'three_branches',
    title: 'Parallel Universe',
    description: 'Create 3 or more branches',
    icon: '🌳',
    category: 'branching',
    rarity: 'rare',
    unlockCondition: (state) => Object.values(state.branches).filter(b => !b.isRemote).length >= 4,
  },
  {
    id: 'first_merge',
    title: 'Unifier',
    description: 'Merge two branches together',
    icon: '🤝',
    category: 'branching',
    rarity: 'rare',
    unlockCondition: (state) => Object.values(state.commits).some(c => c.parentHashes.length > 1),
  },
  {
    id: 'first_tag',
    title: 'Release Manager',
    description: 'Create your first tag',
    icon: '🏷️',
    category: 'advanced',
    rarity: 'rare',
    unlockCondition: (state) => Object.keys(state.tags).length >= 1,
  },
  {
    id: 'first_stash',
    title: 'Stash Master',
    description: 'Stash your changes for later',
    icon: '📦',
    category: 'advanced',
    rarity: 'rare',
    unlockCondition: (_s, history) => history.some(h => h.startsWith('git stash')),
  },
  {
    id: 'first_rebase',
    title: 'Rebaser',
    description: 'Perform a rebase operation',
    icon: '🔄',
    category: 'advanced',
    rarity: 'epic',
    unlockCondition: (_s, history) => history.some(h => h.startsWith('git rebase')),
  },
  {
    id: 'first_revert',
    title: 'Time Traveler',
    description: 'Revert a commit to undo changes',
    icon: '↩️',
    category: 'advanced',
    rarity: 'epic',
    unlockCondition: (_s, history) => history.some(h => h.startsWith('git revert')),
  },
  {
    id: 'first_cherry_pick',
    title: 'Cherry Picker',
    description: 'Cherry-pick a commit from another branch',
    icon: '🍒',
    category: 'advanced',
    rarity: 'epic',
    unlockCondition: (_s, history) => history.some(h => h.startsWith('git cherry-pick')),
  },
  {
    id: 'remote_setup',
    title: 'Connected',
    description: 'Add a remote repository',
    icon: '🌐',
    category: 'collaboration',
    rarity: 'rare',
    unlockCondition: (state) => Object.keys(state.remotes).length >= 1,
  },
  {
    id: 'first_push',
    title: 'Ship It!',
    description: 'Push your changes to a remote',
    icon: '🚀',
    category: 'collaboration',
    rarity: 'epic',
    unlockCondition: (_s, history) => history.some(h => h.startsWith('git push')),
  },
  {
    id: 'clone_repo',
    title: 'Cloner',
    description: 'Clone a repository',
    icon: '📋',
    category: 'collaboration',
    rarity: 'common',
    unlockCondition: (_s, history) => history.some(h => h.startsWith('git clone')),
  },
  {
    id: 'file_sandbox',
    title: 'Visual Coder',
    description: 'Edit files using the visual editor',
    icon: '🎨',
    category: 'basics',
    rarity: 'common',
    unlockCondition: (_s, history) => history.some(h => h.startsWith('echo "Updated')),
  },
  {
    id: 'power_user',
    title: 'Power User',
    description: 'Execute 50 or more commands',
    icon: '⚡',
    category: 'mastery',
    rarity: 'epic',
    unlockCondition: (_s, history) => history.length >= 50,
  },
  {
    id: 'detached_adventurer',
    title: 'Detached Adventurer',
    description: 'Enter detached HEAD state',
    icon: '🎪',
    category: 'advanced',
    rarity: 'rare',
    unlockCondition: (state) => state.detachedHead,
  },
  {
    id: 'git_master',
    title: 'Git Master',
    description: 'Complete all learning milestones',
    icon: '👑',
    category: 'mastery',
    rarity: 'legendary',
    unlockCondition: (state) => {
      return state.initialized
        && Object.values(state.branches).filter(b => !b.isRemote).length >= 3
        && Object.values(state.commits).some(c => c.parentHashes.length > 1)
        && Object.keys(state.tags).length >= 1
        && Object.keys(state.remotes).length >= 1
        && Object.keys(state.commits).length >= 10;
    },
  },
];

export function checkAchievements(
  state: GitState,
  commandHistory: string[],
  unlockedIds: Set<string>
): Achievement[] {
  const newlyUnlocked: Achievement[] = [];
  for (const ach of ACHIEVEMENTS) {
    if (!unlockedIds.has(ach.id)) {
      try {
        if (ach.unlockCondition(state, commandHistory)) {
          newlyUnlocked.push(ach);
        }
      } catch { /* skip */ }
    }
  }
  return newlyUnlocked;
}

export function getRarityColor(rarity: Achievement['rarity']): string {
  switch (rarity) {
    case 'common': return 'text-gray-400';
    case 'rare': return 'text-blue-400';
    case 'epic': return 'text-purple-400';
    case 'legendary': return 'text-yellow-400';
  }
}

export function getRarityBorder(rarity: Achievement['rarity']): string {
  switch (rarity) {
    case 'common': return 'border-gray-700';
    case 'rare': return 'border-blue-800/60';
    case 'epic': return 'border-purple-800/60';
    case 'legendary': return 'border-yellow-700/60';
  }
}
