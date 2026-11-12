import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Disclosure, LessonHead, Panel } from '../components/ui';
import PageNav from '../components/layout/PageNav';
import { ArrowIcon } from '../components/ui/icons';

type Layer = {
  n: number;
  name: string;
  job: string;
  examples: string;
};

const LAYERS: Layer[] = [
  { n: 7, name: 'Application', job: 'The rules your app speaks: web pages, names, mail, APIs.', examples: 'HTTP, DNS, SMTP, SSH' },
  { n: 6, name: 'Presentation', job: 'Formats and encrypts data so both sides understand it.', examples: 'TLS, UTF-8, JPEG' },
  { n: 5, name: 'Session', job: 'Opens, keeps and closes a conversation between two hosts.', examples: 'RPC, sockets' },
  { n: 4, name: 'Transport', job: 'Delivers bytes reliably (TCP) or fast (UDP) and uses ports.', examples: 'TCP, UDP' },
  { n: 3, name: 'Network', job: 'Finds a path between networks using IP addresses.', examples: 'IP, ICMP' },
  { n: 2, name: 'Data link', job: 'Moves frames between two devices on the same link.', examples: 'Ethernet, Wi-Fi' },
  { n: 1, name: 'Physical', job: 'Puts bits on the wire, fibre or radio.', examples: 'Cable, radio' },
];

export default function Fundamentals() {
  const [active, setActive] = useState(7);
  const layer = LAYERS.find((l) => l.n === active) ?? LAYERS[0];

  return (
    <>
      <LessonHead
        eyebrow="01 · Fundamentals"
        title="Layer 7 is where your app talks"
        sentence="Every click becomes an application protocol message before anything is sent on the wire."
      />

      <div className="stack-lab">
        <div className="stack-lab__list" role="list">
          {LAYERS.map((l) => (
            <button
              key={l.n}
              type="button"
              role="listitem"
              className={`stack-row${l.n === active ? ' is-active' : ''}${l.n === 7 ? ' is-l7' : ''}`}
              onClick={() => setActive(l.n)}
              aria-pressed={l.n === active}
            >
              <span className="stack-row__num">L{l.n}</span>
              <span className="stack-row__name">{l.name}</span>
              {l.n === 7 ? <span className="stack-row__tag">this lab</span> : null}
            </button>
          ))}
        </div>

        <Panel className="stack-lab__detail">
          <div className="stack-lab__eyebrow">Layer {layer.n} · {layer.name}</div>
          <p className="stack-lab__job">{layer.job}</p>
          <div className="stack-lab__meta">
            <span className="faint">Protocols</span>
            <span className="mono">{layer.examples}</span>
          </div>
          {layer.n === 7 ? (
            <p className="stack-lab__hint">
              Everything in this lab lives here. Pick a protocol below and watch it work.
            </p>
          ) : (
            <p className="stack-lab__hint">
              Layer 7 hands its message down to layer {layer.n - 1 > 0 ? layer.n - 1 : 1}, and each layer adds its own header.
            </p>
          )}
          <Link to="/http" className="stack-lab__link">
            See a real Layer 7 exchange <ArrowIcon />
          </Link>
        </Panel>
      </div>

      <section className="learn-more">
        <h2 className="learn-more__title">Learn more</h2>

        <Disclosure title="Ports you will meet in this lab" meta="80 · 443 · 53 · 67">
          <table className="table">
            <thead>
              <tr>
                <th>Protocol</th>
                <th>Port</th>
                <th>Transport</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="mono">HTTP</td><td className="mono">80</td><td>TCP</td></tr>
              <tr><td className="mono">HTTPS</td><td className="mono">443</td><td>TCP</td></tr>
              <tr><td className="mono">DNS</td><td className="mono">53</td><td>UDP, TCP</td></tr>
              <tr><td className="mono">DHCP</td><td className="mono">67 / 68</td><td>UDP</td></tr>
              <tr><td className="mono">SMTP</td><td className="mono">25 / 587</td><td>TCP</td></tr>
              <tr><td className="mono">SSH</td><td className="mono">22</td><td>TCP</td></tr>
            </tbody>
          </table>
        </Disclosure>

        <Disclosure title="Why TCP or UDP?" meta="reliability vs speed">
          <ul className="checklist checklist--teal">
            <li><strong>TCP</strong> — ordered and retransmitted. Used when every byte matters: HTTP, SMTP, SSH.</li>
            <li><strong>UDP</strong> — no handshake, no retry. Used when a fast answer beats a complete one: DNS, DHCP.</li>
          </ul>
        </Disclosure>

        <Disclosure title="Where TLS sits" meta="443 is not a protocol">
          <p className="disclosure__note">
            HTTPS is HTTP sent inside TLS. The application protocol is still HTTP; TLS encrypts the connection before the
            first request byte is written.
          </p>
        </Disclosure>
      </section>

      <PageNav />
    </>
  );
}
