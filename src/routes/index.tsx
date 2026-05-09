import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Play, Pause, Volume2, Heart, MessageCircle, BarChart3, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { startSession, submitAnswer, type SessionResponse, type AnswerResponse, type MockBundle } from "@/services/api";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Skor — Learn KSSM the TikTok way" },
      { name: "description", content: "Gamified AI learning for Malaysian high school students. Swipe, answer, master the KSSM syllabus." },
      { property: "og:title", content: "Skor — Learn KSSM the TikTok way" },
      { property: "og:description", content: "Gamified AI learning for Malaysian high school students." },
    ],
  }),
  component: StudentFeed,
});

const LETTERS = ["A", "B", "C", "D"] as const;
type Letter = (typeof LETTERS)[number];

function StudentFeed() {
  const { t, lang } = useI18n();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<Letter | null>(null);
  const [checking, setChecking] = useState<Letter | null>(null);
  const [feedback, setFeedback] = useState<AnswerResponse | null>(null);
  const [streak, setStreak] = useState(7);
  const [xp, setXp] = useState(1240);
  const [error, setError] = useState<string | null>(null);

  const mock: MockBundle = {
    question: t.mockQuestion,
    optionA: t.mockOptionA,
    optionB: t.mockOptionB,
    optionC: t.mockOptionC,
    optionD: t.mockOptionD,
    topic: t.mockTopic,
    subject: t.mockSubject,
    feedbackCorrect: t.feedbackCorrect,
    feedbackWrong: t.feedbackWrong,
    misconception: t.feedbackMisconception,
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const data = await startSession("student_001", "Kinematics", "KSSM", "Physics", mock);
        if (mounted) setSession(data);
      } catch (err) {
        console.error("[Skor] startSession error:", err);
        if (mounted) setError("Couldn't load the next question. Please try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnswer = async (letter: Letter) => {
    if (checking || feedback) return;
    setChecking(letter);
    setSelected(letter);
    setError(null);
    try {
      const res = await submitAnswer(
        "student_001",
        session?.topic ?? "Kinematics",
        "KSSM",
        letter,
        {},
        mock,
      );
      setFeedback(res);
      if (res.correct) {
        setStreak((s) => s + 1);
        setXp((x) => x + 25);
      }
    } catch (err) {
      console.error("[Skor] submitAnswer error:", err);
      setError("Couldn't submit your answer. Please try again.");
      setSelected(null);
    } finally {
      setChecking(null);
    }
  };

  const handleNext = async () => {
    setFeedback(null);
    setSelected(null);
    setError(null);
    setLoading(true);
    try {
      const data = await startSession("student_001", "Kinematics", "KSSM", "Physics", mock);
      setSession(data);
    } catch (err) {
      console.error("[Skor] startSession error:", err);
      setError("Couldn't load the next question. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] bg-gradient-feed text-foreground overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,oklch(0.65_0.24_295/0.25),transparent_60%)]" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">Skor</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <LanguageSwitcher compact />
          <span className="rounded-full border border-border/60 bg-card/60 px-3 py-1 backdrop-blur">
            🔥 <span className="font-semibold">{streak}</span>
          </span>
          <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-primary-glow">
            ⚡ <span className="font-semibold">{xp}</span>
          </span>
          <Link to="/teacher" className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-card/60 text-muted-foreground hover:text-foreground transition">
            <BarChart3 className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-md flex-col gap-4 px-4 pb-8 pt-6">
        {/* Media player card */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-primary/40 bg-card/80 shadow-glow animate-pulse-glow">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,oklch(0.70_0.22_240/0.4),transparent_60%),radial-gradient(circle_at_70%_70%,oklch(0.65_0.28_300/0.4),transparent_60%)]" />
          <div className="absolute inset-0 grid place-items-center">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="grid h-20 w-20 place-items-center rounded-full bg-background/40 backdrop-blur-md ring-1 ring-white/10 transition hover:scale-105"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="h-9 w-9 fill-foreground" /> : <Play className="h-9 w-9 fill-foreground translate-x-0.5" />}
            </button>
          </div>
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-background/50 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse" />
            {session?.subject ?? "Physics"} • {session?.topic ?? "Kinematics"}
          </div>
          <div className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-background/50 backdrop-blur">
            <Volume2 className="h-4 w-4" />
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>0:00 / 0:42</span>
            <span>{t.form}</span>
          </div>
        </div>

        {/* Side actions row (TikTok-style) */}
        <div className="flex items-center gap-3 px-1 text-sm text-muted-foreground">
          <button className="flex items-center gap-1.5 hover:text-foreground transition">
            <Heart className="h-5 w-5" /> 1.2k
          </button>
          <button className="flex items-center gap-1.5 hover:text-foreground transition">
            <MessageCircle className="h-5 w-5" /> 84
          </button>
          <span className="ml-auto text-xs">@cikgu_aisyah</span>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-xs font-semibold uppercase tracking-wider hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Question */}
        <section className="rounded-3xl border border-border/70 bg-card/70 p-5 backdrop-blur">
          {loading || !session ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-4/5" />
            </div>
          ) : (
            <>
              <div className="text-xs uppercase tracking-widest text-primary-glow">{t.question}</div>
              <h1 className="mt-2 font-display text-2xl font-semibold leading-snug">
                {session.question}
              </h1>
            </>
          )}
        </section>

        {/* Answer buttons */}
        <div className="grid gap-3">
          {loading
            ? LETTERS.map((l) => <Skeleton key={l} className="h-16 w-full rounded-2xl" />)
            : LETTERS.map((letter) => {
                const isChecking = checking === letter;
                const isSelected = selected === letter;
                const showResult = feedback && isSelected;
                const isCorrectChoice = feedback && letter === feedback.correct_answer;
                return (
                  <button
                    key={letter}
                    onClick={() => handleAnswer(letter)}
                    disabled={!!checking || !!feedback}
                    className={cn(
                      "group flex items-center gap-4 rounded-2xl border-2 border-border bg-card/60 p-4 text-left transition-all",
                      "hover:border-primary/60 hover:bg-card hover:-translate-y-0.5 hover:shadow-glow",
                      "disabled:cursor-not-allowed",
                      isSelected && !feedback && "border-primary",
                      showResult && feedback?.correct && "border-neon-green bg-[oklch(0.78_0.24_145/0.12)] shadow-glow-success",
                      showResult && !feedback?.correct && "border-destructive bg-destructive/10",
                      feedback && !isSelected && isCorrectChoice && "border-neon-green bg-[oklch(0.78_0.24_145/0.08)]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-border bg-background font-display text-xl font-bold transition",
                        "group-hover:border-primary group-hover:text-primary-glow",
                        isSelected && !feedback && "border-primary bg-primary/20 text-primary-glow",
                        showResult && feedback?.correct && "border-neon-green bg-[oklch(0.78_0.24_145/0.2)] text-neon-green",
                        showResult && !feedback?.correct && "border-destructive bg-destructive/20 text-destructive",
                      )}
                    >
                      {isChecking ? <Loader2 className="h-5 w-5 animate-spin" /> : letter}
                    </span>
                    <span className="flex-1 text-base font-medium leading-snug">
                      {session?.options[letter]}
                    </span>
                  </button>
                );
              })}
        </div>
      </main>

      {/* Feedback bottom sheet */}
      <Sheet open={!!feedback} onOpenChange={(o) => !o && setFeedback(null)}>
        <SheetContent
          side="bottom"
          className={cn(
            "rounded-t-3xl border-t-2 bg-card/95 backdrop-blur-xl",
            feedback?.correct ? "border-neon-green" : "border-destructive",
          )}
        >
          <SheetHeader className="text-left">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 font-display text-2xl">
                {feedback?.correct ? (
                  <>
                    <span className="text-2xl">🎉</span>
                    <span className="text-neon-green">{t.spotOn}</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">💡</span>
                    <span className="text-destructive">{t.notQuite}</span>
                  </>
                )}
              </SheetTitle>
              <button onClick={() => setFeedback(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
          </SheetHeader>
          <div className="mx-auto max-w-md space-y-4 pb-2 pt-3">
            <div className="rounded-2xl border border-border bg-background/50 p-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{t.diagnosticFeedback}</div>
              <p className="mt-2 text-base leading-relaxed">{feedback?.feedback}</p>
            </div>
            {feedback?.misconception && !feedback.correct && (
              <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4">
                <div className="text-xs uppercase tracking-widest text-warning">{t.commonMisconception}</div>
                <p className="mt-1 text-sm text-foreground/90">{feedback.misconception}</p>
              </div>
            )}
            <Button
              onClick={handleNext}
              size="lg"
              className="h-14 w-full rounded-2xl bg-gradient-primary text-base font-bold shadow-glow hover:opacity-95"
            >
              {t.nextQuestion}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
