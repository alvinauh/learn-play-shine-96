import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CatchStarsGame, type GameChallenge } from "@/components/games/CatchStarsGame";
import { DinoRunnerGame } from "@/components/games/DinoRunnerGame";
import { FlappyBirdGame } from "@/components/games/FlappyBirdGame";
import { FlappyAnswerGame } from "@/components/games/FlappyAnswerGame";

export const Route = createFileRoute("/gametest")({
  component: GameTest,
});

const SAMPLE_CHALLENGE: GameChallenge = {
  question: "What is the SI unit of electric current?",
  options: { A: "Volt", B: "Ampere", C: "Ohm", D: "Watt" },
  correctLetter: "B",
};

function GameTest() {
  const [log, setLog] = useState<string[]>([]);
  const [which, setWhich] = useState<"kaplay" | "flappy" | "dino" | "stars" | "quiz">("kaplay");
  const [nonce, setNonce] = useState(0);
  const onEnd = (won: boolean) => {
    setLog((l) => [`t=${performance.now().toFixed(0)} onGameEnd(${won})`, ...l]);
  };

  const renderGame = () => {
    const key = `${which}-${nonce}`;
    if (which === "kaplay")
      return <FlappyAnswerGame key={key} onGameEnd={onEnd} challenge={SAMPLE_CHALLENGE} />;
    if (which === "flappy") return <FlappyBirdGame key={key} onGameEnd={onEnd} />;
    if (which === "dino") return <DinoRunnerGame key={key} onGameEnd={onEnd} />;
    if (which === "quiz")
      return <CatchStarsGame key={key} onGameEnd={onEnd} challenge={SAMPLE_CHALLENGE} />;
    return <CatchStarsGame key={key} onGameEnd={onEnd} />;
  };

  return (
    <div style={{ padding: 16, color: "#fff", background: "#111", minHeight: "100vh" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(["kaplay", "quiz", "stars", "flappy", "dino"] as const).map((w) => (
          <button
            key={w}
            data-testid={`pick-${w}`}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              fontWeight: 700,
              background: which === w ? "#6366f1" : "#333",
              color: "#fff",
            }}
            onClick={() => {
              setWhich(w);
              setNonce((n) => n + 1);
              setLog([]);
            }}
          >
            {w === "kaplay" ? "answer-flappy (kaplay)" : w === "quiz" ? "catch-the-answer" : w}
          </button>
        ))}
      </div>
      {renderGame()}
      <pre data-testid="log" style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
        {log.join("\n")}
      </pre>
    </div>
  );
}
