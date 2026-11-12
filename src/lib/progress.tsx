import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type QuizLevel = 'beginner' | 'intermediate' | 'advanced';

export type QuizAttempt = {
  level: QuizLevel;
  correct: number;
  total: number;
  at: number;
};

export type LabProgress = {
  visited: string[];
  sims: string[];
  scenarios: string[];
  quiz: QuizAttempt[];
  best: Record<string, number>;
};

const STORAGE_KEY = 'layer7-lab.progress.v1';

export const TOTAL_TRACKED_UNITS = 11 + 5 + 6 + 3;

const EMPTY: LabProgress = { visited: [], sims: [], scenarios: [], quiz: [], best: {} };

function read(): LabProgress {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<LabProgress>;
    return {
      visited: Array.isArray(parsed.visited) ? parsed.visited.filter((v): v is string => typeof v === 'string') : [],
      sims: Array.isArray(parsed.sims) ? parsed.sims.filter((v): v is string => typeof v === 'string') : [],
      scenarios: Array.isArray(parsed.scenarios) ? parsed.scenarios.filter((v): v is string => typeof v === 'string') : [],
      quiz: Array.isArray(parsed.quiz)
        ? parsed.quiz.filter(
            (q): q is QuizAttempt =>
              !!q && typeof q === 'object' && typeof (q as QuizAttempt).correct === 'number' && typeof (q as QuizAttempt).total === 'number',
          )
        : [],
      best: parsed.best && typeof parsed.best === 'object' ? (parsed.best as Record<string, number>) : {},
    };
  } catch {
    return EMPTY;
  }
}

type ProgressContextValue = {
  progress: LabProgress;
  percent: number;
  markVisited: (id: string) => void;
  completeSim: (id: string) => void;
  solveScenario: (id: string) => void;
  recordQuiz: (level: QuizLevel, correct: number, total: number) => void;
  resetProgress: () => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

function withUnique(list: string[], value: string): string[] {
  return list.includes(value) ? list : [...list, value];
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<LabProgress>(() => read());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      /* storage may be unavailable (private mode) — progress stays in memory */
    }
  }, [progress]);

  const markVisited = useCallback((id: string) => {
    setProgress((prev) => (prev.visited.includes(id) ? prev : { ...prev, visited: [...prev.visited, id] }));
  }, []);

  const completeSim = useCallback((id: string) => {
    setProgress((prev) => (prev.sims.includes(id) ? prev : { ...prev, sims: [...prev.sims, id] }));
  }, []);

  const solveScenario = useCallback((id: string) => {
    setProgress((prev) => (prev.scenarios.includes(id) ? prev : { ...prev, scenarios: [...prev.scenarios, id] }));
  }, []);

  const recordQuiz = useCallback((level: QuizLevel, correct: number, total: number) => {
    setProgress((prev) => {
      const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
      const best = Math.max(prev.best[level] ?? 0, pct);
      return {
        ...prev,
        best: { ...prev.best, [level]: best },
        quiz: [...prev.quiz, { level, correct, total, at: Date.now() }].slice(-20),
      };
    });
  }, []);

  const resetProgress = useCallback(() => setProgress(EMPTY), []);

  const percent = useMemo(() => {
    const units =
      Math.min(progress.visited.length, 11) +
      Math.min(progress.sims.length, 5) +
      Math.min(progress.scenarios.length, 6) +
      Object.keys(progress.best).length;
    return Math.round((units / TOTAL_TRACKED_UNITS) * 100);
  }, [progress]);

  const value = useMemo(
    () => ({ progress, percent, markVisited, completeSim, solveScenario, recordQuiz, resetProgress }),
    [progress, percent, markVisited, completeSim, solveScenario, recordQuiz, resetProgress],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
}

export { withUnique };
