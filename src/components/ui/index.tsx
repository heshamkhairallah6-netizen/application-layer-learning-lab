import type { ReactNode } from 'react';

type PanelProps = {
  title?: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  flush?: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
};

export function Panel({ title, sub, actions, footer, flush, children, className, id }: PanelProps) {
  return (
    <section className={className ? `panel ${className}` : 'panel'} id={id}>
      {(title || actions) && (
        <header className="panel__head">
          {title ? <h3 className="panel__title">{title}</h3> : null}
          {sub ? <span className="panel__sub">{sub}</span> : null}
          {actions ? <div className="row" style={{ marginLeft: 'auto', gap: 6 }}>{actions}</div> : null}
        </header>
      )}
      <div className={flush ? 'panel__body panel__body--tight' : 'panel__body'}>{children}</div>
      {footer ? <footer className="panel__foot">{footer}</footer> : null}
    </section>
  );
}

type PageHeadProps = {
  eyebrow: string;
  title: string;
  lede: string;
  actions?: ReactNode;
};

export function PageHead({ eyebrow, title, lede, actions }: PageHeadProps) {
  return (
    <header className="page-head">
      <div className="page-head__main">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page-head__title">{title}</h1>
        <p className="page-head__lede">{lede}</p>
      </div>
      {actions ? <div className="page-head__actions">{actions}</div> : null}
    </header>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
      {hint ? <div className="stat__hint">{hint}</div> : null}
    </div>
  );
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'blue' | 'teal' | 'amber' | 'red' | 'green' }) {
  return <span className={`badge${tone === 'muted' ? '' : ` badge--${tone}`}`}>{children}</span>;
}

export type KVRow = [string, ReactNode];

export function KeyValue({ rows }: { rows: KVRow[] }) {
  return (
    <div className="kv">
      {rows.map(([key, value]) => (
        <div className="kv__row" key={key}>
          <div className="kv__key">{key}</div>
          <div className="kv__val">{value}</div>
        </div>
      ))}
    </div>
  );
}

export function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="code-block">
      <div className="code-block__head">
        <span className="dot dot--live" />
        {title}
      </div>
      <pre>{code}</pre>
    </div>
  );
}

export function Tabs<T extends string>({
  items,
  active,
  onChange,
  pill = false,
  label,
}: {
  items: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  pill?: boolean;
  label?: string;
}) {
  return (
    <div className={pill ? 'tabs tabs--pill' : 'tabs'} role="tablist" aria-label={label ?? 'View selector'}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={active === item.id}
          className={`tab${active === item.id ? ' is-active' : ''}`}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Callout({ tone = 'info', children }: { tone?: 'info' | 'teal' | 'warn' | 'ok'; children: ReactNode }) {
  const cls = tone === 'info' ? 'callout' : `callout callout--${tone}`;
  return <div className={cls}>{children}</div>;
}

export function Meter({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="stack" style={{ gap: 6 }}>
      {label ? (
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="eyebrow">{label}</span>
          <span className="mono dim">{pct}%</span>
        </div>
      ) : null}
      <div className="score-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'Progress'}>
        <div className="score-bar__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
