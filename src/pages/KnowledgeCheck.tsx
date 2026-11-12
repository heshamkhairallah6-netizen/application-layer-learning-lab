import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { QUIZ_LEVELS, questionsFor } from '../data/quiz';
import type { QuizLevel } from '../lib/progress';
import { useProgress } from '../lib/progress';
import { Badge, Callout, PageHead, Panel } from '../components/ui';
import PageNav from '../components/layout/PageNav';
import { ArrowIcon, CheckIcon } from '../components/ui/icons';

type Answers = Record<string, number>;

export default function KnowledgeCheck() {
  const [level, setLevel] = useState<QuizLevel>('beginner');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [finished, setFinished] = useState(false);
  const { progress, recordQuiz } = useProgress();

  const questions = useMemo(() => questionsFor(level), [level]);
  const question = questions[index];
  const answeredCount = questions.filter((item) => answers[item.id] !== undefined).length;
  const score = questions.filter((item) => answers[item.id] === item.answer).length;
  const selected = question ? answers[question.id] : undefined;
  const isLast = index === questions.length - 1;
  const best = progress.best[level];

  function switchLevel(next: QuizLevel) {
    setLevel(next);
    setIndex(0);
    setAnswers({});
    setFinished(false);
  }

  function select(optionIndex: number) {
    if (!question || answers[question.id] !== undefined) return;
    setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }));
  }

  function goNext() {
    if (isLast) {
      setFinished(true);
      recordQuiz(level, score, questions.length);
      return;
    }
    setIndex((prev) => Math.min(prev + 1, questions.length - 1));
  }

  function restart() {
    setIndex(0);
    setAnswers({});
    setFinished(false);
  }

  const levelMeta = QUIZ_LEVELS.find((item) => item.id === level);
  const percentage = questions.length ? Math.round((score / questions.length) * 100) : 0;

  return (
    <>
      <PageHead
        eyebrow="09 · Assessment"
        title="Knowledge Check"
        lede="Three graded banks built from the same material as the labs. Every answer is explained, correct or not, and your best score per level is stored on this device."
        actions={
          <>
            <Badge tone="blue">{QUIZ_LEVELS.length} levels</Badge>
            <Badge tone="teal">{answeredCount}/{questions.length} answered</Badge>
          </>
        }
      />

      <div className="level-grid">
        {QUIZ_LEVELS.map((item) => {
          const itemBest = progress.best[item.id];
          return (
            <button
              key={item.id}
              type="button"
              className={`level-card${item.id === level ? ' is-active' : ''}`}
              aria-pressed={item.id === level}
              onClick={() => switchLevel(item.id)}
            >
              <span className="level-card__name">{item.name}</span>
              <span className="level-card__meta">{item.blurb}</span>
              <span className="level-card__meta mono" style={{ marginTop: 6 }}>
                {questionsFor(item.id).length} questions{itemBest !== undefined ? ` · best ${itemBest}%` : ''}
              </span>
            </button>
          );
        })}
      </div>

      {!finished && question && (
        <Panel
          title={`${levelMeta?.name ?? level} · question ${index + 1} of ${questions.length}`}
          sub={question.topic}
          actions={
            best !== undefined ? <Badge tone="teal">best {best}%</Badge> : <Badge tone="muted">no attempt yet</Badge>
          }
        >
          <div className="stack">
            <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
              <div
                style={{
                  height: '100%',
                  width: `${((index + (selected !== undefined ? 1 : 0)) / questions.length) * 100}%`,
                  background: 'var(--teal)',
                  borderRadius: 2,
                  transition: 'width 320ms ease',
                }}
              />
            </div>

            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: '#eef1f4' }}>{question.prompt}</p>

            <div className="stack" style={{ gap: 8 }}>
              {question.options.map((option, optionIndex) => {
                const isChosen = selected === optionIndex;
                const isCorrect = question.answer === optionIndex;
                const revealed = selected !== undefined;
                const cls = revealed && isCorrect ? ' is-correct' : revealed && isChosen && !isCorrect ? ' is-wrong' : '';
                return (
                  <button
                    key={option}
                    type="button"
                    className={`option${cls}`}
                    aria-pressed={isChosen}
                    onClick={() => select(optionIndex)}
                    disabled={revealed}
                  >
                    <span className="option__key">{String.fromCharCode(65 + optionIndex)}</span>
                    <span className="option__body">
                      <span style={{ display: 'block', fontSize: 12.8 }}>{option}</span>
                      {revealed && isCorrect && (
                        <span className="mono" style={{ display: 'block', fontSize: 9.5, color: '#79c0a8', marginTop: 4 }}>
                          CORRECT ANSWER
                        </span>
                      )}
                      {revealed && isChosen && !isCorrect && (
                        <span className="mono" style={{ display: 'block', fontSize: 9.5, color: '#d99a9a', marginTop: 4 }}>
                          YOUR CHOICE
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {selected !== undefined && (
              <div className="quiz__explain">
                <div className="row" style={{ gap: 6, marginBottom: 6 }}>
                  {selected === question.answer ? (
                    <>
                      <CheckIcon size={12} />
                      <span className="eyebrow" style={{ margin: 0, color: '#79c0a8' }}>
                        Correct
                      </span>
                    </>
                  ) : (
                    <span className="eyebrow" style={{ margin: 0, color: '#d9a36a' }}>
                      Not quite — here is why
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 12.6, lineHeight: 1.7, color: 'var(--muted)' }}>{question.explanation}</p>
              </div>
            )}

            <div className="row" style={{ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
                disabled={index === 0}
              >
                Previous
              </button>
              <div className="row" style={{ gap: 8 }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                  score {score}/{questions.length}
                </span>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={goNext}
                  disabled={selected === undefined}
                >
                  {isLast ? 'See results' : 'Next question'}
                  <ArrowIcon size={12} />
                </button>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {finished && (
        <Panel
          title="Results summary"
          sub={`${levelMeta?.name ?? level} bank`}
          actions={<Badge tone={percentage >= 80 ? 'green' : percentage >= 50 ? 'amber' : 'red'}>{percentage}%</Badge>}
        >
          <div className="stack">
            <div className="grid grid--3">
              <div className="stat">
                <div className="stat__label">Correct</div>
                <div className="stat__value">
                  {score}/{questions.length}
                </div>
                <div className="stat__hint">answered first time</div>
              </div>
              <div className="stat">
                <div className="stat__label">Best on this level</div>
                <div className="stat__value">{progress.best[level] ?? percentage}%</div>
                <div className="stat__hint">stored locally</div>
              </div>
              <div className="stat">
                <div className="stat__label">Verdict</div>
                <div className="stat__value" style={{ fontSize: 16 }}>
                  {percentage >= 80 ? 'Lab ready' : percentage >= 50 ? 'Review needed' : 'Revisit fundamentals'}
                </div>
                <div className="stat__hint">based on this attempt</div>
              </div>
            </div>

            <div className="stack" style={{ gap: 8 }}>
              {questions.map((item) => {
                const given = answers[item.id];
                const ok = given === item.answer;
                return (
                  <div key={item.id} className="quiz__explain">
                    <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 12.4, color: '#e6eaee' }}>{item.prompt}</span>
                      <span className="mono" style={{ fontSize: 9.5, color: ok ? '#79c0a8' : '#d99a9a' }}>
                        {ok ? 'PASS' : 'MISS'}
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 11.8, color: 'var(--muted)', lineHeight: 1.65 }}>
                      Correct: <strong style={{ color: '#dfe5ea' }}>{item.options[item.answer]}</strong>
                      {!ok && given !== undefined ? ` · you chose: ${item.options[given]}` : ''}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 11.6, color: 'var(--muted)', lineHeight: 1.65 }}>
                      {item.explanation}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn--primary btn--sm" onClick={restart}>
                Retry this level
              </button>
              {level !== 'advanced' && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => switchLevel(level === 'beginner' ? 'intermediate' : 'advanced')}
                >
                  Continue to {level === 'beginner' ? 'intermediate' : 'advanced'}
                </button>
              )}
              <Link className="btn btn--ghost btn--sm" to="/summary">
                Open learning summary
                <ArrowIcon size={12} />
              </Link>
            </div>
          </div>
        </Panel>
      )}

      {!finished && answeredCount === questions.length && questions.length > 0 && (
        <Callout tone="teal">
          <span>Every question in this bank is answered. Use “See results” to record the attempt.</span>
        </Callout>
      )}

      <PageNav />
    </>
  );
}
