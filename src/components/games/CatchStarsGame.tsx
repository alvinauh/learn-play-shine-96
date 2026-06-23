import { useEffect, useRef, useState } from "react";

interface Props {
  onGameEnd: (won: boolean) => void;
}

interface Star {
  x: number;
  y: number;
  vy: number;
}

const W = 360;
const H = 480;
const BUCKET_W = 70;
const BUCKET_H = 18;
const GOAL = 10;
const DURATION = 30;

export function CatchStarsGame({ onGameEnd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bucketXRef = useRef(W / 2);
  const starsRef = useRef<Star[]>([]);
  const caughtRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const startRef = useRef(0);
  const endedRef = useRef(false);
  const [caught, setCaught] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();

    const onMove = (clientX: number) => {
      const r = canvas.getBoundingClientRect();
      const ratio = W / r.width;
      bucketXRef.current = Math.max(BUCKET_W / 2, Math.min(W - BUCKET_W / 2, (clientX - r.left) * ratio));
    };
    const mm = (e: MouseEvent) => onMove(e.clientX);
    const tm = (e: TouchEvent) => {
      if (e.touches[0]) onMove(e.touches[0].clientX);
    };
    canvas.addEventListener("mousemove", mm);
    canvas.addEventListener("touchmove", tm, { passive: true });

    let raf = 0;
    let prev = performance.now();
    startRef.current = prev;

    const end = (won: boolean) => {
      if (endedRef.current) return;
      endedRef.current = true;
      cancelAnimationFrame(raf);
      onGameEnd(won);
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const elapsed = (now - startRef.current) / 1000;
      const left = Math.max(0, DURATION - elapsed);
      setTimeLeft(Math.ceil(left));

      // spawn
      if (now - lastSpawnRef.current > 800) {
        lastSpawnRef.current = now;
        starsRef.current.push({
          x: 20 + Math.random() * (W - 40),
          y: -20,
          vy: 80 + Math.random() * 100,
        });
      }

      // update + collide
      const bx = bucketXRef.current;
      const by = H - 40;
      starsRef.current = starsRef.current.filter((s) => {
        s.y += s.vy * dt;
        if (
          s.y + 12 >= by &&
          s.y - 12 <= by + BUCKET_H &&
          Math.abs(s.x - bx) <= BUCKET_W / 2
        ) {
          caughtRef.current += 1;
          setCaught(caughtRef.current);
          return false;
        }
        return s.y < H + 30;
      });

      // draw
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#0b1a3a");
      grad.addColorStop(1, "#1a0533");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // stars
      ctx.fillStyle = "#fde047";
      ctx.font = "24px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const s of starsRef.current) ctx.fillText("⭐", s.x, s.y);

      // bucket
      ctx.fillStyle = "#facc15";
      ctx.fillRect(bx - BUCKET_W / 2, by, BUCKET_W, BUCKET_H);
      ctx.strokeStyle = "#92400e";
      ctx.lineWidth = 3;
      ctx.strokeRect(bx - BUCKET_W / 2, by, BUCKET_W, BUCKET_H);

      if (caughtRef.current >= GOAL) return end(true);
      if (left <= 0) return end(false);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousemove", mm);
      canvas.removeEventListener("touchmove", tm);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex w-full max-w-[360px] items-center justify-between text-sm font-bold text-white">
        <span>⭐ {caught}/{GOAL}</span>
        <span>⏱ {timeLeft}s</span>
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
