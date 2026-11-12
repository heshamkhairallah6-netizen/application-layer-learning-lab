import { useMemo, useState } from 'react';
import { SCENARIOS, type Scenario } from '../data/troubleshooting';
import { Badge, Callout, PageHead, Panel } from '../components/ui';
import PageNav from '../components/layout/PageNav';
import { CheckIcon, TerminalIcon } from '../components/ui/icons';
import { useProgress } from '../lib/progress';

type LocalState = { ran: string[]; chosen: string | null; revealed: boolean };

const EMPTY: LocalState = { ran: [], chosen: null, revealed: false };

const METHOD = [
  ['1 · Reproduce', 'Confirm the failure from the same network and client the user has. A ticket that cannot be reproduced is a scoping problem first.'],
  ['2 · Name resolution', 'Does the name resolve? dig / nslookup before anything else — a wrong address makes every later test meaningless.'],
  ['3 · Transport', 'Can you reach the port? nc, curl -v, openssl s_client show connect, TLS and HTTP separately.'],
  ['4 · Application', 'Read the status code, headers and body. 4xx is the client or the contract; 5xx is the server.'],
  ['5 · Evidence', 'Logs and captures on both ends. Compare timestamps before assuming causality.'],
  ['6 · Verify', 'Re-run the exact failing command and confirm the user sees the fix, not just a green dashboard.'],
];

const COMMANDS = [
  ['dig name +short', 'Resolves via the configured resolver; proves naming works or fails'],
  ['dig @ns1.zone name', 'Queries the authoritative server directly, bypassing caches'],
  ['curl -v https://host/path', 'Shows DNS, TCP, TLS and HTTP in one ordered trace'],
  ['curl -I https://host', 'Headers and status code only — fast contract check'],
  ['openssl s_client -connect host:443', 'Certificate chain, expiry and SNI verification'],
  ['nc -vz host 443', 'Pure TCP reachability without any application layer'],
  ['traceroute host', 'Where packets stop on the path (routers may block it)'],
  ['tcpdump -i any port 53', 'Proves whether a query actually left the host'],
  ['ss -tlnp', 'Which process is listening on which port locally'],
  ['dhclient -v / ipconfig /renew', 'Replays DHCP from the client and shows the exchange'],
];

function severityTone(difficulty: Scenario['difficulty']) {
  return difficulty === 'Foundation' ? 'teal' : difficulty === 'Intermediate' ? 'blue' : 'amber';
}

export default function Troubleshooting() {
  const [activeId, setActiveId] = useState(SCENARIOS[0].id);
  const [states, setStates] = useState<Record<string, LocalState>>({});
  const { progress, solveScenario } = useProgress();

  const scenario = useMemo(() => SCENARIOS.find((item) => item.id === activeId) ?? SCENARIOS[0], [activeId]);
  const state = states[scenario.id] ?? EMPTY;
  const solved = progress.scenarios.includes(scenario.id);
  const chosen = scenario.hypotheses.find((item) => item.id === state.chosen);
  const showResolution = state.revealed || Boolean(chosen);

  function update(patch: Partial<LocalState>) {
    setStates((prev) => ({ ...prev, [scenario.id]: { ...(prev[scenario.id] ?? EMPTY), ...patch } }));
  }

  function runCommand(id: string) {
    if (state.ran.includes(id)) return;
    update({ ran: [...state.ran, id] });
  }

  function chooseHypothesis(id: string) {
    const hypothesis = scenario.hypotheses.find((item) => item.id === id);
    if (!hypothesis) return;
    update({ chosen: id });
    if (hypothesis.correct) solveScenario(scenario.id);
  }

  return (
    <>
      <PageHead
        eyebrow="08 · Field practice"
        title="Practical Troubleshooting"
        lede="Six realistic tickets. Run diagnostics in the console, read the evidence, commit to a hypothesis and compare it with the actual root cause. Nothing here is revealed until you ask for it."
        actions={
          <>
            <Badge tone="teal">
              {progress.scenarios.length}/{SCENARIOS.length} resolved
            </Badge>
            <Badge tone="muted">Layer 7 focus</Badge>
          </>
        }
      />

      <div className="grid grid--sidebar">
        <Panel
          title="Ticket queue"
          sub="select a scenario"
          actions={<Badge tone="muted">{SCENARIOS.length}</Badge>}
          flush
        >
          <div>
            {SCENARIOS.map((item) => {
              const isSolved = progress.scenarios.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  className="scenario-item"
                  aria-pressed={item.id === activeId}
                  onClick={() => setActiveId(item.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: item.id === activeId ? 'rgba(71,123,158,0.14)' : 'transparent',
                    border: 0,
                    borderBottom: '1px solid var(--border)',
                    borderLeft: item.id === activeId ? '2px solid var(--blue)' : '2px solid transparent',
                    padding: '11px 14px',
                    cursor: 'pointer',
                    color: 'inherit',
                  }}
                >
                  <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                      {item.ticket}
                    </span>
                    {isSolved ? (
                      <span className="row" style={{ gap: 4, color: '#79c0a8' }}>
                        <CheckIcon size={11} />
                        <span style={{ fontSize: 9.5, letterSpacing: '0.08em' }}>SOLVED</span>
                      </span>
                    ) : (
                      <span className="mono" style={{ fontSize: 9.5, color: 'var(--muted)' }}>
                        OPEN
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.6, color: '#e6eaee', marginTop: 3, lineHeight: 1.4 }}>{item.title}</div>
                  <div className="mono" style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 3 }}>
                    {item.protocol} · {item.difficulty}
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        <div className="stack" style={{ gap: 16 }}>
          <Panel
            title={scenario.title}
            sub={`${scenario.ticket} · ${scenario.protocol}`}
            actions={<Badge tone={severityTone(scenario.difficulty)}>{scenario.difficulty}</Badge>}
          >
            <div className="stack">
              <p style={{ margin: 0, color: '#dfe5ea', fontSize: 13, lineHeight: 1.65 }}>{scenario.symptom}</p>
              <div>
                <span className="eyebrow">Briefing</span>
                <ul className="checklist" style={{ marginTop: 6 }}>
                  {scenario.briefing.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div className="code-block">
                <div className="code-block__head">
                  <span className="row" style={{ gap: 6 }}>
                    <TerminalIcon size={12} />
                    <span>Observed output</span>
                  </span>
                  <span className="mono" style={{ fontSize: 9.5, color: 'var(--muted)' }}>
                    reported by user
                  </span>
                </div>
                <pre>{scenario.alert}</pre>
              </div>
            </div>
          </Panel>

          <Panel
            title="Diagnostic console"
            sub={`${state.ran.length} of ${scenario.commands.length} commands run`}
            actions={
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => update({ ran: [], chosen: null, revealed: false })}
              >
                Reset scenario
              </button>
            }
          >
            <div className="stack">
              <div className="cmd-grid">
                {scenario.commands.map((command) => {
                  const done = state.ran.includes(command.id);
                  return (
                    <button
                      key={command.id}
                      type="button"
                      className={`cmd-btn${done ? ' is-run' : ''}`}
                      onClick={() => runCommand(command.id)}
                      title={done ? 'Already executed' : 'Run this command'}
                    >
                      <span className="mono" style={{ fontSize: 10.5 }}>
                        $ {command.cmd}
                      </span>
                      <span className="mono" style={{ fontSize: 9, color: done ? '#79c0a8' : 'var(--muted)' }}>
                        {done ? 'RAN' : 'RUN'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="code-block" style={{ minHeight: 180 }}>
                <div className="code-block__head">
                  <span className="mono" style={{ fontSize: 10 }}>
                    root@lab:~#
                  </span>
                  <span className="mono" style={{ fontSize: 9.5, color: 'var(--muted)' }}>
                    session output
                  </span>
                </div>
                <pre>
                  {state.ran.length === 0
                    ? 'Select a command above to execute it. Output appears here with an interpretation of what the result proves.'
                    : scenario.commands
                        .filter((command) => state.ran.includes(command.id))
                        .map(
                          (command) =>
                            `$ ${command.cmd}\n${command.output}\n\n# interpretation\n${command.finding}\n`,
                        )
                        .join('\n')}
                </pre>
              </div>
            </div>
          </Panel>

          <Panel
            title="Commit to a hypothesis"
            sub="choose the most likely root cause"
            actions={chosen ? <Badge tone={chosen.correct ? 'green' : 'red'}>{chosen.correct ? 'CORRECT' : 'REVIEW'}</Badge> : undefined}
          >
            <div className="stack">
              {scenario.hypotheses.map((hypothesis) => {
                const isChosen = state.chosen === hypothesis.id;
                return (
                  <button
                    key={hypothesis.id}
                    type="button"
                    onClick={() => chooseHypothesis(hypothesis.id)}
                    className={`option${isChosen ? (hypothesis.correct ? ' is-correct' : ' is-wrong') : ''}`}
                  >
                    <span className="option__mark">{isChosen ? (hypothesis.correct ? '✓' : '✕') : ''}</span>
                    <span className="option__body">
                      <span style={{ display: 'block', fontSize: 12.6 }}>{hypothesis.label}</span>
                      {isChosen && (
                        <span style={{ display: 'block', fontSize: 11.6, color: 'var(--muted)', marginTop: 4, lineHeight: 1.6 }}>
                          {hypothesis.feedback}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}

              {!showResolution && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => update({ revealed: true })}>
                  Reveal root cause without guessing
                </button>
              )}

              {showResolution && (
                <div className="stack" style={{ gap: 10 }}>
                  <div className="divider" />
                  <div>
                    <span className="eyebrow">Root cause</span>
                    <p style={{ margin: '5px 0 0', fontSize: 12.6, lineHeight: 1.7, color: '#e2e8ee' }}>{scenario.rootCause}</p>
                  </div>
                  <div>
                    <span className="eyebrow">Resolution</span>
                    <ol className="checklist checklist--teal" style={{ marginTop: 6 }}>
                      {scenario.resolution.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  <Callout tone="ok">
                    <span>
                      <strong>Verification:</strong> {scenario.verification}
                    </span>
                  </Callout>
                  {solved && (
                    <span className="mono" style={{ fontSize: 10, color: '#79c0a8' }}>
                      ✓ Recorded in your progress
                    </span>
                  )}
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid grid--2" style={{ marginTop: 16 }}>
        <Panel title="Method" sub="the order that avoids wasted effort">
          <ol className="checklist">
            {METHOD.map(([step, detail]) => (
              <li key={step}>
                <strong>{step}</strong> — {detail}
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Command reference" sub="what each tool actually proves">
          <div className="scroll-x">
            <table className="table table--mono">
              <thead>
                <tr>
                  <th>Command</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {COMMANDS.map(([cmd, evidence]) => (
                  <tr key={cmd}>
                    <td style={{ whiteSpace: 'nowrap' }}>{cmd}</td>
                    <td style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5 }}>{evidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <PageNav />
    </>
  );
}
