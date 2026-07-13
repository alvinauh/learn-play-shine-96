import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CatchStarsGame, type GameChallenge } from "./games/CatchStarsGame";
import { DinoRunnerGame } from "./games/DinoRunnerGame";
import { FlappyBirdGame } from "./games/FlappyBirdGame";
import { FlappyAnswerGame } from "./games/FlappyAnswerGame";
import { recordPenaltyGameResult } from "@/services/api";

interface Props {
  open: boolean;
  studentId: string;
  sessionId?: string;
  /** Receives the credited mastery_score on a challenge win (else undefined/null)
   *  so callers can update a live mastery bar without refetching. */
  onComplete: (masteryScore?: number | null) => void;
  /** When provided, the game replays this question so the student must actively
   *  catch the correct answer — assessment-integrated reinforcement. */
  challenge?: GameChallenge | null;
  /** Topic/subject of the replayed question — a win credits partial mastery recovery. */
  topic?: string;
  subject?: string;
}

const GAME_TYPES = ["catch_stars", "dino_runner", "flappy_bird"] as const;

export function PenaltyGameModal({ open, studentId, sessionId, onComplete, challenge, topic, subject }: Props) {
  // With a challenge we run the Kaplay assessment flagship (Answer Flappy).
  const gameIdxRef = useRef<number>(challenge ? 0 : Math.floor(Math.random() * 3));
  const startedAtRef = useRef<number>(0);
  const [outcome, setOutcome] = useState<"playing" | "won" | "lost">("playing");

  useEffect(() => {
    if (open) {
      startedAtRef.current = performance.now();
      gameIdxRef.current = challenge ? 0 : Math.floor(Math.random() * 3);
    }
  }, [open, challenge]);

  if (!open) return null;

  const activeGame = challenge ? "flappy_bird" : GAME_TYPES[gameIdxRef.current];

  const handleEnd = async (won: boolean) => {
    setOutcome(won ? "won" : "lost");
    const durationMs = Math.round(performance.now() - startedAtRef.current);
    const res = await recordPenaltyGameResult({
      studentId,
      sessionId,
      gameType: activeGame,
      result: won ? "win" : "loss",
      durationMs,
      // Only assessment-integrated challenges carry a topic → mastery recovery.
      topic: challenge ? topic : undefined,
      subject: challenge ? subject : undefined,
    });
    if (res?.points_awarded && res.points_awarded > 0) {
      toast.success(`+${res.points_awarded} Leaderboard Points!`, {
        style: { background: "#facc15", color: "#422006", fontWeight: 700 },
      });
    }
    if (res?.mastery_delta && res.mastery_delta > 0) {
      toast.success(`Mastery recovered +${Math.round(res.mastery_delta * 100)}%`, {
        style: { background: "#22c55e", color: "#052e16", fontWeight: 700 },
      });
    }
    setTimeout(() => {
      setOutcome("playing");
      onComplete(res?.mastery_score ?? null);
    }, 1500);
  };

  const renderGame = () => {
    if (challenge) return <FlappyAnswerGame onGameEnd={handleEnd} challenge={challenge} />;
    if (gameIdxRef.current === 0) return <CatchStarsGame onGameEnd={handleEnd} />;
    if (gameIdxRef.current === 1) return <DinoRunnerGame onGameEnd={handleEnd} />;
    return <FlappyBirdGame onGameEnd={handleEnd} />;
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="flex w-full max-w-md flex-col items-center gap-4 py-6">
        <div className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-3 text-center text-base font-bold text-white shadow-2xl">
          {challenge
            ? "Let's lock it in — fly through the correct answer! 🎯"
            : "Oops! Time for a mini-challenge before we continue…"}
        </div>
        {outcome === "playing" ? (
          renderGame()
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
