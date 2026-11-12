import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import FlowCanvas, { type FlowNode } from './FlowCanvas';
import { Badge, KeyValue, type KVRow } from '../ui';
import { NextIcon, PauseIcon, PlayIcon, PrevIcon, ReplayIcon } from '../ui/icons';
import { useProgress } from '../../lib/progress';

export type SimStep = {
  id: string;
  title: string;
  phase: string;
  node: number;
  detail: string;
  status?: 'ok' | 'warn' | 'bad' | 'info';
  payloadTitle?: string;
  rows?: KVRow[];
  raw?: string;
  packetLabel?: string;
};

type Props = {
  simId: string;
  title: string;
  sub: string;
  nodes: FlowNode[];
  steps: SimStep[];
  controls?: ReactNode;
  resetKey?: string;
  extra?: ReactNode;
  caption?: string;
  stageFooter?: ReactNode;
};

const SPEEDS = [0.5, 1, 1.5, 2, 3];

const STATUS_TONE: Record<NonNullable<SimStep['status']>, 'blue' | 'teal' | 'amber' | 'red' | 'muted'> = {
  info: 'blue',
  ok: 'teal',
  warn: 'amber',
  bad: 'red',
};

export default function SimulationShell({
  simId,
  title,
  sub,
  nodes,
  steps,
  controls,
  resetKey,
  extra,
  caption,
  stageFooter,
}: Props) {
  const reduce = useReducedMotion();
  const { completeSim } = useProgress();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timelineRef = useRef<HTMLDivElement>(null);

  const last = steps.length - 1;
  const safeIndex = Math.min(index, last);
  const step = steps[safeIndex];
  const finished = safeIndex === last;

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [resetKey, steps.length]);

  useEffect(() => {
    if (!playing) return;
    if (index >= last) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setIndex((i) => Math.min(i + 1, last)), 2400 / speed);
    return () => window.clearTimeout(timer);
  }, [playing, index, last, speed]);

  useEffect(() => {
    if (safeIndex === last) completeSim(simId);
  }, [safeIndex, last, simId, completeSim]);

  useEffect(() => {
    const node = timelineRef.current?.querySelector('[data-active="true"]');
    if (node instanceof HTMLElement) node.scrollIntoView({ block: 'nearest' });
  }, [safeIndex]);

  const playPause = () => {
    if (finished) {
      setIndex(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };

  const replay = () => {
    setIndex(0);
    setPlaying(true);
  };

  return (
    <section className="sim" aria-label={`${title} simulation`}>
      <header className="sim__head">
        <div style={{ minWidth: 0 }}>
          <div className="sim__title">{title}</div>
          <div className="sim__sub">{sub}</div>
        </div>
        {controls ? <div className="sim__controls">{controls}</div> : null}
      </header>

      <div className="sim__progress" aria-hidden>
        <div className="sim__progress-bar" style={{ width: `${((safeIndex + 1) / steps.length) * 100}%` }} />
      </div>

      <div className="sim__stage">
        <div className="sim__caption">
          <span className="sim__caption-dot" aria-hidden />
          <span>
            Step {String(safeIndex + 1).padStart(2, '0')} of {String(steps.length).padStart(2, '0')}
          </span>
          <span aria-hidden>·</span>
          <span>{caption ?? step?.phase}</span>
        </div>
        <FlowCanvas
          nodes={nodes}
          activeNode={step?.node ?? 0}
          packetLabel={step?.packetLabel}
          speed={speed}
        />
        {stageFooter}
      </div>

      <div className="sim__toolbar">
        <button
          type="button"
          className="btn btn--icon"
          onClick={() => {
            setPlaying(false);
            setIndex((i) => Math.max(0, i - 1));
          }}
          disabled={safeIndex === 0}
          aria-label="Previous step"
          title="Previous step"
        >
          <PrevIcon />
        </button>
        <button type="button" className="btn btn--primary" onClick={playPause} aria-label={playing ? 'Pause simulation' : 'Play simulation'}>
          {playing ? <PauseIcon /> : <PlayIcon />}
          {playing ? 'Pause' : finished ? 'Play again' : 'Play'}
        </button>
        <button
          type="button"
          className="btn btn--icon"
          onClick={() => {
            setPlaying(false);
            setIndex((i) => Math.min(last, i + 1));
          }}
          disabled={finished}
          aria-label="Next step"
          title="Next step"
        >
          <NextIcon />
        </button>
        <button type="button" className="btn btn--ghost" onClick={replay} aria-label="Replay simulation from the first step">
          <ReplayIcon />
          Replay
        </button>

        <div className="spacer" />

        <label className="sim__speed">
          SPEED
          <select className="select" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Animation speed">
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="sim__body">
        <div className="sim__timeline" ref={timelineRef} role="list" aria-label="Communication timeline">
          {steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="listitem"
              data-active={i === safeIndex}
              className={`sim__step${i === safeIndex ? ' is-active' : ''}${i < safeIndex ? ' is-done' : ''}`}
              onClick={() => {
                setPlaying(false);
                setIndex(i);
              }}
              aria-current={i === safeIndex}
            >
              <span className="sim__step-index">{String(i + 1).padStart(2, '0')}</span>
              <span>
                <span className="sim__step-title">{s.title}</span>
                <span className="sim__step-phase">{s.phase}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="sim__detail" aria-live="polite">
          <div className="sim__detail-head">
            <span className="mono dim" style={{ fontSize: 12 }}>
              {String(safeIndex + 1).padStart(2, '0')}
            </span>
            <span className="sim__detail-title">{step?.title}</span>
            {step?.status ? <Badge tone={STATUS_TONE[step.status]}>{step.phase}</Badge> : <Badge>{step?.phase}</Badge>}
          </div>
          <p className="sim__explain">{step?.detail}</p>
          {step?.rows && step.rows.length > 0 ? (
            <div className="sim__payload">
              <div className="sim__payload-head">
                <span className="dot dot--live" />
                {step.payloadTitle ?? 'Inspection'}
              </div>
              <KeyValue rows={step.rows} />
            </div>
          ) : null}
          {step?.raw ? (
            <div className="code-block">
              <div className="code-block__head">RAW MESSAGE</div>
              <pre>{step.raw}</pre>
            </div>
          ) : null}
          <div className="sim__hint">
            <span className="sim__hint-label">Tip</span>
            <span>
              Click any component in the diagram to see what it does in this exchange. Use the arrows to move one step at a time.
            </span>
          </div>
          {!reduce && finished ? (
            <div className="callout callout--ok">
              <span>
                <strong>Sequence complete.</strong> Every hop has been inspected — replay or step back to compare individual messages.
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="sim__legend">
        <span>
          <span className="dot dot--ok" style={{ display: 'inline-block', marginRight: 8 }} />
          completed
        </span>
        <span>
          <span className="dot dot--live" style={{ display: 'inline-block', marginRight: 8 }} />
          active hop
        </span>
        <span className="faint">click any component for its role</span>
      </div>

      {extra}
    </section>
  );
}
