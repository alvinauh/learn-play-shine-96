import { useEffect, useRef, useState } from "react";
import { ChevronUp, Loader2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitAnswer, type AnswerResponse, type SessionResponse } from "@/services/api";
import { buildChallengeFrom } from "@/lib/challenge";
import type { GameChallenge } from "@/components/games/CatchStarsGame";
import { QUESTION_SECONDS, speedBonus, totalPoints } from "@/lib/gameProgress";
import { SpeedTimer } from "./SpeedTimer";

type Letter = "A" | "B" | "C" | "D";
const LETTERS: Letter[] = ["A", "B", "C", "D"];
const LETTER_TINT: Record<Letter, string> = {
  A: "border-red-400/60 bg-red-500/10",
  B: "border-blue-400/60 bg-blue-500/10",
  C: "border-amber-400/60 bg-amber-500/10",
  D: "border-emerald-400/60 bg-emerald-500/10",
};

export interface SlideResult {
  correct: boolean;
  points: number;
  mastery?: number;
  topicComplete?: boolean;
  nextTopic?: string;
  triggerPenalty?: boolean;
  sessionId?: string;
  /** The just-answered MCQ rebuilt with its correct answer (from feedback, which
   *  is NOT stripped) so the penalty game can replay it. Null for non-MCQ. */
  challenge?: GameChallenge | null;
}

interface QuestionSlideProps {
  session: SessionResponse;
  isActive: boolean;
  studentId: string;
  subject: string;
  apiLang: string;
  streak: number;
  lang: string;
  timerEnabled: boolean;
  onResult: (r: SlideResult) => void;
  onOpenTutor: (sessionId?: string) => void;
  onRequestNext: () => void;
}

export function QuestionSlide({
  session, isActive, studentId, subject, apiLang, streak, lang, timerEnabled,
  onResult, onOpenTutor, onRequestNext,
}: QuestionSlideProps) {
  const qType = session.question_type ?? "mcq";
  const isMcq = qType === "mcq" || qType === "listening";
  const interactive = session.interactive as { video_url?: string } | null | undefined;
  const videoUrl = typeof interactive?.video_url === "string" ? interactive.video_url : "";

  const [selected, setSelected] = useState<Letter | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<AnswerResponse | null>(null);
  const [pointsBurst, setPointsBurst] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS);
  const answeredRef = useRef(false);

  // Countdown only while active + unanswered.
  useEffect(() => {
    if (!isActive || feedback || !timerEnabled) return;
    const id = setInterval(() => setSecondsLeft((s) => (s <= 0 ? 0 : s - 0.1)), 100);
    return () => clearInterval(id);
  }, [isActive, feedback, timerEnabled]);

  const submit = async (answerText: string, letter?: Letter) => {
    if (checking || feedback || answeredRef.current) return;
    answeredRef.current = true;
    setChecking(true);
    if (letter) setSelected(letter);
    try {
      const res = await submitAnswer(
        studentId, session.topic ?? "", "", answerText,
        (session.question_data ?? {}) as Record<string, unknown>,
        undefined, apiLang, session.subject ?? subject, session.session_id,
      );
      const correct = res.is_correct ?? res.correct ?? false;
      const pts = correct ? totalPoints(res.points_awarded, streak, timerEnabled ? secondsLeft : QUESTION_SECONDS) : 0;
      setFeedback({ ...res, correct });
      if (correct) {
        setPointsBurst(pts);
        setTimeout(() => setPointsBurst(null), 1100);
      }
      onResult({
        correct, points: pts, mastery: res.mastery_score,
        topicComplete: res.topic_complete, nextTopic: res.next_topic,
        triggerPenalty: res.trigger_penalty_game === true,
        sessionId: session.session_id,
        // Feedback carries the correct answer (session payload strips it), so the
        // penalty game can replay this exact question.
        challenge: buildChallengeFrom(
          session.question,
          session.options,
          res.correct_answer,
          session.question_type ?? "mcq",
        ),
      });
    } catch {
      answeredRef.current = false; // allow retry on network error
    } finally {
      setChecking(false);
    }
  };

  const bonus = timerEnabled ? speedBonus(secondsLeft) : 0;

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-gradient-feed">
      {/* Ambient background: concept video (muted loop) or subtle gradient */}
      {videoUrl ? (
        <video
          key={videoUrl} src={videoUrl} autoPlay muted loop playsInline
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />

      {/* Content */}
      <div className="relative flex h-full flex-col gap-2.5 p-4">
        {/* top row: kbat chip + timer */}
        <div className="flex shrink-0 items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {session.kbat_level && (
              <span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-glow">
                {session.kbat_level}
              </span>
            )}
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {(session.subject ?? subject) || ""}
            </span>
          </div>
          {isMcq && timerEnabled && !feedback && <SpeedTimer secondsLeft={secondsLeft} />}
        </div>

        {/* stimulus + question — scrollable region so long prompts never push the
            answer choices out of the column; answers/feedback below stay pinned */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          {session.stimulus && (
            <div className="mb-2.5 rounded-xl border-l-2 border-primary/60 bg-primary/5 px-3 py-2 text-sm leading-relaxed text-foreground/90">
              {session.stimulus}
            </div>
          )}
          <h1 className="font-display text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
            {session.question}
          </h1>
        </div>

        {/* answers */}
        <div className="flex shrink-0 flex-col gap-2">
          {isMcq ? (
            LETTERS.map((letter) => {
              const text = session.options?.[letter];
              if (!text) return null;
              const isPicked = selected === letter;
              const showCorrect = !!feedback && isPicked && feedback.correct;
              const showWrong = !!feedback && isPicked && !feedback.correct;
              return (
                <button
                  key={letter}
                  disabled={!!feedback || checking}
                  onClick={() => submit(text, letter)}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left backdrop-blur transition-all",
                    LETTER_TINT[letter],
                    !feedback && "hover:scale-[1.01] hover:border-primary/70",
                    showCorrect && "border-emerald-400 bg-emerald-500/20 animate-answer-correct",
                    showWrong && "border-red-400 bg-red-500/20 animate-shake-x",
                    feedback && !isPicked && "opacity-50",
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/20 text-sm font-bold">
                    {letter}
                  </span>
                  <span className="text-sm font-medium leading-snug">{text}</span>
                </button>
              );
            })
          ) : (
            <div className="flex flex-col gap-2">
              <Input
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                disabled={!!feedback || checking}
                placeholder={lang === "ms" ? "Taip jawapan…" : "Type your answer…"}
                className="h-14 rounded-2xl border-2 bg-card/60 px-4 text-base"
                onKeyDown={(e) => { if (e.key === "Enter") void submit(textAnswer); }}
              />
              <Button
                onClick={() => void submit(textAnswer)}
                disabled={!!feedback || checking || !textAnswer.trim()}
                size="lg"
                className="h-12 rounded-2xl bg-gradient-primary font-bold shadow-glow"
              >
                {checking ? <Loader2 className="h-5 w-5 animate-spin" /> : lang === "ms" ? "Hantar" : "Submit"}
              </Button>
            </div>
          )}
        </div>

        {/* feedback strip */}
        {feedback && (
          <div
            className={cn(
              "animate-slide-up-in shrink-0 rounded-2xl border p-3 text-sm",
              feedback.correct
                ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                : "border-red-400/50 bg-red-500/10 text-red-200",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">
                {feedback.correct ? (lang === "ms" ? "Betul! 🎉" : "Correct! 🎉") : (lang === "ms" ? "Belum tepat" : "Not quite")}
              </span>
              {feedback.correct && bonus > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-neon-green">+{bonus} speed</span>
              )}
            </div>
            {feedback.feedback && <p className="mt-1 leading-relaxed text-foreground/85">{feedback.feedback}</p>}
            {!feedback.correct && feedback.misconception && (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">💡 {feedback.misconception}</p>
            )}
          </div>
        )}

        {/* footer: tutor + swipe hint */}
        <div className="flex shrink-0 items-center justify-between pt-1">
          <button
            onClick={() => onOpenTutor(session.session_id)}
            disabled={!session.session_id}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-primary-glow disabled:opacity-40"
          >
            <MessageCircle className="h-4 w-4" />
            {lang === "ms" ? "Tanya Tutor" : "Ask Tutor"}
          </button>
          <button
            onClick={onRequestNext}
            className={cn(
              "flex items-center gap-1 text-xs font-semibold text-primary-glow",
              feedback ? "animate-swipe-hint" : "opacity-60",
            )}
          >
            <ChevronUp className="h-4 w-4" />
            {lang === "ms" ? "Leret ke atas" : "Swipe up"}
          </button>
        </div>
      </div>

      {/* points burst */}
      {pointsBurst != null && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center">
          <span className="animate-points-float text-4xl font-black text-neon-green drop-shadow-[0_0_12px_rgba(74,222,128,0.6)]">
            +{pointsBurst}
          </span>
        </div>
      )}
    </div>
  );
}
