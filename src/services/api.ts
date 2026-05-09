// Skor API service — connects to local Python backend
export const BASE_URL = "http://localhost:8000";

export interface SessionResponse {
  session_id?: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct?: string;
  topic?: string;
  subject?: string;
}

export interface AnswerResponse {
  correct: boolean;
  correct_answer: string;
  feedback: string;
  misconception?: string;
  next_question?: SessionResponse;
}

const MOCK_QUESTION: SessionResponse = {
  session_id: "mock-1",
  question:
    "A car accelerates uniformly from rest at 2 m/s². How far does it travel in 5 seconds?",
  options: {
    A: "10 m",
    B: "20 m",
    C: "25 m",
    D: "50 m",
  },
  correct: "C",
  topic: "Kinematics",
  subject: "Physics",
};

const MOCK_FEEDBACK: AnswerResponse = {
  correct: false,
  correct_answer: "C",
  feedback:
    "Use s = ut + ½at². With u = 0, a = 2 m/s², t = 5 s → s = ½ × 2 × 25 = 25 m. A common slip is multiplying a × t (giving velocity) instead of using the displacement formula.",
  misconception: "Confusing velocity (a·t) with displacement (½at²).",
};

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function startSession(
  studentId: string,
  topic: string,
  curriculum: string,
  subject: string,
): Promise<SessionResponse> {
  try {
    return await postJSON<SessionResponse>("/start_session", {
      student_id: studentId,
      topic,
      curriculum,
      subject,
    });
  } catch (err) {
    console.warn("[Skor API] startSession failed, using mock:", err);
    return MOCK_QUESTION;
  }
}

export async function submitAnswer(
  studentId: string,
  topic: string,
  curriculum: string,
  studentAnswer: string,
  draft: string,
): Promise<AnswerResponse> {
  try {
    return await postJSON<AnswerResponse>("/submit_answer", {
      student_id: studentId,
      topic,
      curriculum,
      student_answer: studentAnswer,
      draft,
    });
  } catch (err) {
    console.warn("[Skor API] submitAnswer failed, using mock:", err);
    return {
      ...MOCK_FEEDBACK,
      correct: studentAnswer === MOCK_FEEDBACK.correct_answer,
      feedback:
        studentAnswer === MOCK_FEEDBACK.correct_answer
          ? "Spot on! You correctly applied s = ut + ½at² with u = 0 to get 25 m. Strong grasp of uniform acceleration."
          : MOCK_FEEDBACK.feedback,
    };
  }
}
