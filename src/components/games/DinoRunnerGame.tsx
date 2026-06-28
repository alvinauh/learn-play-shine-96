import { useEffect, useRef, useState } from "react";

interface Props {
  onGameEnd: (won: boolean) => void;
}

const W = 360;
const H = 200;
const GROUND = 170;
const GOAL = 5;

interface Cactus {
  x: number;
  passed: boolean;
}

export function DinoRunnerGame({ onGameEnd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dinoYRef = useRef(GROUND - 40);
  const dinoVyRef = useRef(0);
  const cactiRef = useRef<Cactus[]>([]);
  const nextSpawnRef = useRef(1500);
  const speedRef = useRef(200);
  const clearedRef = useRef(0);
  const endedRef = useRef(false);
  const gameActive = useRef(false);
  const [cleared, setCleared] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const jump = () => {
      if (dinoYRef.current >= GROUND - 40 - 0.1) dinoVyRef.current = -400;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        jump();
      }
    };
    const onTap = (e: Event) => {
      e.preventDefault();
      jump();
    };
    window.addEventListener("keydown", onKey);
    canvas.addEventListener("mousedown", onTap);
    canvas.addEventListener("touchstart", onTap, { passive: false });

    let raf = 0;
    let prev = performance.now();
    let elapsed = 0;

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
      elapsed += dt * 1000;
      speedRef.current = 200 + Math.min(150, elapsed / 100);

      // physics
      dinoVyRef.current += 800 * dt;
      dinoYRef.current += dinoVyRef.current * dt;
      if (dinoYRef.current > GROUND - 40) {
        dinoYRef.current = GROUND - 40;
        dinoVyRef.current = 0;
      }

      // spawn
      nextSpawnRef.current -= dt * 1000;
      if (nextSpawnRef.current <= 0) {
        cactiRef.current.push({ x: W + 20, passed: false });
        nextSpawnRef.current = 1500 + Math.random() * 1000;
      }

      // move + collide
      const dinoBox = { x: 60, y: dinoYRef.current, w: 30, h: 40 };
      for (const c of cactiRef.current) {
        c.x -= speedRef.current * dt;
        const cBox = { x: c.x, y: GROUND - 40, w: 20, h: 40 };
        if (
          dinoBox.x < cBox.x + cBox.w &&
          dinoBox.x + dinoBox.w > cBox.x &&
          dinoBox.y < cBox.y + cBox.h &&
          dinoBox.y + dinoBox.h > cBox.y
        ) {
          return end(false);
        }
        if (!c.passed && c.x + 20 < 60) {
          c.passed = true;
          clearedRef.current += 1;
          setCleared(clearedRef.current);
        }
      }
      cactiRef.current = cactiRef.current.filter((c) => c.x > -40);

      // draw
      ctx.fillStyle = "#1e1b4b";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#a78bfa";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND);
      ctx.lineTo(W, GROUND);
      ctx.stroke();

      // dino
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(60, dinoYRef.current, 30, 40);
      ctx.fillStyle = "#052e16";
      ctx.fillRect(80, dinoYRef.current + 8, 4, 4);

      // cacti
      ctx.fillStyle = "#166534";
      for (const c of cactiRef.current) ctx.fillRect(c.x, GROUND - 40, 20, 40);

      if (clearedRef.current >= GOAL) return end(true);
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
        Cleared: {cleared}/{GOAL} · tap / space to jump
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
