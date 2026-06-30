import { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { GitState } from '../engine/types';
import { GitEngine } from '../engine/gitEngine';

// ── Props ──
interface FileExplorerProps {
  engine: GitEngine;
  state: GitState;
  onStateChange: () => void;
  onRunCommand?: (cmd: string) => void;
}

// ── Tree types ──
type NodeKind = 'file' | 'folder';
type GitStatus = 'U' | 'M' | 'A' | 'AM' | 'D' | 'AD' | 'C' | '';
interface TreeNode {
  name: string;
  path: string;
  kind: NodeKind;
  children: TreeNode[];
  depth: number;
  status: GitStatus;
  size: number;
}

// ── Icons ──
const EXT_ICON: Record<string, [string, string]> = {
  js: ['JS', '#f0db4f'], jsx: ['⚛', '#61dafb'], ts: ['TS', '#3178c6'], tsx: ['⚛', '#3178c6'],
  json: ['{}', '#cbcb41'], md: ['M', '#519aba'], txt: ['¶', '#8b949e'], html: ['<>', '#e34c26'],
  css: ['#', '#563d7c'], scss: ['#', '#c6538c'], py: ['Py', '#3572a5'], rb: ['Rb', '#cc342d'],
  go: ['Go', '#00add8'], rs: ['Rs', '#dea584'], java: ['Jv', '#b07219'],
  c: ['C', '#555'], cpp: ['C+', '#f34b7d'], h: ['H', '#555'],
  sh: ['$', '#89e051'], bash: ['$', '#89e051'],
  yml: ['⚙', '#cb171e'], yaml: ['⚙', '#cb171e'], toml: ['⚙', '#9c4121'],
  xml: ['<>', '#0060ac'], svg: ['◇', '#ffb13b'], sql: ['Q', '#e38c00'],
  env: ['🔒', '#ecd53f'], log: ['📜', '#8b949e'], csv: ['▦', '#237346'],
  lock: ['🔒', '#8b949e'],
};
const SPECIAL_FILE: Record<string, [string, string]> = {
  '.gitignore': ['', '#f05032'], 'readme.md': ['📖', '#519aba'], 'package.json': ['📦', '#cb3837'],
  'tsconfig.json': ['⚙', '#3178c6'], license: ['⚖', '#d4a533'], 'license.md': ['⚖', '#d4a533'],
  dockerfile: ['🐳', '#384d54'], makefile: ['⚙', '#427819'], '.env': ['🔒', '#ecd53f'],
};
const FOLDER_ICON: Record<string, string> = {
  src: '📦', components: '🧩', utils: '🔧', hooks: '🪝', lib: '📚', pages: '📄',
  api: '🔌', assets: '🎨', styles: '🎨', public: '🌐', dist: '📤', build: '📤',
  test: '🧪', tests: '🧪', config: '⚙', docs: '📖', scripts: '📜', types: '📐',
};
function fileIcon(name: string): [string, string] {
  const lower = name.toLowerCase();
  if (SPECIAL_FILE[lower]) return SPECIAL_FILE[lower];
  const ext = lower.split('.').pop() || '';
  return EXT_ICON[ext] || ['📄', '#8b949e'];
}
function folderIcon(name: string): string {
  return FOLDER_ICON[name.toLowerCase()] || '📁';
}

// ── Git status ──
function computeStatus(path: string, state: GitState): GitStatus {
  const headCommit = (() => {
    if (state.detachedHead) return state.commits[state.HEAD] || null;
    const b = state.branches[state.currentBranch];
    return b ? state.commits[b.commitHash] || null : null;
  })();
  const cf = headCommit?.files || {};
  const wd = state.workingDirectory[path];
  const sa = state.stagingArea[path];
  if (sa === '__DELETED__') return 'AD';
  if (sa !== undefined && cf[path] === undefined) return 'A';
  if (sa !== undefined && sa !== cf[path]) return 'AM';
  if (wd !== undefined && cf[path] === undefined && sa === undefined) return 'U';
  if (wd !== undefined && cf[path] !== undefined && wd !== cf[path] && sa === undefined) return 'M';
  if (wd === undefined && cf[path] !== undefined && sa !== '__DELETED__') return 'D';
  return cf[path] !== undefined || sa !== undefined ? 'C' : '';
}
function statusColor(s: GitStatus): string {
  switch (s) {
    case 'U': return '#9ca3af'; case 'M': return '#e5c07b';
    case 'A': case 'AM': return '#98c379'; case 'D': case 'AD': return '#e06c75';
    default: return 'var(--text-secondary)';
  }
}
function statusBadge(s: GitStatus): { label: string; color: string } | null {
  switch (s) {
    case 'U': return { label: 'U', color: '#9ca3af' };
    case 'M': return { label: 'M', color: '#fbbf24' };
    case 'A': return { label: 'A', color: '#4ade80' };
    case 'AM': return { label: 'M', color: '#4ade80' };
    case 'D': return { label: 'D', color: '#f87171' };
    case 'AD': return { label: 'D', color: '#f87171' };
    default: return null;
  }
}

// ── Build tree ──
function buildTree(state: GitState): TreeNode[] {
  const headCommit = (() => {
    if (state.detachedHead) return state.commits[state.HEAD] || null;
    const b = state.branches[state.currentBranch];
    return b ? state.commits[b.commitHash] || null : null;
  })();
  const allPaths = new Set([
    ...Object.keys(state.workingDirectory),
    ...Object.keys(headCommit?.files || {}),
    ...Object.keys(state.stagingArea),
  ]);
  const root: TreeNode[] = [];
  const dirMap = new Map<string, TreeNode>();
  function ensureDir(parts: string[], depth: number): TreeNode[] {
    if (depth === 0) return root;
    const dp = parts.slice(0, depth).join('/');
    if (dirMap.has(dp)) return dirMap.get(dp)!.children;
    const parent = ensureDir(parts, depth - 1);
    const node: TreeNode = { name: parts[depth - 1], path: dp, kind: 'folder', children: [], depth: depth - 1, status: '', size: 0 };
    dirMap.set(dp, node);
    parent.push(node);
    return node.children;
  }
  for (const fp of Array.from(allPaths).sort()) {
    const parts = fp.split('/');
    const children = ensureDir(parts, parts.length - 1);
    children.push({ name: parts[parts.length - 1], path: fp, kind: 'file', children: [], depth: parts.length - 1, status: computeStatus(fp, state), size: (state.workingDirectory[fp] || '').length });
  }
  const dirSet = state.directories instanceof Set ? state.directories : new Set(Array.isArray(state.directories) ? state.directories : []);
  for (const d of dirSet) { const parts = d.split('/'); ensureDir(parts, parts.length); }
  function propagate(nodes: TreeNode[]) {
    for (const n of nodes) {
      if (n.kind === 'folder') {
        propagate(n.children);
        n.size = n.children.reduce((s, c) => s + c.size, 0);
        const prio: GitStatus[] = ['A', 'AM', 'AD', 'M', 'U', 'D'];
        for (const p of prio) { if (n.children.some(c => c.status === p)) { n.status = p; break; } }
      }
    }
    nodes.sort((a, b) => a.kind !== b.kind ? (a.kind === 'folder' ? -1 : 1) : a.name.localeCompare(b.name));
  }
  propagate(root);
  return root;
}

// ── Context menu items ──
interface CtxMenu { x: number; y: number; node: TreeNode | null; }

// ══════════ MAIN COMPONENT ══════════
export default function FileExplorer({ engine, state, onStateChange, onRunCommand }: FileExplorerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [ctx, setCtx] = useState<CtxMenu | null>(null);
  const [inline, setInline] = useState<{ kind: 'file' | 'folder' | 'rename'; parent: string; old?: string } | null>(null);
  const [inlineVal, setInlineVal] = useState('');
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [editorDirty, setEditorDirty] = useState(false);
  const inRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const tree = buildTree(state);

  // auto-expand root folders
  useEffect(() => {
    if (expanded.size === 0 && tree.length > 0) {
      const init = new Set<string>();
      tree.forEach(n => { if (n.kind === 'folder') init.add(n.path); });
      setExpanded(init);
    }
  }, [tree.length]); // eslint-disable-line

  // focus inline input
  useEffect(() => { if (inline && inRef.current) { inRef.current.focus(); inRef.current.select(); } }, [inline]);

  // close ctx on outside click
  useEffect(() => { const h = () => setCtx(null); window.addEventListener('click', h); return () => window.removeEventListener('click', h); }, []);

  // sync editor content when active tab changes
  useEffect(() => {
    if (activeTab && state.workingDirectory[activeTab] !== undefined) {
      setEditorContent(state.workingDirectory[activeTab]);
      setEditorDirty(false);
    }
  }, [activeTab]); // eslint-disable-line

  const createFile = useCallback((path: string) => {
    engine.state.workingDirectory[path] = '';
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      if (!engine.state.directories) engine.state.directories = new Set();
      (engine.state.directories as Set<string>).add(parts.slice(0, i).join('/'));
    }
    onStateChange();
  }, [engine, onStateChange]);

  const createFolder = useCallback((path: string) => {
    if (!engine.state.directories) engine.state.directories = new Set();
    const parts = path.split('/');
    for (let i = 1; i <= parts.length; i++) {
      (engine.state.directories as Set<string>).add(parts.slice(0, i).join('/'));
    }
    onStateChange();
  }, [engine, onStateChange]);

  const deleteNode = useCallback((path: string, isFolder: boolean) => {
    if (isFolder) {
      const prefix = path + '/';
      for (const k of Object.keys(engine.state.workingDirectory)) {
        if (k.startsWith(prefix) || k === path) delete engine.state.workingDirectory[k];
      }
      if (engine.state.directories instanceof Set) engine.state.directories.delete(path);
    } else {
      delete engine.state.workingDirectory[path];
    }
    setOpenTabs(prev => prev.filter(t => t !== path && !t.startsWith(path + '/')));
    if (activeTab === path || (isFolder && activeTab?.startsWith(path + '/'))) setActiveTab(null);
    onStateChange();
  }, [engine, onStateChange, activeTab]);

  const renameNode = useCallback((oldPath: string, newPath: string, isFolder: boolean) => {
    if (isFolder) {
      const prefix = oldPath + '/';
      const entries = Object.entries(engine.state.workingDirectory).filter(([k]) => k.startsWith(prefix));
      entries.forEach(([k, v]) => { engine.state.workingDirectory[k.replace(prefix, newPath + '/')] = v; delete engine.state.workingDirectory[k]; });
      if (engine.state.directories instanceof Set) { engine.state.directories.delete(oldPath); engine.state.directories.add(newPath); }
    } else {
      engine.state.workingDirectory[newPath] = engine.state.workingDirectory[oldPath] || '';
      delete engine.state.workingDirectory[oldPath];
    }
    setOpenTabs(prev => prev.map(t => t === oldPath ? newPath : t.startsWith(oldPath + '/') ? t.replace(oldPath + '/', newPath + '/') : t));
    if (activeTab === oldPath) setActiveTab(newPath);
    onStateChange();
  }, [engine, onStateChange, activeTab]);

  const saveFile = useCallback((path: string, content: string) => {
    engine.state.workingDirectory[path] = content;
    setEditorDirty(false);
    onStateChange();
  }, [engine, onStateChange]);

  const duplicateFile = useCallback((path: string) => {
    const ext = path.includes('.') ? '.' + path.split('.').pop() : '';
    const base = path.includes('.') ? path.slice(0, path.lastIndexOf('.')) : path;
    let copyPath = `${base}-copy${ext}`;
    let n = 1;
    while (engine.state.workingDirectory[copyPath] !== undefined) { copyPath = `${base}-copy${++n}${ext}`; }
    engine.state.workingDirectory[copyPath] = engine.state.workingDirectory[path] || '';
    onStateChange();
    openFile(copyPath);
  }, [engine, onStateChange]); // eslint-disable-line

  const openFile = useCallback((path: string) => {
    setOpenTabs(prev => prev.includes(path) ? prev : [...prev, path]);
    setActiveTab(path);
    setEditorContent(engine.state.workingDirectory[path] || '');
    setEditorDirty(false);
  }, [engine]);

  const closeTab = useCallback((path: string) => {
    setOpenTabs(prev => {
      const next = prev.filter(t => t !== path);
      if (activeTab === path) setActiveTab(next[next.length - 1] || null);
      return next;
    });
  }, [activeTab]);

  const submitInline = useCallback(() => {
    if (!inline || !inlineVal.trim()) { setInline(null); return; }
    const val = inlineVal.trim();
    if (inline.kind === 'file') {
      const path = inline.parent ? `${inline.parent}/${val}` : val;
      createFile(path);
      openFile(path);
    } else if (inline.kind === 'folder') {
      const path = inline.parent ? `${inline.parent}/${val}` : val;
      createFolder(path);
      setExpanded(prev => new Set([...prev, path]));
    } else if (inline.kind === 'rename' && inline.old) {
      const oldPath = inline.parent ? `${inline.parent}/${inline.old}` : inline.old;
      const newPath = inline.parent ? `${inline.parent}/${val}` : val;
      if (oldPath !== newPath) {
        const node = findNode(tree, oldPath);
        renameNode(oldPath, newPath, node?.kind === 'folder');
      }
    }
    setInline(null);
    setInlineVal('');
  }, [inline, inlineVal, createFile, createFolder, renameNode, openFile, tree]);

  const toggle = useCallback((p: string) => setExpanded(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; }), []);
  const expandAll = useCallback(() => { const a = new Set<string>(); (function w(ns: TreeNode[]) { ns.forEach(n => { if (n.kind === 'folder') { a.add(n.path); w(n.children); } }); })(tree); setExpanded(a); }, [tree]);
  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  function filterTree(nodes: TreeNode[], q: string): TreeNode[] {
    if (!q) return nodes;
    const lq = q.toLowerCase();
    return nodes.reduce<TreeNode[]>((acc, n) => {
      if (n.kind === 'file') { if (n.name.toLowerCase().includes(lq) || n.path.toLowerCase().includes(lq)) acc.push(n); }
      else { const fc = filterTree(n.children, q); if (fc.length > 0 || n.name.toLowerCase().includes(lq)) acc.push({ ...n, children: fc }); }
      return acc;
    }, []);
  }
  const vis = filterTree(tree, search);

  function findNode(nodes: TreeNode[], path: string): TreeNode | null {
    for (const n of nodes) { if (n.path === path) return n; if (n.kind === 'folder') { const f = findNode(n.children, path); if (f) return f; } } return null;
  }

  // Keyboard Ctrl+S save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeTab && editorDirty) saveFile(activeTab, editorContent);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab, editorDirty, editorContent, saveFile]);

  return (
    <div ref={boxRef} className="flex flex-col h-full relative select-none" style={{ backgroundColor: 'var(--bg-panel)' }}>

      {/* ── TOOLBAR ── */}
      <div className="flex items-center justify-between px-2.5 py-1.5 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Explorer
        </span>
        <div className="flex items-center gap-px">
          <TBtn title="New File" onClick={() => { setInline({ kind: 'file', parent: '' }); setInlineVal(''); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          </TBtn>
          <TBtn title="New Folder" onClick={() => { setInline({ kind: 'folder', parent: '' }); setInlineVal(''); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
          </TBtn>
          <TBtn title="Search" onClick={() => setShowSearch(!showSearch)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </TBtn>
          <TBtn title="Expand All" onClick={expandAll}><span style={{fontSize:'11px'}}>⊞</span></TBtn>
          <TBtn title="Collapse All" onClick={collapseAll}><span style={{fontSize:'11px'}}>⊟</span></TBtn>
        </div>
      </div>

      {/* ── SEARCH BAR ── */}
      {showSearch && (
        <div className="px-2 py-1.5 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter files…" autoFocus
            className="w-full text-[11px] px-2 py-1 rounded outline-none"
            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            onKeyDown={e => { if (e.key === 'Escape') { setShowSearch(false); setSearch(''); } }} />
        </div>
      )}

      {/* ── TREE CONTAINER ── */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar py-0.5"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setCtx({
            x: e.nativeEvent.offsetX,
            y: e.clientY - (boxRef.current?.getBoundingClientRect().top || 0),
            node: null, // null means context menu on empty space
          });
        }}
      >
        <>
          {inline && inline.parent === '' && inline.kind !== 'rename' && (
            <InlineInput ref={inRef} value={inlineVal} onChange={setInlineVal} onSubmit={submitInline} onCancel={() => setInline(null)} isFolder={inline.kind === 'folder'} depth={0} />
          )}
          {vis.length === 0 && !inline ? (
            <div className="text-center py-8 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {search ? 'No matches' : 'Empty workspace — create files above or right-click here'}
            </div>
          ) : (
            <RenderTree nodes={vis} expanded={expanded} toggle={toggle} openFile={openFile} activeTab={activeTab} onCtx={(e, n) => { e.preventDefault(); e.stopPropagation(); setCtx({ x: e.nativeEvent.offsetX, y: e.clientY - (boxRef.current?.getBoundingClientRect().top || 0), node: n }); }}
              inline={inline} inlineVal={inlineVal} setInlineVal={setInlineVal} submitInline={submitInline} cancelInline={() => setInline(null)} inRef={inRef} />
          )}
        </>
      </div>

      {/* ── EDITOR TABS ── */}
      {openTabs.length > 0 && (
        <div className="shrink-0 flex flex-col" style={{ borderTop: '1px solid var(--border)', minHeight: 0, maxHeight: '55%' }}>
          {/* Tabs Bar */}
          <div className="flex overflow-x-auto custom-scrollbar shrink-0" style={{ backgroundColor: 'var(--bg-surface)' }}>
            {openTabs.map(tab => {
              const isActive = activeTab === tab;
              const name = tab.split('/').pop() || tab;
              const [icon, iconColor] = fileIcon(name);
              const isDirtyTab = isActive && editorDirty;
              return (
                <button key={tab} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] shrink-0 border-r transition-colors group"
                  style={{ backgroundColor: isActive ? 'var(--bg-panel)' : 'transparent', borderColor: 'var(--border-subtle)', borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent', color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  onClick={() => { setActiveTab(tab); setEditorContent(engine.state.workingDirectory[tab] || ''); setEditorDirty(false); }}>
                  <span className="text-[9px]" style={{ color: iconColor }}>{icon}</span>
                  <span className="font-medium">{name}</span>
                  {isDirtyTab && <span className="w-2 h-2 rounded-full bg-white/50" title="Unsaved changes" />}
                  <span onClick={e => { e.stopPropagation(); closeTab(tab); }} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 ml-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>✕</span>
                </button>
              );
            })}
          </div>

          {/* Editor Area */}
          {activeTab && state.workingDirectory[activeTab] !== undefined && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1 px-3 py-1 text-[9px] font-mono shrink-0" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border-subtle)' }}>
                {activeTab.split('/').map((part, i, arr) => (
                  <span key={i}>{part}{i < arr.length - 1 && <span className="mx-0.5" style={{ opacity: 0.4 }}>/</span>}</span>
                ))}
                <span className="ml-auto flex items-center gap-2">
                  <span>{(editorContent || '').split('\n').length} lines</span>
                  <span>{(editorContent || '').length}B</span>
                  {editorDirty && <span style={{ color: 'var(--warning)' }}>● modified</span>}
                </span>
              </div>

              {/* Text Editor */}
              <div className="flex-1 flex min-h-0 overflow-auto custom-scrollbar" style={{ backgroundColor: 'var(--term-bg)' }}>
                {/* Line Numbers */}
                <div className="py-1 shrink-0 select-none text-right pr-1.5 pl-2" style={{ color: 'var(--text-muted)', opacity: 0.3, minWidth: '32px', fontSize: '11px', fontFamily: 'monospace', lineHeight: '18px' }}>
                  {(editorContent || '').split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
                </div>
                <textarea
                  ref={editorRef}
                  value={editorContent}
                  onChange={e => { setEditorContent(e.target.value); setEditorDirty(true); }}
                  className="flex-1 resize-none outline-none py-1 pr-3 bg-transparent"
                  style={{ color: 'var(--term-text)', fontSize: '11px', fontFamily: "'SF Mono','Cascadia Code','Fira Code','Consolas',monospace", lineHeight: '18px', tabSize: 2 }}
                  spellCheck={false}
                  onKeyDown={e => {
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      const ta = e.currentTarget;
                      const start = ta.selectionStart;
                      const end = ta.selectionEnd;
                      const val = editorContent;
                      setEditorContent(val.substring(0, start) + '  ' + val.substring(end));
                      setEditorDirty(true);
                      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
                    }
                  }}
                />
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between px-3 py-1 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
                <div className="flex gap-2">
                  <button onClick={() => { if (activeTab) saveFile(activeTab, editorContent); }} disabled={!editorDirty}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-md transition-all disabled:opacity-30"
                    style={{ backgroundColor: editorDirty ? 'var(--accent)' : 'var(--bg-elevated)', color: editorDirty ? '#fff' : 'var(--text-muted)' }}>
                    💾 Save{editorDirty ? '' : 'd'}
                  </button>
                  <button onClick={() => { if (activeTab) { setEditorContent(state.workingDirectory[activeTab] || ''); setEditorDirty(false); } }}
                    className="text-[10px] px-2 py-1 rounded-md" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                    ↩ Revert
                  </button>
                </div>
                <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>Ctrl+S to save</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STATUS BAR ── */}
      <StatusBar state={state} />

      {/* ── CONTEXT MENU ── */}
      {ctx && (
        <div className="absolute z-50 py-1.5 rounded-xl shadow-2xl min-w-[190px]" style={{ left: Math.min(ctx.x, 50), top: Math.min(ctx.y, 400), backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          onClick={e => e.stopPropagation()}>
          {ctx.node ? (
            // Context menu on active node
            <>
              <CtxItem icon="📄" label="New File Here…" onClick={() => { const p = ctx.node!.kind === 'folder' ? ctx.node!.path : ctx.node!.path.split('/').slice(0, -1).join('/'); setInline({ kind: 'file', parent: p }); setInlineVal(''); setCtx(null); if (p) setExpanded(prev => new Set([...prev, p])); }} />
              <CtxItem icon="📁" label="New Folder Here…" onClick={() => { const p = ctx.node!.kind === 'folder' ? ctx.node!.path : ctx.node!.path.split('/').slice(0, -1).join('/'); setInline({ kind: 'folder', parent: p }); setInlineVal(''); setCtx(null); if (p) setExpanded(prev => new Set([...prev, p])); }} />
              <CtxSep />
              {ctx.node.kind === 'file' && <CtxItem icon="📝" label="Open in Editor" onClick={() => { openFile(ctx.node!.path); setCtx(null); }} />}
              <CtxItem icon="✏️" label="Rename…" onClick={() => { const pp = ctx.node!.path.split('/').slice(0, -1).join('/'); setInline({ kind: 'rename', parent: pp, old: ctx.node!.name }); setInlineVal(ctx.node!.name); setCtx(null); }} />
              {ctx.node.kind === 'file' && <CtxItem icon="📋" label="Duplicate" onClick={() => { duplicateFile(ctx.node!.path); setCtx(null); }} />}
              <CtxItem icon="🗑" label="Delete" danger onClick={() => { deleteNode(ctx.node!.path, ctx.node!.kind === 'folder'); setCtx(null); }} />
              <CtxSep />
              <CtxItem icon="📎" label="Copy Path" onClick={() => { navigator.clipboard?.writeText(ctx.node!.path); setCtx(null); }} />
              {ctx.node.kind === 'file' && <CtxItem icon="📋" label="Copy Content" onClick={() => { navigator.clipboard?.writeText(state.workingDirectory[ctx.node!.path] || ''); setCtx(null); }} />}
              <CtxSep />
              <CtxItem icon="➕" label="Git: Stage" accent onClick={() => { onRunCommand?.(`git add ${ctx.node!.path}`); setCtx(null); }} />
              <CtxItem icon="↩️" label="Git: Unstage" onClick={() => { onRunCommand?.(`git restore --staged ${ctx.node!.path}`); setCtx(null); }} />
              <CtxItem icon="🔍" label="Git: Diff" onClick={() => { onRunCommand?.(`git diff ${ctx.node!.path}`); setCtx(null); }} />
            </>
          ) : (
            // Context menu on empty space
            <>
              <CtxItem icon="📄" label="New File…" onClick={() => { setInline({ kind: 'file', parent: '' }); setInlineVal(''); setCtx(null); }} />
              <CtxItem icon="📁" label="New Folder…" onClick={() => { setInline({ kind: 'folder', parent: '' }); setInlineVal(''); setCtx(null); }} />
              <CtxSep />
              <CtxItem icon="➕" label="Git: Stage All" accent onClick={() => { onRunCommand?.('git add .'); setCtx(null); }} />
              <CtxItem icon="💾" label="Git: Commit" onClick={() => { onRunCommand?.('git commit -m "update"'); setCtx(null); }} />
              <CtxItem icon="📊" label="Git: Status" onClick={() => { onRunCommand?.('git status'); setCtx(null); }} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── SUB COMPONENTS ──

function RenderTree({ nodes, expanded, toggle, openFile, activeTab, onCtx, inline, inlineVal, setInlineVal, submitInline, cancelInline, inRef }: {
  nodes: TreeNode[]; expanded: Set<string>; toggle: (p: string) => void; openFile: (p: string) => void; activeTab: string | null;
  onCtx: (e: React.MouseEvent, n: TreeNode) => void;
  inline: { kind: 'file' | 'folder' | 'rename'; parent: string; old?: string } | null;
  inlineVal: string; setInlineVal: (v: string) => void; submitInline: () => void; cancelInline: () => void; inRef: React.RefObject<HTMLInputElement | null>;
}) {
  return <>
    {nodes.map(node => {
      const isExp = expanded.has(node.path);
      const isActive = activeTab === node.path;
      const isRenaming = inline?.kind === 'rename' && inline.old === node.name && inline.parent === node.path.split('/').slice(0, -1).join('/');
      const badge = statusBadge(node.status);
      const [icon, iconColor] = node.kind === 'folder' ? [isExp ? '📂' : folderIcon(node.name), ''] : fileIcon(node.name);

      return <div key={node.path}>
        {isRenaming ? (
          <InlineInput ref={inRef} value={inlineVal} onChange={setInlineVal} onSubmit={submitInline} onCancel={cancelInline} isFolder={node.kind === 'folder'} depth={node.depth} />
        ) : (
          <div className="flex items-center gap-1 pr-2 cursor-pointer group transition-colors"
            style={{ paddingLeft: `${node.depth * 14 + 6}px`, height: '22px', backgroundColor: isActive ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : undefined }}
            onClick={(e) => {
              e.stopPropagation(); // Stop propagation so it doesn't trigger the empty container context/click
              if (node.kind === 'folder') toggle(node.path); else openFile(node.path);
            }}
            onContextMenu={e => onCtx(e, node)}
            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}>
            {node.kind === 'folder' ? (
              <span className="w-3.5 text-center text-[8px] shrink-0 transition-transform" style={{ color: 'var(--text-muted)', transform: isExp ? 'rotate(90deg)' : 'none' }}>▶</span>
            ) : <span className="w-3.5 shrink-0" />}
            <span className="shrink-0 text-[11px] w-4 text-center" style={{ color: iconColor || 'var(--text-secondary)' }}>{icon}</span>
            <span className="flex-1 truncate text-[11.5px]" style={{
              color: statusColor(node.status),
              textDecoration: node.status === 'D' || node.status === 'AD' ? 'line-through' : 'none',
              fontStyle: node.status === 'U' ? 'italic' : 'normal',
              fontWeight: isActive ? 600 : 400,
            }}>{node.name}</span>
            {node.kind === 'folder' && <span className="text-[9px] opacity-0 group-hover:opacity-50 font-mono" style={{ color: 'var(--text-muted)' }}>{node.children.length}</span>}
            {badge && <span className="text-[8px] font-bold font-mono px-1 rounded" style={{ color: badge.color, backgroundColor: `color-mix(in srgb, ${badge.color} 12%, transparent)` }}>{badge.label}</span>}
          </div>
        )}
        {node.kind === 'folder' && isExp && <>
          {inline && inline.parent === node.path && inline.kind !== 'rename' && (
            <InlineInput ref={inRef} value={inlineVal} onChange={setInlineVal} onSubmit={submitInline} onCancel={cancelInline} isFolder={inline.kind === 'folder'} depth={node.depth + 1} />
          )}
          <RenderTree nodes={node.children} expanded={expanded} toggle={toggle} openFile={openFile} activeTab={activeTab} onCtx={onCtx} inline={inline} inlineVal={inlineVal} setInlineVal={setInlineVal} submitInline={submitInline} cancelInline={cancelInline} inRef={inRef} />
        </>}
      </div>;
    })}
  </>;
}

const InlineInput = forwardRef<HTMLInputElement, { value: string; onChange: (v: string) => void; onSubmit: () => void; onCancel: () => void; isFolder: boolean; depth: number }>(
  ({ value, onChange, onSubmit, onCancel, isFolder, depth }, ref) => (
    <div className="flex items-center gap-1 pr-2" style={{ paddingLeft: `${depth * 14 + 6}px`, height: '22px' }} onClick={e => e.stopPropagation()}>
      <span className="w-3.5 shrink-0" />
      <span className="shrink-0 text-[11px] w-4 text-center">{isFolder ? '📁' : '📄'}</span>
      <input ref={ref} type="text" value={value} onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSubmit(); } if (e.key === 'Escape') onCancel(); }}
        onBlur={() => setTimeout(onCancel, 150)}
        className="flex-1 text-[11px] px-1.5 py-0.5 rounded outline-none font-mono min-w-0"
        style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--accent)', boxShadow: '0 0 0 1px var(--accent)' }}
        placeholder={isFolder ? 'folder-name' : 'filename.ext'} />
    </div>
  )
);

function StatusBar({ state }: { state: GitState }) {
  const files = Object.keys(state.workingDirectory);
  const bytes = files.reduce((s, f) => s + (state.workingDirectory[f]?.length || 0), 0);
  const staged = Object.keys(state.stagingArea).length;
  return (
    <div className="flex items-center justify-between px-2.5 py-0.5 shrink-0 text-[9px] font-mono" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface)' }}>
      <div className="flex items-center gap-2">
        <span>{files.length} files</span>
        {staged > 0 && <span style={{ color: 'var(--success)' }}>+{staged} staged</span>}
      </div>
      <span>{bytes > 1024 ? `${(bytes / 1024).toFixed(1)}KB` : `${bytes}B`}</span>
    </div>
  );
}

function TBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} title={title} className="w-6 h-6 flex items-center justify-center rounded transition-colors"
      style={{ color: 'var(--text-muted)' }}
      onMouseEnter={e => { (e.currentTarget).style.backgroundColor = 'var(--bg-hover)'; (e.currentTarget).style.color = 'var(--text-primary)'; }}
      onMouseLeave={e => { (e.currentTarget).style.backgroundColor = 'transparent'; (e.currentTarget).style.color = 'var(--text-muted)'; }}>
      {children}
    </button>
  );
}

function CtxItem({ icon, label, onClick, danger, accent }: { icon: string; label: string; onClick: () => void; danger?: boolean; accent?: boolean }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left transition-colors font-sans"
      style={{ color: danger ? 'var(--error)' : accent ? 'var(--accent)' : 'var(--text-secondary)' }}
      onMouseEnter={e => { (e.currentTarget).style.backgroundColor = 'var(--bg-hover)'; }}
      onMouseLeave={e => { (e.currentTarget).style.backgroundColor = 'transparent'; }}>
      <span className="w-4 text-center shrink-0">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

function CtxSep() { return <div className="my-1" style={{ borderTop: '1px solid var(--border-subtle)' }} />; }
