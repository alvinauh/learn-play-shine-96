import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Loader2 } from "lucide-react";
import { startSession, type QuestionType, type SessionResponse } from "@/services/api";
import { StreakMeter } from "./StreakMeter";
import { XpBar } from "./XpBar";
import { MasteryBar } from "./MasteryBar";
import { QuestionSlide, type SlideResult } from "./QuestionSlide";
import { PenaltyGameModal } from "@/components/PenaltyGameModal";
import { buildChallenge } from "@/lib/challenge";
import type { GameChallenge } from "@/components/games/CatchStarsGame";

interface FeedSlide {
  key: string;
  session: SessionResponse;
}

interface QuestionFeedProps {
  seed: SessionResponse;
  studentId: string;
  subject: string;
  topic: string;
  apiLang: string;
  lang: string;
  formLevel: number;
  questionType: QuestionType;
  timerEnabled: boolean;
  headerRight?: ReactNode;
  onOpenTutor: (sessionId?: string) => void;
}

function isRateLimited(s: SessionResponse): boolean {
  const q = s.question ?? "";
  return q.includes("API Rate Limit") || !q.trim();
}

export function QuestionFeed({
  seed, studentId, subject, topic, apiLang, lang, formLevel, questionType, timerEnabled,
  headerRight, onOpenTutor,
}: QuestionFeedProps) {
  const [slides, setSlides] = useState<FeedSlide[]>([{ key: "seed", session: seed }]);
  const [current, setCurrent] = useState(0);
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [score, setScore] = useState(0);
  const [mastery, setMastery] = useState<number | null>(
    typeof seed.mastery_score === "number" ? seed.mastery_score : null,
  );
  const [penalty, setPenalty] = useState<{
    open: boolean;
    sessionId?: string;
    challenge?: GameChallenge | null;
    topic?: string;
    subject?: string;
  }>({ open: false });
  const seqRef = useRef(0);
  const loadingRef = useRef(false);

  const [emblaRef, embla] = useEmblaCarousel({ axis: "y", loop: false, align: "start", dragFree: false });

  const fetchNext = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      // Up to 2 attempts to skip a transient rate-limited payload.
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await startSession(studentId, topic, "KSSM", apiLang, subject, undefined, true, questionType, formLevel);
        if (!isRateLimited(res)) {
          seqRef.current += 1;
          setSlides((prev) => [...prev, { key: `q${seqRef.current}`, session: res }]);
          return;
        }
      }
    } catch {
      /* swallow — feed stays on current slide, user can retry by swiping */
    } finally {
      loadingRef.current = false;
    }
  }, [studentId, topic, apiLang, subject, questionType, formLevel]);

  // Track the active slide + prefetch when near the end.
  useEffect(() => {
    if (!embla) return;
    const onSelect = () => {
      const idx = embla.selectedScrollSnap();
      setCurrent(idx);
      if (idx >= slides.length - 2) void fetchNext();
    };
    embla.on("select", onSelect);
    onSelect();
    return () => { embla.off("select", onSelect); };
  }, [embla, slides.length, fetchNext]);

  // Re-init embla when slides are appended so it registers the new snap points.
  useEffect(() => { embla?.reInit(); }, [embla, slides.length]);

  // Ensure at least one lookahead question is ready on mount.
  useEffect(() => { if (slides.length < 2) void fetchNext(); /* eslint-disable-next-line */ }, []);

  const handleResult = (r: SlideResult) => {
    setScore((s) => s + r.points);
    if (typeof r.mastery === "number") setMastery(r.mastery);
    if (r.correct) {
      setStreak((s) => s + 1);
      setXp((x) => x + r.points);
    } else {
      setStreak(0);
      // Every 3rd consecutive wrong answer the backend asks for a mini-game break.
      // Replay the just-wrong MCQ as the game so a win credits mastery recovery.
      if (r.triggerPenalty) {
        const wrong = slides[current]?.session;
        setPenalty({
          open: true,
          sessionId: r.sessionId,
          challenge: buildChallenge(wrong ?? null),
          topic: wrong?.topic ?? topic,
          subject: wrong?.subject ?? subject,
        });
      }
    }
  };

  const handlePenaltyComplete = (masteryScore?: number | null) => {
    // A game win credits partial mastery recovery — reflect it live, no refetch.
    if (typeof masteryScore === "number") setMastery(masteryScore);
    setPenalty({ open: false });
    // Advance to the next question once the mini-game is done.
    embla?.scrollNext();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Gamification HUD */}
      <div className="flex items-center gap-3">
        <StreakMeter streak={streak} />
        <span className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-sm font-bold tabular-nums text-foreground">
          {score.toLocaleString()}
        </span>
        {headerRight && <div className="ml-auto">{headerRight}</div>}
      </div>
      <XpBar xp={xp} />
      <MasteryBar mastery={mastery} lang={lang} />

      {/* Vertical swipe feed — touch-action must NOT include pan-y or the browser
          claims the vertical drag as native scroll and embla's drag handler bails
          (non-cancelable touchmove). pan-x lets embla capture the vertical swipe. */}
      <div className="touch-pan-x overflow-hidden rounded-3xl" ref={emblaRef}>
        <div className="flex touch-pan-x flex-col" style={{ height: "76vh" }}>
          {slides.map((s, i) => (
            <div key={s.key} className="relative min-h-0 shrink-0 grow-0 basis-full pb-3">
              <QuestionSlide
                session={s.session}
                isActive={i === current}
                studentId={studentId}
                subject={subject}
                apiLang={apiLang}
                streak={streak}
                lang={lang}
                timerEnabled={timerEnabled}
                onResult={handleResult}
                onOpenTutor={onOpenTutor}
                onRequestNext={() => embla?.scrollNext()}
              />
            </div>
          ))}
          {/* trailing loader slide while the next question streams in */}
          <div className="flex min-h-0 shrink-0 grow-0 basis-full items-center justify-center pb-3">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs">{lang === "ms" ? "Memuatkan soalan…" : "Loading question…"}</span>
            </div>
          </div>
        </div>
      </div>

      <PenaltyGameModal
        open={penalty.open}
        studentId={studentId}
        sessionId={penalty.sessionId}
        onComplete={handlePenaltyComplete}
        challenge={penalty.challenge}
        topic={penalty.topic}
        subject={penalty.subject}
      />
    </div>
  );
}
