import { Link, useLocation } from 'react-router-dom';
import { ALL_NAV_ITEMS } from '../../lib/nav';
import { ArrowIcon } from '../ui/icons';

export default function PageNav() {
  const { pathname } = useLocation();
  const index = ALL_NAV_ITEMS.findIndex((item) => item.path === pathname);
  const prev = index > 0 ? ALL_NAV_ITEMS[index - 1] : undefined;
  const next = index >= 0 && index < ALL_NAV_ITEMS.length - 1 ? ALL_NAV_ITEMS[index + 1] : undefined;

  return (
    <nav className="panel page-nav-panel" aria-label="Page navigation">
      <div className="panel__body row" style={{ justifyContent: 'space-between', gap: 16 }}>
        {prev ? (
          <Link className="page-nav-link" to={prev.path}>
            <span style={{ display: 'inline-flex', transform: 'rotate(180deg)', color: 'var(--muted)' }}>
              <ArrowIcon />
            </span>
            <span className="page-nav-link__meta">
              <span className="eyebrow">Previous · {prev.index}</span>
              <span className="page-nav-link__title">{prev.short}</span>
            </span>
          </Link>
        ) : (
          <span className="mono faint" style={{ fontSize: 12 }}>
            START OF LABORATORY
          </span>
        )}

        {next ? (
          <Link className="page-nav-link page-nav-link--next" to={next.path} style={{ marginLeft: 'auto' }}>
            <span className="page-nav-link__meta">
              <span className="eyebrow">Next · {next.index}</span>
              <span className="page-nav-link__title">{next.short}</span>
            </span>
            <span style={{ display: 'inline-flex', color: 'var(--muted)' }}>
              <ArrowIcon />
            </span>
          </Link>
        ) : (
          <Link className="page-nav-link page-nav-link--next" to="/" style={{ marginLeft: 'auto' }}>
            <span className="page-nav-link__meta">
              <span className="eyebrow">Finished</span>
              <span className="page-nav-link__title">Back to overview</span>
            </span>
            <span style={{ display: 'inline-flex', color: 'var(--muted)' }}>
              <ArrowIcon />
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
}
