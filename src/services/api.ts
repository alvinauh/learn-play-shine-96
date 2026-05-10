// Skor API service — connects to local Python backend
export const BASE_URL = "http://localhost:8000";

export interface ClassMasteryItem {
  subject: string;
  mastery: number;
}

export interface RecentAlert {
  diagnostic_tag: string;
  topic?: string;
  severity?: "destructive" | "warning" | "success" | string;
}

export interface TeacherInsightsResponse {
  class_mastery: ClassMasteryItem[];
  recent_alerts: RecentAlert[];
  active_students?: number;
  class_average_mastery?: number;
  weakest_topic?: string;
}

export async function fetchTeacherInsights(): Promise<TeacherInsightsResponse> {
  const res = await fetch(`${BASE_URL}/teacher_insights`, { method: "GET" });
  if (!res.ok) throw new ApiResponseError(res.status);
  return res.json() as Promise<TeacherInsightsResponse>;
}

export interface SessionResponse {
  session_id?: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct?: string;
  topic?: string;
  subject?: string;
  media_url?: string;
  mnemonic_lyrics?: string[];
}

export interface AnswerResponse {
  correct: boolean;
  correct_answer: string;
  feedback: string;
  misconception?: string;
  next_question?: SessionResponse;
  topic_complete?: boolean;
  next_topic?: string;
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

export class ApiResponseError extends Error {
  status: number;

  constructor(status: number, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.name = "ApiResponseError";
    this.status = status;
  }
}

interface StartSessionApiResponse {
  session_id?: string;
  question?: string;
  options?: { A?: string; B?: string; C?: string; D?: string } | string[];
  correct?: string;
  topic?: string;
  subject?: string;
  media_url?: string;
  mnemonic_lyrics?: string[];
  question_data?: {
    question?: string;
    options?: string[];
    correct_answer?: string;
  };
  draft?: {
    question?: string;
    options?: string[];
    correct_answer?: string;
    topic?: string;
    subject?: string;
  };
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiResponseError(res.status);
  return res.json() as Promise<T>;
}

function normalizeOptions(options?: StartSessionApiResponse["options"] | string[]) {
  if (Array.isArray(options)) {
    return {
      A: options[0] ?? "A",
      B: options[1] ?? "B",
      C: options[2] ?? "C",
      D: options[3] ?? "D",
    };
  }

  return {
    A: options?.A ?? "A",
    B: options?.B ?? "B",
    C: options?.C ?? "C",
    D: options?.D ?? "D",
  };
}

function normalizeSessionResponse(
  data: StartSessionApiResponse,
  topic: string,
  subject: string,
): SessionResponse {
  const question = data.question ?? data.question_data?.question ?? data.draft?.question;

  if (!question) {
    throw new Error("Invalid start_session payload");
  }

  return {
    session_id: data.session_id,
    question,
    options: normalizeOptions(
      data.options ?? data.question_data?.options ?? data.draft?.options,
    ),
    correct:
      data.correct ?? data.question_data?.correct_answer ?? data.draft?.correct_answer,
    topic: data.topic ?? data.draft?.topic ?? topic,
    subject: data.subject ?? data.draft?.subject ?? subject,
    media_url: data.media_url,
  };
}

export async function startSession(
  studentId: string,
  topic: string,
  curriculum: string,
  subject: string,
  mock?: MockBundle,
  language: string = "English",
): Promise<SessionResponse> {
  try {
    const data = await postJSON<StartSessionApiResponse>("/start_session", {
      student_id: studentId,
      topic,
      curriculum,
      subject,
      language,
    });

    return normalizeSessionResponse(data, topic, subject);
  } catch (err) {
    console.warn("[Skor API] startSession failed, using mock:", err);
    if (!mock || err instanceof ApiResponseError) throw err;
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
  draft: Record<string, unknown> = {},
  mock?: MockBundle,
  language: string = "English",
): Promise<AnswerResponse> {
  try {
    return await postJSON<AnswerResponse>("/submit_answer", {
      student_id: studentId,
      topic,
      curriculum,
      student_answer: studentAnswer,
      draft,
      language,
    });
  } catch (err) {
    console.warn("[Skor API] submitAnswer failed, using mock:", err);
    if (!mock || err instanceof ApiResponseError) throw err;
    const correct = studentAnswer === "C";
    return {
      correct,
      correct_answer: "C",
      feedback: correct ? mock.feedbackCorrect : mock.feedbackWrong,
      misconception: mock.misconception,
    };
  }
}
