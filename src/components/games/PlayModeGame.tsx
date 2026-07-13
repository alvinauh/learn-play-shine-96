import { useEffect, useRef, useState } from "react";
import { startSession, submitAnswer, fetchSessionChallenge, type QuestionType } from "@/services/api";
import { buildChallengeFrom } from "@/lib/challenge";
import type { GameChallenge } from "./CatchStarsGame";

/**
 * Play mode — the learn-through-play loop. A continuous Flappy run where each
 * obstacle IS a real question: fly through the gate with the correct answer to
 * advance, fly through a wrong one to lose a life AND get a one-line "why"
 * (the teaching moment). Every gate is submitted to /submit_answer, so playing
 * updates real mastery + event logs exactly like the button-MCQ feed.
 *
 * The question buffer is filled by reusing start_session (adaptive) — no backend
 * change. A later phase can swap in a /game_batch endpoint for one-shot fills.
 */

type Letter = "A" | "B" | "C" | "D";

const W = 360;
const H = 480;
const LIVES = 3;
const BUFFER_TARGET = 4; // keep this many questions queued ahead

const SPEED = 118;
const GRAVITY = 1500;
const FLAP = 430;
const PIPE_W = 74;
const BIRD_X = 82;
const GAP_H = 116;
const TOP_GAP_C = 132;
const BOT_GAP_C = 348;

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

interface Props {
  studentId: string;
  topic: string;
  subject: string;
  apiLang: string;
  lang: string;
  formLevel: number;
  questionType: QuestionType;
  /** Bubble each resolved question up to the feed HUD (score / streak / mastery). */
  onResult: (r: { correct: boolean; points: number; mastery?: number | null }) => void;
  onExit: () => void;
}

function isRateLimited(q: string | undefined): boolean {
  const s = q ?? "";
  return s.includes("API Rate Limit") || !s.trim();
}

export function PlayModeGame({
  studentId, topic, subject, apiLang, lang, formLevel, questionType, onResult, onExit,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const queueRef = useRef<GameChallenge[]>([]);
  const prefetchingRef = useRef(false);
  const resumeRef = useRef<(() => void) | null>(null);

  const [ready, setReady] = useState(false);
  const [lives, setLives] = useState(LIVES);
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [teach, setTeach] = useState<{ challenge: GameChallenge; chosen: Letter } | null>(null);
  const [over, setOver] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [runId, setRunId] = useState(0); // bump to restart the game loop from scratch

  const restart = () => {
    resumeRef.current = null;
    setLives(LIVES); setAnswered(0); setCorrect(0);
    setTeach(null); setOver(false); setBuffering(true);
    void refill();
    setRunId((n) => n + 1);
  };

  // ---- question buffer (reuses start_session + session_challenge) ----
  const refill = async () => {
    if (prefetchingRef.current) return;
    prefetchingRef.current = true;
    try {
      let guard = 0;
      while (queueRef.current.length < BUFFER_TARGET && guard < BUFFER_TARGET * 2) {
        guard++;
        const s = await startSession(studentId, topic, "KSSM", apiLang, subject, undefined, true, questionType, formLevel);
        if (isRateLimited(s.question) || !s.session_id) continue;
        const correctRaw = await fetchSessionChallenge(s.session_id);
        const ch = buildChallengeFrom(s.question, s.options, correctRaw, "mcq", {
          sessionId: s.session_id,
          explanation: s.illustrative_notes || undefined,
          topic: s.topic ?? topic,
          subject: s.subject ?? subject,
        });
        if (ch) {
          queueRef.current.push(ch);
          setBuffering(false);
        }
      }
    } catch {
      /* leave the queue as-is; the game loop retries when it needs one */
    } finally {
      prefetchingRef.current = false;
    }
  };

  // Submit a resolved gate as a real assessment attempt.
  const submitGate = (challenge: GameChallenge, chosen: Letter) => {
    const answerText = challenge.options[chosen] ?? chosen;
    void submitAnswer(
      studentId, challenge.topic ?? topic, "", answerText, {}, undefined,
      apiLang, challenge.subject ?? subject, challenge.sessionId,
    )
      .then((res) => {
        onResult({
          correct: res.is_correct ?? res.correct ?? (chosen === challenge.correctLetter),
          points: res.points_awarded ?? 0,
          mastery: res.mastery_score ?? null,
        });
      })
      .catch(() => {
        // Network failed — still credit the local outcome so the run feels responsive.
        onResult({ correct: chosen === challenge.correctLetter, points: 0, mastery: null });
      });
  };

  useEffect(() => {
    void refill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- game loop ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let cleanup = () => {};

    void (async () => {
      const kaplay = (await import("kaplay")).default;
      if (disposed) return;
      const k = kaplay({
        canvas, width: W, height: H, background: [11, 16, 34],
        global: false, touchToMouse: true, crisp: false,
        pixelDensity: Math.min(2, window.devicePixelRatio || 1),
      });
      setReady(true);
      k.setGravity(0);

      let livesLeft = LIVES;
      let answeredCount = 0;
      let correctCount = 0;
      let gameOver = false;
      let started = false;
      let paused = false; // frozen during a teaching moment
      let invulnUntil = 0;
      let spawner: { cancel: () => void } | null = null;
      let current: GameChallenge | null = null; // question the live obstacle presents

      // ---- parallax stars ----
      for (let i = 0; i < 26; i++) {
        const depth = 0.3 + Math.random() * 0.7;
        const star = k.add([
          k.rect(2 + depth * 2, 2 + depth * 2),
          k.pos(Math.random() * W, Math.random() * H),
          k.color(255, 255, 255), k.opacity(0.2 + depth * 0.5), k.z(-10),
        ]);
        star.onUpdate(() => {
          if (paused) return;
          star.pos.x -= SPEED * depth * 0.5 * k.dt();
          if (star.pos.x < -4) star.pos.x = W + 4;
        });
      }

      const bird = k.add([
        k.circle(15), k.pos(BIRD_X, H / 2), k.color(250, 204, 21),
        k.outline(3, k.rgb(120, 53, 15)), k.area({ scale: 0.85 }),
        k.body({ jumpForce: FLAP }), k.anchor("center"), k.rotate(0), k.opacity(1), k.z(10), "bird",
      ]);
      bird.onUpdate(() => {
        const vy = bird.vel?.y ?? 0;
        bird.angle = Math.max(-28, Math.min(70, vy * 0.06));
      });

      const startHint = k.add([
        k.text("Tap / Space\nto start", { size: 20, align: "center" }),
        k.pos(W / 2, H * 0.36), k.color(255, 255, 255), k.opacity(0.9), k.anchor("center"), k.z(20),
      ]);

      const flap = () => {
        if (gameOver || paused) return;
        if (!started) {
          started = true;
          k.setGravity(GRAVITY);
          startHint.destroy();
          spawner = k.loop(2.6, trySpawn);
        }
        bird.jump(FLAP);
      };
      k.onKeyPress("space", flap);
      k.onMousePress(flap);
      k.onTouchStart(flap);

      const finish = () => {
        if (gameOver) return;
        gameOver = true;
        spawner?.cancel();
        k.wait(0.5, () => { if (!disposed) setOver(true); });
      };

      const loseLife = () => {
        if (k.time() < invulnUntil || gameOver || paused) return;
        livesLeft -= 1;
        setLives(livesLeft);
        invulnUntil = k.time() + 1;
        k.shake(9);
        bird.pos.x = BIRD_X; bird.pos.y = H / 2;
        if (bird.vel) bird.vel.y = 0;
        let blinks = 6;
        const t = k.loop(0.12, () => {
          bird.opacity = bird.opacity === 1 ? 0.3 : 1;
          if (--blinks <= 0) { bird.opacity = 1; t.cancel(); }
        });
        if (livesLeft <= 0) finish();
      };

      // Freeze the world and show the "why" overlay, then resume on Continue.
      const teachThenResume = (challenge: GameChallenge, chosen: Letter) => {
        paused = true;
        k.setGravity(0);
        if (bird.vel) bird.vel.y = 0;
        setTeach({ challenge, chosen });
        resumeRef.current = () => {
          setTeach(null);
          resumeRef.current = null;
          if (gameOver || disposed) return;
          paused = false;
          k.setGravity(GRAVITY);
        };
      };

      // ---- obstacle building (two gaps: correct + one distractor) ----
      const gapPill = (parent: ReturnType<typeof k.add>, cx: number, cy: number, label: string) => {
        const pill = parent.add([
          k.rect(128, 34, { radius: 8 }), k.pos(cx, cy), k.color(248, 250, 252),
          k.outline(2, k.rgb(148, 163, 184)), k.anchor("center"), k.z(6),
        ]);
        pill.add([
          k.text(truncate(label, 15), { size: 15, align: "center" }),
          k.color(15, 23, 42), k.anchor("center"), k.pos(0, 0),
        ]);
      };
      const pipeSeg = (parent: ReturnType<typeof k.add>, y: number, h: number) => {
        if (h <= 0) return;
        parent.add([
          k.rect(PIPE_W, h), k.pos(0, y), k.color(34, 197, 94),
          k.outline(3, k.rgb(21, 128, 61)), k.area(), k.anchor("topleft"), "pipe",
        ]);
      };
      const gapSensor = (
        parent: ReturnType<typeof k.add>, cy: number, isCorrect: boolean, letter: Letter,
      ) => {
        parent.add([
          k.rect(PIPE_W, GAP_H), k.pos(0, cy - GAP_H / 2), k.area(), k.opacity(0),
          k.anchor("topleft"), { isCorrect, letter }, "gap",
        ]);
      };

      const trySpawn = () => {
        if (gameOver || paused) return;
        const next = queueRef.current.shift();
        if (queueRef.current.length < BUFFER_TARGET) void refill();
        if (!next) {
          // Buffer empty — wait briefly for a prefetch to land, then retry.
          setBuffering(true);
          k.wait(0.6, trySpawn);
          return;
        }
        setBuffering(false);
        current = next;

        const letters = (["A", "B", "C", "D"] as Letter[]).filter((l) => next.options[l]);
        const correctL = next.correctLetter;
        const distractors = letters.filter((l) => l !== correctL);
        const distractor = distractors.length ? distractors[Math.floor(k.time()) % distractors.length] : correctL;

        const obst = k.add([k.pos(W + PIPE_W, 0), { resolved: false }, "obstacle"]);
        pipeSeg(obst, 0, TOP_GAP_C - GAP_H / 2);
        pipeSeg(obst, TOP_GAP_C + GAP_H / 2, BOT_GAP_C - GAP_H / 2 - (TOP_GAP_C + GAP_H / 2));
        pipeSeg(obst, BOT_GAP_C + GAP_H / 2, H - (BOT_GAP_C + GAP_H / 2));

        const correctOnTop = k.time() % 1 < 0.5;
        const topLetter = correctOnTop ? correctL : distractor;
        const botLetter = correctOnTop ? distractor : correctL;
        const label = (l: Letter) => `${l}. ${next.options[l] ?? ""}`;
        gapPill(obst, PIPE_W / 2, TOP_GAP_C, label(topLetter));
        gapPill(obst, PIPE_W / 2, BOT_GAP_C, label(botLetter));
        gapSensor(obst, TOP_GAP_C, correctOnTop, topLetter);
        gapSensor(obst, BOT_GAP_C, !correctOnTop, botLetter);

        obst.onUpdate(() => {
          if (paused) return;
          obst.pos.x -= SPEED * k.dt();
          if (obst.pos.x < -PIPE_W - 140) obst.destroy();
        });
      };

      // ---- collisions ----
      bird.onCollide("pipe", (p) => {
        const o = (p as unknown as { parent?: { resolved: boolean } }).parent;
        if (o?.resolved || paused) return;
        if (o) o.resolved = true;
        loseLife();
      });

      bird.onCollide("gap", (g) => {
        const gap = g as unknown as { isCorrect: boolean; letter: Letter; parent?: { resolved: boolean } };
        const o = gap.parent;
        if (o?.resolved || paused) return;
        if (o) o.resolved = true;
        const challenge = current;
        if (!challenge) return;

        answeredCount += 1;
        setAnswered(answeredCount);
        submitGate(challenge, gap.letter);

        if (gap.isCorrect) {
          correctCount += 1;
          setCorrect(correctCount);
          k.shake(3);
        } else {
          teachThenResume(challenge, gap.letter);
          loseLife();
        }
      });

      bird.onUpdate(() => {
        if (gameOver || !started || paused) return;
        if (bird.pos.y < 8 || bird.pos.y > H - 8) loseLife();
      });

      cleanup = () => {
        spawner?.cancel();
        try { k.quit(); } catch { /* already torn down */ }
      };
    })();

    return () => { disposed = true; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const t = (ms: string, en: string) => (lang === "ms" ? ms : en);

  return (
    <div className="relative flex w-full max-w-[360px] flex-col items-center gap-2">
      <div className="flex w-full items-center justify-between text-sm font-bold text-white">
        <span>✅ {correct}/{answered}</span>
        <span className="text-rose-300">{"❤".repeat(lives)}{"·".repeat(LIVES - lives)}</span>
        <span className="text-white/50 text-xs">
          {ready ? (buffering ? t("memuat…", "loading…") : t("ketuk", "tap")) : t("memuat…", "loading…")}
        </span>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full max-w-[360px] rounded-2xl border border-white/20 touch-none shadow-2xl"
      />

      {/* Teaching moment — shown when the player flies through a wrong answer. */}
      {teach && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/85 p-4 text-center backdrop-blur-sm">
          <p className="text-sm font-bold text-rose-300">{t("Belum tepat", "Not quite")}</p>
          <p className="text-[13px] text-white/80 line-clamp-3">{teach.challenge.question}</p>
          <p className="text-sm font-semibold text-emerald-300">
            {t("Jawapan betul", "Correct answer")}: {teach.challenge.correctLetter}. {teach.challenge.options[teach.challenge.correctLetter]}
          </p>
          {teach.challenge.explanation && (
            <p className="text-[13px] text-white/70 line-clamp-4">{teach.challenge.explanation}</p>
          )}
          <button
            onClick={() => resumeRef.current?.()}
            className="mt-1 rounded-full bg-emerald-500 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-400"
          >
            {t("Teruskan ▶", "Continue ▶")}
          </button>
        </div>
      )}

      {/* End-of-run summary. */}
      {over && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 rounded-2xl bg-black/90 p-4 text-center backdrop-blur-sm">
          <p className="text-lg font-extrabold text-white">{t("Tamat!", "Run over!")}</p>
          <p className="text-sm text-white/80">
            {t("Betul", "Correct")}: <span className="font-bold text-emerald-300">{correct}</span> / {answered}
          </p>
          <div className="flex gap-2">
            <button
              onClick={restart}
              className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-400"
            >
              {t("Main lagi", "Play again")}
            </button>
            <button
              onClick={onExit}
              className="rounded-full bg-white/10 px-5 py-2 text-sm font-bold text-white/80 hover:bg-white/20"
            >
              {t("Kembali", "Back")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
