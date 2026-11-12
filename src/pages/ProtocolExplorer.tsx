import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PROTOCOLS, PROTOCOL_CATEGORIES, type ProtocolCategory } from '../data/protocols';
import { Disclosure, LessonHead, Tabs } from '../components/ui';
import PageNav from '../components/layout/PageNav';
import { ArrowIcon } from '../components/ui/icons';

const LAB_LINKS: Record<string, string> = {
  http: '/http',
  https: '/http',
  dns: '/dns',
  dhcp: '/dhcp',
  smtp: '/email',
  imap: '/email',
  pop3: '/email',
  rest: '/api-lab',
  json: '/api-lab',
};

export default function ProtocolExplorer() {
  const [category, setCategory] = useState<ProtocolCategory>('Web');
  const [openId, setOpenId] = useState<string | null>('http');

  const list = useMemo(() => PROTOCOLS.filter((p) => p.category === category), [category]);

  return (
    <>
      <LessonHead
        eyebrow="02 · Protocol explorer"
        title="Which protocol does what"
        sentence="Pick a category, then tap a protocol to see its port and its job in one line."
      />

      <Tabs
        items={PROTOCOL_CATEGORIES.map((c) => ({ id: c, label: c }))}
        active={category}
        onChange={setCategory}
        pill
        label="Protocol category"
      />

      <ul className="proto-list">
        {list.map((p) => {
          const open = openId === p.id;
          const lab = LAB_LINKS[p.id];
          return (
            <li key={p.id} className={`proto${open ? ' is-open' : ''}`}>
              <button
                type="button"
                className="proto__head"
                onClick={() => setOpenId(open ? null : p.id)}
                aria-expanded={open}
              >
                <span className="proto__name">{p.name}</span>
                <span className="proto__full">{p.full}</span>
                <span className="proto__port mono">{p.ports}</span>
                <span className="proto__chev">{open ? '−' : '+'}</span>
              </button>

              {open ? (
                <div className="proto__body">
                  <p className="proto__purpose">{p.purpose}</p>
                  <div className="proto__facts">
                    <div>
                      <span className="faint">Transport</span>
                      <span>{p.transport}</span>
                    </div>
                    <div>
                      <span className="faint">Ports</span>
                      <span className="mono">{p.ports}</span>
                    </div>
                    <div>
                      <span className="faint">Security</span>
                      <span>{p.security}</span>
                    </div>
                  </div>
                  <p className="proto__example">
                    <span className="faint">Example</span> {p.examples[0]}
                  </p>
                  {lab ? (
                    <Link to={lab} className="proto__lab">
                      Try it in the lab <ArrowIcon />
                    </Link>
                  ) : null}
                  <details className="sim__fields">
                    <summary>Deeper detail</summary>
                    <p className="disclosure__note">{p.why}</p>
                    <ul className="checklist checklist--teal">
                      {p.process.slice(0, 4).map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                    <p className="disclosure__note">
                      <strong>Common problem:</strong> {p.troubleshooting[0]}
                    </p>
                    <p className="disclosure__note">
                      <strong>Standard:</strong> {p.standard}
                    </p>
                  </details>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <section className="learn-more">
        <h2 className="learn-more__title">Learn more</h2>
        <Disclosure title="Encrypted or cleartext?" meta="one glance">
          <table className="table">
            <thead>
              <tr>
                <th>Protocol</th>
                <th>Default state</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="mono">HTTPS</td><td>Encrypted (TLS)</td></tr>
              <tr><td className="mono">HTTP</td><td>Cleartext</td></tr>
              <tr><td className="mono">DNS over HTTPS</td><td>Encrypted (TLS)</td></tr>
              <tr><td className="mono">DNS on port 53</td><td>Cleartext</td></tr>
              <tr><td className="mono">SFTP / SSH</td><td>Encrypted (SSH)</td></tr>
              <tr><td className="mono">FTP / Telnet</td><td>Cleartext</td></tr>
            </tbody>
          </table>
        </Disclosure>
      </section>

      <PageNav />
    </>
  );
}
