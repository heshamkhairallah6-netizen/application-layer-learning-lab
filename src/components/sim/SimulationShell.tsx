import { useEffect, useState, type ReactNode } from 'react';
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
  /** Label for the primary action, e.g. "Send request". Defaults to Play. */
  playLabel?: string;
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

const pad = (n: number) => String(n).padStart(2, '0');

export default function SimulationShell({
  simId,
  title,
  sub,
  nodes,
  steps,
  controls,
  resetKey,
  extra,
  playLabel,
  caption,
  stageFooter,
}: Props) {
  const { completeSim } = useProgress();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

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
    const timer = window.setTimeout(() => setIndex((i) => Math.min(i + 1, last)), 2600 / speed);
    return () => window.clearTimeout(timer);
  }, [playing, index, last, speed]);

  useEffect(() => {
    if (safeIndex === last) completeSim(simId);
  }, [safeIndex, last, simId, completeSim]);

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

  const idleLabel = playLabel ?? 'Play';

  return (
    <section className="sim" aria-label={`${title} simulation`}>
      <header className="sim__head">
        <div className="sim__heading">
          <h2 className="sim__title">{title}</h2>
          <p className="sim__sub">{sub}</p>
        </div>
        {controls ? <div className="sim__controls">{controls}</div> : null}
      </header>

      <div className="sim__stage">
        <div className="sim__caption">
          <span className="sim__caption-dot" aria-hidden />
          <span className="mono">
            STEP {pad(safeIndex + 1)} / {pad(steps.length)}
          </span>
          <span className="sim__caption-phase">{step?.phase}</span>
        </div>

        <FlowCanvas nodes={nodes} activeNode={step?.node ?? 0} packetLabel={step?.packetLabel} speed={speed} />

        {caption ? <p className="sim__stage-note">{caption}</p> : null}
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

        <button
          type="button"
          className="btn btn--primary btn--play"
          onClick={playPause}
          aria-label={playing ? 'Pause simulation' : idleLabel}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
          {playing ? 'Pause' : finished ? `Replay` : idleLabel}
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
          Restart
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

      <div className="sim__now" aria-live="polite">
        <div className="sim__now-head">
          <span className="sim__now-step mono">{pad(safeIndex + 1)}</span>
          <span className="sim__now-title">{step?.title}</span>
          {step?.status ? <Badge tone={STATUS_TONE[step.status]}>{step.phase}</Badge> : null}
        </div>

        <p className="sim__now-text">{step?.detail}</p>

        {step?.raw ? <pre className="sim__wire">{step.raw}</pre> : null}

        {step?.rows && step.rows.length > 0 ? (
          <details className="sim__fields">
            <summary>
              {step.payloadTitle ?? 'Message fields'} <span className="faint">· {step.rows.length} fields</span>
            </summary>
            <KeyValue rows={step.rows} />
          </details>
        ) : null}
      </div>

      <ol className="sim__chips" aria-label="Message sequence">
        {steps.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              className={`sim__chip${i === safeIndex ? ' is-active' : ''}${i < safeIndex ? ' is-done' : ''}`}
              onClick={() => {
                setPlaying(false);
                setIndex(i);
              }}
              aria-current={i === safeIndex}
              aria-label={`Step ${i + 1}: ${s.title}`}
              title={s.title}
            >
              <span className="sim__chip-num">{i + 1}</span>
              <span className="sim__chip-label">{s.packetLabel ?? s.phase}</span>
            </button>
          </li>
        ))}
      </ol>

      {extra}
    </section>
  );
}
