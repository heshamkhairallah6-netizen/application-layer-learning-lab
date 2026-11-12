import { Link } from 'react-router-dom';
import { Disclosure, LessonHead } from '../components/ui';
import PageNav from '../components/layout/PageNav';
import { ArrowIcon } from '../components/ui/icons';
import { useProgress } from '../lib/progress';

const STARTS = [
  { to: '/http', label: 'Send an HTTP request', note: 'Start here', meta: '03' },
  { to: '/protocols', label: 'Find any protocol', note: 'Ports and jobs', meta: '02' },
  { to: '/knowledge-check', label: 'Test yourself', note: '3 levels', meta: '09' },
];

export default function Overview() {
  const { percent, progress } = useProgress();

  return (
    <>
      <LessonHead
        eyebrow="00 · Orientation"
        title="The Layer 7 engineering lab"
        sentence="Five live simulations that show how the protocols behind every click actually work."
      />

      <div className="progress-strip">
        <div className="progress-strip__bar">
          <span style={{ width: `${percent}%` }} />
        </div>
        <div className="progress-strip__meta">
          <strong>{percent}%</strong> of the lab complete · {progress.sims.length}/5 simulations ·{' '}
          {progress.scenarios.length}/6 scenarios · {progress.quiz.length}/3 quizzes
        </div>
      </div>

      <div className="start-grid">
        {STARTS.map((s) => (
          <Link key={s.to} to={s.to} className="start-card">
            <span className="start-card__meta">{s.meta}</span>
            <span className="start-card__label">{s.label}</span>
            <span className="start-card__note">{s.note}</span>
            <span className="start-card__arrow">
              <ArrowIcon />
            </span>
          </Link>
        ))}
      </div>

      <section className="learn-more">
        <h2 className="learn-more__title">Learn more</h2>

        <Disclosure title="How to use this lab" meta="3 steps">
          <ul className="checklist checklist--teal">
            <li>Press the play button and watch one message travel.</li>
            <li>Step forward one message at a time and read the real protocol text.</li>
            <li>Click any box in the diagram to see what that machine does.</li>
          </ul>
        </Disclosure>

        <Disclosure title="What Layer 7 actually is" meta="one paragraph">
          <p className="disclosure__note">
            Layer 7 is the top layer of the OSI model. It is the set of rules applications agree on: how a web page is
            requested, how a name becomes an address, how mail is delivered. Everything below it exists to carry those
            messages.
          </p>
        </Disclosure>
      </section>

      <PageNav />
    </>
  );
}
