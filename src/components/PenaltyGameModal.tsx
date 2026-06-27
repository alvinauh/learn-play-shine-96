import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CatchStarsGame } from "./games/CatchStarsGame";
import { DinoRunnerGame } from "./games/DinoRunnerGame";
import { FlappyBirdGame } from "./games/FlappyBirdGame";
import { recordPenaltyGameResult } from "@/services/api";

interface Props {
  open: boolean;
  studentId: string;
  sessionId?: string;
  onComplete: () => void;
}

const GAME_TYPES = ["catch_stars", "dino_runner", "flappy_bird"] as const;

export function PenaltyGameModal({ open, studentId, sessionId, onComplete }: Props) {
  const gameIdxRef = useRef<number>(Math.floor(Math.random() * 3));
  const startedAtRef = useRef<number>(0);
  const [outcome, setOutcome] = useState<"playing" | "won" | "lost">("playing");

  useEffect(() => {
    if (open) startedAtRef.current = performance.now();
  }, [open]);

  if (!open) return null;

  const activeGame = GAME_TYPES[gameIdxRef.current];

  const handleEnd = async (won: boolean) => {
    setOutcome(won ? "won" : "lost");
    const durationMs = Math.round(performance.now() - startedAtRef.current);
    const res = await recordPenaltyGameResult({
      studentId,
      sessionId,
      gameType: activeGame,
      result: won ? "win" : "loss",
      durationMs,
    });
    if (res?.points_awarded && res.points_awarded > 0) {
      toast.success(`+${res.points_awarded} Leaderboard Points!`, {
        style: { background: "#facc15", color: "#422006", fontWeight: 700 },
      });
    }
    setTimeout(() => {
      setOutcome("playing");
      gameIdxRef.current = Math.floor(Math.random() * 3);
      onComplete();
    }, 1500);
  };

  const Game =
    gameIdxRef.current === 0
      ? CatchStarsGame
      : gameIdxRef.current === 1
        ? DinoRunnerGame
        : FlappyBirdGame;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="flex w-full max-w-md flex-col items-center gap-4 py-6">
        <div className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-3 text-center text-base font-bold text-white shadow-2xl">
          Oops! Time for a mini-challenge before we continue…
        </div>
        {outcome === "playing" ? (
          <Game onGameEnd={handleEnd} />
        ) : outcome === "won" ? (
          <div className="w-full rounded-2xl bg-green-500 px-4 py-4 text-center text-lg font-bold text-white shadow-xl">
            Great effort! Back to learning 🎉
          </div>
        ) : (
          <div className="w-full rounded-2xl bg-yellow-400 px-4 py-4 text-center text-lg font-bold text-yellow-950 shadow-xl">
            Nice try! Keep going 💪
          </div>
        )}
      </div>
    </div>
  );
}
