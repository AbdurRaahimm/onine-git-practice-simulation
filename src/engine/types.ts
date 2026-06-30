export interface GitFile {
  name: string;
  content: string;
  path: string;
}

export interface GitCommit {
  hash: string;
  message: string;
  timestamp: number;
  parentHashes: string[];
  files: Record<string, string>; // path -> content snapshot
  author: string;
  branch: string;
}

export interface GitBranch {
  name: string;
  commitHash: string;
  isRemote: boolean;
}

export interface GitTag {
  name: string;
  commitHash: string;
  message?: string;
}

export interface GitStashEntry {
  id: number;
  message: string;
  files: Record<string, string>;
  stagedFiles: Record<string, string>;
  branch: string;
}

export interface GitRemote {
  name: string;
  url: string;
  branches: Record<string, string>; // branch name -> commit hash
}

export interface FileStatus {
  path: string;
  status: 'untracked' | 'modified' | 'staged' | 'deleted' | 'renamed' | 'conflict';
  oldPath?: string;
}

export interface GitState {
  initialized: boolean;
  workingDirectory: Record<string, string>; // path -> content
  stagingArea: Record<string, string>; // path -> content
  commits: Record<string, GitCommit>; // hash -> commit
  branches: Record<string, GitBranch>; // name -> branch
  tags: Record<string, GitTag>;
  currentBranch: string;
  HEAD: string; // commit hash or branch name
  detachedHead: boolean;
  stash: GitStashEntry[];
  remotes: Record<string, GitRemote>;
  mergeHead: string | null;
  rebaseState: null | { onto: string; branch: string; remaining: string[]; current: number };
  config: Record<string, string>;
  log: string[];
  currentDirectory: string; // cwd relative path
  directories: Set<string>; // tracked directories
  aliases: Record<string, string>; // command aliases
  env: Record<string, string>; // env variables
}

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'info' | 'warning' | 'system';
  content: string;
  timestamp: number;
}
