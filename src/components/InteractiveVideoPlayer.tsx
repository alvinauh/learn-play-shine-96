import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { submitAnswer, type AnswerResponse } from "@/services/api";

export interface H5PContent {
  interactiveVideo?: {
    video?: { files?: Array<{ path?: string; mime?: string }> };
    assets?: {
      interactions?: Array<{
        duration?: { from?: number; to?: number };
        pause?: boolean;
        action?: {
          params?: {
            files?: Array<{ path?: string; mime?: string }>;
            question?: string;
            answers?: Array<{ text?: string }>;
          };
        };
      }>;
    };
  };
}

interface InteractiveVideoPlayerProps {
  h5pContent: H5PContent;
  questionData: Record<string, unknown>;
  sessionId: string;
  studentId: string;
  topic: string;
  subject: string;
  language: string;
  mnemonicLyrics?: string[] | null;
  onAnswerSubmit: (result: AnswerResponse) => void;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

export function InteractiveVideoPlayer({
  h5pContent,
  questionData,
  sessionId,
  studentId,
  topic,
  subject,
  language,
  mnemonicLyrics,
  onAnswerSubmit,
}: InteractiveVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const parsed = useMemo(() => {
    const iv = h5pContent?.interactiveVideo;
    const videoUrl = iv?.video?.files?.[0]?.path ?? "";
    const interactions = iv?.assets?.interactions ?? [];
    const audioUrl = interactions[0]?.action?.params?.files?.[0]?.path ?? "";
    const pauseAt = interactions[1]?.duration?.from ?? 8;
    const rawQuestion = interactions[1]?.action?.params?.question ?? "";
    const answers = interactions[1]?.action?.params?.answers ?? [];
    const options = answers.map((a) => a?.text ?? "").filter((t) => t.length > 0);
    return {
      videoUrl,
      audioUrl,
      pauseAt,
      questionText: stripHtml(rawQuestion),
      options,
    };
  }, [h5pContent]);

  const [showQuestion, setShowQuestion] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AnswerResponse | null>(null);
  const [canAdvance, setCanAdvance] = useState(false);
  const [lyricIdx, setLyricIdx] = useState(0);

  const safeLyrics = Array.isArray(mnemonicLyrics)
    ? mnemonicLyrics.filter((l): l is string => typeof l === "string" && l.trim().length > 0)
    : [];

  // Sync audio with video
  const handleCanPlay = () => {
    const a = audioRef.current;
    if (a && parsed.audioUrl) {
      a.currentTime = 0;
      a.play().catch(() => undefined);
    }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    if (!showQuestion && v.currentTime >= parsed.pauseAt) {
      v.pause();
      const a = audioRef.current;
      if (a) a.pause();
      setShowQuestion(true);
    }
    if (safeLyrics.length > 0) {
      const total = parsed.pauseAt || 8;
      const ratio = Math.min(1, v.currentTime / total);
      setLyricIdx(Math.min(safeLyrics.length - 1, Math.floor(ratio * safeLyrics.length)));
    }
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      videoRef.current?.pause();
    };
  }, []);

  const handleSubmit = async () => {
    if (!selected || submitting || result) return;
    setSubmitting(true);
    try {
      const res = await submitAnswer(
        studentId,
        topic,
        "",
        selected,
        {},
        undefined,
        language,
        subject,
        sessionId,
      );
      setResult(res);
      setTimeout(() => setCanAdvance(true), 1200);
    } catch (err) {
      console.error("[InteractiveVideoPlayer] submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-[480px] overflow-hidden rounded-3xl border border-primary/40 bg-black shadow-glow">
      <div className="relative aspect-[9/16] w-full">
        {parsed.videoUrl ? (
          <video
            ref={videoRef}
            src={parsed.videoUrl}
            autoPlay
            playsInline
            onCanPlay={handleCanPlay}
            onTimeUpdate={handleTimeUpdate}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            Video unavailable
          </div>
        )}
        {parsed.audioUrl && <audio ref={audioRef} src={parsed.audioUrl} preload="auto" />}

        {/* Mnemonic subtitle */}
        {!showQuestion && safeLyrics.length > 0 && (
          <div className="absolute inset-x-0 bottom-6 px-4">
            <div className="rounded-2xl bg-black/60 px-4 py-3 text-center text-base font-semibold text-white backdrop-blur-md">
              {safeLyrics[lyricIdx]}
            </div>
          </div>
        )}

        {/* MCQ overlay */}
        {showQuestion && (
          <div
            className={cn(
              "absolute inset-0 flex flex-col gap-3 p-4 backdrop-blur-sm transition-colors",
              result
                ? result.correct
                  ? "bg-[oklch(0.35_0.18_150/0.85)]"
                  : "bg-[oklch(0.4_0.22_25/0.85)]"
                : "bg-black/70",
            )}
          >
            <div className="rounded-2xl bg-card/95 p-4 text-foreground shadow-lg">
              <div className="text-xs uppercase tracking-widest text-primary-glow">Question</div>
              <p className="mt-1 text-base font-semibold leading-snug">{parsed.questionText}</p>
            </div>

            <div className="flex flex-1 flex-col justify-end gap-2.5">
              {parsed.options.map((opt) => {
                const isSelected = selected === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={!!result || submitting}
                    onClick={() => setSelected(opt)}
                    className={cn(
                      "w-full rounded-xl bg-primary px-4 py-3 text-left text-sm font-semibold text-primary-foreground transition disabled:opacity-70",
                      isSelected && "ring-2 ring-white",
                    )}
                  >
                    {opt}
                  </button>
                );
              })}

              {!result ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!selected || submitting}
                  size="lg"
                  className="h-12 w-full rounded-xl bg-white text-base font-bold text-black hover:bg-white/90"
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit Answer"}
                </Button>
              ) : (
                <div className="rounded-xl bg-black/40 p-3 text-white">
                  <div className="text-lg font-bold">
                    {result.correct ? "✔ Correct!" : "✗ Try again!"}
                  </div>
                  {result.feedback && (
                    <p className="mt-1 text-sm leading-relaxed">{result.feedback}</p>
                  )}
                  {canAdvance && (
                    <Button
                      onClick={() => onAnswerSubmit(result)}
                      size="lg"
                      className="mt-3 h-11 w-full rounded-xl bg-white text-base font-bold text-black hover:bg-white/90"
                    >
                      Next Question
                    </Button>
                  )}
                </div>
              )}
            </div>

            {submitting && !result && (
              <div className="absolute inset-0 grid place-items-center bg-black/40">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
