import { useMemo } from 'react';
import { GitState, GitCommit } from '../engine/types';
import { shortHash } from '../engine/utils';

interface GitGraphProps {
  state: GitState;
  onSelectCommit: (hash: string) => void;
  onCheckoutBranch: (branchName: string) => void;
  isDarkMode: boolean;
}

interface GraphNode {
  commit: GitCommit;
  x: number;
  y: number;
  color: string;
  branches: string[];
  tags: string[];
  isHead: boolean;
  isMerge: boolean;
}

const BRANCH_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
];

export default function GitGraph({ state, onSelectCommit, onCheckoutBranch, isDarkMode }: GitGraphProps) {
  const graphData = useMemo(() => {
    if (!state.initialized || Object.keys(state.commits).length === 0) {
      return { nodes: [], edges: [] };
    }

    const allCommits = Object.values(state.commits)
      .sort((a, b) => b.timestamp - a.timestamp);

    const branchMap: Record<string, string[]> = {};
    for (const [name, branch] of Object.entries(state.branches)) {
      if (!branch.isRemote && branch.commitHash) {
        if (!branchMap[branch.commitHash]) branchMap[branch.commitHash] = [];
        branchMap[branch.commitHash].push(name);
      }
    }

    const tagMap: Record<string, string[]> = {};
    for (const [name, tag] of Object.entries(state.tags)) {
      if (!tagMap[tag.commitHash]) tagMap[tag.commitHash] = [];
      tagMap[tag.commitHash].push(name);
    }

    const branchLane: Record<string, number> = {};
    let nextLane = 0;
    branchLane[state.currentBranch] = nextLane++;
    for (const commit of allCommits) {
      if (commit.branch && branchLane[commit.branch] === undefined) {
        branchLane[commit.branch] = nextLane++;
      }
    }

    const currentCommitHash = state.detachedHead 
      ? state.HEAD 
      : (state.branches[state.currentBranch]?.commitHash || '');

    const nodes: GraphNode[] = allCommits.map((commit, i) => {
      const lane = branchLane[commit.branch] ?? 0;
      return {
        commit,
        x: lane,
        y: i,
        color: BRANCH_COLORS[lane % BRANCH_COLORS.length],
        branches: branchMap[commit.hash] || [],
        tags: tagMap[commit.hash] || [],
        isHead: commit.hash === currentCommitHash,
        isMerge: commit.parentHashes.length > 1,
      };
    });

    const edges: { from: GraphNode; to: GraphNode; color: string; isMerge: boolean }[] = [];
    const nodeMap = new Map<string, GraphNode>();
    nodes.forEach(n => nodeMap.set(n.commit.hash, n));

    for (const node of nodes) {
      for (let pi = 0; pi < node.commit.parentHashes.length; pi++) {
        const parentNode = nodeMap.get(node.commit.parentHashes[pi]);
        if (parentNode) {
          edges.push({
            from: node,
            to: parentNode,
            color: pi === 0 ? node.color : parentNode.color,
            isMerge: pi > 0,
          });
        }
      }
    }

    return { nodes, edges };
  }, [state]);

  if (graphData.nodes.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full text-gray-500 ${isDarkMode ? 'bg-[#0d1117]' : 'bg-gray-50'}`}>
        <div className="text-center p-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border ${
            isDarkMode ? 'bg-gray-850 border-gray-700 text-3xl' : 'bg-white border-gray-200 text-3xl shadow-sm'
          }`}>
            <span>🌱</span>
          </div>
          <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No commits yet</p>
          <p className={`text-xs ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
            Create files and commit them to visualize the git graph
          </p>
          <div className={`mt-4 p-3 rounded-xl border ${
            isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-100 border-gray-200 shadow-inner'
          }`}>
            <p className="text-[10px] text-gray-500 font-mono space-y-1">
              <span className="block"><span className="text-gray-600">$</span> <span className="text-green-500">git init</span></span>
              <span className="block"><span className="text-gray-600">$</span> <span className="text-blue-400">touch</span> file.txt</span>
              <span className="block"><span className="text-gray-600">$</span> <span className="text-green-500">git add</span> .</span>
              <span className="block"><span className="text-gray-600">$</span> <span className="text-green-500">git commit</span> -m "first"</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const nodeSpacingY = 72;
  const nodeSpacingX = 48;
  const paddingLeft = 35;
  const paddingTop = 35;
  const nodeRadius = 7;
  
  const maxLane = Math.max(...graphData.nodes.map(n => n.x), 0);
  const labelStartX = paddingLeft + (maxLane + 1) * nodeSpacingX + 25;
  const svgWidth = labelStartX + 350;
  const svgHeight = paddingTop * 2 + graphData.nodes.length * nodeSpacingY;

  const getPos = (node: GraphNode) => ({
    cx: paddingLeft + node.x * nodeSpacingX,
    cy: paddingTop + node.y * nodeSpacingY,
  });

  return (
    <div className={`overflow-auto h-full custom-scrollbar ${isDarkMode ? 'bg-[#0d1117]' : 'bg-white'}`}>
      <div className={`px-4 py-1.5 border-b text-[10px] uppercase tracking-wider font-semibold ${
        isDarkMode ? 'border-gray-800 bg-gray-900/50 text-gray-500' : 'border-gray-200 bg-gray-50 text-gray-400'
      }`}>
        💡 Click nodes to inspect commits / branch labels to checkout
      </div>
      <svg width={svgWidth} height={Math.max(svgHeight, 200)} className="min-w-full">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.4"/>
          </filter>
          {BRANCH_COLORS.map((color, i) => (
            <radialGradient key={i} id={`grad-${i}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.7" />
            </radialGradient>
          ))}
        </defs>

        {/* Background grid lines for lanes */}
        {Array.from({ length: maxLane + 1 }, (_, i) => (
          <line
            key={`lane-${i}`}
            x1={paddingLeft + i * nodeSpacingX}
            y1={0}
            x2={paddingLeft + i * nodeSpacingX}
            y2={svgHeight}
            stroke={isDarkMode ? '#1e293b' : '#e2e8f0'}
            strokeWidth={1}
            strokeDasharray="2,6"
            opacity={0.3}
          />
        ))}

        {/* Edges */}
        {graphData.edges.map((edge, i) => {
          const from = getPos(edge.from);
          const to = getPos(edge.to);
          
          let path: string;
          if (from.cx === to.cx) {
            path = `M ${from.cx} ${from.cy} L ${to.cx} ${to.cy}`;
          } else {
            const midY1 = from.cy + (to.cy - from.cy) * 0.3;
            const midY2 = from.cy + (to.cy - from.cy) * 0.7;
            path = `M ${from.cx} ${from.cy} C ${from.cx} ${midY1} ${to.cx} ${midY2} ${to.cx} ${to.cy}`;
          }

          return (
            <g key={`edge-${i}`}>
              <path
                d={path}
                fill="none"
                stroke={edge.color}
                strokeWidth={4}
                strokeDasharray={edge.isMerge ? '6,4' : undefined}
                opacity={0.1}
              />
              <path
                d={path}
                fill="none"
                stroke={edge.color}
                strokeWidth={2}
                strokeDasharray={edge.isMerge ? '6,4' : undefined}
                opacity={0.6}
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {/* Nodes */}
        {graphData.nodes.map((node) => {
          const pos = getPos(node);
          const laneIndex = node.x % BRANCH_COLORS.length;

          return (
            <g key={node.commit.hash} className="group">
              {/* HEAD glow ring */}
              {node.isHead && (
                <>
                  <circle
                    cx={pos.cx}
                    cy={pos.cy}
                    r={nodeRadius + 8}
                    fill="none"
                    stroke={node.color}
                    strokeWidth={1.5}
                    opacity={0.2}
                    filter="url(#glow)"
                  />
                  <circle
                    cx={pos.cx}
                    cy={pos.cy}
                    r={nodeRadius + 4}
                    fill="none"
                    stroke={node.color}
                    strokeWidth={2}
                    opacity={0.4}
                  />
                </>
              )}

              {/* Node selection outline on hover */}
              <circle
                cx={pos.cx}
                cy={pos.cy}
                r={nodeRadius + 12}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => onSelectCommit(node.commit.hash)}
              />

              {/* Main node */}
              {node.isMerge ? (
                <rect
                  x={pos.cx - nodeRadius + 1}
                  y={pos.cy - nodeRadius + 1}
                  width={(nodeRadius - 1) * 2}
                  height={(nodeRadius - 1) * 2}
                  fill={isDarkMode ? '#0d1117' : '#ffffff'}
                  stroke={node.color}
                  strokeWidth={2.5}
                  transform={`rotate(45, ${pos.cx}, ${pos.cy})`}
                  rx={2}
                  className="cursor-pointer hover:scale-125 transition-transform"
                  onClick={() => onSelectCommit(node.commit.hash)}
                />
              ) : (
                <circle
                  cx={pos.cx}
                  cy={pos.cy}
                  r={nodeRadius}
                  fill={`url(#grad-${laneIndex})`}
                  filter="url(#shadow)"
                  className="cursor-pointer hover:r-[9px] transition-all"
                  onClick={() => onSelectCommit(node.commit.hash)}
                />
              )}

              {/* Commit info */}
              {/* Hash */}
              <text
                x={labelStartX}
                y={pos.cy - 7}
                fill={isDarkMode ? '#64748b' : '#94a3b8'}
                fontSize="11"
                fontFamily="'SF Mono', 'Cascadia Code', monospace"
                className="cursor-pointer hover:underline"
                onClick={() => onSelectCommit(node.commit.hash)}
              >
                {shortHash(node.commit.hash)}
              </text>

              {/* Message */}
              <text
                x={labelStartX + 62}
                y={pos.cy - 7}
                fill={isDarkMode ? '#cbd5e1' : '#1e293b'}
                fontSize="11.5"
                fontFamily="system-ui, sans-serif"
                className="cursor-pointer hover:text-green-500 transition-colors"
                onClick={() => onSelectCommit(node.commit.hash)}
              >
                {node.commit.message.length > 30 
                  ? node.commit.message.substring(0, 30) + '…'
                  : node.commit.message}
              </text>

              {/* Branch labels */}
              {node.branches.map((branch, bi) => {
                const isCurrentBranch = branch === state.currentBranch;
                const bx = labelStartX + bi * 95;
                const labelWidth = Math.min(branch.length * 6.5 + 16, 88);
                return (
                  <g key={`branch-${bi}`} className="cursor-pointer" onClick={() => onCheckoutBranch(branch)}>
                    <rect
                      x={bx}
                      y={pos.cy + 3}
                      width={labelWidth}
                      height={17}
                      rx={8.5}
                      fill={isCurrentBranch ? node.color : isDarkMode ? '#1e293b' : '#e2e8f0'}
                      opacity={isCurrentBranch ? 0.2 : 0.8}
                      stroke={isCurrentBranch ? node.color : isDarkMode ? '#334155' : '#cbd5e1'}
                      strokeWidth={1}
                    />
                    <text
                      x={bx + 8}
                      y={pos.cy + 15}
                      fill={isCurrentBranch ? node.color : isDarkMode ? '#94a3b8' : '#475569'}
                      fontSize="9.5"
                      fontFamily="'SF Mono', monospace"
                      fontWeight={isCurrentBranch ? '600' : '400'}
                    >
                      {branch.length > 11 ? branch.substring(0, 11) + '..' : branch}
                    </text>
                  </g>
                );
              })}

              {/* Tags */}
              {node.tags.map((tag, ti) => {
                const offsetX = node.branches.length * 95;
                const tx = labelStartX + offsetX + ti * 85;
                const tagWidth = Math.min(tag.length * 6.5 + 20, 80);
                return (
                  <g key={`tag-${ti}`}>
                    <rect
                      x={tx}
                      y={pos.cy + 3}
                      width={tagWidth}
                      height={17}
                      rx={8.5}
                      fill="#78350f"
                      opacity={0.3}
                      stroke="#d97706"
                      strokeWidth={1}
                    />
                    <text
                      x={tx + 8}
                      y={pos.cy + 15}
                      fill="#fbbf24"
                      fontSize="9.5"
                      fontFamily="'SF Mono', monospace"
                    >
                      🏷 {tag.length > 8 ? tag.substring(0, 8) + '..' : tag}
                    </text>
                  </g>
                );
              })}

              {/* HEAD pointer */}
              {node.isHead && (
                <g>
                  <rect
                    x={pos.cx - 16}
                    y={pos.cy - nodeRadius - 19}
                    width={32}
                    height={14}
                    rx={7}
                    fill="#eab308"
                    opacity={0.15}
                    stroke="#eab308"
                    strokeWidth={1}
                  />
                  <text
                    x={pos.cx}
                    y={pos.cy - nodeRadius - 9}
                    fill="#fbbf24"
                    fontSize="8.5"
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="system-ui, sans-serif"
                  >
                    HEAD
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
