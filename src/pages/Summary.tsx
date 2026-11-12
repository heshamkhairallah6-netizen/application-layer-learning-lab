import { Link } from 'react-router-dom';
import { PROTOCOLS } from '../data/protocols';
import { QUIZ_LEVELS } from '../data/quiz';
import { SCENARIOS } from '../data/troubleshooting';
import { ALL_NAV_ITEMS } from '../lib/nav';
import { useProgress } from '../lib/progress';
import { LessonHead } from '../components/ui';
import PageNav from '../components/layout/PageNav';

const CORE = ['http', 'https', 'dns', 'dhcp', 'smtp', 'imap', 'pop3', 'ssh', 'ftp', 'sftp', 'snmp', 'ntp'];

export default function Summary() {
  const { percent, progress, resetProgress } = useProgress();

  const core = PROTOCOLS.filter((p) => CORE.includes(p.id));
  const lessonsDone = progress.visited.length;

  return (
    <>
      <LessonHead
        eyebrow="10 · Summary"
        title="What you can do now"
        sentence="Read a real protocol exchange, name the port, and find the broken step."
      />

      <div className="summary-top">
        <div className="summary-ring">
          <div className="summary-ring__value">{percent}%</div>
          <div className="summary-ring__label">complete</div>
        </div>
        <div className="summary-stats">
          <div>
            <span className="summary-stats__num">{lessonsDone}/{ALL_NAV_ITEMS.length}</span>
            <span className="summary-stats__label">pages opened</span>
          </div>
          <div>
            <span className="summary-stats__num">{progress.sims.length}/5</span>
            <span className="summary-stats__label">simulations finished</span>
          </div>
          <div>
            <span className="summary-stats__num">{progress.scenarios.length}/{SCENARIOS.length}</span>
            <span className="summary-stats__label">tickets solved</span>
          </div>
          <div>
            <span className="summary-stats__num">{progress.quiz.length}/{QUIZ_LEVELS.length}</span>
            <span className="summary-stats__label">quiz levels passed</span>
          </div>
        </div>
      </div>

      <h2 className="summary-title">The twelve protocols, in one table</h2>
      <table className="table table--wide">
        <thead>
          <tr>
            <th>Protocol</th>
            <th>Port</th>
            <th>Transport</th>
            <th>Job</th>
          </tr>
        </thead>
        <tbody>
          {core.map((p) => (
            <tr key={p.id}>
              <td className="mono">{p.name}</td>
              <td className="mono">{p.ports}</td>
              <td>{p.transport}</td>
              <td>{p.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="summary-actions">
        <Link to="/protocols" className="btn">
          Open protocol explorer
        </Link>
        <Link to="/troubleshooting" className="btn">
          Try another ticket
        </Link>
        <button type="button" className="btn btn--ghost" onClick={resetProgress}>
          Reset my progress
        </button>
      </div>

      <PageNav />
    </>
  );
}
