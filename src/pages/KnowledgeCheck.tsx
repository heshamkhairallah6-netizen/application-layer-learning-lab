import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { QUIZ_LEVELS, questionsFor } from '../data/quiz';
import type { QuizLevel } from '../lib/progress';
import { useProgress } from '../lib/progress';
import { LessonHead, Tabs } from '../components/ui';
import PageNav from '../components/layout/PageNav';
import { ArrowIcon, CheckIcon } from '../components/ui/icons';

export default function KnowledgeCheck() {
  const [level, setLevel] = useState<QuizLevel>('beginner');
  const questions = useMemo(() => questionsFor(level), [level]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const { progress, recordQuiz } = useProgress();

  const question = questions[index];
  const best = progress.best[level];

  function switchLevel(next: QuizLevel) {
    setLevel(next);
    setIndex(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  }

  function choose(i: number) {
    if (picked !== null) return;
    setPicked(i);
    if (i === question.answer) setScore((s) => s + 1);
  }

  function next() {
    if (index === questions.length - 1) {
      setDone(true);
      recordQuiz(level, score, questions.length);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  }

  function restart() {
    setIndex(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  }

  return (
    <>
      <LessonHead
        eyebrow="09 · Knowledge check"
        title="Three levels, ten minutes"
        sentence="One question at a time, with the reason shown right after you answer."
      />

      <Tabs
        items={QUIZ_LEVELS.map((l) => ({ id: l.id, label: l.name }))}
        active={level}
        onChange={switchLevel}
        pill
        label="Quiz level"
      />

      <div className="quiz">
        {done ? (
          <div className="quiz__result">
            <div className="quiz__score">
              {score}
              <span>/{questions.length}</span>
            </div>
            <p className="quiz__verdict">
              {score === questions.length
                ? 'Perfect score. Try the next level.'
                : score >= questions.length - 2
                  ? 'Solid. Review the ones you missed, then move up a level.'
                  : 'Worth replaying the lab simulations, then trying again.'}
            </p>
            <div className="quiz__actions">
              <button type="button" className="btn btn--primary" onClick={restart}>
                Try again
              </button>
              <Link to="/summary" className="btn">
                See my progress <ArrowIcon />
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="quiz__meta">
              <span>
                Question {index + 1} of {questions.length}
              </span>
              <span className="faint">{question.topic}</span>
              {best !== undefined ? <span className="faint">best {best}%</span> : null}
            </div>
            <div className="quiz__bar">
              <span style={{ width: `${((index + (picked !== null ? 1 : 0)) / questions.length) * 100}%` }} />
            </div>

            <p className="quiz__prompt">{question.prompt}</p>

            <div className="quiz__options">
              {question.options.map((opt, i) => {
                const state =
                  picked === null
                    ? ''
                    : i === question.answer
                      ? ' is-right'
                      : i === picked
                        ? ' is-wrong'
                        : ' is-dim';
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`quiz__option${state}`}
                    onClick={() => choose(i)}
                    disabled={picked !== null}
                  >
                    <span className="quiz__key">{String.fromCharCode(65 + i)}</span>
                    <span>{opt}</span>
                    {picked !== null && i === question.answer ? <CheckIcon /> : null}
                  </button>
                );
              })}
            </div>

            {picked !== null ? (
              <div className="quiz__explain">
                <p>{question.explanation}</p>
                <button type="button" className="btn btn--primary" onClick={next}>
                  {index === questions.length - 1 ? 'See result' : 'Next question'}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <PageNav />
    </>
  );
}
