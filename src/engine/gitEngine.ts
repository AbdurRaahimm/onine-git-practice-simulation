import { GitState, GitCommit, TerminalLine } from './types';
import { generateHash, shortHash, formatTimestamp, parseArgs, diffStrings } from './utils';

function createId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function createInitialState(): GitState {
  return {
    initialized: false,
    workingDirectory: {},
    stagingArea: {},
    commits: {},
    branches: {},
    tags: {},
    currentBranch: 'main',
    HEAD: '',
    detachedHead: false,
    stash: [],
    remotes: {},
    mergeHead: null,
    rebaseState: null,
    config: {
      'user.name': 'Developer',
      'user.email': 'dev@example.com',
    },
    log: [],
    currentDirectory: '.',
    directories: new Set<string>(),
    aliases: {},
    env: { HOME: '/home/user', USER: 'developer', SHELL: '/bin/bash' },
  };
}

function line(type: TerminalLine['type'], content: string): TerminalLine {
  return { id: createId(), type, content, timestamp: Date.now() };
}

export class GitEngine {
  state: GitState;
  private outputLines: TerminalLine[] = [];

  constructor(initialState?: GitState) {
    if (initialState) {
      // Restore Set from serialized array (JSON.parse turns Set into array or object)
      this.state = {
        ...initialState,
        directories: initialState.directories instanceof Set 
          ? initialState.directories 
          : new Set(Array.isArray(initialState.directories) ? initialState.directories : []),
        aliases: initialState.aliases || {},
        env: initialState.env || { HOME: '/home/user', USER: 'developer', SHELL: '/bin/bash' },
        currentDirectory: initialState.currentDirectory || '.',
      };
    } else {
      this.state = createInitialState();
    }
  }

  getState(): GitState {
    return { 
      ...this.state,
      // Convert Set to array for JSON serialization
      directories: new Set(this.state.directories),
    };
  }

  private out(type: TerminalLine['type'], content: string) {
    this.outputLines.push(line(type, content));
  }

  private getHeadCommit(): GitCommit | null {
    if (this.state.detachedHead) {
      return this.state.commits[this.state.HEAD] || null;
    }
    const branch = this.state.branches[this.state.currentBranch];
    if (!branch) return null;
    return this.state.commits[branch.commitHash] || null;
  }

  private getCurrentCommitHash(): string {
    if (this.state.detachedHead) return this.state.HEAD;
    const branch = this.state.branches[this.state.currentBranch];
    return branch ? branch.commitHash : '';
  }

  private resolveRef(ref: string): string | null {
    // Check if it's a commit hash
    if (this.state.commits[ref]) return ref;
    // Check short hash
    for (const hash of Object.keys(this.state.commits)) {
      if (hash.startsWith(ref)) return hash;
    }
    // Check branch
    if (this.state.branches[ref]) return this.state.branches[ref].commitHash;
    // Check tag
    if (this.state.tags[ref]) return this.state.tags[ref].commitHash;
    // HEAD
    if (ref === 'HEAD') return this.getCurrentCommitHash();
    // HEAD~n
    const headMatch = ref.match(/^HEAD~(\d+)$/);
    if (headMatch) {
      let current = this.getCurrentCommitHash();
      let n = parseInt(headMatch[1]);
      while (n > 0 && current) {
        const commit = this.state.commits[current];
        if (!commit || commit.parentHashes.length === 0) return null;
        current = commit.parentHashes[0];
        n--;
      }
      return current || null;
    }
    // branch~n
    const branchMatch = ref.match(/^(.+)~(\d+)$/);
    if (branchMatch) {
      const branchName = branchMatch[1];
      let n = parseInt(branchMatch[2]);
      let current = this.state.branches[branchName]?.commitHash;
      if (!current) return null;
      while (n > 0 && current) {
        const commit = this.state.commits[current];
        if (!commit || commit.parentHashes.length === 0) return null;
        current = commit.parentHashes[0];
        n--;
      }
      return current || null;
    }
    return null;
  }

  private getCommitHistory(startHash: string, limit: number = 50): GitCommit[] {
    const history: GitCommit[] = [];
    const visited = new Set<string>();
    const queue = [startHash];

    while (queue.length > 0 && history.length < limit) {
      const hash = queue.shift()!;
      if (visited.has(hash)) continue;
      visited.add(hash);

      const commit = this.state.commits[hash];
      if (!commit) continue;

      history.push(commit);
      for (const parent of commit.parentHashes) {
        if (!visited.has(parent)) {
          queue.push(parent);
        }
      }
    }

    return history.sort((a, b) => b.timestamp - a.timestamp);
  }

  private resolvePath(p: string): string {
    if (p.startsWith('/')) return p;
    const cwd = this.state.currentDirectory;
    if (cwd === '.' || cwd === '') return p;
    return `${cwd}/${p}`;
  }

  private getFilesInDir(dir: string): string[] {
    const prefix = dir === '.' || dir === '' ? '' : (dir.endsWith('/') ? dir : dir + '/');
    return Object.keys(this.state.workingDirectory).filter(f =>
      prefix === '' ? !f.includes('/') : (f.startsWith(prefix) && !f.slice(prefix.length).includes('/'))
    );
  }

  private getDirsInDir(dir: string): string[] {
    const prefix = dir === '.' || dir === '' ? '' : (dir.endsWith('/') ? dir : dir + '/');
    const dirs = new Set<string>();
    for (const f of Object.keys(this.state.workingDirectory)) {
      if (prefix && !f.startsWith(prefix)) continue;
      const rest = prefix ? f.slice(prefix.length) : f;
      const slashIdx = rest.indexOf('/');
      if (slashIdx !== -1) dirs.add(rest.substring(0, slashIdx));
    }
    for (const d of this.state.directories) {
      if (prefix && !d.startsWith(prefix)) continue;
      const rest = prefix ? d.slice(prefix.length) : d;
      if (rest && !rest.includes('/')) dirs.add(rest);
    }
    return Array.from(dirs).sort();
  }

  execute(input: string): TerminalLine[] {
    this.outputLines = [];
    const trimmed = input.trim();
    if (!trimmed) return [];

    // Handle && chain operator
    if (trimmed.includes(' && ')) {
      const parts = trimmed.split(' && ').map(s => s.trim()).filter(Boolean);
      let allOutput: TerminalLine[] = [];
      for (const part of parts) {
        const result = this.execute(part);
        allOutput = [...allOutput, ...result];
        if (result.some(r => r.type === 'error')) break; // stop on error
      }
      return allOutput;
    }

    // Handle ; sequential operator
    if (trimmed.includes('; ')) {
      const parts = trimmed.split('; ').map(s => s.trim()).filter(Boolean);
      let allOutput: TerminalLine[] = [];
      for (const part of parts) {
        allOutput = [...allOutput, ...this.execute(part)];
      }
      return allOutput;
    }

    // Handle | pipe simulation (run left, feed output as context)
    if (trimmed.includes(' | ')) {
      const parts = trimmed.split(' | ').map(s => s.trim());
      let pipeContent = '';
      for (let i = 0; i < parts.length; i++) {
        if (i === 0) {
          const result = this.execute(parts[i]);
          pipeContent = result.filter(l => l.type === 'output' || l.type === 'success').map(l => l.content).join('\n');
        } else {
          // Simulate pipe target
          const cmd = parts[i];
          if (cmd.startsWith('grep ')) {
            const pattern = cmd.substring(5).trim().replace(/^["']|["']$/g, '');
            const lines = pipeContent.split('\n').filter(l => l.toLowerCase().includes(pattern.toLowerCase()));
            pipeContent = lines.join('\n');
          } else if (cmd === 'sort') {
            pipeContent = pipeContent.split('\n').sort().join('\n');
          } else if (cmd === 'uniq') {
            const unique: string[] = [];
            pipeContent.split('\n').forEach(l => { if (unique[unique.length - 1] !== l) unique.push(l); });
            pipeContent = unique.join('\n');
          } else if (cmd.startsWith('head')) {
            const n = parseInt(cmd.split('-n ')[1] || cmd.split(' ')[1] || '10');
            pipeContent = pipeContent.split('\n').slice(0, isNaN(n) ? 10 : n).join('\n');
          } else if (cmd.startsWith('tail')) {
            const n = parseInt(cmd.split('-n ')[1] || cmd.split(' ')[1] || '10');
            const lns = pipeContent.split('\n');
            pipeContent = lns.slice(Math.max(0, lns.length - (isNaN(n) ? 10 : n))).join('\n');
          } else if (cmd === 'wc -l') {
            pipeContent = String(pipeContent.split('\n').filter(Boolean).length);
          } else if (cmd === 'wc -w') {
            pipeContent = String(pipeContent.split(/\s+/).filter(Boolean).length);
          } else if (cmd === 'wc') {
            const lns = pipeContent.split('\n');
            const wds = pipeContent.split(/\s+/).filter(Boolean);
            pipeContent = `  ${lns.length}  ${wds.length}  ${pipeContent.length}`;
          } else if (cmd === 'tac' || cmd === 'rev') {
            pipeContent = pipeContent.split('\n').reverse().join('\n');
          } else if (cmd === 'tr A-Z a-z' || cmd === 'tr [:upper:] [:lower:]') {
            pipeContent = pipeContent.toLowerCase();
          } else if (cmd === 'tr a-z A-Z' || cmd === 'tr [:lower:] [:upper:]') {
            pipeContent = pipeContent.toUpperCase();
          }
        }
      }
      this.outputLines.push(line('input', `$ ${trimmed}`));
      if (pipeContent) this.out('output', pipeContent);
      return this.outputLines;
    }

    // Check aliases
    const firstWord = trimmed.split(' ')[0];
    if (this.state.aliases[firstWord]) {
      const expanded = trimmed.replace(firstWord, this.state.aliases[firstWord]);
      return this.execute(expanded);
    }

    this.outputLines.push(line('input', `$ ${trimmed}`));

    // ──── Shell Commands ────
    if (trimmed === 'clear' || trimmed === 'cls') return [line('system', '__CLEAR__')];
    if (trimmed === 'help' || trimmed === '--help') { this.showHelp(); return this.outputLines; }

    // echo with redirection
    if (trimmed.startsWith('echo ')) {
      const appendMatch = trimmed.match(/echo\s+(.+?)\s*>>\s*(.+)$/);
      const redirectMatch = !appendMatch ? trimmed.match(/echo\s+(.+?)\s*>\s*(.+)$/) : null;
      if (appendMatch) {
        const text = appendMatch[1].replace(/^["']|["']$/g, '');
        const file = this.resolvePath(appendMatch[2].trim());
        const existing = this.state.workingDirectory[file] || '';
        this.state.workingDirectory[file] = existing + (existing ? '\n' : '') + text;
      } else if (redirectMatch) {
        const text = redirectMatch[1].replace(/^["']|["']$/g, '');
        const file = this.resolvePath(redirectMatch[2].trim());
        this.state.workingDirectory[file] = text;
      } else {
        this.out('output', trimmed.substring(5).replace(/^["']|["']$/g, ''));
      }
      return this.outputLines;
    }

    // cat - concatenate & print (supports multiple files)
    if (trimmed.startsWith('cat ')) {
      const files = parseArgs(trimmed.substring(4));
      for (const f of files) {
        const path = this.resolvePath(f);
        if (this.state.workingDirectory[path] !== undefined) {
          this.out('output', this.state.workingDirectory[path]);
        } else {
          this.out('error', `cat: ${f}: No such file or directory`);
        }
      }
      return this.outputLines;
    }

    // touch - create files (supports multiple)
    if (trimmed.startsWith('touch ')) {
      const files = parseArgs(trimmed.substring(6));
      for (const f of files) {
        const path = this.resolvePath(f);
        if (this.state.workingDirectory[path] === undefined) {
          this.state.workingDirectory[path] = '';
        }
        // Ensure parent directories exist
        const parts = path.split('/');
        for (let i = 1; i < parts.length; i++) {
          this.state.directories.add(parts.slice(0, i).join('/'));
        }
      }
      return this.outputLines;
    }

    // mkdir - create directories
    if (trimmed.startsWith('mkdir ')) {
      const args = parseArgs(trimmed.substring(6));
      const recursive = args.includes('-p');
      const dirs = args.filter(a => !a.startsWith('-'));
      for (const d of dirs) {
        const path = this.resolvePath(d);
        if (recursive) {
          const parts = path.split('/');
          for (let i = 1; i <= parts.length; i++) {
            this.state.directories.add(parts.slice(0, i).join('/'));
          }
        }
        this.state.directories.add(path);
        this.out('success', `Created directory: ${path}`);
      }
      return this.outputLines;
    }

    // rmdir - remove empty directories
    if (trimmed.startsWith('rmdir ')) {
      const dirs = parseArgs(trimmed.substring(6)).filter(a => !a.startsWith('-'));
      for (const d of dirs) {
        const path = this.resolvePath(d);
        const hasFiles = Object.keys(this.state.workingDirectory).some(f => f.startsWith(path + '/'));
        if (hasFiles) {
          this.out('error', `rmdir: ${d}: Directory not empty`);
        } else {
          this.state.directories.delete(path);
          this.out('success', `Removed directory: ${path}`);
        }
      }
      return this.outputLines;
    }

    // ls - list with directory support
    if (trimmed === 'ls' || trimmed.startsWith('ls ')) {
      const args = parseArgs(trimmed.substring(2).trim());
      const showAll = args.includes('-a') || args.includes('-la') || args.includes('-al');
      const showLong = args.includes('-l') || args.includes('-la') || args.includes('-al');
      const target = args.find(a => !a.startsWith('-')) || '.';
      const dir = target === '.' ? this.state.currentDirectory : this.resolvePath(target);

      if (showAll && this.state.initialized) this.out('output', `${showLong ? 'drwxr-xr-x  ' : ''}${showLong ? '.git/' : '.git/'}`);
      
      const subDirs = this.getDirsInDir(dir);
      for (const sd of subDirs) {
        this.out('info', `${showLong ? 'drwxr-xr-x  ' : ''}${sd}/`);
      }
      const files = this.getFilesInDir(dir);
      for (const f of files) {
        const name = dir === '.' || dir === '' ? f : f.replace(dir + '/', '');
        const content = this.state.workingDirectory[f] || '';
        this.out('output', `${showLong ? `-rw-r--r--  ${String(content.length).padStart(5)}B  ` : ''}${name}`);
      }
      if (subDirs.length === 0 && files.length === 0) this.out('info', '(empty directory)');
      return this.outputLines;
    }

    // rm - remove files with glob and recursive support
    if (trimmed.startsWith('rm ')) {
      const args = parseArgs(trimmed.substring(3));
      const recursive = args.includes('-r') || args.includes('-rf') || args.includes('-fr');
      const force = args.includes('-f') || args.includes('-rf') || args.includes('-fr');
      const targets = args.filter(a => !a.startsWith('-'));
      for (const t of targets) {
        const path = this.resolvePath(t);
        if (this.state.workingDirectory[path] !== undefined) {
          delete this.state.workingDirectory[path];
          this.out('success', `Removed ${path}`);
        } else if (recursive) {
          const prefix = path.endsWith('/') ? path : path + '/';
          const toRemove = Object.keys(this.state.workingDirectory).filter(f => f === path || f.startsWith(prefix));
          if (toRemove.length > 0) {
            toRemove.forEach(f => delete this.state.workingDirectory[f]);
            this.state.directories.delete(path);
            this.out('success', `Removed ${path}/ (${toRemove.length} file${toRemove.length > 1 ? 's' : ''})`);
          } else if (!force) {
            this.out('error', `rm: ${t}: No such file or directory`);
          }
        } else {
          if (!force) this.out('error', `rm: ${t}: No such file or directory`);
        }
      }
      return this.outputLines;
    }

    // mv - move/rename files
    if (trimmed.startsWith('mv ') && !trimmed.startsWith('mv -')) {
      const args = parseArgs(trimmed.substring(3));
      if (args.length < 2) { this.out('error', 'usage: mv <source> <dest>'); return this.outputLines; }
      const src = this.resolvePath(args[0]);
      const dst = this.resolvePath(args[1]);
      if (this.state.workingDirectory[src] !== undefined) {
        this.state.workingDirectory[dst] = this.state.workingDirectory[src];
        delete this.state.workingDirectory[src];
        this.out('success', `Renamed: ${src} → ${dst}`);
      } else {
        // Try renaming a directory
        const prefix = src + '/';
        const toMove = Object.keys(this.state.workingDirectory).filter(f => f.startsWith(prefix));
        if (toMove.length > 0) {
          toMove.forEach(f => {
            this.state.workingDirectory[f.replace(prefix, dst + '/')] = this.state.workingDirectory[f];
            delete this.state.workingDirectory[f];
          });
          this.state.directories.delete(src);
          this.state.directories.add(dst);
          this.out('success', `Renamed: ${src}/ → ${dst}/`);
        } else {
          this.out('error', `mv: ${args[0]}: No such file or directory`);
        }
      }
      return this.outputLines;
    }

    // cp - copy files
    if (trimmed.startsWith('cp ')) {
      const args = parseArgs(trimmed.substring(3));
      const recursive = args.includes('-r') || args.includes('-R');
      const sources = args.filter(a => !a.startsWith('-'));
      if (sources.length < 2) { this.out('error', 'usage: cp [-r] <source> <dest>'); return this.outputLines; }
      const dst = this.resolvePath(sources[sources.length - 1]);
      for (let i = 0; i < sources.length - 1; i++) {
        const src = this.resolvePath(sources[i]);
        if (this.state.workingDirectory[src] !== undefined) {
          this.state.workingDirectory[dst] = this.state.workingDirectory[src];
          this.out('success', `Copied: ${src} → ${dst}`);
        } else if (recursive) {
          const prefix = src + '/';
          const toCopy = Object.keys(this.state.workingDirectory).filter(f => f.startsWith(prefix));
          toCopy.forEach(f => {
            this.state.workingDirectory[f.replace(prefix, dst + '/')] = this.state.workingDirectory[f];
          });
          if (toCopy.length > 0) this.out('success', `Copied: ${src}/ → ${dst}/ (${toCopy.length} files)`);
          else this.out('error', `cp: ${sources[i]}: No such file or directory`);
        } else {
          this.out('error', `cp: ${sources[i]}: No such file or directory`);
        }
      }
      return this.outputLines;
    }

    // pwd
    if (trimmed === 'pwd') {
      const cwd = this.state.currentDirectory;
      this.out('output', `/home/user/project${cwd !== '.' ? '/' + cwd : ''}`);
      return this.outputLines;
    }

    // cd - change directory
    if (trimmed === 'cd' || trimmed.startsWith('cd ')) {
      const target = trimmed === 'cd' ? '.' : trimmed.substring(3).trim();
      if (target === '.' || target === '~' || target === '/' || target === '') {
        this.state.currentDirectory = '.';
      } else if (target === '..') {
        const parts = this.state.currentDirectory.split('/');
        parts.pop();
        this.state.currentDirectory = parts.length > 0 ? parts.join('/') : '.';
      } else {
        const resolved = this.resolvePath(target);
        const dirExists = this.state.directories.has(resolved) || 
          Object.keys(this.state.workingDirectory).some(f => f.startsWith(resolved + '/'));
        if (dirExists) {
          this.state.currentDirectory = resolved;
        } else {
          this.out('error', `cd: ${target}: No such directory`);
        }
      }
      return this.outputLines;
    }

    // head - show first N lines
    if (trimmed.startsWith('head ')) {
      const args = parseArgs(trimmed.substring(5));
      let n = 10;
      const nIdx = args.indexOf('-n');
      if (nIdx !== -1 && args[nIdx + 1]) n = parseInt(args[nIdx + 1]) || 10;
      const file = args.find(a => !a.startsWith('-') && a !== String(n));
      if (file) {
        const path = this.resolvePath(file);
        const content = this.state.workingDirectory[path];
        if (content !== undefined) {
          this.out('output', content.split('\n').slice(0, n).join('\n'));
        } else {
          this.out('error', `head: ${file}: No such file`);
        }
      }
      return this.outputLines;
    }

    // tail - show last N lines
    if (trimmed.startsWith('tail ')) {
      const args = parseArgs(trimmed.substring(5));
      let n = 10;
      const nIdx = args.indexOf('-n');
      if (nIdx !== -1 && args[nIdx + 1]) n = parseInt(args[nIdx + 1]) || 10;
      const file = args.find(a => !a.startsWith('-') && a !== String(n));
      if (file) {
        const path = this.resolvePath(file);
        const content = this.state.workingDirectory[path];
        if (content !== undefined) {
          const lns = content.split('\n');
          this.out('output', lns.slice(Math.max(0, lns.length - n)).join('\n'));
        } else {
          this.out('error', `tail: ${file}: No such file`);
        }
      }
      return this.outputLines;
    }

    // wc - word/line/char count
    if (trimmed.startsWith('wc ')) {
      const args = parseArgs(trimmed.substring(3));
      const file = args.find(a => !a.startsWith('-'));
      if (file) {
        const path = this.resolvePath(file);
        const content = this.state.workingDirectory[path];
        if (content !== undefined) {
          const lns = content.split('\n');
          const words = content.split(/\s+/).filter(Boolean);
          if (args.includes('-l')) this.out('output', `${lns.length} ${file}`);
          else if (args.includes('-w')) this.out('output', `${words.length} ${file}`);
          else if (args.includes('-c')) this.out('output', `${content.length} ${file}`);
          else this.out('output', `  ${lns.length}  ${words.length}  ${content.length} ${file}`);
        } else {
          this.out('error', `wc: ${file}: No such file`);
        }
      }
      return this.outputLines;
    }

    // grep - search file content
    if (trimmed.startsWith('grep ')) {
      const args = parseArgs(trimmed.substring(5));
      const caseInsensitive = args.includes('-i');
      const showLineNums = args.includes('-n');
      const invertMatch = args.includes('-v');
      const countOnly = args.includes('-c');
      const parts = args.filter(a => !a.startsWith('-'));
      const pattern = parts[0] || '';
      const targets = parts.slice(1);
      
      const searchFiles = targets.length > 0 
        ? targets.map(t => this.resolvePath(t))
        : Object.keys(this.state.workingDirectory);

      for (const filePath of searchFiles) {
        const content = this.state.workingDirectory[filePath];
        if (content === undefined) { this.out('error', `grep: ${filePath}: No such file`); continue; }
        const lines = content.split('\n');
        const matchingLines: string[] = [];
        lines.forEach((l, idx) => {
          const matches = caseInsensitive 
            ? l.toLowerCase().includes(pattern.toLowerCase())
            : l.includes(pattern);
          if (invertMatch ? !matches : matches) {
            const prefix = targets.length > 1 ? `${filePath}:` : '';
            const lineNum = showLineNums ? `${idx + 1}:` : '';
            matchingLines.push(`${prefix}${lineNum}${l}`);
          }
        });
        if (countOnly) {
          this.out('output', `${targets.length > 1 ? filePath + ':' : ''}${matchingLines.length}`);
        } else {
          matchingLines.forEach(m => this.out('success', m));
        }
      }
      return this.outputLines;
    }

    // find - find files
    if (trimmed.startsWith('find ')) {
      const args = parseArgs(trimmed.substring(5));
      const namePattern = args.includes('-name') ? args[args.indexOf('-name') + 1] : null;
      const typeFilter = args.includes('-type') ? args[args.indexOf('-type') + 1] : null;
      const startDir = args.find(a => !a.startsWith('-') && a !== namePattern && a !== typeFilter) || '.';
      
      for (const filePath of Object.keys(this.state.workingDirectory)) {
        if (startDir !== '.' && !filePath.startsWith(startDir)) continue;
        const fileName = filePath.split('/').pop() || '';
        if (typeFilter === 'd') continue; // files are not dirs
        if (namePattern) {
          const regex = new RegExp('^' + namePattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
          if (!regex.test(fileName)) continue;
        }
        this.out('output', `./${filePath}`);
      }
      if (typeFilter === 'd' || !typeFilter) {
        for (const d of this.state.directories) {
          if (startDir !== '.' && !d.startsWith(startDir)) continue;
          const dName = d.split('/').pop() || '';
          if (namePattern) {
            const regex = new RegExp('^' + namePattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
            if (!regex.test(dName)) continue;
          }
          this.out('info', `./${d}/`);
        }
      }
      return this.outputLines;
    }

    // tree - visual directory tree
    if (trimmed === 'tree' || trimmed.startsWith('tree ')) {
      const files = Object.keys(this.state.workingDirectory).sort();
      const dirSet = new Set<string>();
      files.forEach(f => {
        const parts = f.split('/');
        for (let i = 1; i < parts.length; i++) dirSet.add(parts.slice(0, i).join('/'));
      });
      this.out('output', '.');
      if (this.state.initialized) this.out('info', '├── .git/');
      const allEntries = [...Array.from(dirSet).map(d => ({ path: d, isDir: true })), ...files.map(f => ({ path: f, isDir: false }))];
      allEntries.sort((a, b) => a.path.localeCompare(b.path));
      const printed = new Set<string>();
      for (const entry of allEntries) {
        if (printed.has(entry.path)) continue;
        printed.add(entry.path);
        const depth = entry.path.split('/').length - 1;
        const indent = '│   '.repeat(depth);
        const name = entry.path.split('/').pop();
        this.out(entry.isDir ? 'info' : 'output', `${indent}├── ${name}${entry.isDir ? '/' : ''}`);
      }
      const dirCount = dirSet.size;
      const fileCount = files.length;
      this.out('info', `\n${dirCount} director${dirCount !== 1 ? 'ies' : 'y'}, ${fileCount} file${fileCount !== 1 ? 's' : ''}`);
      return this.outputLines;
    }

    // sort - sort file lines
    if (trimmed.startsWith('sort ')) {
      const args = parseArgs(trimmed.substring(5));
      const reverse = args.includes('-r');
      const unique = args.includes('-u');
      const file = args.find(a => !a.startsWith('-'));
      if (file) {
        const path = this.resolvePath(file);
        const content = this.state.workingDirectory[path];
        if (content !== undefined) {
          let lines = content.split('\n').sort();
          if (reverse) lines.reverse();
          if (unique) lines = [...new Set(lines)];
          this.out('output', lines.join('\n'));
        } else {
          this.out('error', `sort: ${file}: No such file`);
        }
      }
      return this.outputLines;
    }

    // uniq - remove consecutive duplicates
    if (trimmed.startsWith('uniq ')) {
      const args = parseArgs(trimmed.substring(5));
      const countFlag = args.includes('-c');
      const file = args.find(a => !a.startsWith('-'));
      if (file) {
        const path = this.resolvePath(file);
        const content = this.state.workingDirectory[path];
        if (content !== undefined) {
          const lines = content.split('\n');
          const result: string[] = [];
          const counts: number[] = [];
          for (const l of lines) {
            if (result[result.length - 1] === l) { counts[counts.length - 1]++; }
            else { result.push(l); counts.push(1); }
          }
          if (countFlag) {
            result.forEach((l, i) => this.out('output', `${String(counts[i]).padStart(4)} ${l}`));
          } else {
            this.out('output', result.join('\n'));
          }
        } else {
          this.out('error', `uniq: ${file}: No such file`);
        }
      }
      return this.outputLines;
    }

    // sed - stream editor (simple s/old/new/g)
    if (trimmed.startsWith('sed ')) {
      const args = parseArgs(trimmed.substring(4));
      const inPlace = args.includes('-i');
      const parts = args.filter(a => !a.startsWith('-'));
      const expr = parts[0] || '';
      const file = parts[1];
      const sedMatch = expr.match(/^s\/(.+?)\/(.*)\/([gi]*)$/);
      if (sedMatch && file) {
        const path = this.resolvePath(file);
        const content = this.state.workingDirectory[path];
        if (content !== undefined) {
          const [, searchStr, replaceStr, flags] = sedMatch;
          const regex = new RegExp(searchStr, flags || 'g');
          const result = content.replace(regex, replaceStr);
          if (inPlace) {
            this.state.workingDirectory[path] = result;
            this.out('success', `Modified ${path} in-place`);
          } else {
            this.out('output', result);
          }
        } else {
          this.out('error', `sed: ${file}: No such file`);
        }
      } else {
        this.out('error', 'usage: sed [-i] "s/old/new/g" <file>');
      }
      return this.outputLines;
    }

    // diff (non-git) between two files
    if (trimmed.startsWith('diff ') && !trimmed.startsWith('diff --git')) {
      const args = parseArgs(trimmed.substring(5)).filter(a => !a.startsWith('-'));
      if (args.length >= 2) {
        const c1 = this.state.workingDirectory[this.resolvePath(args[0])];
        const c2 = this.state.workingDirectory[this.resolvePath(args[1])];
        if (c1 === undefined) { this.out('error', `diff: ${args[0]}: No such file`); return this.outputLines; }
        if (c2 === undefined) { this.out('error', `diff: ${args[1]}: No such file`); return this.outputLines; }
        if (c1 === c2) { this.out('info', 'Files are identical'); return this.outputLines; }
        const d = diffStrings(c1, c2);
        d.forEach(l => {
          if (l.startsWith('+')) this.out('success', l);
          else if (l.startsWith('-')) this.out('error', l);
          else this.out('output', l);
        });
      } else {
        this.out('error', 'usage: diff <file1> <file2>');
      }
      return this.outputLines;
    }

    // chmod - simulated
    if (trimmed.startsWith('chmod ')) {
      const args = parseArgs(trimmed.substring(6));
      const target = args[args.length - 1];
      if (target && this.state.workingDirectory[this.resolvePath(target)] !== undefined) {
        this.out('success', `Mode changed for ${target}`);
      } else {
        this.out('error', `chmod: ${target}: No such file`);
      }
      return this.outputLines;
    }

    // whoami / id
    if (trimmed === 'whoami') { this.out('output', this.state.config['user.name'] || 'developer'); return this.outputLines; }
    if (trimmed === 'id') { this.out('output', `uid=1000(${this.state.config['user.name'] || 'developer'}) gid=1000(staff)`); return this.outputLines; }

    // date
    if (trimmed === 'date') { this.out('output', new Date().toString()); return this.outputLines; }

    // hostname
    if (trimmed === 'hostname') { this.out('output', 'gitsim-workstation'); return this.outputLines; }

    // uname
    if (trimmed === 'uname' || trimmed === 'uname -a') { this.out('output', 'GitSim 1.0.0 gitsim-workstation x86_64'); return this.outputLines; }

    // which
    if (trimmed.startsWith('which ')) {
      const cmd = trimmed.substring(6).trim();
      const builtins = ['git', 'ls', 'cd', 'cat', 'echo', 'touch', 'mkdir', 'rm', 'cp', 'mv', 'pwd', 'grep', 'find', 'sort', 'head', 'tail', 'wc', 'sed', 'uniq', 'tree', 'diff', 'chmod', 'whoami', 'date', 'clear', 'history', 'alias', 'export', 'env'];
      if (builtins.includes(cmd)) this.out('output', `/usr/bin/${cmd}`);
      else this.out('error', `${cmd}: not found`);
      return this.outputLines;
    }

    // man - manual pages
    if (trimmed.startsWith('man ')) {
      const cmd = trimmed.substring(4).trim();
      this.showManPage(cmd);
      return this.outputLines;
    }

    // history
    if (trimmed === 'history') {
      this.out('info', 'Command history is tracked in the Lessons > History tab.');
      return this.outputLines;
    }

    // alias
    if (trimmed === 'alias' || trimmed.startsWith('alias ')) {
      if (trimmed === 'alias') {
        if (Object.keys(this.state.aliases).length === 0) {
          this.out('info', 'No aliases defined. Use: alias name="command"');
        } else {
          for (const [k, v] of Object.entries(this.state.aliases)) {
            this.out('output', `alias ${k}='${v}'`);
          }
        }
      } else {
        const match = trimmed.match(/alias\s+(\w+)=["']?(.+?)["']?$/);
        if (match) {
          this.state.aliases[match[1]] = match[2];
          this.out('success', `Alias set: ${match[1]} → ${match[2]}`);
        } else {
          this.out('error', 'usage: alias name="command"');
        }
      }
      return this.outputLines;
    }

    // unalias
    if (trimmed.startsWith('unalias ')) {
      const name = trimmed.substring(8).trim();
      if (this.state.aliases[name]) {
        delete this.state.aliases[name];
        this.out('success', `Removed alias: ${name}`);
      } else {
        this.out('error', `unalias: ${name}: not found`);
      }
      return this.outputLines;
    }

    // export - set env vars
    if (trimmed.startsWith('export ')) {
      const match = trimmed.match(/export\s+(\w+)=["']?(.+?)["']?$/);
      if (match) {
        this.state.env[match[1]] = match[2];
        this.out('success', `${match[1]}=${match[2]}`);
      } else {
        this.out('error', 'usage: export VAR=value');
      }
      return this.outputLines;
    }

    // env / printenv
    if (trimmed === 'env' || trimmed === 'printenv') {
      for (const [k, v] of Object.entries(this.state.env)) this.out('output', `${k}=${v}`);
      return this.outputLines;
    }

    // xargs - simple simulation
    if (trimmed.startsWith('xargs ')) {
      this.out('info', 'xargs is simulated. Use pipe (|) syntax for chaining commands.');
      return this.outputLines;
    }

    // printf
    if (trimmed.startsWith('printf ')) {
      const content = trimmed.substring(7).replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      this.out('output', content);
      return this.outputLines;
    }

    // basename / dirname
    if (trimmed.startsWith('basename ')) { this.out('output', trimmed.substring(9).trim().split('/').pop() || ''); return this.outputLines; }
    if (trimmed.startsWith('dirname ')) { const p = trimmed.substring(8).trim().split('/'); p.pop(); this.out('output', p.join('/') || '.'); return this.outputLines; }

    // du - disk usage simulation
    if (trimmed.startsWith('du ') || trimmed === 'du') {
      let total = 0;
      for (const [f, c] of Object.entries(this.state.workingDirectory)) {
        total += c.length;
        this.out('output', `${c.length}\t./${f}`);
      }
      this.out('info', `${total}\ttotal`);
      return this.outputLines;
    }

    // stat - file info
    if (trimmed.startsWith('stat ')) {
      const file = trimmed.substring(5).trim();
      const path = this.resolvePath(file);
      const content = this.state.workingDirectory[path];
      if (content !== undefined) {
        this.out('output', `  File: ${path}`);
        this.out('output', `  Size: ${content.length}\tBlocks: ${Math.ceil(content.length / 512)}`);
        this.out('output', `  Type: regular file`);
        this.out('output', `  Lines: ${content.split('\n').length}`);
        this.out('output', `  Words: ${content.split(/\s+/).filter(Boolean).length}`);
      } else {
        this.out('error', `stat: ${file}: No such file`);
      }
      return this.outputLines;
    }

    // file - detect type
    if (trimmed.startsWith('file ')) {
      const file = trimmed.substring(5).trim();
      const path = this.resolvePath(file);
      const content = this.state.workingDirectory[path];
      if (content !== undefined) {
        const ext = file.split('.').pop() || '';
        const typeMap: Record<string, string> = {
          js: 'JavaScript source', ts: 'TypeScript source', json: 'JSON data',
          md: 'Markdown document', txt: 'ASCII text', html: 'HTML document',
          css: 'CSS stylesheet', py: 'Python script', rb: 'Ruby script',
          sh: 'Bourne shell script', yml: 'YAML data', yaml: 'YAML data',
          xml: 'XML document', svg: 'SVG image', csv: 'CSV text',
        };
        this.out('output', `${file}: ${typeMap[ext] || 'ASCII text'}, ${content.length} bytes`);
      } else {
        this.out('error', `file: ${file}: No such file`);
      }
      return this.outputLines;
    }

    // tee - write to file and stdout
    if (trimmed.startsWith('tee ')) {
      const file = trimmed.substring(4).trim();
      this.out('info', `tee: ready to write to ${file} (use pipe for input)`);
      return this.outputLines;
    }

    // true / false
    if (trimmed === 'true') return this.outputLines;
    if (trimmed === 'false') { this.out('error', ''); return this.outputLines; }

    // ──── Git Commands ────
    if (!trimmed.startsWith('git ')) {
      this.out('error', `Command not found: ${trimmed.split(' ')[0]}. Type 'help' for available commands.`);
      return this.outputLines;
    }

    const args = parseArgs(trimmed.substring(4));
    if (args.length === 0) { this.showGitHelp(); return this.outputLines; }

    const command = args[0];
    const subArgs = args.slice(1);

    try {
      switch (command) {
        case 'init': this.gitInit(subArgs); break;
        case 'add': this.gitAdd(subArgs); break;
        case 'commit': this.gitCommit(subArgs); break;
        case 'status': this.gitStatus(subArgs); break;
        case 'log': this.gitLog(subArgs); break;
        case 'branch': this.gitBranch(subArgs); break;
        case 'checkout': this.gitCheckout(subArgs); break;
        case 'switch': this.gitSwitch(subArgs); break;
        case 'merge': this.gitMerge(subArgs); break;
        case 'rebase': this.gitRebase(subArgs); break;
        case 'diff': this.gitDiff(subArgs); break;
        case 'stash': this.gitStash(subArgs); break;
        case 'tag': this.gitTag(subArgs); break;
        case 'remote': this.gitRemote(subArgs); break;
        case 'push': this.gitPush(subArgs); break;
        case 'pull': this.gitPull(subArgs); break;
        case 'fetch': this.gitFetch(subArgs); break;
        case 'clone': this.gitClone(subArgs); break;
        case 'reset': this.gitReset(subArgs); break;
        case 'revert': this.gitRevert(subArgs); break;
        case 'cherry-pick': this.gitCherryPick(subArgs); break;
        case 'show': this.gitShow(subArgs); break;
        case 'rm': this.gitRm(subArgs); break;
        case 'mv': this.gitMv(subArgs); break;
        case 'config': this.gitConfig(subArgs); break;
        case 'reflog': this.gitReflog(subArgs); break;
        case 'blame': this.gitBlame(subArgs); break;
        case 'restore': this.gitRestore(subArgs); break;
        case 'clean': this.gitClean(subArgs); break;
        case 'shortlog': this.gitShortlog(subArgs); break;
        case 'describe': this.gitDescribe(subArgs); break;
        case 'rev-parse': this.gitRevParse(subArgs); break;
        case 'count-objects': this.gitCountObjects(); break;
        case 'fsck': this.gitFsck(); break;
        case 'gc': this.gitGc(); break;
        case 'help': this.showGitHelp(); break;
        default:
          this.out('error', `git: '${command}' is not a git command. See 'git help'.`);
      }
    } catch (err: any) {
      this.out('error', `Error: ${err.message}`);
    }

    return this.outputLines;
  }

  private requireInit() {
    if (!this.state.initialized) {
      throw new Error('fatal: not a git repository (or any of the parent directories): .git');
    }
  }

  private gitInit(args: string[]) {
    if (this.state.initialized) {
      this.out('warning', 'Reinitialized existing Git repository in /home/user/project/.git/');
      return;
    }
    
    const defaultBranch = args.includes('-b') ? args[args.indexOf('-b') + 1] : 'main';
    
    this.state.initialized = true;
    this.state.currentBranch = defaultBranch;
    this.state.branches[defaultBranch] = {
      name: defaultBranch,
      commitHash: '',
      isRemote: false,
    };
    this.state.HEAD = defaultBranch;
    this.state.detachedHead = false;

    this.out('success', `Initialized empty Git repository in /home/user/project/.git/`);
    this.out('info', `Default branch: ${defaultBranch}`);
  }

  private gitAdd(args: string[]) {
    this.requireInit();
    
    if (args.length === 0) {
      this.out('error', 'Nothing specified, nothing added.');
      return;
    }

    if (args[0] === '.' || args[0] === '-A' || args[0] === '--all') {
      const files = Object.keys(this.state.workingDirectory);
      let count = 0;
      
      // Add all working directory files
      for (const file of files) {
        const headCommit = this.getHeadCommit();
        const committedContent = headCommit?.files[file];
        const workingContent = this.state.workingDirectory[file];
        
        if (committedContent !== workingContent || this.state.stagingArea[file] !== workingContent) {
          this.state.stagingArea[file] = workingContent;
          count++;
        }
      }
      
      // Handle deleted files
      const headCommit = this.getHeadCommit();
      if (headCommit) {
        for (const file of Object.keys(headCommit.files)) {
          if (this.state.workingDirectory[file] === undefined) {
            this.state.stagingArea[file] = '__DELETED__';
            count++;
          }
        }
      }
      
      if (count > 0) {
        this.out('success', `Added ${count} file(s) to staging area`);
      } else {
        this.out('info', 'Nothing to add - working tree clean');
      }
    } else {
      for (const file of args) {
        if (file.startsWith('-')) continue;
        if (this.state.workingDirectory[file] !== undefined) {
          this.state.stagingArea[file] = this.state.workingDirectory[file];
          this.out('success', `Added '${file}' to staging area`);
        } else {
          // Check if file was deleted
          const headCommit = this.getHeadCommit();
          if (headCommit?.files[file] !== undefined) {
            this.state.stagingArea[file] = '__DELETED__';
            this.out('success', `Staged deletion of '${file}'`);
          } else {
            this.out('error', `fatal: pathspec '${file}' did not match any files`);
          }
        }
      }
    }
  }

  private gitCommit(args: string[]) {
    this.requireInit();

    let message = '';
    let amend = false;
    let allowEmpty = false;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-m' && i + 1 < args.length) {
        message = args[i + 1];
        i++;
      } else if (args[i] === '--amend') {
        amend = true;
      } else if (args[i] === '--allow-empty') {
        allowEmpty = true;
      }
    }

    if (!message) {
      this.out('error', 'Aborting commit due to empty commit message. Use -m "message"');
      return;
    }

    const stagedFiles = Object.keys(this.state.stagingArea);
    if (stagedFiles.length === 0 && !amend && !allowEmpty) {
      this.out('error', 'nothing to commit, working tree clean');
      this.out('info', 'Use "git add" to stage changes, or "git commit --allow-empty"');
      return;
    }

    const parentHash = this.getCurrentCommitHash();
    const parentCommit = parentHash ? this.state.commits[parentHash] : null;

    // Build file snapshot
    const files: Record<string, string> = {};
    if (parentCommit) {
      Object.assign(files, parentCommit.files);
    }

    for (const [path, content] of Object.entries(this.state.stagingArea)) {
      if (content === '__DELETED__') {
        delete files[path];
      } else {
        files[path] = content;
      }
    }

    if (amend && parentCommit) {
      // Amend: replace last commit
      const hash = generateHash();
      const commit: GitCommit = {
        hash,
        message,
        timestamp: Date.now(),
        parentHashes: parentCommit.parentHashes,
        files,
        author: this.state.config['user.name'] || 'Developer',
        branch: this.state.currentBranch,
      };

      delete this.state.commits[parentHash];
      this.state.commits[hash] = commit;

      if (!this.state.detachedHead) {
        this.state.branches[this.state.currentBranch].commitHash = hash;
      } else {
        this.state.HEAD = hash;
      }

      this.state.stagingArea = {};
      const changedCount = stagedFiles.length || Object.keys(parentCommit.files).length;
      this.out('success', `[${this.state.currentBranch} ${shortHash(hash)}] ${message} (amended)`);
      this.out('info', ` ${changedCount} file(s) changed`);
    } else {
      const hash = generateHash();
      const parentHashes = parentHash ? [parentHash] : [];
      
      if (this.state.mergeHead) {
        parentHashes.push(this.state.mergeHead);
      }

      const commit: GitCommit = {
        hash,
        message,
        timestamp: Date.now(),
        parentHashes,
        files,
        author: this.state.config['user.name'] || 'Developer',
        branch: this.state.currentBranch,
      };

      this.state.commits[hash] = commit;

      if (!this.state.detachedHead) {
        this.state.branches[this.state.currentBranch].commitHash = hash;
      } else {
        this.state.HEAD = hash;
      }

      this.state.stagingArea = {};
      this.state.mergeHead = null;

      const isRoot = parentHashes.length === 0;
      this.out('success', `[${this.state.currentBranch} ${isRoot ? '(root-commit) ' : ''}${shortHash(hash)}] ${message}`);
      this.out('info', ` ${stagedFiles.length} file(s) changed`);
    }
  }

  private gitStatus(_args: string[]) {
    this.requireInit();

    this.out('info', `On branch ${this.state.currentBranch}`);

    if (this.state.mergeHead) {
      this.out('warning', 'You have unmerged paths.');
    }

    const headCommit = this.getHeadCommit();
    const committedFiles = headCommit?.files || {};

    // Staged changes
    const stagedEntries: string[] = [];
    for (const [path, content] of Object.entries(this.state.stagingArea)) {
      if (content === '__DELETED__') {
        stagedEntries.push(`\tdeleted:    ${path}`);
      } else if (committedFiles[path] === undefined) {
        stagedEntries.push(`\tnew file:   ${path}`);
      } else if (committedFiles[path] !== content) {
        stagedEntries.push(`\tmodified:   ${path}`);
      }
    }

    if (stagedEntries.length > 0) {
      this.out('success', 'Changes to be committed:');
      this.out('info', '  (use "git restore --staged <file>..." to unstage)');
      stagedEntries.forEach(e => this.out('success', e));
      this.out('output', '');
    }

    // Modified but not staged
    const modifiedEntries: string[] = [];
    for (const [path, content] of Object.entries(this.state.workingDirectory)) {
      const stagedContent = this.state.stagingArea[path];
      const commitContent = committedFiles[path];
      const compareWith = stagedContent !== undefined ? stagedContent : commitContent;
      
      if (compareWith !== undefined && compareWith !== '__DELETED__' && content !== compareWith) {
        modifiedEntries.push(`\tmodified:   ${path}`);
      }
    }

    // Deleted in working dir
    for (const path of Object.keys(committedFiles)) {
      if (this.state.workingDirectory[path] === undefined && this.state.stagingArea[path] !== '__DELETED__') {
        modifiedEntries.push(`\tdeleted:    ${path}`);
      }
    }

    if (modifiedEntries.length > 0) {
      this.out('warning', 'Changes not staged for commit:');
      this.out('info', '  (use "git add <file>..." to update what will be committed)');
      modifiedEntries.forEach(e => this.out('warning', e));
      this.out('output', '');
    }

    // Untracked files
    const untrackedFiles: string[] = [];
    for (const path of Object.keys(this.state.workingDirectory)) {
      if (committedFiles[path] === undefined && this.state.stagingArea[path] === undefined) {
        untrackedFiles.push(`\t${path}`);
      }
    }

    if (untrackedFiles.length > 0) {
      this.out('error', 'Untracked files:');
      this.out('info', '  (use "git add <file>..." to include in what will be committed)');
      untrackedFiles.forEach(e => this.out('error', e));
      this.out('output', '');
    }

    if (stagedEntries.length === 0 && modifiedEntries.length === 0 && untrackedFiles.length === 0) {
      this.out('success', 'nothing to commit, working tree clean');
    }
  }

  private gitLog(args: string[]) {
    this.requireInit();

    const oneline = args.includes('--oneline');
    const graph = args.includes('--graph');
    const all = args.includes('--all');
    let limit = 20;
    
    const nIndex = args.indexOf('-n');
    if (nIndex !== -1 && nIndex + 1 < args.length) {
      limit = parseInt(args[nIndex + 1]) || 20;
    }

    const currentHash = this.getCurrentCommitHash();
    if (!currentHash) {
      this.out('error', 'fatal: your current branch does not have any commits yet');
      return;
    }

    let allCommits: GitCommit[];
    
    if (all) {
      const allHashes = new Set<string>();
      for (const branch of Object.values(this.state.branches)) {
        if (branch.commitHash) {
          const history = this.getCommitHistory(branch.commitHash, limit);
          history.forEach(c => allHashes.add(c.hash));
        }
      }
      allCommits = Array.from(allHashes)
        .map(h => this.state.commits[h])
        .filter(Boolean)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    } else {
      allCommits = this.getCommitHistory(currentHash, limit);
    }

    // Find which branches point to which commits
    const branchMap: Record<string, string[]> = {};
    for (const [name, branch] of Object.entries(this.state.branches)) {
      if (!branch.isRemote) {
        if (!branchMap[branch.commitHash]) branchMap[branch.commitHash] = [];
        branchMap[branch.commitHash].push(name);
      }
    }
    
    const tagMap: Record<string, string[]> = {};
    for (const [name, tag] of Object.entries(this.state.tags)) {
      if (!tagMap[tag.commitHash]) tagMap[tag.commitHash] = [];
      tagMap[tag.commitHash].push(name);
    }

    for (const commit of allCommits) {
      const isHead = commit.hash === currentHash;
      const refs: string[] = [];
      
      if (isHead && !this.state.detachedHead) {
        refs.push(`HEAD -> ${this.state.currentBranch}`);
      } else if (isHead) {
        refs.push('HEAD');
      }
      
      const branches = branchMap[commit.hash] || [];
      for (const b of branches) {
        if (!isHead || b !== this.state.currentBranch) {
          refs.push(b);
        }
      }
      
      const tags = tagMap[commit.hash] || [];
      for (const t of tags) {
        refs.push(`tag: ${t}`);
      }

      const refStr = refs.length > 0 ? ` (${refs.join(', ')})` : '';
      const prefix = graph ? '* ' : '';

      if (oneline) {
        this.out('output', `${prefix}${shortHash(commit.hash)}${refStr} ${commit.message}`);
      } else {
        this.out('warning', `${prefix}commit ${commit.hash}${refStr}`);
        if (commit.parentHashes.length > 1) {
          this.out('output', `Merge: ${commit.parentHashes.map(shortHash).join(' ')}`);
        }
        this.out('output', `Author: ${commit.author} <${this.state.config['user.email'] || 'dev@example.com'}>`);
        this.out('output', `Date:   ${formatTimestamp(commit.timestamp)}`);
        this.out('output', '');
        this.out('output', `    ${commit.message}`);
        this.out('output', '');
      }
    }
  }

  private gitBranch(args: string[]) {
    this.requireInit();

    const deleteFlag = args.includes('-d') || args.includes('-D');
    const moveFlag = args.includes('-m') || args.includes('-M');
    const allFlag = args.includes('-a') || args.includes('--all');
    const verboseFlag = args.includes('-v') || args.includes('--verbose');

    // Filter out flags
    const names = args.filter(a => !a.startsWith('-'));

    if (deleteFlag && names.length > 0) {
      const branchName = names[0];
      if (branchName === this.state.currentBranch) {
        this.out('error', `error: Cannot delete branch '${branchName}' checked out`);
        return;
      }
      if (!this.state.branches[branchName]) {
        this.out('error', `error: branch '${branchName}' not found.`);
        return;
      }
      delete this.state.branches[branchName];
      this.out('success', `Deleted branch ${branchName}`);
      return;
    }

    if (moveFlag && names.length >= 1) {
      const oldName = names.length >= 2 ? names[0] : this.state.currentBranch;
      const newName = names.length >= 2 ? names[1] : names[0];
      
      if (!this.state.branches[oldName]) {
        this.out('error', `error: branch '${oldName}' not found.`);
        return;
      }
      
      this.state.branches[newName] = { ...this.state.branches[oldName], name: newName };
      delete this.state.branches[oldName];
      
      if (this.state.currentBranch === oldName) {
        this.state.currentBranch = newName;
      }
      
      this.out('success', `Branch '${oldName}' renamed to '${newName}'`);
      return;
    }

    if (names.length > 0 && !deleteFlag && !moveFlag) {
      // Create new branch
      const branchName = names[0];
      const startPoint = names[1] ? this.resolveRef(names[1]) : this.getCurrentCommitHash();
      
      if (this.state.branches[branchName]) {
        this.out('error', `fatal: A branch named '${branchName}' already exists.`);
        return;
      }

      this.state.branches[branchName] = {
        name: branchName,
        commitHash: startPoint || '',
        isRemote: false,
      };
      this.out('success', `Created branch '${branchName}'`);
      return;
    }

    // List branches
    const branches = Object.values(this.state.branches)
      .filter(b => allFlag || !b.isRemote)
      .sort((a, b) => a.name.localeCompare(b.name));

    if (branches.length === 0) {
      this.out('info', 'No branches yet');
      return;
    }

    for (const branch of branches) {
      const isCurrent = branch.name === this.state.currentBranch && !this.state.detachedHead;
      const prefix = isCurrent ? '* ' : '  ';
      const color = isCurrent ? 'success' : (branch.isRemote ? 'error' : 'output');
      
      let extra = '';
      if (verboseFlag && branch.commitHash) {
        const commit = this.state.commits[branch.commitHash];
        if (commit) {
          extra = ` ${shortHash(commit.hash)} ${commit.message}`;
        }
      }
      
      this.out(color as TerminalLine['type'], `${prefix}${branch.isRemote ? 'remotes/' : ''}${branch.name}${extra}`);
    }
  }

  private gitCheckout(args: string[]) {
    this.requireInit();

    const createBranch = args.includes('-b');
    const names = args.filter(a => !a.startsWith('-'));

    if (names.length === 0) {
      this.out('error', 'error: you need to specify a branch or commit');
      return;
    }

    const target = names[0];

    if (createBranch) {
      const startPoint = names[1] ? this.resolveRef(names[1]) : this.getCurrentCommitHash();
      
      if (this.state.branches[target]) {
        this.out('error', `fatal: A branch named '${target}' already exists.`);
        return;
      }

      this.state.branches[target] = {
        name: target,
        commitHash: startPoint || '',
        isRemote: false,
      };
      this.state.currentBranch = target;
      this.state.HEAD = target;
      this.state.detachedHead = false;

      // Update working directory
      if (startPoint) {
        const commit = this.state.commits[startPoint];
        if (commit) {
          this.state.workingDirectory = { ...commit.files };
        }
      }

      this.out('success', `Switched to a new branch '${target}'`);
      return;
    }

    // Check if it's a branch
    if (this.state.branches[target]) {
      const branch = this.state.branches[target];
      this.state.currentBranch = target;
      this.state.HEAD = target;
      this.state.detachedHead = false;

      if (branch.commitHash) {
        const commit = this.state.commits[branch.commitHash];
        if (commit) {
          this.state.workingDirectory = { ...commit.files };
          this.state.stagingArea = {};
        }
      }

      this.out('success', `Switched to branch '${target}'`);
      return;
    }

    // Check if it's a commit
    const hash = this.resolveRef(target);
    if (hash) {
      this.state.HEAD = hash;
      this.state.detachedHead = true;

      const commit = this.state.commits[hash];
      if (commit) {
        this.state.workingDirectory = { ...commit.files };
        this.state.stagingArea = {};
      }

      this.out('warning', `Note: switching to '${shortHash(hash)}'.`);
      this.out('info', 'You are in detached HEAD state.');
      this.out('info', `HEAD is now at ${shortHash(hash)} ${commit?.message || ''}`);
      return;
    }

    // Check if it's a file to restore
    const headCommit = this.getHeadCommit();
    if (headCommit?.files[target] !== undefined) {
      this.state.workingDirectory[target] = headCommit.files[target];
      delete this.state.stagingArea[target];
      this.out('success', `Updated 1 path from the index: ${target}`);
      return;
    }

    this.out('error', `error: pathspec '${target}' did not match any file(s) known to git`);
  }

  private gitSwitch(args: string[]) {
    this.requireInit();
    
    const createFlag = args.includes('-c') || args.includes('--create');
    const names = args.filter(a => !a.startsWith('-'));

    if (names.length === 0) {
      this.out('error', 'error: missing branch name');
      return;
    }

    if (createFlag) {
      this.gitCheckout(['-b', ...names]);
    } else {
      this.gitCheckout(names);
    }
  }

  private gitMerge(args: string[]) {
    this.requireInit();

    const names = args.filter(a => !a.startsWith('-'));
    const noFf = args.includes('--no-ff');
    const abort = args.includes('--abort');

    if (abort) {
      this.state.mergeHead = null;
      this.out('success', 'Merge aborted');
      return;
    }

    if (names.length === 0) {
      this.out('error', 'error: specify a branch to merge');
      return;
    }

    const branchName = names[0];
    const targetHash = this.resolveRef(branchName);

    if (!targetHash) {
      this.out('error', `merge: ${branchName} - not something we can merge`);
      return;
    }

    const currentHash = this.getCurrentCommitHash();

    if (targetHash === currentHash) {
      this.out('info', 'Already up to date.');
      return;
    }

    // Check if fast-forward is possible
    const targetHistory = this.getCommitHistory(targetHash);
    const canFastForward = targetHistory.some(c => c.hash === currentHash);

    if (canFastForward && !noFf) {
      // Fast-forward merge
      if (!this.state.detachedHead) {
        this.state.branches[this.state.currentBranch].commitHash = targetHash;
      }
      this.state.HEAD = this.state.detachedHead ? targetHash : this.state.currentBranch;

      const commit = this.state.commits[targetHash];
      if (commit) {
        this.state.workingDirectory = { ...commit.files };
      }

      this.out('success', `Updating ${shortHash(currentHash)}..${shortHash(targetHash)}`);
      this.out('success', 'Fast-forward');
      const commit2 = this.state.commits[targetHash];
      if (commit2) {
        this.out('info', ` ${Object.keys(commit2.files).length} file(s) changed`);
      }
      return;
    }

    // Create merge commit
    const targetCommit = this.state.commits[targetHash];
    const currentCommit = this.state.commits[currentHash];

    if (!targetCommit || !currentCommit) {
      this.out('error', 'Cannot merge: invalid commits');
      return;
    }

    // Merge files
    const mergedFiles: Record<string, string> = { ...currentCommit.files };
    for (const [path, content] of Object.entries(targetCommit.files)) {
      if (mergedFiles[path] !== undefined && mergedFiles[path] !== content) {
        // Simulated auto-merge (in real git this would be more complex)
        mergedFiles[path] = content; // Take theirs for simplicity
      } else {
        mergedFiles[path] = content;
      }
    }

    const hash = generateHash();
    const mergeCommit: GitCommit = {
      hash,
      message: `Merge branch '${branchName}' into ${this.state.currentBranch}`,
      timestamp: Date.now(),
      parentHashes: [currentHash, targetHash],
      files: mergedFiles,
      author: this.state.config['user.name'] || 'Developer',
      branch: this.state.currentBranch,
    };

    this.state.commits[hash] = mergeCommit;
    if (!this.state.detachedHead) {
      this.state.branches[this.state.currentBranch].commitHash = hash;
    }

    this.state.workingDirectory = { ...mergedFiles };
    this.state.stagingArea = {};

    this.out('success', `Merge made by the 'ort' strategy.`);
    this.out('info', ` ${Object.keys(targetCommit.files).length} file(s) affected`);
  }

  private gitRebase(args: string[]) {
    this.requireInit();

    const names = args.filter(a => !a.startsWith('-'));
    const interactive = args.includes('-i') || args.includes('--interactive');
    const abort = args.includes('--abort');
    const cont = args.includes('--continue');

    if (abort) {
      this.state.rebaseState = null;
      this.out('success', 'Rebase aborted');
      return;
    }

    if (cont) {
      this.state.rebaseState = null;
      this.out('success', 'Rebase continued and completed');
      return;
    }

    if (names.length === 0) {
      this.out('error', 'error: specify a branch to rebase onto');
      return;
    }

    const ontoRef = names[0];
    const ontoHash = this.resolveRef(ontoRef);

    if (!ontoHash) {
      this.out('error', `fatal: invalid upstream '${ontoRef}'`);
      return;
    }

    const currentHash = this.getCurrentCommitHash();
    const currentHistory = this.getCommitHistory(currentHash);
    const ontoHistory = this.getCommitHistory(ontoHash);
    
    // Find common ancestor
    const ontoHashes = new Set(ontoHistory.map(c => c.hash));
    const commitsToRebase: GitCommit[] = [];
    
    for (const commit of currentHistory) {
      if (ontoHashes.has(commit.hash)) break;
      commitsToRebase.push(commit);
    }

    if (commitsToRebase.length === 0) {
      this.out('info', `Current branch ${this.state.currentBranch} is up to date.`);
      return;
    }

    if (interactive) {
      this.out('info', 'Interactive rebase simulation:');
      commitsToRebase.reverse().forEach(c => {
        this.out('output', `pick ${shortHash(c.hash)} ${c.message}`);
      });
      this.out('info', '');
      this.out('info', '(In this simulation, all commits are picked automatically)');
    }

    // Replay commits
    let parentHash = ontoHash;
    for (const commit of commitsToRebase.reverse()) {
      const newHash = generateHash();
      const newCommit: GitCommit = {
        ...commit,
        hash: newHash,
        parentHashes: [parentHash],
        timestamp: Date.now(),
        branch: this.state.currentBranch,
      };
      this.state.commits[newHash] = newCommit;
      parentHash = newHash;
    }

    if (!this.state.detachedHead) {
      this.state.branches[this.state.currentBranch].commitHash = parentHash;
    }

    const lastCommit = this.state.commits[parentHash];
    if (lastCommit) {
      this.state.workingDirectory = { ...lastCommit.files };
    }

    this.out('success', `Successfully rebased and updated refs/heads/${this.state.currentBranch}.`);
    this.out('info', `Replayed ${commitsToRebase.length} commit(s) onto ${shortHash(ontoHash)}`);
  }

  private gitDiff(args: string[]) {
    this.requireInit();

    const staged = args.includes('--staged') || args.includes('--cached');
    const names = args.filter(a => !a.startsWith('-'));
    
    const headCommit = this.getHeadCommit();
    const committedFiles = headCommit?.files || {};

    if (staged) {
      // Diff between staged and last commit
      let hasDiff = false;
      for (const [path, content] of Object.entries(this.state.stagingArea)) {
        const oldContent = committedFiles[path] || '';
        if (content === '__DELETED__') {
          this.out('warning', `diff --git a/${path} b/${path}`);
          this.out('error', `deleted file mode 100644`);
          this.out('output', `--- a/${path}`);
          this.out('output', `+++ /dev/null`);
          const lines = oldContent.split('\n');
          lines.forEach(l => this.out('error', `-${l}`));
          hasDiff = true;
        } else if (oldContent !== content) {
          this.out('warning', `diff --git a/${path} b/${path}`);
          this.out('output', `--- ${oldContent ? `a/${path}` : '/dev/null'}`);
          this.out('output', `+++ b/${path}`);
          const diffLines = diffStrings(oldContent, content);
          diffLines.forEach(l => {
            if (l.startsWith('+')) this.out('success', l);
            else if (l.startsWith('-')) this.out('error', l);
            else this.out('output', l);
          });
          hasDiff = true;
        }
      }
      if (!hasDiff) this.out('info', 'No staged changes');
    } else if (names.length >= 2) {
      // Diff between two refs
      const hash1 = this.resolveRef(names[0]);
      const hash2 = this.resolveRef(names[1]);
      if (!hash1 || !hash2) {
        this.out('error', 'fatal: bad revision');
        return;
      }
      const c1 = this.state.commits[hash1];
      const c2 = this.state.commits[hash2];
      if (!c1 || !c2) return;
      
      const allPaths = new Set([...Object.keys(c1.files), ...Object.keys(c2.files)]);
      for (const path of allPaths) {
        const content1 = c1.files[path] || '';
        const content2 = c2.files[path] || '';
        if (content1 !== content2) {
          this.out('warning', `diff --git a/${path} b/${path}`);
          const diffLines = diffStrings(content1, content2);
          diffLines.forEach(l => {
            if (l.startsWith('+')) this.out('success', l);
            else if (l.startsWith('-')) this.out('error', l);
            else this.out('output', l);
          });
        }
      }
    } else {
      // Working directory vs staged/committed
      let hasDiff = false;
      for (const [path, content] of Object.entries(this.state.workingDirectory)) {
        const compareContent = this.state.stagingArea[path] !== undefined 
          ? this.state.stagingArea[path]
          : committedFiles[path];
        
        if (compareContent !== undefined && compareContent !== '__DELETED__' && content !== compareContent) {
          this.out('warning', `diff --git a/${path} b/${path}`);
          this.out('output', `--- a/${path}`);
          this.out('output', `+++ b/${path}`);
          const diffLines = diffStrings(compareContent, content);
          diffLines.forEach(l => {
            if (l.startsWith('+')) this.out('success', l);
            else if (l.startsWith('-')) this.out('error', l);
            else this.out('output', l);
          });
          hasDiff = true;
        }
      }
      if (!hasDiff) this.out('info', 'No changes in working directory');
    }
  }

  private gitStash(args: string[]) {
    this.requireInit();

    const subCommand = args[0] || 'push';
    
    switch (subCommand) {
      case 'push':
      case 'save': {
        let message = 'WIP on ' + this.state.currentBranch;
        const mIdx = args.indexOf('-m');
        if (mIdx !== -1 && mIdx + 1 < args.length) {
          message = args[mIdx + 1];
        } else if (subCommand === 'save' && args.length > 1) {
          message = args.slice(1).join(' ');
        }

        const headCommit = this.getHeadCommit();
        const committedFiles = headCommit?.files || {};
        
        // Check for changes
        const hasChanges = Object.keys(this.state.stagingArea).length > 0 ||
          Object.keys(this.state.workingDirectory).some(f => 
            this.state.workingDirectory[f] !== committedFiles[f]
          );

        if (!hasChanges) {
          this.out('info', 'No local changes to save');
          return;
        }

        this.state.stash.unshift({
          id: this.state.stash.length,
          message,
          files: { ...this.state.workingDirectory },
          stagedFiles: { ...this.state.stagingArea },
          branch: this.state.currentBranch,
        });

        // Reset working directory
        this.state.workingDirectory = { ...committedFiles };
        this.state.stagingArea = {};

        this.out('success', `Saved working directory and index state: ${message}`);
        break;
      }
      case 'list': {
        if (this.state.stash.length === 0) {
          this.out('info', 'No stash entries');
          return;
        }
        this.state.stash.forEach((entry, i) => {
          this.out('output', `stash@{${i}}: On ${entry.branch}: ${entry.message}`);
        });
        break;
      }
      case 'pop': {
        const index = args[1] ? parseInt(args[1].replace('stash@{', '').replace('}', '')) : 0;
        if (index >= this.state.stash.length) {
          this.out('error', `error: stash@{${index}} not found`);
          return;
        }
        const entry = this.state.stash[index];
        this.state.workingDirectory = { ...entry.files };
        this.state.stagingArea = { ...entry.stagedFiles };
        this.state.stash.splice(index, 1);
        this.out('success', `Dropped stash@{${index}}`);
        this.out('info', 'Applied stash and restored working directory');
        break;
      }
      case 'apply': {
        const idx = args[1] ? parseInt(args[1].replace('stash@{', '').replace('}', '')) : 0;
        if (idx >= this.state.stash.length) {
          this.out('error', `error: stash@{${idx}} not found`);
          return;
        }
        const e = this.state.stash[idx];
        this.state.workingDirectory = { ...e.files };
        this.state.stagingArea = { ...e.stagedFiles };
        this.out('success', 'Applied stash (kept in stash list)');
        break;
      }
      case 'drop': {
        const di = args[1] ? parseInt(args[1].replace('stash@{', '').replace('}', '')) : 0;
        if (di >= this.state.stash.length) {
          this.out('error', `error: stash@{${di}} not found`);
          return;
        }
        this.state.stash.splice(di, 1);
        this.out('success', `Dropped stash@{${di}}`);
        break;
      }
      case 'clear': {
        this.state.stash = [];
        this.out('success', 'Cleared all stash entries');
        break;
      }
      default:
        this.out('error', `error: unknown stash subcommand '${subCommand}'`);
    }
  }

  private gitTag(args: string[]) {
    this.requireInit();

    const deleteFlag = args.includes('-d');
    const listFlag = args.includes('-l') || args.length === 0;
    const annotatedFlag = args.includes('-a');
    const names = args.filter(a => !a.startsWith('-'));
    let message = '';
    const mIdx = args.indexOf('-m');
    if (mIdx !== -1 && mIdx + 1 < args.length) {
      message = args[mIdx + 1];
      const msgIndex = names.indexOf(args[mIdx + 1]);
      if (msgIndex !== -1) names.splice(msgIndex, 1);
    }

    if (deleteFlag && names.length > 0) {
      const tagName = names[0];
      if (!this.state.tags[tagName]) {
        this.out('error', `error: tag '${tagName}' not found.`);
        return;
      }
      delete this.state.tags[tagName];
      this.out('success', `Deleted tag '${tagName}'`);
      return;
    }

    if (names.length > 0 && !listFlag) {
      const tagName = names[0];
      const ref = names[1] ? this.resolveRef(names[1]) : this.getCurrentCommitHash();
      
      if (!ref) {
        this.out('error', 'fatal: cannot create tag: no commits');
        return;
      }

      if (this.state.tags[tagName]) {
        this.out('error', `fatal: tag '${tagName}' already exists`);
        return;
      }

      this.state.tags[tagName] = {
        name: tagName,
        commitHash: ref,
        message: annotatedFlag ? (message || tagName) : undefined,
      };
      this.out('success', `Created tag '${tagName}' at ${shortHash(ref)}`);
      return;
    }

    // List tags
    const tags = Object.values(this.state.tags).sort((a, b) => a.name.localeCompare(b.name));
    if (tags.length === 0) {
      this.out('info', 'No tags');
    } else {
      tags.forEach(t => this.out('output', t.name));
    }
  }

  private gitRemote(args: string[]) {
    this.requireInit();

    const subCommand = args[0] || '';
    const names = args.filter(a => !a.startsWith('-'));

    if (!subCommand || args.includes('-v')) {
      const remotes = Object.values(this.state.remotes);
      if (remotes.length === 0) {
        this.out('info', 'No remotes configured');
        return;
      }
      for (const remote of remotes) {
        if (args.includes('-v')) {
          this.out('output', `${remote.name}\t${remote.url} (fetch)`);
          this.out('output', `${remote.name}\t${remote.url} (push)`);
        } else {
          this.out('output', remote.name);
        }
      }
      return;
    }

    switch (subCommand) {
      case 'add': {
        if (names.length < 3) {
          this.out('error', 'usage: git remote add <name> <url>');
          return;
        }
        const name = names[1];
        const url = names[2];
        if (this.state.remotes[name]) {
          this.out('error', `error: remote ${name} already exists.`);
          return;
        }
        this.state.remotes[name] = { name, url, branches: {} };
        this.out('success', `Added remote '${name}' -> ${url}`);
        break;
      }
      case 'remove':
      case 'rm': {
        const name = names[1];
        if (!this.state.remotes[name]) {
          this.out('error', `error: remote ${name} does not exist.`);
          return;
        }
        delete this.state.remotes[name];
        this.out('success', `Removed remote '${name}'`);
        break;
      }
      case 'rename': {
        if (names.length < 3) {
          this.out('error', 'usage: git remote rename <old> <new>');
          return;
        }
        const oldName = names[1];
        const newName = names[2];
        if (!this.state.remotes[oldName]) {
          this.out('error', `error: remote ${oldName} does not exist.`);
          return;
        }
        this.state.remotes[newName] = { ...this.state.remotes[oldName], name: newName };
        delete this.state.remotes[oldName];
        this.out('success', `Renamed '${oldName}' to '${newName}'`);
        break;
      }
      default:
        this.out('error', `error: unknown remote subcommand '${subCommand}'`);
    }
  }

  private gitPush(args: string[]) {
    this.requireInit();

    const names = args.filter(a => !a.startsWith('-'));
    const force = args.includes('-f') || args.includes('--force');
    const setUpstream = args.includes('-u') || args.includes('--set-upstream');
    const deleteFlag = args.includes('--delete') || args.includes('-d');

    const remoteName = names[0] || 'origin';
    const branchName = names[1] || this.state.currentBranch;

    if (!this.state.remotes[remoteName]) {
      this.out('error', `fatal: '${remoteName}' does not appear to be a git repository`);
      this.out('info', 'Add a remote with: git remote add origin <url>');
      return;
    }

    if (deleteFlag) {
      delete this.state.remotes[remoteName].branches[branchName];
      // Remove remote tracking branch
      delete this.state.branches[`${remoteName}/${branchName}`];
      this.out('success', ` - [deleted]         ${branchName}`);
      return;
    }

    const currentHash = this.resolveRef(branchName) || this.getCurrentCommitHash();

    this.state.remotes[remoteName].branches[branchName] = currentHash;
    
    // Create remote tracking branch
    this.state.branches[`${remoteName}/${branchName}`] = {
      name: `${remoteName}/${branchName}`,
      commitHash: currentHash,
      isRemote: true,
    };

    this.out('success', `Enumerating objects: done.`);
    this.out('success', `Counting objects: done.`);
    this.out('output', `Writing objects: 100%`);
    this.out('success', `To ${this.state.remotes[remoteName].url}`);
    
    const oldHash = this.state.remotes[remoteName].branches[branchName];
    if (oldHash && oldHash !== currentHash) {
      this.out('success', `   ${shortHash(oldHash)}..${shortHash(currentHash)}  ${branchName} -> ${branchName}${force ? ' (forced update)' : ''}`);
    } else {
      this.out('success', ` * [new branch]      ${branchName} -> ${branchName}`);
    }

    if (setUpstream) {
      this.out('info', `Branch '${branchName}' set up to track '${remoteName}/${branchName}'.`);
    }
  }

  private gitPull(args: string[]) {
    this.requireInit();

    const names = args.filter(a => !a.startsWith('-'));
    const rebase = args.includes('--rebase');
    const remoteName = names[0] || 'origin';
    const branchName = names[1] || this.state.currentBranch;

    if (!this.state.remotes[remoteName]) {
      this.out('error', `fatal: '${remoteName}' does not appear to be a git repository`);
      return;
    }

    this.out('success', `From ${this.state.remotes[remoteName].url}`);
    this.out('info', ` * branch            ${branchName}     -> FETCH_HEAD`);
    
    if (rebase) {
      this.out('success', 'Successfully rebased and updated.');
    } else {
      this.out('success', 'Already up to date.');
    }
  }

  private gitFetch(args: string[]) {
    this.requireInit();

    const names = args.filter(a => !a.startsWith('-'));
    const all = args.includes('--all');
    const remoteName = names[0] || 'origin';

    if (!all && !this.state.remotes[remoteName]) {
      this.out('error', `fatal: '${remoteName}' does not appear to be a git repository`);
      return;
    }

    const remotes = all ? Object.values(this.state.remotes) : [this.state.remotes[remoteName]];

    for (const remote of remotes) {
      if (!remote) continue;
      this.out('success', `Fetching ${remote.name}`);
      this.out('output', `From ${remote.url}`);
      
      for (const [branch, hash] of Object.entries(remote.branches)) {
        this.out('info', ` * [new branch]      ${branch}     -> ${remote.name}/${branch}`);
        this.state.branches[`${remote.name}/${branch}`] = {
          name: `${remote.name}/${branch}`,
          commitHash: hash,
          isRemote: true,
        };
      }
    }
  }

  private gitClone(args: string[]) {
    if (this.state.initialized) {
      this.out('error', 'fatal: destination path already exists and is not empty');
      return;
    }

    const names = args.filter(a => !a.startsWith('-'));
    if (names.length === 0) {
      this.out('error', 'usage: git clone <repository> [<directory>]');
      return;
    }

    const url = names[0];

    // Initialize
    this.state.initialized = true;
    this.state.currentBranch = 'main';
    this.state.branches['main'] = { name: 'main', commitHash: '', isRemote: false };
    this.state.HEAD = 'main';
    this.state.detachedHead = false;
    this.state.remotes['origin'] = { name: 'origin', url, branches: {} };

    // Create initial commit with README
    const hash = generateHash();
    const commit: GitCommit = {
      hash,
      message: 'Initial commit',
      timestamp: Date.now(),
      parentHashes: [],
      files: { 'README.md': `# Project\n\nCloned from ${url}` },
      author: 'Remote Author',
      branch: 'main',
    };

    this.state.commits[hash] = commit;
    this.state.branches['main'].commitHash = hash;
    this.state.branches['origin/main'] = { name: 'origin/main', commitHash: hash, isRemote: true };
    this.state.remotes['origin'].branches['main'] = hash;
    this.state.workingDirectory = { ...commit.files };

    this.out('success', `Cloning into 'project'...`);
    this.out('output', 'remote: Enumerating objects: done.');
    this.out('output', 'remote: Counting objects: done.');
    this.out('output', 'Receiving objects: 100%');
    this.out('success', 'Clone complete.');
  }

  private gitReset(args: string[]) {
    this.requireInit();

    let mode = 'mixed'; // soft, mixed, hard
    let ref = 'HEAD';

    for (const arg of args) {
      if (arg === '--soft') mode = 'soft';
      else if (arg === '--mixed') mode = 'mixed';
      else if (arg === '--hard') mode = 'hard';
      else if (!arg.startsWith('-')) ref = arg;
    }

    const targetHash = this.resolveRef(ref);
    if (!targetHash) {
      this.out('error', `fatal: ambiguous argument '${ref}': unknown revision`);
      return;
    }

    const commit = this.state.commits[targetHash];
    if (!commit) {
      this.out('error', 'fatal: cannot find commit');
      return;
    }

    // Move branch pointer
    if (!this.state.detachedHead) {
      this.state.branches[this.state.currentBranch].commitHash = targetHash;
    }

    switch (mode) {
      case 'soft':
        // Only move HEAD, keep staging and working dir
        this.out('success', `HEAD is now at ${shortHash(targetHash)} ${commit.message}`);
        break;
      case 'mixed':
        // Reset staging area
        this.state.stagingArea = {};
        this.out('success', `Unstaged changes after reset:`);
        this.out('success', `HEAD is now at ${shortHash(targetHash)} ${commit.message}`);
        break;
      case 'hard':
        // Reset everything
        this.state.stagingArea = {};
        this.state.workingDirectory = { ...commit.files };
        this.out('success', `HEAD is now at ${shortHash(targetHash)} ${commit.message}`);
        break;
    }
  }

  private gitRevert(args: string[]) {
    this.requireInit();

    const names = args.filter(a => !a.startsWith('-'));
    if (names.length === 0) {
      this.out('error', 'usage: git revert <commit>');
      return;
    }

    const targetHash = this.resolveRef(names[0]);
    if (!targetHash) {
      this.out('error', `fatal: bad revision '${names[0]}'`);
      return;
    }

    const targetCommit = this.state.commits[targetHash];
    if (!targetCommit) {
      this.out('error', 'fatal: cannot find commit');
      return;
    }

    // Create a revert commit
    const currentHash = this.getCurrentCommitHash();
    const currentCommit = this.state.commits[currentHash];
    
    // "Undo" the changes by reverting to parent's files for changed files
    const parentHash = targetCommit.parentHashes[0];
    const parentCommit = parentHash ? this.state.commits[parentHash] : null;
    const parentFiles = parentCommit?.files || {};

    const revertedFiles: Record<string, string> = { ...(currentCommit?.files || {}) };
    
    for (const [path, content] of Object.entries(targetCommit.files)) {
      if (parentFiles[path] !== content) {
        // This file was changed in the target commit, revert it
        if (parentFiles[path] !== undefined) {
          revertedFiles[path] = parentFiles[path];
        } else {
          delete revertedFiles[path];
        }
      }
    }

    const hash = generateHash();
    const revertCommit: GitCommit = {
      hash,
      message: `Revert "${targetCommit.message}"`,
      timestamp: Date.now(),
      parentHashes: [currentHash],
      files: revertedFiles,
      author: this.state.config['user.name'] || 'Developer',
      branch: this.state.currentBranch,
    };

    this.state.commits[hash] = revertCommit;
    if (!this.state.detachedHead) {
      this.state.branches[this.state.currentBranch].commitHash = hash;
    }

    this.state.workingDirectory = { ...revertedFiles };
    this.state.stagingArea = {};

    this.out('success', `[${this.state.currentBranch} ${shortHash(hash)}] Revert "${targetCommit.message}"`);
  }

  private gitCherryPick(args: string[]) {
    this.requireInit();

    const names = args.filter(a => !a.startsWith('-'));
    if (names.length === 0) {
      this.out('error', 'usage: git cherry-pick <commit>...');
      return;
    }

    for (const ref of names) {
      const targetHash = this.resolveRef(ref);
      if (!targetHash) {
        this.out('error', `fatal: bad revision '${ref}'`);
        return;
      }

      const targetCommit = this.state.commits[targetHash];
      if (!targetCommit) continue;

      const currentHash = this.getCurrentCommitHash();
      const currentCommit = this.state.commits[currentHash];
      const currentFiles = currentCommit?.files || {};

      // Apply the target commit's changes
      const newFiles = { ...currentFiles };
      const parentCommit = targetCommit.parentHashes[0] ? this.state.commits[targetCommit.parentHashes[0]] : null;
      const parentFiles = parentCommit?.files || {};

      for (const [path, content] of Object.entries(targetCommit.files)) {
        if (!parentFiles[path] || parentFiles[path] !== content) {
          newFiles[path] = content;
        }
      }

      const hash = generateHash();
      const newCommit: GitCommit = {
        hash,
        message: targetCommit.message,
        timestamp: Date.now(),
        parentHashes: [currentHash],
        files: newFiles,
        author: targetCommit.author,
        branch: this.state.currentBranch,
      };

      this.state.commits[hash] = newCommit;
      if (!this.state.detachedHead) {
        this.state.branches[this.state.currentBranch].commitHash = hash;
      }

      this.state.workingDirectory = { ...newFiles };
      this.state.stagingArea = {};

      this.out('success', `[${this.state.currentBranch} ${shortHash(hash)}] ${targetCommit.message}`);
    }
  }

  private gitShow(args: string[]) {
    this.requireInit();

    const ref = args[0] || 'HEAD';
    const hash = this.resolveRef(ref);

    if (!hash) {
      this.out('error', `fatal: bad revision '${ref}'`);
      return;
    }

    const commit = this.state.commits[hash];
    if (!commit) return;

    this.out('warning', `commit ${commit.hash}`);
    if (commit.parentHashes.length > 1) {
      this.out('output', `Merge: ${commit.parentHashes.map(shortHash).join(' ')}`);
    }
    this.out('output', `Author: ${commit.author} <${this.state.config['user.email'] || 'dev@example.com'}>`);
    this.out('output', `Date:   ${formatTimestamp(commit.timestamp)}`);
    this.out('output', '');
    this.out('output', `    ${commit.message}`);
    this.out('output', '');

    // Show diff with parent
    const parentCommit = commit.parentHashes[0] ? this.state.commits[commit.parentHashes[0]] : null;
    const parentFiles = parentCommit?.files || {};

    for (const [path, content] of Object.entries(commit.files)) {
      if (parentFiles[path] !== content) {
        this.out('warning', `diff --git a/${path} b/${path}`);
        const diffLines = diffStrings(parentFiles[path] || '', content);
        diffLines.forEach(l => {
          if (l.startsWith('+')) this.out('success', l);
          else if (l.startsWith('-')) this.out('error', l);
          else this.out('output', l);
        });
      }
    }

    // Deleted files
    for (const path of Object.keys(parentFiles)) {
      if (commit.files[path] === undefined) {
        this.out('warning', `diff --git a/${path} b/${path}`);
        this.out('error', `deleted file mode 100644`);
      }
    }
  }

  private gitRm(args: string[]) {
    this.requireInit();

    const cached = args.includes('--cached');
    const names = args.filter(a => !a.startsWith('-'));

    for (const file of names) {
      if (cached) {
        // Only remove from staging
        if (this.state.stagingArea[file] !== undefined) {
          delete this.state.stagingArea[file];
          this.out('success', `rm --cached '${file}'`);
        }
      } else {
        if (this.state.workingDirectory[file] !== undefined) {
          delete this.state.workingDirectory[file];
          this.state.stagingArea[file] = '__DELETED__';
          this.out('success', `rm '${file}'`);
        } else {
          this.out('error', `fatal: pathspec '${file}' did not match any files`);
        }
      }
    }
  }

  private gitMv(args: string[]) {
    this.requireInit();

    const names = args.filter(a => !a.startsWith('-'));
    if (names.length < 2) {
      this.out('error', 'usage: git mv <source> <destination>');
      return;
    }

    const src = names[0];
    const dst = names[1];

    if (this.state.workingDirectory[src] === undefined) {
      this.out('error', `fatal: bad source, source=${src}, destination=${dst}`);
      return;
    }

    this.state.workingDirectory[dst] = this.state.workingDirectory[src];
    delete this.state.workingDirectory[src];
    this.state.stagingArea[dst] = this.state.workingDirectory[dst];
    this.state.stagingArea[src] = '__DELETED__';

    this.out('success', `Renamed ${src} -> ${dst}`);
  }

  private gitConfig(args: string[]) {
    const list = args.includes('--list') || args.includes('-l');
    const names = args.filter(a => !a.startsWith('-'));

    if (list) {
      for (const [key, value] of Object.entries(this.state.config)) {
        this.out('output', `${key}=${value}`);
      }
      return;
    }

    if (names.length >= 2) {
      this.state.config[names[0]] = names[1];
      this.out('success', `Set ${names[0]} = ${names[1]}`);
    } else if (names.length === 1) {
      const value = this.state.config[names[0]];
      if (value !== undefined) {
        this.out('output', value);
      } else {
        this.out('error', `error: key "${names[0]}" not found`);
      }
    }
  }

  private gitReflog(_args: string[]) {
    this.requireInit();

    const currentHash = this.getCurrentCommitHash();
    const history = this.getCommitHistory(currentHash, 20);

    history.forEach((commit, i) => {
      const action = i === 0 ? 'commit (latest)' : (commit.parentHashes.length > 1 ? 'merge' : 'commit');
      this.out('output', `${shortHash(commit.hash)} HEAD@{${i}}: ${action}: ${commit.message}`);
    });
  }

  private gitBlame(args: string[]) {
    this.requireInit();

    const names = args.filter(a => !a.startsWith('-'));
    if (names.length === 0) {
      this.out('error', 'usage: git blame <file>');
      return;
    }

    const file = names[0];
    const headCommit = this.getHeadCommit();

    if (!headCommit || headCommit.files[file] === undefined) {
      this.out('error', `fatal: no such path '${file}' in HEAD`);
      return;
    }

    const lines = headCommit.files[file].split('\n');
    lines.forEach((l, i) => {
      this.out('output', `${shortHash(headCommit.hash)} (${headCommit.author} ${formatTimestamp(headCommit.timestamp).substring(0, 10)} ${(i + 1).toString().padStart(3)}) ${l}`);
    });
  }

  private gitRestore(args: string[]) {
    this.requireInit();

    const staged = args.includes('--staged');
    const names = args.filter(a => !a.startsWith('-'));

    if (names.length === 0) {
      this.out('error', 'error: you must specify path(s) to restore');
      return;
    }

    for (const file of names) {
      if (staged) {
        if (this.state.stagingArea[file] !== undefined) {
          delete this.state.stagingArea[file];
          this.out('success', `Unstaged '${file}'`);
        } else {
          this.out('error', `error: pathspec '${file}' did not match any file(s)`);
        }
      } else {
        const headCommit = this.getHeadCommit();
        if (headCommit?.files[file] !== undefined) {
          this.state.workingDirectory[file] = headCommit.files[file];
          this.out('success', `Restored '${file}'`);
        } else if (this.state.stagingArea[file] !== undefined && this.state.stagingArea[file] !== '__DELETED__') {
          this.state.workingDirectory[file] = this.state.stagingArea[file];
          this.out('success', `Restored '${file}' from staging`);
        } else {
          this.out('error', `error: pathspec '${file}' did not match any file(s)`);
        }
      }
    }
  }

  private showHelp() {
    this.out('info', '╔══════════════════════════════════════════════════════╗');
    this.out('info', '║        GitSim Pro — Interactive Git Terminal         ║');
    this.out('info', '╚══════════════════════════════════════════════════════╝');
    this.out('output', '');
    this.out('success', '📁 File & Directory Commands:');
    this.out('output', '  touch <file...>          Create empty file(s)');
    this.out('output', '  echo "text" > file       Write to file');
    this.out('output', '  echo "text" >> file      Append to file');
    this.out('output', '  cat <file...>            Show file contents');
    this.out('output', '  cp [-r] <src> <dst>      Copy file or directory');
    this.out('output', '  mv <src> <dst>           Move / rename');
    this.out('output', '  rm [-rf] <path>          Remove files / directories');
    this.out('output', '  mkdir [-p] <dir...>      Create directories');
    this.out('output', '  rmdir <dir>              Remove empty directory');
    this.out('output', '  ls [-la] [dir]           List files');
    this.out('output', '  cd <dir>                 Change directory');
    this.out('output', '  pwd                      Print working directory');
    this.out('output', '  tree                     Visual directory tree');
    this.out('output', '  stat <file>              File statistics');
    this.out('output', '  file <file>              Detect file type');
    this.out('output', '  du                       Disk usage');
    this.out('output', '');
    this.out('success', '🔍 Text Processing:');
    this.out('output', '  grep [-invc] <pat> [f]   Search text in files');
    this.out('output', '  find [dir] -name <pat>   Find files');
    this.out('output', '  head [-n N] <file>       First N lines');
    this.out('output', '  tail [-n N] <file>       Last N lines');
    this.out('output', '  sort [-ru] <file>        Sort lines');
    this.out('output', '  uniq [-c] <file>         Remove duplicate lines');
    this.out('output', '  wc [-lwc] <file>         Count lines/words/chars');
    this.out('output', '  sed "s/old/new/g" <file> Stream editor');
    this.out('output', '  diff <file1> <file2>     Compare two files');
    this.out('output', '');
    this.out('success', '⚙️  Shell Utilities:');
    this.out('output', '  alias name="cmd"         Create command alias');
    this.out('output', '  unalias <name>           Remove alias');
    this.out('output', '  export VAR=value         Set environment variable');
    this.out('output', '  env / printenv           Show environment');
    this.out('output', '  whoami / id              Current user');
    this.out('output', '  date                     Current date & time');
    this.out('output', '  which <cmd>              Locate a command');
    this.out('output', '  man <cmd>                Manual pages');
    this.out('output', '  hostname / uname         System info');
    this.out('output', '  chmod <mode> <file>      Change permissions (sim)');
    this.out('output', '  history                  Command history');
    this.out('output', '  clear                    Clear terminal');
    this.out('output', '');
    this.out('success', '⛓️  Operators:');
    this.out('output', '  cmd1 && cmd2             Run cmd2 if cmd1 succeeds');
    this.out('output', '  cmd1 ; cmd2              Run both sequentially');
    this.out('output', '  cmd | grep / sort / wc   Pipe output to filter');
    this.out('output', '');
    this.out('success', '🔧 Git — Core Workflow:');
    this.out('output', '  git init / clone         Initialize or clone repo');
    this.out('output', '  git add <file|.>         Stage changes');
    this.out('output', '  git commit -m "msg"      Commit changes');
    this.out('output', '  git status / diff        Inspect changes');
    this.out('output', '');
    this.out('success', '🌿 Git — Branching & Merging:');
    this.out('output', '  git branch / checkout    Create / switch branches');
    this.out('output', '  git merge / rebase       Combine branches');
    this.out('output', '  git cherry-pick <hash>   Apply specific commit');
    this.out('output', '');
    this.out('success', '⏪ Git — Undo & History:');
    this.out('output', '  git restore / reset      Discard / unstage changes');
    this.out('output', '  git revert <commit>      Create inverse commit');
    this.out('output', '  git stash [pop|list]     Temporary storage');
    this.out('output', '  git log / reflog / blame Show history');
    this.out('output', '');
    this.out('success', '🌐 Git — Remote & Tags:');
    this.out('output', '  git remote add <n> <u>   Add remote');
    this.out('output', '  git push / pull / fetch  Sync with remote');
    this.out('output', '  git tag [-a] <name>      Create tags');
    this.out('output', '');
    this.out('success', '🛠️  Git — Advanced:');
    this.out('output', '  git clean [-ndf]         Remove untracked files');
    this.out('output', '  git shortlog [-sn]       Summarize by author');
    this.out('output', '  git describe             Describe closest tag');
    this.out('output', '  git rev-parse HEAD       Resolve reference');
    this.out('output', '  git count-objects        Count repo objects');
    this.out('output', '  git fsck                 Check integrity');
    this.out('output', '  git gc                   Garbage collection');
    this.out('output', '');
    this.out('info', '💡 Quick start: git init && touch app.js && git add . && git commit -m "init"');
    this.out('info', '💡 Press Ctrl+K for Command Palette  |  ? for reference  |  Tab to autocomplete');
  }

  private showGitHelp() {
    this.showHelp();
  }

  // ─────────── Advanced Git Commands ───────────

  private gitClean(args: string[]) {
    this.requireInit();
    const dryRun = args.includes('-n') || args.includes('--dry-run');
    const force = args.includes('-f') || args.includes('--force');
    const dirs = args.includes('-d');
    if (!force && !dryRun) {
      this.out('error', 'fatal: clean.requireForce defaults to true. Use -f or -n.');
      return;
    }
    const headCommit = this.getHeadCommit();
    const committedFiles = headCommit?.files || {};
    const untracked = Object.keys(this.state.workingDirectory)
      .filter(f => committedFiles[f] === undefined && this.state.stagingArea[f] === undefined);
    if (untracked.length === 0) {
      this.out('info', 'Nothing to clean — working directory has no untracked files.');
      return;
    }
    for (const f of untracked) {
      if (dryRun) {
        this.out('output', `Would remove ${f}`);
      } else {
        delete this.state.workingDirectory[f];
        this.out('success', `Removing ${f}`);
      }
    }
    if (dirs) {
      for (const d of Array.from(this.state.directories)) {
        const hasTracked = Object.keys(committedFiles).some(f => f.startsWith(d + '/'));
        if (!hasTracked) {
          if (dryRun) this.out('output', `Would remove ${d}/`);
          else { this.state.directories.delete(d); this.out('success', `Removing ${d}/`); }
        }
      }
    }
  }

  private gitShortlog(args: string[]) {
    this.requireInit();
    const numbered = args.includes('-n') || args.includes('-sn');
    const summary = args.includes('-s') || args.includes('-sn');
    const currentHash = this.getCurrentCommitHash();
    if (!currentHash) { this.out('info', 'No commits yet.'); return; }
    const history = this.getCommitHistory(currentHash, 100);
    const byAuthor: Record<string, string[]> = {};
    for (const c of history) {
      if (!byAuthor[c.author]) byAuthor[c.author] = [];
      byAuthor[c.author].push(c.message);
    }
    let entries = Object.entries(byAuthor);
    if (numbered) entries.sort((a, b) => b[1].length - a[1].length);
    else entries.sort((a, b) => a[0].localeCompare(b[0]));
    for (const [author, messages] of entries) {
      if (summary) {
        this.out('output', `${String(messages.length).padStart(6)}  ${author}`);
      } else {
        this.out('warning', `${author} (${messages.length}):`);
        messages.forEach(m => this.out('output', `      ${m}`));
        this.out('output', '');
      }
    }
  }

  private gitDescribe(_args: string[]) {
    this.requireInit();
    const currentHash = this.getCurrentCommitHash();
    if (!currentHash) { this.out('error', 'fatal: no commits'); return; }
    // Find closest tag
    const history = this.getCommitHistory(currentHash, 100);
    for (let i = 0; i < history.length; i++) {
      const tag = Object.values(this.state.tags).find(t => t.commitHash === history[i].hash);
      if (tag) {
        if (i === 0) { this.out('output', tag.name); }
        else { this.out('output', `${tag.name}-${i}-g${history[0].hash.substring(0, 7)}`); }
        return;
      }
    }
    this.out('error', 'fatal: No tags found. Cannot describe.');
  }

  private gitRevParse(args: string[]) {
    this.requireInit();
    const ref = args[0] || 'HEAD';
    if (ref === '--show-toplevel') { this.out('output', '/home/user/project'); return; }
    if (ref === '--git-dir') { this.out('output', '.git'); return; }
    if (ref === '--abbrev-ref' && args[1] === 'HEAD') {
      this.out('output', this.state.detachedHead ? 'HEAD' : this.state.currentBranch);
      return;
    }
    const hash = this.resolveRef(ref);
    if (hash) this.out('output', hash);
    else this.out('error', `fatal: ambiguous argument '${ref}'`);
  }

  private gitCountObjects() {
    this.requireInit();
    const commitCount = Object.keys(this.state.commits).length;
    let totalSize = 0;
    for (const c of Object.values(this.state.commits)) {
      totalSize += JSON.stringify(c.files).length;
    }
    this.out('output', `count: ${commitCount}`);
    this.out('output', `size: ${Math.round(totalSize / 1024)} KiB`);
    this.out('output', `in-pack: 0`);
    this.out('output', `packs: 0`);
  }

  private gitFsck() {
    this.requireInit();
    this.out('success', 'Checking object directory...');
    let issues = 0;
    for (const [hash, commit] of Object.entries(this.state.commits)) {
      for (const parent of commit.parentHashes) {
        if (!this.state.commits[parent]) {
          this.out('error', `broken link from commit ${hash.substring(0, 7)} to parent ${parent.substring(0, 7)}`);
          issues++;
        }
      }
    }
    for (const branch of Object.values(this.state.branches)) {
      if (branch.commitHash && !this.state.commits[branch.commitHash]) {
        this.out('error', `dangling ref: ${branch.name} points to missing ${branch.commitHash.substring(0, 7)}`);
        issues++;
      }
    }
    if (issues === 0) this.out('success', 'No issues found. Repository is healthy.');
    else this.out('warning', `Found ${issues} issue(s).`);
  }

  private gitGc() {
    this.requireInit();
    this.out('success', 'Counting objects...');
    this.out('success', `Total ${Object.keys(this.state.commits).length} objects`);
    this.out('success', 'Compressing objects: done.');
    this.out('success', 'Garbage collection complete.');
  }

  // ─────────── Man Pages ───────────

  private showManPage(cmd: string) {
    const pages: Record<string, string[]> = {
      git: [
        'GIT(1)                    Git Manual                    GIT(1)',
        '',
        'NAME',
        '    git - the stupid content tracker',
        '',
        'SYNOPSIS',
        '    git <command> [<args>]',
        '',
        'DESCRIPTION',
        '    Git is a distributed version control system designed for speed,',
        '    data integrity, and support for distributed workflows.',
      ],
      ls: [
        'LS(1)                     User Commands                    LS(1)',
        '',
        'NAME',
        '    ls - list directory contents',
        '',
        'SYNOPSIS',
        '    ls [-alh] [directory]',
        '',
        'OPTIONS',
        '    -a    Show all (including hidden files)',
        '    -l    Long listing format with sizes',
      ],
      grep: [
        'GREP(1)                   User Commands                   GREP(1)',
        '',
        'NAME',
        '    grep - search file contents for patterns',
        '',
        'SYNOPSIS',
        '    grep [-inv] <pattern> [file...]',
        '',
        'OPTIONS',
        '    -i    Case-insensitive matching',
        '    -n    Show line numbers',
        '    -v    Invert match (show non-matching lines)',
        '    -c    Count matches only',
      ],
      find: [
        'FIND(1)                   User Commands                  FIND(1)',
        '',
        'NAME',
        '    find - search for files in a directory tree',
        '',
        'SYNOPSIS',
        '    find [path] [-name pattern] [-type f|d]',
      ],
      sed: [
        'SED(1)                    User Commands                   SED(1)',
        '',
        'NAME',
        '    sed - stream editor for filtering and transforming text',
        '',
        'SYNOPSIS',
        '    sed [-i] "s/old/new/g" <file>',
        '',
        'OPTIONS',
        '    -i    Edit file in-place',
      ],
      mkdir: [
        'MKDIR(1)                  User Commands                 MKDIR(1)',
        '',
        'NAME',
        '    mkdir - create directories',
        '',
        'SYNOPSIS',
        '    mkdir [-p] <directory...>',
        '',
        'OPTIONS',
        '    -p    Create parent directories as needed',
      ],
      cp: [
        'CP(1)                     User Commands                    CP(1)',
        '',
        'NAME',
        '    cp - copy files and directories',
        '',
        'SYNOPSIS',
        '    cp [-r] <source> <destination>',
        '',
        'OPTIONS',
        '    -r    Copy directories recursively',
      ],
      sort: [
        'SORT(1)                   User Commands                  SORT(1)',
        '',
        'NAME',
        '    sort - sort lines of text files',
        '',
        'SYNOPSIS',
        '    sort [-ru] <file>',
        '',
        'OPTIONS',
        '    -r    Reverse the sort order',
        '    -u    Unique (remove duplicates)',
      ],
    };
    const p = pages[cmd];
    if (p) { p.forEach(l => this.out('output', l)); }
    else { this.out('error', `No manual entry for ${cmd}`); }
  }
}
