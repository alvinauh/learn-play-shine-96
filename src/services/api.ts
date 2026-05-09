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

export interface MockBundle {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  topic: string;
  subject: string;
  feedbackCorrect: string;
  feedbackWrong: string;
  misconception: string;
}

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
  mock?: MockBundle,
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
    if (!mock) throw err;
    return {
      session_id: "mock-1",
      question: mock.question,
      options: { A: mock.optionA, B: mock.optionB, C: mock.optionC, D: mock.optionD },
      correct: "C",
      topic: mock.topic,
      subject: mock.subject,
    };
  }
}

export async function submitAnswer(
  studentId: string,
  topic: string,
  curriculum: string,
  studentAnswer: string,
  draft: string,
  mock?: MockBundle,
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
    if (!mock) throw err;
    const correct = studentAnswer === "C";
    return {
      correct,
      correct_answer: "C",
      feedback: correct ? mock.feedbackCorrect : mock.feedbackWrong,
      misconception: mock.misconception,
    };
  }
}
