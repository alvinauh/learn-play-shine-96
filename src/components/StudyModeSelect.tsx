import { useEffect, useState } from "react";
import { Target, BookOpen, Sparkles, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
  fetchDiagnosticProgress,
  type DiagnosticProgress,
} from "@/services/api";

export type StudyMode = "diagnostic" | "free_practice" | "join_class";

interface Props {
  studentId: string;
  formLevel: number;
  initialMode?: StudyMode | null;
  onStart: (mode: StudyMode) => void;
  onJoinClass?: (code: string) => Promise<void>;
}

export function StudyModeSelect({ studentId, formLevel, initialMode, onStart }: Props) {
  const [progress, setProgress] = useState<DiagnosticProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StudyMode | null>(initialMode ?? null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchDiagnosticProgress(studentId, formLevel).then((p) => {
      if (cancelled) return;
      setProgress(p);
      setLoading(false);
      // Auto-select Diagnostic if resuming
      if (!initialMode && p && !p.diagnostic_complete && p.questions_answered > 0) {
        setSelected("diagnostic");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [studentId, formLevel, initialMode]);

  const answered = progress?.questions_answered ?? 0;
  const total = progress?.total ?? 10;
  const complete = !!progress?.diagnostic_complete;
  const inProgress = !complete && answered > 0 && answered < total;
  const fresh = !complete && answered === 0;

  return (
    <div className="relative min-h-[100dvh] bg-[linear-gradient(180deg,#1a0533_0%,#2d0a6e_100%)] text-foreground overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,oklch(0.65_0.24_295/0.35),transparent_60%)]" />
      <main className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-6 px-4 py-10">
        <div className="flex items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">Skor</span>
        </div>

        <div className="rounded-2xl border border-indigo-400/40 bg-[#1a0e3f]/80 p-6 backdrop-blur shadow-glow">
          <h1 className="text-center font-display text-2xl font-bold text-white">
            How do you want to study today?
          </h1>

          <div className="mt-6 flex flex-col gap-3">
            {/* Diagnostic */}
            <button
              type="button"
              onClick={() => setSelected("diagnostic")}
              className={cn(
                "rounded-xl border-2 p-5 text-left transition",
                selected === "diagnostic"
                  ? "border-white ring-2 ring-white bg-indigo-500/20"
                  : "border-indigo-400 bg-indigo-900/30 hover:bg-indigo-800/40",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-indigo-500/30 text-2xl">
                  <Target className="h-6 w-6 text-indigo-200" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-white">
                      Diagnostic Test
                    </h2>
                    {fresh && (
                      <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-950">
                        Recommended
                      </span>
                    )}
                  </div>
                  {loading ? (
                    <p className="mt-1 text-sm text-indigo-200/60">Checking your progress…</p>
                  ) : complete ? (
                    <p className="mt-1 text-sm text-indigo-100">
                      ✅ Completed! Tap to retake or view your Study Coach.
                    </p>
                  ) : inProgress ? (
                    <>
                      <p className="mt-1 text-sm text-indigo-100">
                        Resume — {answered}/{total} done
                      </p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-indigo-800">
                        <div
                          className="h-full rounded-full bg-indigo-300 transition-all"
                          style={{ width: `${(answered / Math.max(1, total)) * 100}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-sm text-indigo-100">
                        {total} questions across all your subjects
                      </p>
                      <p className="mt-0.5 text-xs text-indigo-200/80">
                        Unlock your AI Study Coach report when done
                      </p>
                    </>
                  )}
                </div>
              </div>
            </button>

            {/* Free practice */}
            <button
              type="button"
              onClick={() => setSelected("free_practice")}
              className={cn(
                "rounded-xl border-2 p-5 text-left transition",
                selected === "free_practice"
                  ? "border-white ring-2 ring-white bg-indigo-500/20"
                  : "border-indigo-400 bg-indigo-900/30 hover:bg-indigo-800/40",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-indigo-500/30 text-2xl">
                  <BookOpen className="h-6 w-6 text-indigo-200" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-bold text-white">Free Practice</h2>
                  <p className="mt-1 text-sm text-indigo-100">
                    Pick any subject and topic to practise
                  </p>
                </div>
              </div>
            </button>
          </div>

          <Button
            onClick={() => selected && onStart(selected)}
            disabled={!selected}
            className="mt-6 h-14 w-full rounded-xl bg-indigo-500 text-base font-bold text-white shadow-glow hover:bg-indigo-400 disabled:opacity-50"
          >
            Let&apos;s Go →
          </Button>
        </div>
      </main>
    </div>
  );
}
