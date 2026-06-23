import { useRef, useState } from "react";
import { CatchStarsGame } from "./games/CatchStarsGame";
import { DinoRunnerGame } from "./games/DinoRunnerGame";
import { FlappyBirdGame } from "./games/FlappyBirdGame";

interface Props {
  open: boolean;
  onComplete: () => void;
}

export function PenaltyGameModal({ open, onComplete }: Props) {
  const gameIdxRef = useRef<number>(Math.floor(Math.random() * 3));
  const [outcome, setOutcome] = useState<"playing" | "won" | "lost">("playing");

  if (!open) return null;

  const handleEnd = (won: boolean) => {
    setOutcome(won ? "won" : "lost");
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
