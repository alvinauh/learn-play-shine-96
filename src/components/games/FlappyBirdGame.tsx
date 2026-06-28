import { useEffect, useRef, useState } from "react";

interface Props {
  onGameEnd: (won: boolean) => void;
}

const W = 360;
const H = 480;
const GOAL = 3;
const GAP = 130;
const PIPE_W = 60;

interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

export function FlappyBirdGame({ onGameEnd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const birdYRef = useRef(240);
  const birdVyRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([{ x: W + 40, gapY: 200, passed: false }]);
  const scoreRef = useRef(0);
  const endedRef = useRef(false);
  const gameActive = useRef(false);
  const framesRef = useRef(0);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const flap = () => {
      birdVyRef.current = -280;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        flap();
      }
    };
    const onTap = (e: Event) => {
      e.preventDefault();
      flap();
    };
    window.addEventListener("keydown", onKey);
    canvas.addEventListener("mousedown", onTap);
    canvas.addEventListener("touchstart", onTap, { passive: false });

    let raf = 0;
    let prev = performance.now();

    const end = (won: boolean) => {
      if (!gameActive.current) return;
      if (endedRef.current) return;
      endedRef.current = true;
      gameActive.current = false;
      cancelAnimationFrame(raf);
      onGameEnd(won);
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      framesRef.current += 1;

      birdVyRef.current += 500 * dt;
      birdYRef.current += birdVyRef.current * dt;

      const bx = 80;
      const r = 20;

      // pipes
      for (const p of pipesRef.current) {
        p.x -= 150 * dt;
        const topH = p.gapY - GAP / 2;
        const botY = p.gapY + GAP / 2;
        const hitX = bx + r > p.x && bx - r < p.x + PIPE_W;
        if (hitX && (birdYRef.current - r < topH || birdYRef.current + r > botY)) {
          return end(false);
        }
        // Only count a pass on an active frame after the bird's x has crossed the pipe's right edge
        if (framesRef.current > 1 && !p.passed && p.x + PIPE_W < bx - r) {
          p.passed = true;
          scoreRef.current += 1;
          setScore(scoreRef.current);
        }
      }
      const last = pipesRef.current[pipesRef.current.length - 1];
      if (last.x < 180) {
        pipesRef.current.push({
          x: W + 40,
          gapY: 100 + Math.random() * (H - 200),
          passed: false,
        });
      }
      pipesRef.current = pipesRef.current.filter((p) => p.x > -PIPE_W);

      if (birdYRef.current - r < 0 || birdYRef.current + r > H) return end(false);

      // draw
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#7dd3fc");
      sky.addColorStop(1, "#0c4a6e");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "#166534";
      for (const p of pipesRef.current) {
        ctx.fillRect(p.x, 0, PIPE_W, p.gapY - GAP / 2);
        ctx.fillRect(p.x, p.gapY + GAP / 2, PIPE_W, H);
      }

      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(bx, birdYRef.current, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(bx + 6, birdYRef.current - 4, 3, 0, Math.PI * 2);
      ctx.fill();

      if (scoreRef.current >= GOAL) return end(true);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("mousedown", onTap);
      canvas.removeEventListener("touchstart", onTap);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-full max-w-[360px] text-sm font-bold text-white">
        Pipes: {score}/{GOAL} · tap / space to flap
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="w-full max-w-[360px] rounded-2xl border border-white/20 touch-none"
      />
    </div>
  );
}
