import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  Heart,
  MessageCircle,
  BarChart3,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ApiResponseError,
  startSession,
  submitAnswer,
  fetchSubjects,
  type SessionResponse,
  type AnswerResponse,
  type MockBundle,
} from "@/services/api";
import { cn } from "@/lib/utils";
import { useI18n, type Lang } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/lib/auth";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Skor — Learn KSSM the TikTok way" },
      {
        name: "description",
        content:
          "Gamified AI learning for Malaysian high school students. Swipe, answer, master the KSSM syllabus.",
      },
      { property: "og:title", content: "Skor — Learn KSSM the TikTok way" },
      {
        property: "og:description",
        content: "Gamified AI learning for Malaysian high school students.",
      },
    ],
  }),
  component: StudentFeed,
});

const LETTERS = ["A", "B", "C", "D"] as const;
type Letter = (typeof LETTERS)[number];

type TopicOption = { label: string; value: string };

/**
 * Optional per-subject topic suggestions. This is NOT a source-of-truth list
 * of subjects — subjects are fetched dynamically from the backend. Any subject
 * not listed here falls back to a single generic topic equal to the subject
 * name, so brand-new subjects from the backend render automatically.
 */
const TOPIC_SUGGESTIONS: Record<string, TopicOption[]> = {
  Physics: [
    { label: "Kinematics", value: "Kinematics" },
    { label: "Electromagnetism", value: "Electromagnetism" },
  ],
  Sejarah: [
    { label: "Bab 1 Warisan Negara Bangsa", value: "Warisan Negara Bangsa" },
    { label: "Bab 2 Kebangkitan Nasionalisme", value: "Kebangkitan Nasionalisme" },
  ],
  Perniagaan: [
    { label: "Asas Perniagaan", value: "Asas Perniagaan" },
    { label: "Pengurusan Sumber Manusia", value: "Pengurusan Sumber Manusia" },
  ],
  Biologi: [
    { label: "Bab 1 Cell Division", value: "Cell Division" },
    { label: "Bab 2 Respiration", value: "Respiration" },
  ],
};

function getTopicsForSubject(subject: string): TopicOption[] {
  const known = TOPIC_SUGGESTIONS[subject];
  if (known && known.length > 0) return known;
  return [{ label: subject, value: subject }];
}

// Royalty-free Lo-Fi loop (Pixabay CDN, CC0)
const LOFI_AUDIO_URL =
  "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3";

function isValidUrl(u: unknown): u is string {
  return typeof u === "string" && u.trim().length > 0 && u !== "null" && u !== "undefined";
}

function KineticLyrics({
  lines,
  videoBroll,
  voiceoverUrl,
}: {
  lines: unknown;
  videoBroll?: string | null;
  voiceoverUrl?: string | null;
}) {
  const safeLines = Array.isArray(lines)
    ? lines.filter((l): l is string => typeof l === "string" && l.trim().length > 0)
    : [];
  const lyricsKey = safeLines.join("\n");
  const safeVideo = isValidUrl(videoBroll) ? videoBroll : undefined;
  const safeVoice = isValidUrl(voiceoverUrl) ? voiceoverUrl : undefined;
  const [visible, setVisible] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const beatRef = useRef<HTMLAudioElement | null>(null);
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const showLyrics = safeLines.length > 0;
  const showPlayOverlay = !playing;

  // Animate lyrics line-by-line; restart whenever lyrics change OR playback starts
  useEffect(() => {
    setVisible(0);
    if (!safeLines.length || !playing) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    safeLines.forEach((_, i) => {
      timers.push(setTimeout(() => setVisible((v) => Math.max(v, i + 1)), 600 + i * 900));
    });
    return () => timers.forEach(clearTimeout);
  }, [lyricsKey, playing]);

  // Reset playback state when source changes
  useEffect(() => {
    setPlaying(false);
    setVideoError(false);
    setVisible(0);
    if (beatRef.current) {
      beatRef.current.pause();
      beatRef.current.currentTime = 0;
    }
    if (voiceRef.current) {
      voiceRef.current.pause();
      voiceRef.current.currentTime = 0;
    }
  }, [safeVideo, safeVoice, lyricsKey]);

  const handlePlayAudio = async () => {
    const beat = beatRef.current;
    const voice = voiceRef.current;
    try {
      if (beat) {
        beat.volume = 0.3;
        beat.loop = true;
        beat.muted = false;
        await beat.play();
      }
      if (voice && safeVoice) {
        voice.volume = 1;
        voice.muted = false;
        await voice.play();
      }
      videoRef.current?.play().catch(() => {});
      setPlaying(true);
    } catch (e) {
      console.warn("Audio playback failed", e);
    }
  };

  const handlePauseAudio = () => {
    beatRef.current?.pause();
    voiceRef.current?.pause();
    setPlaying(false);
  };

  return (
    <div className="relative aspect-[9/14] sm:aspect-[16/10] overflow-hidden rounded-3xl border border-primary/40 bg-black shadow-glow">
      {/* Layer 1 — Video b-roll background */}
      {safeVideo && !videoError ? (
        <video
          key={safeVideo}
          ref={videoRef}
          src={safeVideo}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onError={() => {
            console.warn("video b-roll failed to load");
            setVideoError(true);
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(0.55_0.28_300/0.5),transparent_60%),radial-gradient(circle_at_80%_80%,oklch(0.55_0.28_240/0.5),transparent_60%)]" />
      )}

      {/* Dark gradient overlay for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/80" />

      {/* Layer 2a — AI voiceover (hidden) */}
      {safeVoice ? (
        <audio
          ref={voiceRef}
          src={safeVoice}
          preload="auto"
          className="hidden"
          onEnded={() => setPlaying(false)}
          onError={() => {
            console.warn("voiceover failed to load");
          }}
        />
      ) : null}
      {/* Layer 2b — Lo-Fi beat loop (hidden) */}
      <audio
        ref={beatRef}
        src={LOFI_AUDIO_URL}
        loop
        preload="auto"
        className="hidden"
        onError={() => console.warn("beat failed to load")}
      />

      {/* Layer 3 — Kinetic lyrics */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 sm:px-6 text-center">
        {showLyrics && safeLines.map((line, i) => (
          <div
            key={i}
            className={cn(
              "font-display text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-white leading-tight max-w-full break-words [text-wrap:balance] transition-all duration-700",
              i < visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-95",
            )}
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85), 0 0 28px rgba(236,72,153,0.55)" }}
          >
            {line}
          </div>
        ))}
      </div>

      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-background/40 px-3 py-1 text-xs font-medium text-white backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse" />
        Mnemonic Hook
      </div>

      {/* Master Play/Pause button */}
      {showPlayOverlay && (
        <button
          onClick={handlePlayAudio}
          className="absolute inset-0 z-10 grid place-items-center bg-black/40 backdrop-blur-[2px] transition hover:bg-black/50"
          aria-label="Tap to play audio"
        >
          <span className="flex flex-col items-center gap-3">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-white/95 text-black shadow-2xl transition group-hover:scale-105">
              <Play className="h-9 w-9 translate-x-0.5" fill="currentColor" />
            </span>
            <span className="rounded-full bg-black/70 px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg">
              Tap to Play Audio
            </span>
          </span>
        </button>
      )}
      {playing && (
        <button
          onClick={handlePauseAudio}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-background/50 text-white backdrop-blur transition hover:scale-105"
          aria-label="Pause mnemonic"
        >
          <Pause className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function StudentFeed() {
  const { t, lang, setLang } = useI18n();
  const { user, signOut } = useAuth();
  const STUDENT_ID = "00000000-0000-0000-0000-000000000001";
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [videoBroll, setVideoBroll] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mnemonicLyrics, setMnemonicLyrics] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<Letter | null>(null);
  const [checking, setChecking] = useState<Letter | null>(null);
  const [feedback, setFeedback] = useState<AnswerResponse | null>(null);
  const [streak, setStreak] = useState(7);
  const [xp, setXp] = useState(1240);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState<string>("");
  const [activeTopic, setActiveTopic] = useState<string>("");
  const [activeLanguage, setActiveLanguage] = useState<Lang>(lang);
  const [dynamicTopic, setDynamicTopic] = useState<string | null>(null);
  const initialLoadAttempted = useRef(false);
  const latestLoadRequestRef = useRef(0);

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

  const langToApi = (l: string): string =>
    l === "ms" ? "Bahasa Melayu" : l === "zh" ? "Chinese" : "English";

  const handleLanguageChange = (nextLanguage: Lang) => {
    setActiveLanguage(nextLanguage);
    setLang(nextLanguage);
  };

  const loadSession = async (
    subjectOverride?: string,
    topicOverride?: string,
    languageOverride?: Lang,
    isAdaptive: boolean = false,
  ) => {
    const requestId = ++latestLoadRequestRef.current;
    const subject = subjectOverride ?? activeSubject;
    const target = topicOverride ?? activeTopic;
    const nextActiveLanguage = languageOverride ?? activeLanguage;
    const apiLanguage = langToApi(nextActiveLanguage);
    if (!subject || !target) {
      // Nothing to load yet (subjects still loading from backend).
      return;
    }
    setLoading(true);
    setError(null);
    setFeedback(null);
    setSelected(null);
    setVideoBroll(null);
    setMediaUrl(null);
    setMnemonicLyrics(null);
    setSession((current) => (current ? { ...current, video_broll: undefined, media_url: undefined, mnemonic_lyrics: undefined } : current));
    try {
      const data = await startSession(
        user?.id ?? STUDENT_ID,
        target,
        "KSSM",
        apiLanguage,
        subject,
        mock,
        isAdaptive,
      );
      if (requestId !== latestLoadRequestRef.current) return;
      console.log("[Skor] startSession response:", data);
      setVideoBroll(data.video_broll ?? null);
      setMediaUrl(data.media_url ?? null);
      setMnemonicLyrics(data.mnemonic_lyrics ?? null);
      setSession(data);
    } catch (err) {
      if (requestId !== latestLoadRequestRef.current) return;
      console.error("[Skor] startSession error:", err);
      setError(
        err instanceof ApiResponseError
          ? "System maintenance — questions are temporarily unavailable."
          : "Couldn't load the next question. Please try again.",
      );
      setSession((current) => current);
    } finally {
      if (requestId === latestLoadRequestRef.current) {
        setLoading(false);
      }
    }
  };

  const handleSubjectChange = (subject: string) => {
    if (subject === activeSubject) return;
    const firstTopic = getTopicsForSubject(subject)[0].value;
    setActiveSubject(subject);
    setActiveTopic(firstTopic);
    setDynamicTopic(null);
    void loadSession(subject, firstTopic, activeLanguage, false);
  };

  const handleTopicChange = (topic: string) => {
    if (topic === activeTopic) return;
    setActiveTopic(topic);
    void loadSession(activeSubject, topic, undefined, false);
  };

  // Fetch the list of available subjects from the backend on mount.
  // No hardcoded subject arrays — new subjects added to the database
  // automatically appear in the UI.
  useEffect(() => {
    if (initialLoadAttempted.current) return;
    initialLoadAttempted.current = true;
    let cancelled = false;
    (async () => {
      setSubjectsLoading(true);
      let list: string[] = [];
      try {
        list = await fetchSubjects();
        console.log("[Skor] fetched subjects:", list);
      } catch (err) {
        console.warn("[Skor] fetchSubjects failed:", err);
      }
      if (cancelled) return;
      setSubjects(list);
      setSubjectsLoading(false);
      if (list.length === 0) {
        setError("No subjects available right now. Please try again later.");
        setLoading(false);
        return;
      }
      const firstSubject = list[0];
      const firstTopic = getTopicsForSubject(firstSubject)[0].value;
      setActiveSubject(firstSubject);
      setActiveTopic(firstTopic);
      void loadSession(firstSubject, firstTopic, undefined, false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setActiveLanguage(lang);
  }, [lang]);

  const handleAnswer = async (letter: Letter) => {
    if (checking || feedback || !session) return;
    setChecking(letter);
    setSelected(letter);
    setError(null);
    try {
      const apiLanguage = langToApi(activeLanguage);
      const res = await submitAnswer(
        STUDENT_ID,
        session.topic ?? activeTopic,
        "KSSM",
        session.options[letter],
        {},
        mock,
        apiLanguage,
      );
      setFeedback(res);
      if (res.correct) {
        setStreak((s) => s + 1);
        setXp((x) => x + 25);
      }
    } catch (err) {
      console.error("[Skor] submitAnswer error:", err);
      setError(
        err instanceof ApiResponseError
          ? "System maintenance — answer checking is temporarily unavailable."
          : "Couldn't submit your answer. Please try again.",
      );
      setSelected(null);
    } finally {
      setChecking(null);
    }
  };

  const handleNext = async () => {
    const nextTopic = feedback?.topic_complete ? feedback.next_topic : null;
    setFeedback(null);
    setSelected(null);
    if (nextTopic) {
      // Find subject containing this topic; if not found, attach to current subject as dynamic
      let targetSubject: string = activeSubject;
      let found = false;
      for (const s of subjects) {
        if (getTopicsForSubject(s).some((t) => t.value === nextTopic)) {
          targetSubject = s;
          found = true;
          break;
        }
      }
      if (!found) setDynamicTopic(nextTopic);
      else setDynamicTopic(null);
      setActiveSubject(targetSubject);
      setActiveTopic(nextTopic);
      await loadSession(targetSubject, nextTopic, activeLanguage, false);
    } else {
      await loadSession(activeSubject, activeTopic, undefined, true);
    }
  };

  const showMaintenanceState = !loading && !session && !!error;

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
          <LanguageSwitcher
            compact
            lang={activeLanguage}
            languages={["en", "ms"]}
            onLangChange={(next) => {
              handleLanguageChange(next);
              void loadSession(activeSubject, activeTopic, next, false);
            }}
          />
          <span className="rounded-full border border-border/60 bg-card/60 px-3 py-1 backdrop-blur">
            🔥 <span className="font-semibold">{streak}</span>
          </span>
          <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-primary-glow">
            ⚡ <span className="font-semibold">{xp}</span>
          </span>
          <Link
            to="/teacher"
            className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-card/60 text-muted-foreground hover:text-foreground transition"
          >
            <BarChart3 className="h-4 w-4" />
          </Link>
          <button
            onClick={() => void signOut()}
            className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-card/60 text-muted-foreground hover:text-foreground transition"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-md flex-col gap-4 px-4 pb-8 pt-6">
        {/* Subject + Topic selectors */}
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={activeSubject}
            onValueChange={(v) => handleSubjectChange(v as SubjectKey)}
            disabled={loading}
          >
            <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-card/60 backdrop-blur">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              {SUBJECTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={activeTopic}
            onValueChange={handleTopicChange}
            disabled={loading}
          >
            <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-card/60 backdrop-blur">
              <SelectValue placeholder="Topic" />
            </SelectTrigger>
            <SelectContent>
              {[
                ...SUBJECT_TOPICS[activeSubject],
                ...(dynamicTopic &&
                !SUBJECT_TOPICS[activeSubject].some((tt) => tt.value === dynamicTopic)
                  ? [{ label: dynamicTopic, value: dynamicTopic }]
                  : []),
              ].map((topic) => (
                <SelectItem key={topic.value} value={topic.value}>
                  {topic.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Language toggle */}
        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/60 px-4 py-2.5 backdrop-blur">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <span className={cn(activeLanguage === "en" && "text-foreground font-semibold")}>English</span>
            <span className="opacity-40">/</span>
            <span className={cn(activeLanguage === "ms" && "text-foreground font-semibold")}>Bahasa Melayu</span>
          </div>
          <Switch
            checked={activeLanguage === "ms"}
            onCheckedChange={(checked) => {
              const next: Lang = checked ? "ms" : "en";
              handleLanguageChange(next);
              void loadSession(activeSubject, activeTopic, next, false);
            }}
            aria-label="Toggle language"
          />
        </div>

        {/* Media / Mnemonic Hook */}
        {session && (
          (Array.isArray(mnemonicLyrics) && mnemonicLyrics.some((l) => typeof l === "string" && l.trim().length > 0)) ||
          isValidUrl(videoBroll) ||
          isValidUrl(mediaUrl)
        ) ? (
          <KineticLyrics
            lines={mnemonicLyrics}
            videoBroll={videoBroll}
            voiceoverUrl={mediaUrl}
          />
        ) : (
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-primary/40 bg-card/80 shadow-glow animate-pulse-glow">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,oklch(0.70_0.22_240/0.4),transparent_60%),radial-gradient(circle_at_70%_70%,oklch(0.65_0.28_300/0.4),transparent_60%)]" />
            <div className="absolute inset-0 grid place-items-center">
              <button
                onClick={() => setPlaying((p) => !p)}
                className="grid h-20 w-20 place-items-center rounded-full bg-background/40 backdrop-blur-md ring-1 ring-white/10 transition hover:scale-105"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? (
                  <Pause className="h-9 w-9 fill-foreground" />
                ) : (
                  <Play className="h-9 w-9 fill-foreground translate-x-0.5" />
                )}
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
        )}

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

        {error && session && (
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

        {showMaintenanceState ? (
          <section className="rounded-3xl border border-border/70 bg-card/70 p-5 backdrop-blur">
            <div className="text-xs uppercase tracking-widest text-primary-glow">
              System Maintenance
            </div>
            <h1 className="mt-2 font-display text-2xl font-semibold leading-snug">
              We’re having trouble loading your next question right now.
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Please try again in a moment. Your streak and progress are safe.
            </p>
            <Button
              onClick={() => void loadSession()}
              size="lg"
              className="mt-5 h-12 rounded-2xl bg-gradient-primary px-6 font-bold shadow-glow hover:opacity-95"
            >
              Retry
            </Button>
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-border/70 bg-card/70 p-5 backdrop-blur">
              {loading || !session ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-4/5" />
                </div>
              ) : (
                <>
                  <div className="text-xs uppercase tracking-widest text-primary-glow">
                    {t.question}
                  </div>
                  <h1 className="mt-2 font-display text-2xl font-semibold leading-snug">
                    {session.question}
                  </h1>
                </>
              )}
            </section>

            <div className="grid gap-3">
              {loading || !session || !LETTERS.every((l) => session.options?.[l])
                ? LETTERS.map((l) => <Skeleton key={l} className="h-16 w-full rounded-2xl" />)
                : LETTERS.map((letter) => {
                    const optionText = session.options[letter];
                    const isChecking = checking === letter;
                    const isSelected = selected === letter;
                    const showResult = feedback && isSelected;
                    const isCorrectChoice =
                      feedback &&
                      (letter === feedback.correct_answer ||
                        optionText === feedback.correct_answer);
                    return (
                      <button
                        key={letter}
                        onClick={() => handleAnswer(letter)}
                        disabled={!!checking || !!feedback || !session}
                        className={cn(
                          "group flex items-center gap-4 rounded-2xl border-2 border-border bg-card/60 p-4 text-left transition-all",
                          "hover:border-primary/60 hover:bg-card hover:-translate-y-0.5 hover:shadow-glow",
                          "disabled:cursor-not-allowed",
                          isSelected && !feedback && "border-primary",
                          showResult &&
                            feedback?.correct &&
                            "border-neon-green bg-[oklch(0.78_0.24_145/0.12)] shadow-glow-success",
                          showResult &&
                            !feedback?.correct &&
                            "border-destructive bg-destructive/10",
                          feedback &&
                            !isSelected &&
                            isCorrectChoice &&
                            "border-neon-green bg-[oklch(0.78_0.24_145/0.08)]",
                        )}
                      >
                        <span
                          className={cn(
                            "grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-border bg-background font-display text-xl font-bold transition",
                            "group-hover:border-primary group-hover:text-primary-glow",
                            isSelected &&
                              !feedback &&
                              "border-primary bg-primary/20 text-primary-glow",
                            showResult &&
                              feedback?.correct &&
                              "border-neon-green bg-[oklch(0.78_0.24_145/0.2)] text-neon-green",
                            showResult &&
                              !feedback?.correct &&
                              "border-destructive bg-destructive/20 text-destructive",
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
          </>
        )}
      </main>

      {/* Feedback bottom sheet — only dismissable via Next Question button */}
      <Sheet open={!!feedback}>
        <SheetContent
          side="bottom"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className={cn(
            "rounded-t-3xl border-t-2 backdrop-blur-xl",
            feedback?.topic_complete
              ? "border-neon-green bg-[linear-gradient(135deg,oklch(0.35_0.18_150/0.95),oklch(0.25_0.12_180/0.95))] animate-pulse-glow"
              : feedback?.correct
                ? "border-neon-green bg-card/95"
                : "border-destructive bg-card/95",
          )}
        >
          <SheetHeader className="text-left">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 font-display text-2xl">
                {feedback?.topic_complete ? (
                  <>
                    <span className="text-3xl animate-bounce">🚀</span>
                    <span className="text-neon-green">Level Up!</span>
                  </>
                ) : feedback?.correct ? (
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
            </div>
          </SheetHeader>
          <div className="mx-auto max-w-md space-y-4 pb-2 pt-3">
            <div className="rounded-2xl border border-border bg-background/50 p-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                {t.diagnosticFeedback}
              </div>
              <p className="mt-2 text-base leading-relaxed">{feedback?.feedback}</p>
            </div>
            {feedback?.misconception && !feedback.correct && (
              <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4">
                <div className="text-xs uppercase tracking-widest text-warning">
                  {t.commonMisconception}
                </div>
                <p className="mt-1 text-sm text-foreground/90">{feedback.misconception}</p>
              </div>
            )}
            <Button
              onClick={handleNext}
              size="lg"
              className={cn(
                "h-14 w-full rounded-2xl text-base font-bold shadow-glow hover:opacity-95",
                feedback?.topic_complete
                  ? "bg-[linear-gradient(135deg,oklch(0.78_0.24_145),oklch(0.65_0.22_175))] text-background"
                  : "bg-gradient-primary",
              )}
            >
              {feedback?.topic_complete && feedback.next_topic
                ? `Advance to ${feedback.next_topic} →`
                : t.nextQuestion}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
