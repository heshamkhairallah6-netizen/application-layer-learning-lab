import { Link, useLocation } from 'react-router-dom';
import { ALL_NAV_ITEMS } from '../../lib/nav';
import { ArrowIcon } from '../ui/icons';

export default function PageNav() {
  const { pathname } = useLocation();
  const index = ALL_NAV_ITEMS.findIndex((item) => item.path === pathname);
  const prev = index > 0 ? ALL_NAV_ITEMS[index - 1] : undefined;
  const next = index >= 0 && index < ALL_NAV_ITEMS.length - 1 ? ALL_NAV_ITEMS[index + 1] : undefined;

  return (
    <nav className="panel" aria-label="Page navigation" style={{ marginTop: 18 }}>
      <div className="panel__body row" style={{ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        {prev ? (
          <Link className="btn btn--ghost" to={prev.path} style={{ height: 'auto', padding: '7px 10px' }}>
            <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
              <ArrowIcon />
            </span>
            <span className="stack" style={{ gap: 1, alignItems: 'flex-start' }}>
              <span className="eyebrow">Previous · {prev.index}</span>
              <span>{prev.short}</span>
            </span>
          </Link>
        ) : (
          <span className="mono faint" style={{ fontSize: 10.5 }}>
            START OF LABORATORY
          </span>
        )}

        {next ? (
          <Link className="btn btn--ghost" to={next.path} style={{ height: 'auto', padding: '7px 10px', marginLeft: 'auto' }}>
            <span className="stack" style={{ gap: 1, alignItems: 'flex-end' }}>
              <span className="eyebrow">Next · {next.index}</span>
              <span>{next.short}</span>
            </span>
            <ArrowIcon />
          </Link>
        ) : (
          <Link className="btn btn--ghost" to="/" style={{ marginLeft: 'auto' }}>
            Back to overview
            <ArrowIcon />
          </Link>
        )}
      </div>
    </nav>
  );
}
