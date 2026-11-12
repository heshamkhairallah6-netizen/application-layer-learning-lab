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
const H = 274;
const BOX_W = 150;
const BOX_H = 78;
const TOP = 146;
const PAD = 92;

const KIND_STROKE: Record<NonNullable<FlowNode['kind']>, string> = {
  client: '#5e97bd',
  server: '#58a8a1',
  service: '#7d8b9b',
  network: '#5a6776',
};

const KIND_FILL: Record<NonNullable<FlowNode['kind']>, string> = {
  client: 'rgba(71,123,158,0.16)',
  server: 'rgba(67,143,137,0.16)',
  service: 'rgba(255,255,255,0.035)',
  network: 'rgba(255,255,255,0.02)',
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
  const packetY = TOP - 42;
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
            <path d="M0 0 6 3 0 6z" fill="#438f89" />
          </marker>
          <linearGradient id="flow-packet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8ec4e0" />
            <stop offset="100%" stopColor="#477b9e" />
          </linearGradient>
        </defs>

        {caption ? (
          <text x="24" y="26" fill="#7f8b99" fontSize="10" letterSpacing="1.6">
            {caption.toUpperCase()}
          </text>
        ) : null}

        {nodes.slice(0, -1).map((node, i) => {
          const x1 = nodeX(i, total) + BOX_W / 2 + 3;
          const x2 = nodeX(i + 1, total) - BOX_W / 2 - 6;
          const isDone = i < activeLink;
          const isActive = i === activeLink;
          return (
            <g key={`wire-${node.id}`}>
              <line
                x1={x1}
                y1={TOP + BOX_H / 2}
                x2={x2}
                y2={TOP + BOX_H / 2}
                stroke={isDone ? '#3d6f6a' : isActive ? '#5e97bd' : '#414d5b'}
                strokeWidth={isActive ? 1.8 : 1.2}
                strokeDasharray={isActive ? '5 4' : undefined}
                markerEnd={isDone ? 'url(#flow-arrow-done)' : 'url(#flow-arrow)'}
                opacity={isActive || isDone ? 1 : 0.75}
              >
                {isActive ? <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1s" repeatCount="indefinite" /> : null}
              </line>
              <text
                x={(x1 + x2) / 2}
                y={TOP + BOX_H / 2 - 8}
                fill={isActive ? '#8fb8d2' : '#5c6875'}
                fontSize="8.5"
                textAnchor="middle"
                letterSpacing="0.8"
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
          const stroke = isActive ? '#7fb2d2' : isDone ? '#3f736e' : KIND_STROKE[node.kind ?? 'service'];
          const fill = isActive ? 'rgba(71,123,158,0.26)' : KIND_FILL[node.kind ?? 'service'];
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
              <rect
                x={x - BOX_W / 2}
                y={TOP}
                width={BOX_W}
                height={BOX_H}
                rx="4"
                fill={fill}
                stroke={stroke}
                strokeWidth={isActive ? 1.8 : 1}
              />
              <rect x={x - BOX_W / 2} y={TOP} width={BOX_W} height="2.5" rx="1" fill={stroke} opacity={isActive ? 1 : 0.55} />
              {node.tag ? (
                <text x={x} y={TOP + 19} fill={isActive ? '#a9cde4' : '#7f8b99'} fontSize="8.5" textAnchor="middle" letterSpacing="1.1">
                  {node.tag.toUpperCase()}
                </text>
              ) : null}
              <text x={x} y={TOP + 42} fill={isActive ? '#f1f3f5' : '#d5dde5'} fontSize="12" textAnchor="middle" fontWeight="600">
                {node.label}
              </text>
              <text x={x} y={TOP + 58} fill={isActive ? '#b6c9d6' : '#8d99a6'} fontSize="8.8" textAnchor="middle">
                {node.sub}
              </text>
              {node.address ? (
                <text x={x} y={TOP + 71} fill="#6f7d8c" fontSize="8" textAnchor="middle">
                  {node.address}
                </text>
              ) : null}
              {isDone ? (
                <circle cx={x + BOX_W / 2 - 9} cy={TOP + 11} r="4" fill="#438f89" />
              ) : null}
              {isDone ? (
                <path
                  d={`M${x + BOX_W / 2 - 11} ${TOP + 11} l1.4 1.4 2.6 -2.8`}
                  stroke="#10161c"
                  strokeWidth="1.2"
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
              r="17"
              fill="rgba(71,123,158,0.16)"
            />
            <motion.circle
              animate={{ cx: px, cy: packetY }}
              initial={false}
              transition={{ duration, ease: 'easeInOut' }}
              r="6.5"
              fill="url(#flow-packet)"
              stroke="#a9cde4"
              strokeWidth="1"
            />
            <motion.line
              animate={{ x1: px, x2: px }}
              initial={false}
              transition={{ duration, ease: 'easeInOut' }}
              y1={packetY + 8}
              y2={TOP - 4}
              stroke="#5e97bd"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.65"
            />
            {packetLabel ? (
              <motion.text
                animate={{ x: px }}
                initial={false}
                transition={{ duration, ease: 'easeInOut' }}
                y={packetY - 18}
                fill="#a9cde4"
                fontSize="9"
                textAnchor="middle"
                letterSpacing="0.8"
              >
                {packetLabel}
              </motion.text>
            ) : null}
          </g>
        ) : null}
      </svg>

      {selectedNode ? (
        <div
          style={{
            margin: '0 10px 10px',
            border: '1px solid rgba(94,151,189,0.4)',
            background: 'rgba(23,28,36,0.72)',
            borderRadius: 4,
            padding: '8px 11px',
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'baseline',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span className="mono" style={{ color: '#cfe3ef' }}>
            {selectedNode.label}
          </span>
          <span className="mono dim" style={{ fontSize: 11 }}>
            {selectedNode.sub}
            {selectedNode.address ? ` · ${selectedNode.address}` : ''}
          </span>
          <span style={{ fontSize: 11.8, color: '#aab4c0', flex: '1 1 260px' }}>{selectedNode.detail ?? 'Component in the Layer 7 path.'}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelected(null)}>
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}
