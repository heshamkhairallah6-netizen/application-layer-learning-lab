import { useMemo, useState } from 'react';
import { SCENARIOS } from '../data/troubleshooting';
import { Disclosure, LessonHead, Tabs } from '../components/ui';
import PageNav from '../components/layout/PageNav';
import { CheckIcon } from '../components/ui/icons';
import { useProgress } from '../lib/progress';

export default function Troubleshooting() {
  const [activeId, setActiveId] = useState(SCENARIOS[0].id);
  const [opened, setOpened] = useState<string[]>([]);
  const [choice, setChoice] = useState<string | null>(null);
  const { progress, solveScenario } = useProgress();

  const scenario = useMemo(
    () => SCENARIOS.find((s) => s.id === activeId) ?? SCENARIOS[0],
    [activeId],
  );

  const chosen = scenario.hypotheses.find((h) => h.id === choice) ?? null;
  const solved = progress.scenarios.includes(scenario.id);

  function pick(id: string, correct: boolean) {
    setChoice(id);
    if (correct) solveScenario(scenario.id);
  }

  function reset(nextId: string) {
    setActiveId(nextId);
    setOpened([]);
    setChoice(null);
  }

  return (
    <>
      <LessonHead
        eyebrow="08 · Troubleshooting"
        title="Find the fault"
        sentence="Read the ticket, run the commands, then choose what is really broken."
      />

      <Tabs
        items={SCENARIOS.map((s) => ({ id: s.id, label: s.title }))}
        active={scenario.id}
        onChange={reset}
        pill
        label="Ticket"
      />

      <div className="ticket">
        <div className="ticket__head">
          <span className="mono ticket__id">{scenario.ticket}</span>
          <span className="ticket__proto">{scenario.protocol}</span>
          {solved ? <span className="ticket__solved"><CheckIcon /> solved</span> : null}
        </div>
        <p className="ticket__symptom">{scenario.symptom}</p>
        <p className="ticket__hint">Run a command, then pick the cause.</p>

        <div className="ticket__cmds">
          {scenario.commands.map((c) => {
            const open = opened.includes(c.id);
            return (
              <div key={c.id} className="ticket__cmd">
                <button
                  type="button"
                  className="ticket__run"
                  onClick={() => setOpened((prev) => (prev.includes(c.id) ? prev : [...prev, c.id]))}
                  aria-expanded={open}
                >
                  <span className="ticket__prompt">$</span>
                  <span className="mono">{c.cmd}</span>
                  <span className="ticket__run-hint">{open ? 'output' : 'run'}</span>
                </button>
                {open ? (
                  <div className="ticket__out">
                    <pre className="sim__wire">{c.output}</pre>
                    <p className="ticket__finding">{c.finding}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="ticket__hyp">
          <div className="ticket__hyp-title">What is the cause?</div>
          <div className="ticket__options">
            {scenario.hypotheses.map((h) => (
              <button
                key={h.id}
                type="button"
                className={`ticket__option${choice === h.id ? (h.correct ? ' is-right' : ' is-wrong') : ''}`}
                onClick={() => pick(h.id, h.correct)}
                disabled={choice !== null}
              >
                {h.label}
              </button>
            ))}
          </div>
          {chosen ? (
            <p className={`ticket__feedback${chosen.correct ? ' is-right' : ' is-wrong'}`}>{chosen.feedback}</p>
          ) : null}
        </div>
      </div>

      <section className="learn-more">
        <h2 className="learn-more__title">Learn more</h2>
        <Disclosure title="What fixed it" meta={scenario.protocol}>
          <p className="disclosure__note"><strong>Root cause:</strong> {scenario.rootCause}</p>
          <ul className="checklist checklist--teal">
            {scenario.resolution.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
          <p className="disclosure__note"><strong>Verify:</strong> {scenario.verification}</p>
        </Disclosure>
      </section>

      <PageNav />
    </>
  );
}
