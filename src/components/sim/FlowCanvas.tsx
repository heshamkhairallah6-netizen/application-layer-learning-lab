import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export type FlowNode = {
  id: string;
  label: string;
  sub: string;
  tag?: string;
  address?: string;
  detail?: string;
  kind?: 'client' | 'server' | 'service' | 'network';
};

const W = 1000;
const H = 300;
const BOX_W = 164;
const BOX_H = 96;
const TOP = 150;
const PAD = 86;

const KIND_STROKE: Record<NonNullable<FlowNode['kind']>, string> = {
  client: '#6ba4c8',
  server: '#62b3aa',
  service: '#8d9aa8',
  network: '#5f6c7b',
};

const KIND_FILL: Record<NonNullable<FlowNode['kind']>, string> = {
  client: 'rgba(71,123,158,0.18)',
  server: 'rgba(67,143,137,0.18)',
  service: 'rgba(255,255,255,0.04)',
  network: 'rgba(255,255,255,0.025)',
};

function nodeX(index: number, total: number) {
  if (total <= 1) return W / 2;
  return PAD + (index * (W - PAD * 2)) / (total - 1);
}

type Props = {
  nodes: FlowNode[];
  activeNode: number;
  packetLabel?: string;
  caption?: string;
  speed?: number;
  onSelectNode?: (index: number) => void;
};

export default function FlowCanvas({ nodes, activeNode, packetLabel, caption, speed = 1, onSelectNode }: Props) {
  const reduce = useReducedMotion();
  const [selected, setSelected] = useState<number | null>(null);
  const total = nodes.length;
  const active = Math.max(0, Math.min(activeNode, total - 1));
  const activeLink = Math.max(0, active - 1);
  const px = nodeX(active, total);
  const packetY = TOP - 48;
  const duration = reduce ? 0 : Math.min(1.1, 0.72 / Math.max(speed, 0.5));

  const selectedNode = useMemo(() => (selected === null ? null : nodes[selected]), [selected, nodes]);

  useEffect(() => {
    setSelected(null);
  }, [nodes]);

  const handleSelect = (index: number) => {
    setSelected((prev) => (prev === index ? null : index));
    onSelectNode?.(index);
  };

  return (
    <div>
      <div className="sim__stage-scroll">
        <svg
          className="flow"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Network flow diagram with ${total} components. Active component: ${nodes[active]?.label ?? 'none'}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker id="flow-arrow" markerWidth="7" markerHeight="7" refX="5.6" refY="3" orient="auto">
              <path d="M0 0 6 3 0 6z" fill="#6b7887" />
            </marker>
            <marker id="flow-arrow-done" markerWidth="7" markerHeight="7" refX="5.6" refY="3" orient="auto">
              <path d="M0 0 6 3 0 6z" fill="#62b3aa" />
            </marker>
            <linearGradient id="flow-packet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a9cde4" />
              <stop offset="100%" stopColor="#477b9e" />
            </linearGradient>
          </defs>

          {caption ? (
            <text x="26" y="30" fill="#8b97a4" fontSize="12" letterSpacing="1.4" fontFamily="var(--mono)">
              {caption.toUpperCase()}
            </text>
          ) : null}

          {nodes.slice(0, -1).map((node, i) => {
            const x1 = nodeX(i, total) + BOX_W / 2 + 4;
            const x2 = nodeX(i + 1, total) - BOX_W / 2 - 8;
            const isDone = i < activeLink;
            const isActive = i === activeLink;
            return (
              <g key={`wire-${node.id}`}>
                <line
                  x1={x1}
                  y1={TOP + BOX_H / 2}
                  x2={x2}
                  y2={TOP + BOX_H / 2}
                  stroke={isDone ? '#3f7a74' : isActive ? '#6ba4c8' : '#414d5b'}
                  strokeWidth={isActive ? 2 : 1.2}
                  strokeDasharray={isActive ? '6 5' : undefined}
                  markerEnd={isDone ? 'url(#flow-arrow-done)' : 'url(#flow-arrow)'}
                  opacity={isActive || isDone ? 1 : 0.7}
                >
                  {isActive ? <animate attributeName="stroke-dashoffset" from="0" to="-22" dur="1s" repeatCount="indefinite" /> : null}
                </line>
                <text
                  x={(x1 + x2) / 2}
                  y={TOP + BOX_H / 2 - 12}
                  fill={isActive ? '#9dc4dc' : '#5c6875'}
                  fontSize="10"
                  fontFamily="var(--mono)"
                  textAnchor="middle"
                  letterSpacing="1"
                >
                  {isActive ? 'IN TRANSIT' : ''}
                </text>
              </g>
            );
          })}

          {nodes.map((node, i) => {
            const x = nodeX(i, total);
            const isActive = i === active;
            const isDone = i < active;
            const isSelected = i === selected;
            const stroke = isSelected ? '#a9cde4' : isActive ? '#8fc2de' : isDone ? '#4b8b85' : KIND_STROKE[node.kind ?? 'service'];
            const fill = isActive ? 'rgba(71,123,158,0.3)' : KIND_FILL[node.kind ?? 'service'];
            return (
              <g
                key={node.id}
                className="flow__node"
                tabIndex={0}
                role="button"
                aria-label={`${node.label}. ${node.sub}. Select for details.`}
                onClick={() => handleSelect(i)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSelect(i);
                  }
                }}
              >
                {isActive && !reduce ? (
                  <motion.rect
                    x={x - BOX_W / 2 - 6}
                    y={TOP - 6}
                    width={BOX_W + 12}
                    height={BOX_H + 12}
                    rx="9"
                    fill="none"
                    stroke="#6ba4c8"
                    strokeWidth="1"
                    animate={{ opacity: [0.15, 0.55, 0.15] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ) : null}
                <rect
                  x={x - BOX_W / 2}
                  y={TOP}
                  width={BOX_W}
                  height={BOX_H}
                  rx="6"
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isSelected ? 2.2 : isActive ? 1.8 : 1}
                />
                <rect x={x - BOX_W / 2} y={TOP} width={BOX_W} height="3" rx="1.5" fill={stroke} opacity={isActive || isSelected ? 1 : 0.55} />
                {node.tag ? (
                  <text x={x} y={TOP + 24} fill={isActive ? '#b6d8ec' : '#8b97a4'} fontSize="10" fontFamily="var(--mono)" textAnchor="middle" letterSpacing="1.2">
                    {node.tag.toUpperCase()}
                  </text>
                ) : null}
                <text x={x} y={TOP + 51} fill={isActive ? '#ffffff' : '#e3e9ef'} fontSize="15" textAnchor="middle" fontWeight="600">
                  {node.label}
                </text>
                <text x={x} y={TOP + 70} fill={isActive ? '#c4d7e3' : '#9aa6b3'} fontSize="11" textAnchor="middle">
                  {node.sub}
                </text>
                {node.address ? (
                  <text x={x} y={TOP + 86} fill="#7d8a98" fontSize="9.5" fontFamily="var(--mono)" textAnchor="middle">
                    {node.address}
                  </text>
                ) : null}
                {isDone ? <circle cx={x + BOX_W / 2 - 11} cy={TOP + 14} r="5" fill="#438f89" /> : null}
                {isDone ? (
                  <path
                    d={`M${x + BOX_W / 2 - 13.5} ${TOP + 14} l1.7 1.7 3 -3.2`}
                    stroke="#10161c"
                    strokeWidth="1.4"
                    fill="none"
                    strokeLinecap="round"
                  />
                ) : null}
              </g>
            );
          })}

          {active >= 0 ? (
            <g pointerEvents="none">
              <motion.circle
                animate={{ cx: px, cy: packetY }}
                initial={false}
                transition={{ duration, ease: 'easeInOut' }}
                r="20"
                fill="rgba(71,123,158,0.16)"
              />
              <motion.circle
                animate={{ cx: px, cy: packetY }}
                initial={false}
                transition={{ duration, ease: 'easeInOut' }}
                r="7.5"
                fill="url(#flow-packet)"
                stroke="#bfe0f2"
                strokeWidth="1"
              />
              <motion.line
                animate={{ x1: px, x2: px }}
                initial={false}
                transition={{ duration, ease: 'easeInOut' }}
                y1={packetY + 9}
                y2={TOP - 4}
                stroke="#6ba4c8"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              {packetLabel ? (
                <motion.text
                  animate={{ x: px }}
                  initial={false}
                  transition={{ duration, ease: 'easeInOut' }}
                  y={packetY - 22}
                  fill="#a9cde4"
                  fontSize="10.5"
                  fontFamily="var(--mono)"
                  textAnchor="middle"
                  letterSpacing="0.8"
                >
                  {packetLabel}
                </motion.text>
              ) : null}
            </g>
          ) : null}
        </svg>
      </div>

      {selectedNode ? (
        <div className="sim__inspector" role="region" aria-label={`${selectedNode.label} details`}>
          <div className="sim__inspector-head">
            <span className="sim__inspector-name">{selectedNode.label}</span>
            <span className="sim__inspector-role">
              {selectedNode.sub}
              {selectedNode.address ? ` · ${selectedNode.address}` : ''}
            </span>
          </div>
          <p className="sim__inspector-body">{selectedNode.detail ?? 'Component in the Layer 7 path.'}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelected(null)}>
            Close details
          </button>
        </div>
      ) : null}
    </div>
  );
}
