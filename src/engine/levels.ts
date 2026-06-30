import { GitState } from './types';

export interface GitLevel {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  instructions: string[];
  goalDescription: string;
  validate: (state: GitState) => { success: boolean; message: string };
  hint?: string;
}

export const GIT_LEVELS: GitLevel[] = [
  {
    id: '1',
    title: 'Initialize & Commit',
    subtitle: 'Welcome to your first Git repository',
    description: 'Learn how to start tracking your project files and save your first checkpoint (commit).',
    difficulty: 'Beginner',
    goalDescription: 'Initialize a new repository, create a README.md file, stage it, and commit with any message.',
    instructions: [
      'Initialize the repo: `git init`',
      'Create a file: `touch README.md`',
      'Stage the file: `git add README.md`',
      'Commit your changes: `git commit -m "First commit"`',
    ],
    hint: 'Type each command into the terminal. Use `git status` to see the state at any time.',
    validate: (state: GitState) => {
      if (!state.initialized) {
        return { success: false, message: 'Repository is not initialized yet. Run `git init`.' };
      }
      const commitCount = Object.keys(state.commits).length;
      if (commitCount === 0) {
        return { success: false, message: 'No commits found. Run `git commit -m "message"` after staging.' };
      }
      // Check if README.md exists in the last commit
      const branch = state.branches[state.currentBranch];
      if (!branch) return { success: false, message: 'No current branch found.' };
      const lastCommit = state.commits[branch.commitHash];
      if (!lastCommit || !lastCommit.files['README.md']) {
        return { success: false, message: 'Make sure you created and staged `README.md` before committing.' };
      }
      return { success: true, message: '🎉 Great job! You successfully initialized and created your first commit.' };
    },
  },
  {
    id: '2',
    title: 'Branching out',
    subtitle: 'Parallel development lines',
    description: 'Create a separate path (branch) to build features without touching the main line of development.',
    difficulty: 'Beginner',
    goalDescription: 'Create a branch named `feature-login`, switch to it, create a file named `login.js`, stage and commit it on that branch.',
    instructions: [
      'Create & switch branch: `git checkout -b feature-login`',
      'Create login file: `touch login.js`',
      'Stage it: `git add login.js`',
      'Commit on your branch: `git commit -m "Add login script"`',
    ],
    hint: 'Use `git branch` to view existing branches, and `git switch` or `git checkout` to move between them.',
    validate: (state: GitState) => {
      if (!state.initialized) {
        return { success: false, message: 'Initialize the repo and complete Level 1 first!' };
      }
      if (!state.branches['feature-login']) {
        return { success: false, message: 'Branch "feature-login" does not exist. Create it using `git branch feature-login` or `git checkout -b feature-login`.' };
      }
      const branchCommitHash = state.branches['feature-login'].commitHash;
      if (!branchCommitHash) {
        return { success: false, message: 'Branch "feature-login" has no commits. Switch to it and commit the new file.' };
      }
      const commit = state.commits[branchCommitHash];
      if (!commit || !commit.files['login.js']) {
        return { success: false, message: 'Commit on "feature-login" branch does not contain "login.js". Make sure you touch, add, and commit it.' };
      }
      return { success: true, message: '🎉 Success! You built a feature on a separate branch safely.' };
    },
  },
  {
    id: '3',
    title: 'Fast-Forward Merge',
    subtitle: 'Bringing features back together',
    description: 'Merge your completed feature branch back into the main branch.',
    difficulty: 'Beginner',
    goalDescription: 'Switch back to the `main` branch, and merge the `feature-login` branch into it.',
    instructions: [
      'Switch back to main: `git checkout main`',
      'Merge the branch: `git merge feature-login`',
    ],
    hint: 'Make sure your current branch is `main` when you execute the merge.',
    validate: (state: GitState) => {
      if (!state.initialized) return { success: false, message: 'Repository not initialized.' };
      if (state.currentBranch !== 'main') {
        return { success: false, message: 'You must checkout the `main` branch to merge into it.' };
      }
      const mainBranch = state.branches['main'];
      const featureBranch = state.branches['feature-login'];
      if (!featureBranch) {
        return { success: false, message: 'Could not find the "feature-login" branch from Level 2.' };
      }
      if (mainBranch.commitHash !== featureBranch.commitHash) {
        return { success: false, message: 'The main branch does not point to the same commit as feature-login. Run `git merge feature-login`.' };
      }
      return { success: true, message: '🎉 Excellent! You fast-forward merged your features cleanly.' };
    },
  },
  {
    id: '4',
    title: 'Safe Progress with Stash',
    subtitle: 'Temporarily saving work',
    description: 'Save dirty work-in-progress without committing, so you can switch branches cleanly.',
    difficulty: 'Intermediate',
    goalDescription: 'Create a file named `wip.js`, write some code, stash it, check that status is clean, then apply or pop the stash.',
    instructions: [
      'Touch a file: `touch wip.js`',
      'Add content: `echo "const x = 5;" > wip.js`',
      'Stage changes: `git add .`',
      'Stash your progress: `git stash save "temporary progress"`',
      'Restore with: `git stash pop`',
    ],
    hint: 'Stashing is helpful when you need to switch tasks quickly without making half-baked commits.',
    validate: (state: GitState) => {
      if (!state.initialized) return { success: false, message: 'Repository not initialized.' };
      // Check if there was stash activity or if wip.js exists
      const hasWip = state.workingDirectory['wip.js'] !== undefined;
      if (!hasWip) {
        return { success: false, message: 'Create and add `wip.js` first, then you can stash it or restore it.' };
      }
      return { success: true, message: '🎉 Fantastic! You mastered the power of Git Stash.' };
    },
  },
  {
    id: '5',
    title: 'Rewriting History with Rebase',
    subtitle: 'Clean and linear commit history',
    description: 'Replay commits from one branch on top of another to maintain a perfectly linear project timeline.',
    difficulty: 'Advanced',
    goalDescription: 'Create a new branch `feature-payment`, add a file `payment.js` with a commit, switch to `feature-payment` and rebase onto `main`.',
    instructions: [
      'Make a payment branch: `git checkout -b feature-payment`',
      'Add a payment file: `touch payment.js`',
      'Commit: `git add .` then `git commit -m "Add payment file"`',
      'Rebase: `git rebase main`',
    ],
    hint: 'Rebase replays branch commits onto the tip of another branch.',
    validate: (state: GitState) => {
      if (!state.initialized) return { success: false, message: 'Repository not initialized.' };
      const payBranch = state.branches['feature-payment'];
      if (!payBranch) {
        return { success: false, message: 'Branch `feature-payment` not found.' };
      }
      // Rebase check: make sure main is in parent history of feature-payment
      const mainHash = state.branches['main']?.commitHash;
      if (!mainHash) return { success: false, message: 'main branch has no commits.' };
      
      const commitHash = payBranch.commitHash;
      let current = commitHash;
      let foundMain = false;
      while (current) {
        if (current === mainHash) {
          foundMain = true;
          break;
        }
        const c = state.commits[current];
        current = c && c.parentHashes.length > 0 ? c.parentHashes[0] : '';
      }
      if (!foundMain) {
        return { success: false, message: 'Rebase not complete. Make sure feature-payment is directly linear to main.' };
      }
      return { success: true, message: '🎉 Rebase complete! Your history is perfectly clean.' };
    },
  },
];
