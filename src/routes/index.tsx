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
  AlertTriangle,
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
  fetchDiagnosticStatus,
  requestStudentCoach,
  fetchStudentCoach,
  startDiagnosticSession,
  type SessionResponse,
  type AnswerResponse,
  type MockBundle,
  type QuestionType,
  type SubjectWithTopics,
  type DiagnosticStatus,
  type CoachNarrative,
} from "@/services/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useI18n, type Lang } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/lib/auth";
import { LogOut } from "lucide-react";
import { LessonNotesModal } from "@/components/LessonNotesModal";
import { TutorChatDrawer } from "@/components/TutorChatDrawer";
import { InteractiveVideoPlayer } from "@/components/InteractiveVideoPlayer";
import { GameTopBar } from "@/components/GameTopBar";
import { PraiseOverlay } from "@/components/PraiseOverlay";
import { PenaltyGameModal } from "@/components/PenaltyGameModal";
import { StudyCoachModal } from "@/components/StudyCoachModal";
import { StudyModeSelect, type StudyMode } from "@/components/StudyModeSelect";
import { DiagnosticHeaderBar } from "@/components/DiagnosticHeaderBar";
import { DiagnosticCompleteScreen } from "@/components/DiagnosticCompleteScreen";
import { toast } from "sonner";



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

function RateLimitWaitingCard({
  lang,
  onRetry,
}: {
  lang: Lang;
  onRetry: () => void;
}) {
  const WAIT_SECONDS = 15;
  const [secondsLeft, setSecondsLeft] = useState(WAIT_SECONDS);

  useEffect(() => {
    setSecondsLeft(WAIT_SECONDS);
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const isMs = lang === "ms";
  const canRetry = secondsLeft === 0;

  return (
    <section className="rounded-3xl border border-[oklch(0.7_0.16_75/0.45)] bg-[oklch(0.3_0.08_75/0.18)] p-5 backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[oklch(0.7_0.16_75/0.2)]">
          <AlertTriangle className="h-5 w-5 text-[oklch(0.82_0.17_75)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-widest text-[oklch(0.82_0.17_75)]">
            {isMs ? "Sila Tunggu" : "Please Wait"}
          </div>
          <h2 className="mt-1 font-display text-xl font-semibold leading-snug text-[oklch(0.95_0.04_75)]">
            Sedang menjana soalan... sila tunggu sebentar.
          </h2>
          <p className="mt-1 text-sm text-[oklch(0.85_0.04_75)]">
            Generating question, please wait a moment.
          </p>

          <div className="mt-4 flex items-center gap-3">
            {canRetry ? (
              <Sparkles className="h-5 w-5 text-[oklch(0.82_0.17_75)]" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-[oklch(0.82_0.17_75)]" />
            )}
            <span className="text-sm text-[oklch(0.88_0.04_75)]">
              {canRetry
                ? isMs
                  ? "Sedia untuk cuba semula"
                  : "Ready to try again"
                : isMs
                  ? `Cuba semula dalam ${secondsLeft}s`
                  : `Retry in ${secondsLeft}s`}
            </span>
          </div>

          <Button
            onClick={onRetry}
            disabled={!canRetry}
            size="lg"
            className="mt-5 h-12 rounded-2xl bg-gradient-primary px-6 font-bold shadow-glow hover:opacity-95 disabled:opacity-60"
          >
            {isMs ? "Cuba Semula" : "Try Again"}
          </Button>
        </div>
      </div>
    </section>
  );
}



function StudentFeed() {
  const { t, lang, setLang } = useI18n();
  const { user, profile, signOut } = useAuth();
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
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongStreak, setWrongStreak] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [lastPoints, setLastPoints] = useState(0);
  const [praiseOn, setPraiseOn] = useState(false);
  const [penaltyOpen, setPenaltyOpen] = useState(false);
  const [wrongFlash, setWrongFlash] = useState<Letter | null>(null);
  const [correctFlash, setCorrectFlash] = useState<Letter | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<SubjectWithTopics[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState<string>("");
  const [activeTopic, setActiveTopic] = useState<string>("");
  const [activeLanguage, setActiveLanguage] = useState<Lang>(lang);
  const [dynamicTopic, setDynamicTopic] = useState<string | null>(null);
  const [questionType, setQuestionType] = useState<QuestionType>("mcq");
  const [textAnswer, setTextAnswer] = useState<string>("");
  const [studyPackOpen, setStudyPackOpen] = useState(false);
  const [tutorChatOpen, setTutorChatOpen] = useState(false);
  const [formLevel, setFormLevel] = useState<4 | 5>(4);

  // ===== Study Mode =====
  const [studyMode, setStudyMode] = useState<StudyMode | null>(null);
  const [diagAnswered, setDiagAnswered] = useState(0);
  const [diagTotal, setDiagTotal] = useState(10);
  const [diagnosticComplete, setDiagnosticComplete] = useState(false);

  // ===== Study Coach =====
  const [diagStatus, setDiagStatus] = useState<DiagnosticStatus | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachNarrative, setCoachNarrative] = useState<CoachNarrative | null>(null);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [coachBannerDismissed, setCoachBannerDismissed] = useState(false);

  const effectiveStudentId = user?.id ?? "00000000-0000-0000-0000-000000000001";

  const refreshDiagnosticStatus = async () => {
    const s = await fetchDiagnosticStatus(effectiveStudentId);
    if (s) setDiagStatus(s);
  };

  useEffect(() => {
    void refreshDiagnosticStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveStudentId]);

  const handleOpenCoach = async () => {
    setCoachOpen(true);
    setCoachLoading(true);
    setCoachError(null);
    setCoachNarrative(null);
    try {
      const res = await requestStudentCoach(effectiveStudentId);
      if (res.ready) {
        setCoachNarrative(res.narrative);
        setCoachBannerDismissed(true);
      } else {
        setCoachOpen(false);
        toast.message(res.message);
      }
    } catch (err) {
      console.error("[Skor] requestStudentCoach failed", err);
      setCoachError("Couldn't generate your report. Please try again in a moment.");
    } finally {
      setCoachLoading(false);
    }
  };

  const handleViewLastCoach = async () => {
    setCoachOpen(true);
    setCoachLoading(true);
    setCoachError(null);
    setCoachNarrative(null);
    try {
      const res = await fetchStudentCoach(effectiveStudentId);
      if (res && res.ready) {
        setCoachNarrative(res.narrative);
        setCoachBannerDismissed(true);
      } else {
        setCoachError("No previous report found.");
      }
    } finally {
      setCoachLoading(false);
    }
  };

  const handleCoachStartPractice = (topic: string, subject: string) => {
    setCoachOpen(false);
    const subjectExists = subjects.some((s) => s.subject === subject);
    const targetSubject = subjectExists ? subject : activeSubject;
    if (!subjectExists) setDynamicTopic(topic);
    setActiveSubject(targetSubject);
    setActiveTopic(topic);
    void loadSession(targetSubject, topic, activeLanguage, false);
  };

  const initialLoadAttempted = useRef(false);
  const latestLoadRequestRef = useRef(0);

  const topicsForSubject = (subject: string): string[] => {
    const found = subjects.find((s) => s.subject === subject);
    return found?.topics ?? [];
  };

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
    questionTypeOverride?: QuestionType,
  ) => {
    const requestId = ++latestLoadRequestRef.current;
    const subject = subjectOverride ?? activeSubject;
    const target = topicOverride ?? activeTopic;
    const nextActiveLanguage = languageOverride ?? activeLanguage;
    const qType = questionTypeOverride ?? questionType;
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
    setTextAnswer("");
    setSession(null);
    try {
      const data = await startSession(
        user?.id ?? STUDENT_ID,
        target,
        "KSSM",
        apiLanguage,
        subject,
        mock,
        isAdaptive,
        qType,
        formLevel,
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
      setSession(null);
    } finally {
      if (requestId === latestLoadRequestRef.current) {
        setLoading(false);
      }
    }
  };

  const handleSubjectChange = (subject: string) => {
    if (subject === activeSubject) return;
    const firstTopic = topicsForSubject(subject)[0] ?? "";
    setActiveSubject(subject);
    setActiveTopic(firstTopic);
    setDynamicTopic(null);
    if (firstTopic) void loadSession(subject, firstTopic, activeLanguage, false);
  };

  const handleTopicChange = (topic: string) => {
    if (topic === activeTopic) return;
    setActiveTopic(topic);
    void loadSession(activeSubject, topic, undefined, false);
  };

  const loadSubjectsForLevel = async (
    level: number,
    { autoStart = true }: { autoStart?: boolean } = {},
  ) => {
    setSubjectsLoading(true);
    let list: SubjectWithTopics[] = [];
    try {
      list = (await fetchSubjects(level)) ?? [];
      console.log("[Skor] fetched subjects (form", level, "):", list);
    } catch (err) {
      console.error("[Skor] fetchSubjects failed:", err);
      list = [];
    }
    setSubjects(list);
    setSubjectsLoading(false);
    if (list.length === 0) {
      setActiveSubject("");
      setActiveTopic("");
      return;
    }
    const randomIndex = Math.floor(Math.random() * list.length);
    const picked = list[randomIndex];
    const firstSubject = picked.subject;
    const topics = picked.topics ?? [];
    const firstTopic = topics.length > 0
      ? topics[Math.floor(Math.random() * topics.length)]
      : "";
    setActiveSubject(firstSubject);
    setActiveTopic(firstTopic);
    if (autoStart && firstTopic) void loadSession(firstSubject, firstTopic, undefined, false);
  };

  const handleFormLevelChange = (level: 4 | 5) => {
    if (level === formLevel) return;
    setFormLevel(level);
    setDynamicTopic(null);
    void loadSubjectsForLevel(level, { autoStart: false });
  };

  // Load diagnostic question (or detect completion).
  const loadDiagnosticSession = async () => {
    const requestId = ++latestLoadRequestRef.current;
    setLoading(true);
    setError(null);
    setFeedback(null);
    setSelected(null);
    setVideoBroll(null);
    setMediaUrl(null);
    setMnemonicLyrics(null);
    setTextAnswer("");
    setSession(null);
    try {
      const res = await startDiagnosticSession(
        effectiveStudentId,
        langToApi(activeLanguage),
        formLevel,
      );
      if (requestId !== latestLoadRequestRef.current) return;
      if (res.diagnostic_complete) {
        setDiagnosticComplete(true);
        setDiagAnswered(res.questions_answered ?? diagTotal);
        setDiagTotal(res.total ?? diagTotal);
        setSession(null);
        return;
      }
      setDiagnosticComplete(false);
      setDiagAnswered(res.diagnostic_progress.questions_answered);
      setDiagTotal(res.diagnostic_progress.total);
      setVideoBroll(res.video_broll ?? null);
      setMediaUrl(res.media_url ?? null);
      setMnemonicLyrics(res.mnemonic_lyrics ?? null);
      setActiveSubject(res.subject ?? "");
      setActiveTopic(res.topic ?? "");
      setSession(res);
    } catch (err) {
      if (requestId !== latestLoadRequestRef.current) return;
      console.error("[Skor] startDiagnosticSession error:", err);
      setError(
        err instanceof ApiResponseError
          ? "System maintenance — diagnostic is temporarily unavailable."
          : "Couldn't load the next diagnostic question. Please try again.",
      );
      setSession(null);
    } finally {
      if (requestId === latestLoadRequestRef.current) setLoading(false);
    }
  };

  const handleStudyModeStart = (mode: StudyMode) => {
    setStudyMode(mode);
    setDiagnosticComplete(false);
    setQuestionNumber(1);
    if (mode === "diagnostic") {
      void loadDiagnosticSession();
    } else {
      // Free practice — make sure we have subjects and start session
      if (subjects.length === 0) {
        void loadSubjectsForLevel(formLevel, { autoStart: true });
      } else if (activeSubject && activeTopic) {
        void loadSession(activeSubject, activeTopic, activeLanguage, false);
      } else {
        void loadSubjectsForLevel(formLevel, { autoStart: true });
      }
    }
  };

  const handleExitToModeSelect = () => {
    setStudyMode(null);
    setSession(null);
    setFeedback(null);
    setDiagnosticComplete(false);
  };

  useEffect(() => {
    if (initialLoadAttempted.current) return;
    initialLoadAttempted.current = true;
    // Preload subjects in the background (no autostart) — used by Free Practice.
    void loadSubjectsForLevel(formLevel, { autoStart: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    setActiveLanguage(lang);
  }, [lang]);

  const advanceToNext = async (completedFeedback: AnswerResponse | null) => {
    const nextTopic = completedFeedback?.topic_complete ? completedFeedback.next_topic : null;
    setFeedback(null);
    setSelected(null);
    setCorrectFlash(null);
    setWrongFlash(null);
    setLastPoints(0);
    setQuestionNumber((q) => q + 1);
    if (studyMode === "diagnostic") {
      await loadDiagnosticSession();
      return;
    }
    if (nextTopic) {
      let targetSubject: string = activeSubject;
      let found = false;
      for (const s of subjects) {
        if (s.topics.includes(nextTopic)) {
          targetSubject = s.subject;
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

  const submitToBackend = async (answerText: string, letter?: Letter) => {
    if (!session) return;
    setError(null);
    try {
      const apiLanguage = langToApi(activeLanguage);
      const res = await submitAnswer(
        STUDENT_ID,
        session.topic ?? activeTopic,
        "",
        answerText,
        {},
        mock,
        apiLanguage,
        session.subject ?? activeSubject,
        session.session_id,
      );

      const isCorrect = res.is_correct ?? res.correct;
      const points =
        typeof res.points_awarded === "number"
          ? res.points_awarded
          : isCorrect
            ? 100 + streak * 20
            : 0;
      const nextStreak =
        typeof res.streak === "number" ? res.streak : isCorrect ? streak + 1 : 0;
      const nextWrongStreak =
        typeof res.wrong_count === "number"
          ? res.wrong_count
          : isCorrect
            ? 0
            : wrongStreak + 1;
      const nextScore =
        typeof res.score === "number" ? res.score : score + points;
      const trigger =
        typeof res.trigger_penalty_game === "boolean"
          ? res.trigger_penalty_game
          : nextWrongStreak > 0 && nextWrongStreak % 3 === 0;

      setStreak(nextStreak);
      setWrongStreak(nextWrongStreak);
      setScore(nextScore);
      setLastPoints(points);

      const enriched: AnswerResponse = { ...res, correct: isCorrect };
      setFeedback(enriched);
      void refreshDiagnosticStatus();

      if (isCorrect) {
        if (letter) setCorrectFlash(letter);
        setPraiseOn(true);
        setTimeout(() => {
          setPraiseOn(false);
          void advanceToNext(enriched);
        }, 1500);
      } else {
        if (letter) setWrongFlash(letter);
        if (trigger) {
          setTimeout(() => setPenaltyOpen(true), 1000);
        } else {
          setTimeout(() => void advanceToNext(enriched), 2000);
        }
      }
    } catch (err) {
      console.error("[Skor] submitAnswer error:", err);
      setError(
        err instanceof ApiResponseError
          ? "System maintenance — answer checking is temporarily unavailable."
          : "Couldn't submit your answer. Please try again.",
      );
      setSelected(null);
    }
  };

  const handleAnswer = async (letter: Letter) => {
    if (checking || feedback || !session) return;
    setChecking(letter);
    setSelected(letter);
    try {
      await submitToBackend(session.options[letter], letter);
    } finally {
      setChecking(null);
    }
  };

  const [submittingText, setSubmittingText] = useState(false);
  const handleTextSubmit = async () => {
    if (submittingText || feedback || !session) return;
    const trimmed = textAnswer.trim();
    if (!trimmed) return;
    setSubmittingText(true);
    try {
      await submitToBackend(trimmed);
    } finally {
      setSubmittingText(false);
    }
  };

  const handleQuestionTypeChange = (next: QuestionType) => {
    if (next === questionType) return;
    setQuestionType(next);
    void loadSession(activeSubject, activeTopic, activeLanguage, false, next);
  };

  const handleNext = async () => {
    await advanceToNext(feedback);
  };

  const handlePenaltyComplete = () => {
    setPenaltyOpen(false);
    void advanceToNext(feedback);
  };

  const showMaintenanceState = !loading && !session && !!error;

  // Guard: detect rate-limit / empty question payloads from /start_session.
  // Treat all of these as "still generating, please wait":
  //   - question text contains "API Rate Limit Hit"
  //   - question_data was null (session.question ends up empty)
  //   - question is an empty / whitespace-only string
  const rawQuestion = typeof session?.question === "string" ? session.question : "";
  const isAwaitingQuestion =
    !loading &&
    !!session &&
    (rawQuestion.includes("API Rate Limit Hit") || rawQuestion.trim().length === 0);


  // Study Mode selection screen — show before any question loads
  if (studyMode === null) {
    return (
      <StudyModeSelect
        studentId={effectiveStudentId}
        formLevel={formLevel}
        onStart={handleStudyModeStart}
      />
    );
  }

  const inDiagnostic = studyMode === "diagnostic";

  return (
    <div className="relative min-h-[100dvh] bg-[linear-gradient(180deg,#1a0533_0%,#2d0a6e_100%)] text-foreground overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,oklch(0.65_0.24_295/0.35),transparent_60%)]" />

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

      {(() => { console.log("[Skor] dropdown render → subjects state:", subjects, "activeSubject:", activeSubject, "activeTopic:", activeTopic, "topics for active:", activeSubject ? topicsForSubject(activeSubject) : []); return null; })()}
      <main className="relative z-10 mx-auto flex max-w-md flex-col gap-4 px-4 pb-8 pt-6">
        <GameTopBar
          streak={streak}
          score={score}
          questionNumber={questionNumber}
          pointsAwarded={lastPoints}
        />

        {inDiagnostic && (
          <DiagnosticHeaderBar
            answered={diagAnswered}
            total={diagTotal}
            subject={session?.subject ?? activeSubject}
            onExit={handleExitToModeSelect}
          />
        )}

        {/* Study Coach banner — diagnostic complete */}
        {diagStatus?.diagnostic_complete && !coachBannerDismissed && (
          <section className="rounded-2xl border border-[oklch(0.65_0.22_300/0.55)] bg-[linear-gradient(135deg,oklch(0.35_0.18_300/0.5),oklch(0.3_0.18_260/0.5))] p-4 backdrop-blur shadow-glow">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-primary text-lg">
                🎯
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-base font-bold leading-snug">
                  Your Study Coach report is ready!
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  A personalised study plan based on your answers.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    onClick={handleOpenCoach}
                    size="sm"
                    className="h-9 rounded-xl bg-gradient-primary px-4 text-sm font-bold shadow-glow"
                  >
                    Get My Study Report
                  </Button>
                  {diagStatus.report_available && (
                    <button
                      onClick={handleViewLastCoach}
                      className="text-xs font-semibold text-primary-glow underline-offset-2 hover:underline"
                    >
                      View last report
                    </button>
                  )}
                  <button
                    onClick={() => setCoachBannerDismissed(true)}
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                    aria-label="Dismiss"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Diagnostic progress — only when incomplete and started */}
        {diagStatus && !diagStatus.diagnostic_complete && diagStatus.questions_answered > 0 && (
          <section className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 backdrop-blur">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-widest text-primary-glow">
                Diagnostic progress
              </span>
              <span>
                {diagStatus.questions_answered} / {diagStatus.threshold} answered
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-background/50">
              <div
                className="h-full rounded-full bg-gradient-primary transition-all"
                style={{
                  width: `${Math.min(100, (diagStatus.questions_answered / Math.max(1, diagStatus.threshold)) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {Math.max(0, diagStatus.threshold - diagStatus.questions_answered)} more to unlock your Study Coach report
            </p>
          </section>
        )}

        {!inDiagnostic && (<>
        {/* Form level segmented control */}
        <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-1 backdrop-blur">
          <span className="px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {activeLanguage === "ms" ? "Tingkatan" : "Form"}
          </span>
          {([4, 5] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => handleFormLevelChange(lvl)}
              disabled={loading || subjectsLoading}
              aria-pressed={formLevel === lvl}
              className={cn(
                "flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition disabled:opacity-50",
                formLevel === lvl
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {activeLanguage === "ms" ? `Tingkatan ${lvl}` : `Form ${lvl}`}
            </button>
          ))}
        </div>

        {/* Subject + Topic selectors */}
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={activeSubject}
            onValueChange={(v) => handleSubjectChange(v)}
            disabled={loading || subjectsLoading || subjects.length === 0}
          >
            <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-card/60 backdrop-blur">
              <SelectValue placeholder={subjectsLoading ? "Loading subjects…" : "Subject"} />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.subject} value={s.subject}>
                  {s.subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={activeTopic}
            onValueChange={handleTopicChange}
            disabled={loading || !activeSubject}
          >
            <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-card/60 backdrop-blur">
              <SelectValue placeholder="Topic" />
            </SelectTrigger>
            <SelectContent>
              {[
                ...(activeSubject ? topicsForSubject(activeSubject) : []),
                ...(dynamicTopic &&
                activeSubject &&
                !topicsForSubject(activeSubject).includes(dynamicTopic)
                  ? [dynamicTopic]
                  : []),
              ].map((topic) => (
                <SelectItem key={topic} value={topic}>
                  {topic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Question type selector */}
        <Select
          value={questionType}
          onValueChange={(v) => handleQuestionTypeChange(v as QuestionType)}
          disabled={loading}
        >
          <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-card/60 backdrop-blur">
            <SelectValue placeholder="Question type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mcq">Multiple Choice</SelectItem>
            <SelectItem value="short_answer">Short Answer</SelectItem>
            <SelectItem value="essay">Essay</SelectItem>
            <SelectItem value="listening">Listening</SelectItem>

          </SelectContent>
        </Select>

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

        {/* Media / Mnemonic Hook — hidden when H5P interactive video is shown */}
        {session && !session.h5p_content && (
          (Array.isArray(mnemonicLyrics) && mnemonicLyrics.some((l) => typeof l === "string" && l.trim().length > 0)) ||
          isValidUrl(videoBroll) ||
          isValidUrl(mediaUrl)
        ) ? (
          <KineticLyrics
            lines={mnemonicLyrics}
            videoBroll={videoBroll}
            voiceoverUrl={mediaUrl}
          />
        ) : session && session.h5p_content ? null : (
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
              {session?.subject ?? "Physics"} • {session?.topic ?? "Kinematics"} · {activeLanguage === "ms" ? `Tingkatan ${formLevel}` : `Form ${formLevel}`}
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
          <button
            onClick={() => session?.session_id && setTutorChatOpen(true)}
            disabled={!session?.session_id}
            className="flex items-center gap-1.5 hover:text-primary-glow transition disabled:opacity-50"
            aria-label={activeLanguage === "ms" ? "Tanya Tutor" : "Ask Tutor"}
          >
            <MessageCircle className="h-5 w-5" />
            {activeLanguage === "ms" ? "Tanya Tutor" : "Ask Tutor"}
          </button>
          <span className="ml-auto text-xs">
            {profile?.full_name
              ? `@${profile.full_name.split(" ")[0].toLowerCase()}`
              : user?.email?.split("@")[0]
                ? `@${user.email!.split("@")[0]}`
                : "@you"}
          </span>
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
        ) : isAwaitingQuestion ? (
          <RateLimitWaitingCard
            lang={activeLanguage}
            onRetry={() => void loadSession(activeSubject, activeTopic, activeLanguage, false)}
          />
        ) : session && session.h5p_content ? (
          <InteractiveVideoPlayer
            h5pContent={session.h5p_content as Parameters<typeof InteractiveVideoPlayer>[0]["h5pContent"]}
            questionData={(session.question_data ?? {}) as Record<string, unknown>}
            sessionId={session.session_id ?? ""}
            studentId={user?.id ?? STUDENT_ID}
            topic={session.topic ?? activeTopic}
            subject={session.subject ?? activeSubject}
            language={langToApi(activeLanguage)}
            correctAnswer={session.correct}
            mnemonicLyrics={mnemonicLyrics}
            onAnswerSubmit={(res) => {
              if (res.correct) {
                setStreak((s) => s + 1);
                setScore((x) => x + 100);
              }
              setQuestionNumber((q) => q + 1);
              void refreshDiagnosticStatus();
              void loadSession(activeSubject, activeTopic, activeLanguage, true);
            }}
          />
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
                  {(() => {
                    const previewText =
                      (typeof session.lesson?.summary === "string" && session.lesson.summary.trim().length > 0
                        ? session.lesson.summary
                        : session.illustrative_notes) ?? "";
                    return (
                      <button
                        type="button"
                        onClick={() => setStudyPackOpen(true)}
                        className="group mb-3 block w-full rounded-2xl border border-[oklch(0.55_0.1_85/0.35)] bg-[oklch(0.25_0.04_85/0.12)] p-3.5 text-left transition hover:border-[oklch(0.65_0.14_85/0.6)] hover:bg-[oklch(0.28_0.05_85/0.2)]"
                        aria-label={activeLanguage === "ms" ? "Buka nota konsep" : "Open concept note"}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-semibold uppercase tracking-wider text-[oklch(0.82_0.16_85)]">
                            📖 {activeLanguage === "ms" ? "Nota Konsep" : "Concept Note"}
                          </div>
                          <div className="text-[10px] font-medium uppercase tracking-wider text-[oklch(0.82_0.16_85)] opacity-70 group-hover:opacity-100">
                            {activeLanguage === "ms" ? "Ketuk untuk belajar →" : "Tap to study →"}
                          </div>
                        </div>
                        {previewText && (
                          <p className="mt-1 text-sm leading-relaxed text-[oklch(0.88_0.03_85)] line-clamp-2">
                            {previewText}
                          </p>
                        )}
                      </button>
                    );
                  })()}
                  <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-widest text-primary-glow">
                    <span>{t.question}</span>
                    <span className="text-muted-foreground">
                      {(session.subject ?? activeSubject) || ""} · {activeLanguage === "ms" ? `Tingkatan ${formLevel}` : `Form ${formLevel}`}
                    </span>
                  </div>
                  <h1 className="mt-2 font-display text-2xl font-semibold leading-snug">
                    {session.question}
                  </h1>
                </>
              )}
            </section>

            {session?.question_type === "listening" && (
              <section className="rounded-3xl border border-primary/40 bg-card/60 p-4 backdrop-blur space-y-3">
                <div className="text-xs uppercase tracking-widest text-primary-glow">
                  🎧 {activeLanguage === "ms" ? "Audio Mendengar" : "Listening Audio"}
                </div>
                {isValidUrl(session.audio_url) ? (
                  <audio
                    key={session.audio_url}
                    src={session.audio_url}
                    controls
                    className="w-full"
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                    {activeLanguage === "ms"
                      ? "Audio tidak tersedia untuk soalan ini."
                      : "Audio is not available for this question."}
                  </div>
                )}
                {typeof session.passage === "string" && session.passage.trim().length > 0 && (
                  <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {activeLanguage === "ms" ? "Petikan" : "Passage"}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                      {session.passage}
                    </p>
                  </div>
                )}
              </section>
            )}


            {(() => {
              const qt: QuestionType = session?.question_type ?? "mcq";
              if (loading || !session) {
                return (
                  <div className="grid gap-3">
                    {LETTERS.map((l) => (
                      <Skeleton key={l} className="h-16 w-full rounded-2xl" />
                    ))}
                  </div>
                );
              }
              if (qt === "short_answer") {
                return (
                  <div className="flex flex-col gap-3">
                    <Input
                      value={textAnswer}
                      onChange={(e) => setTextAnswer(e.target.value)}
                      disabled={!!feedback || submittingText}
                      placeholder="Type your answer…"
                      className="h-14 rounded-2xl border-2 border-border bg-card/60 px-4 text-base"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleTextSubmit();
                      }}
                    />
                    <Button
                      onClick={() => void handleTextSubmit()}
                      disabled={!!feedback || submittingText || !textAnswer.trim()}
                      size="lg"
                      className="h-12 rounded-2xl bg-gradient-primary font-bold shadow-glow"
                    >
                      {submittingText ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit Answer"}
                    </Button>
                  </div>
                );
              }
              if (qt === "essay") {
                return (
                  <div className="flex flex-col gap-3">
                    <Textarea
                      value={textAnswer}
                      onChange={(e) => setTextAnswer(e.target.value)}
                      disabled={!!feedback || submittingText}
                      placeholder="Write your essay response…"
                      className="min-h-[180px] rounded-2xl border-2 border-border bg-card/60 px-4 py-3 text-base leading-relaxed"
                    />
                    <Button
                      onClick={() => void handleTextSubmit()}
                      disabled={!!feedback || submittingText || !textAnswer.trim()}
                      size="lg"
                      className="h-12 rounded-2xl bg-gradient-primary font-bold shadow-glow"
                    >
                      {submittingText ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit Essay"}
                    </Button>
                  </div>
                );
              }
              // mcq (default)
              if (!LETTERS.every((l) => session.options?.[l])) {
                return (
                  <div className="grid gap-3">
                    {LETTERS.map((l) => (
                      <Skeleton key={l} className="h-16 w-full rounded-2xl" />
                    ))}
                  </div>
                );
              }
              const COLORS: Record<Letter, string> = {
                A: "bg-red-500 hover:bg-red-400",
                B: "bg-blue-500 hover:bg-blue-400",
                C: "bg-yellow-500 hover:bg-yellow-400",
                D: "bg-green-500 hover:bg-green-400",
              };
              return (
                <div className="grid gap-3">
                  {LETTERS.map((letter) => {
                    const isChecking = checking === letter;
                    const isSelected = selected === letter;
                    const isFlashCorrect = correctFlash === letter;
                    const isFlashWrong = wrongFlash === letter;
                    return (
                      <button
                        key={letter}
                        onClick={() => handleAnswer(letter)}
                        disabled={!!checking || !!feedback || !session}
                        className={cn(
                          "group flex items-center gap-4 rounded-xl px-4 py-4 text-left text-white font-bold text-lg transition-all shadow-lg",
                          COLORS[letter],
                          "disabled:cursor-not-allowed",
                          isSelected && !feedback && "ring-4 ring-white scale-105",
                          isFlashCorrect && "animate-pulse ring-4 ring-white",
                          isFlashWrong && "animate-[shake_0.4s_ease-in-out] ring-4 ring-red-200",
                        )}
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/25 text-xl font-extrabold">
                          {isChecking ? <Loader2 className="h-5 w-5 animate-spin" /> : letter}
                        </span>
                        <span className="flex-1 leading-snug">
                          {session?.options[letter]}
                        </span>
                      </button>
                    );
                  })}
                  <style>{`
                    @keyframes shake {
                      0%, 100% { transform: translateX(0); }
                      25% { transform: translateX(-8px); }
                      75% { transform: translateX(8px); }
                    }
                  `}</style>
                </div>
              );
            })()}
          </>
        )}
      </main>

      {/* Feedback bottom sheet — only dismissable via Next Question button */}
      <Sheet open={!!feedback && !feedback.correct && !penaltyOpen}>
        <SheetContent
          side="bottom"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className={cn(
            "rounded-t-3xl border-t-2 backdrop-blur-xl",
            feedback?.topic_complete
              ? "border-neon-green bg-[linear-gradient(135deg,oklch(0.35_0.18_150/0.95),oklch(0.25_0.12_180/0.95))] animate-pulse-glow"
              : typeof feedback?.max_marks === "number"
                ? "border-primary bg-card/95"
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
                ) : typeof feedback?.max_marks === "number" ? (
                  <>
                    <span className="text-2xl">📝</span>
                    <span className="text-primary-glow">Graded</span>
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
            {typeof feedback?.max_marks === "number" && (
              <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4">
                <div className="text-xs uppercase tracking-widest text-primary-glow">
                  Score
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold text-foreground">
                    {(feedback.marks_awarded ?? 0).toFixed(1)}
                  </span>
                  <span className="text-lg text-muted-foreground">
                    / {feedback.max_marks}
                  </span>
                  {typeof feedback.partial_credit === "number" && (
                    <span className="ml-auto rounded-full bg-background/60 px-3 py-1 text-xs font-semibold text-foreground">
                      {Math.round(feedback.partial_credit * 100)}%
                    </span>
                  )}
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-background/50">
                  <div
                    className="h-full rounded-full bg-gradient-primary transition-all"
                    style={{
                      width: `${Math.max(0, Math.min(1, feedback.partial_credit ?? (feedback.max_marks ? (feedback.marks_awarded ?? 0) / feedback.max_marks : 0))) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
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
      {session && (
        <LessonNotesModal
          open={studyPackOpen}
          onClose={() => setStudyPackOpen(false)}
          lesson={session.lesson ?? null}
          subject={session.subject ?? activeSubject}
          topic={session.topic ?? activeTopic}
          language={activeLanguage}
          formLevel={formLevel}
          onLessonUpdate={(fresh) => setSession((s) => s ? { ...s, lesson: fresh } : s)}
        />
      )}
      {session?.session_id && (
        <TutorChatDrawer
          open={tutorChatOpen}
          onClose={() => setTutorChatOpen(false)}
          studentId={user?.id ?? STUDENT_ID}
          lessonId={session.lesson_id ?? session.session_id}
          language={activeLanguage}
        />
      )}

      <PraiseOverlay
        show={praiseOn}
        pointsAwarded={lastPoints}
        onFire={streak >= 3}
      />
      <PenaltyGameModal open={penaltyOpen} onComplete={handlePenaltyComplete} />
      <StudyCoachModal
        open={coachOpen}
        loading={coachLoading}
        narrative={coachNarrative}
        errorMessage={coachError}
        onClose={() => setCoachOpen(false)}
        onStartPractice={handleCoachStartPractice}
      />

    </div>
  );
}
