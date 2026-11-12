import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { NAV, findNavByPath } from '../../lib/nav';
import { useProgress } from '../../lib/progress';
import { LayersIcon } from '../ui/icons';

export default function AppShell() {
  const location = useLocation();
  const { percent, markVisited } = useProgress();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = findNavByPath(location.pathname);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (current) markVisited(current.id);
  }, [current, markVisited]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="app-shell">
      {menuOpen ? <button type="button" className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} /> : null}

      <aside className={`sidebar${menuOpen ? ' is-open' : ''}`} aria-label="Laboratory navigation">
        <div className="sidebar__brand">
          <span className="brand-mark">
            <LayersIcon size={16} />
          </span>
          <span className="brand-text">
            <strong>Layer 7 Lab</strong>
            <span>Application Layer</span>
          </span>
        </div>

        <nav className="sidebar__nav">
          {NAV.map((section) => (
            <div className="nav-section" key={section.title}>
              <div className="nav-section__label">{section.title}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
                >
                  <span className="nav-link__index">{item.index}</span>
                  <span className="nav-link__label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="row">
            <span className="dot dot--live live-dot" />
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.08em' }}>
              LAB ENVIRONMENT ONLINE
            </span>
          </div>
          <div className="mono" style={{ fontSize: 10 }}>
            OSI Layer 7 · build 1.0
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button type="button" className="mobile-toggle" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
            <span />
            <span />
            <span />
          </button>
          <div className="topbar__crumb">
            <span>Layer 7 Lab</span>
            <span style={{ color: '#4c5966' }}>/</span>
            <strong>{current?.short ?? 'Application Layer'}</strong>
          </div>
          <div className="topbar__right">
            <div className="progress-chip" title="Saved locally in this browser">
              <span>PROGRESS</span>
              <span className="progress-chip__track">
                <span className="progress-chip__bar" style={{ width: `${percent}%` }} />
              </span>
              <span>{percent}%</span>
            </div>
          </div>
        </header>

        <main className="page" id="main">
          <div className="page-enter" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
