import type { SessionResponse } from "@/services/api";
import type { GameChallenge } from "@/components/games/CatchStarsGame";

const LETTERS = ["A", "B", "C", "D"] as const;
type Letter = (typeof LETTERS)[number];

/** Derive an assessment game challenge from the MCQ the student just saw.
 *  Resolves the correct letter by letter match OR option-text match.
 *  Returns null for non-MCQ / malformed sessions → caller falls back to arcade. */
export function buildChallenge(session: SessionResponse | null): GameChallenge | null {
  if (!session || (session.question_type ?? "mcq") !== "mcq") return null;
  const opts = session.options;
  if (!opts || !LETTERS.every((l) => opts[l])) return null;

  const raw = (session.correct ?? "").trim();
  if (!raw) return null;
  let correctLetter: Letter | null = null;
  const up = raw.toUpperCase();
  if ((LETTERS as readonly string[]).includes(up)) {
    correctLetter = up as Letter;
  } else {
    const match = LETTERS.find(
      (l) => (opts[l] ?? "").trim().toLowerCase() === raw.toLowerCase(),
    );
    if (match) correctLetter = match;
  }
  if (!correctLetter) return null;

  return { question: session.question, options: opts, correctLetter };
}
