import type { SessionResponse } from "@/services/api";
import type { GameChallenge } from "@/components/games/CatchStarsGame";

const LETTERS = ["A", "B", "C", "D"] as const;
type Letter = (typeof LETTERS)[number];

/** Core builder: resolve the correct letter from an explicit answer string
 *  (letter OR option-text match). Returns null unless it's a complete MCQ. */
export function buildChallengeFrom(
  question: string | undefined,
  options: { A: string; B: string; C: string; D: string } | undefined,
  correctRaw: string | null | undefined,
  questionType?: string,
): GameChallenge | null {
  if (questionType && questionType !== "mcq") return null;
  if (!question || !options || !LETTERS.every((l) => options[l])) return null;

  const raw = (correctRaw ?? "").trim();
  if (!raw) return null;
  let correctLetter: Letter | null = null;
  const up = raw.toUpperCase();
  if ((LETTERS as readonly string[]).includes(up)) {
    correctLetter = up as Letter;
  } else {
    const match = LETTERS.find(
      (l) => (options[l] ?? "").trim().toLowerCase() === raw.toLowerCase(),
    );
    if (match) correctLetter = match;
  }
  if (!correctLetter) return null;

  return { question, options, correctLetter };
}

/** Derive a challenge from a session object. NOTE: the backend strips
 *  `correct_answer` from /start_session payloads, so `session.correct` is
 *  usually empty in the live feed — prefer buildChallengeFrom() with the
 *  correct answer from the submit-answer feedback. Kept for the /gametest
 *  harness and any caller that already has the answer on the session. */
export function buildChallenge(session: SessionResponse | null): GameChallenge | null {
  if (!session) return null;
  return buildChallengeFrom(
    session.question,
    session.options,
    session.correct,
    session.question_type ?? "mcq",
  );
}
