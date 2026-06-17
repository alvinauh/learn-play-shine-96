// Direct HTTPS endpoint to the quiz backend. CORS is configured upstream to allow lovable preview/published domains.
export const BASE_URL = "https://178.105.130.105.nip.io:8443";

export interface ClassMasteryItem {
  subject: string;
  mastery: number;
}

export interface RecentAlert {
  diagnostic_tag?: string;
  topic?: string;
  severity?: "destructive" | "warning" | "success" | string;
  category?: string;
  observation?: string;
  action?: string;
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

export interface SubjectWithTopics {
  subject: string;
  topics: string[];
}

/**
 * Fetch the catalog of subjects and their topics from the backend.
 * GET /subjects → { subjects: [{ subject, topics: [] }] }
 */
export async function fetchSubjects(formLevel?: number): Promise<SubjectWithTopics[]> {
  const qs = typeof formLevel === "number" ? `?form_level=${formLevel}` : "";
  const url = `${BASE_URL}/subjects${qs}`;
  console.log("[Skor API] GET subjects → resolved URL:", url, "(origin:", typeof window !== "undefined" ? window.location.origin : "ssr", ")");
  const res = await fetch(url, { method: "GET" });
  console.log("[Skor API] /subjects status:", res.status, res.statusText);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[Skor API] /subjects error body:", text);
    throw new ApiResponseError(res.status);
  }
  const data = (await res.json()) as { subjects?: Array<{ subject?: string; topics?: string[] }> };
  console.log("[Skor API] /subjects raw response:", data);
  const seen = new Set<string>();
  const out: SubjectWithTopics[] = [];
  for (const item of data?.subjects ?? []) {
    const name = (item?.subject ?? "").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const topics = Array.isArray(item?.topics)
      ? item!.topics!.map((t) => (typeof t === "string" ? t.trim() : "")).filter((t) => t.length > 0)
      : [];
    out.push({ subject: name, topics });
  }
  return out.filter((s) => s.subject.length > 0);
}


export type QuestionType = "mcq" | "short_answer" | "essay" | "listening";

export interface LessonKeyTerm {
  term: string;
  definition: string;
}

export interface LessonMindmapBranch {
  label: string;
  children?: string[];
}

export interface Lesson {
  id?: string;
  title?: string;
  summary?: string;
  notes_markdown?: string;
  key_terms?: LessonKeyTerm[];
  worked_example?: string;
  mindmap?: {
    root?: string;
    branches?: LessonMindmapBranch[];
  };
}

export interface SessionResponse {
  session_id?: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct?: string;
  topic?: string;
  subject?: string;
  media_url?: string;
  video_broll?: string;
  mnemonic_lyrics?: string[];
  question_type?: QuestionType;
  illustrative_notes?: string;
  audio_url?: string;
  passage?: string;
  lesson_id?: string;
  lesson?: Lesson | null;
  h5p_content?: Record<string, unknown> | null;
  question_data?: Record<string, unknown> | null;
}




export interface AnswerResponse {
  correct: boolean;
  correct_answer: string;
  feedback: string;
  misconception?: string;
  next_question?: SessionResponse;
  topic_complete?: boolean;
  next_topic?: string;
  partial_credit?: number;
  marks_awarded?: number;
  max_marks?: number;
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
  video_broll?: string;
  mnemonic_lyrics?: string[];
  question_type?: QuestionType;
  question_data?: {
    question?: string;
    options?: string[];
    correct_answer?: string;
    answer?: string;
    explanation?: string;
    question_type?: QuestionType;
    illustrative_notes?: string;
    audio_url?: string;
    passage?: string;
  };
  audio_url?: string;
  passage?: string;
  lesson_id?: string;
  lesson?: Lesson | null;
  draft?: {
    question?: string;
    options?: string[];
    correct_answer?: string;
    topic?: string;
    subject?: string;
    question_type?: QuestionType;
  };
}


async function postJSON<T>(path: string, body: unknown, bustCache: boolean = false): Promise<T> {
  const url = bustCache ? `${BASE_URL}${path}?t=${Date.now()}` : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
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

  const lyricsRaw = data.mnemonic_lyrics as unknown;
  const mnemonic_lyrics: string[] | undefined = Array.isArray(lyricsRaw)
    ? (lyricsRaw.filter((l) => typeof l === "string") as string[])
    : typeof lyricsRaw === "string" && lyricsRaw.trim().length > 0
      ? lyricsRaw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
      : undefined;

  return {
    session_id: data.session_id,
    question,
    options: normalizeOptions(
      data.options ?? data.question_data?.options ?? data.draft?.options,
    ),
    correct:
      data.correct ??
      data.question_data?.correct_answer ??
      data.question_data?.answer ??
      data.draft?.correct_answer,
    topic: data.topic ?? data.draft?.topic ?? topic,
    subject: data.subject ?? data.draft?.subject ?? subject,
    media_url: data.media_url,
    video_broll: data.video_broll,
    mnemonic_lyrics,
    question_type:
      data.question_type ?? data.question_data?.question_type ?? data.draft?.question_type ?? "mcq",
    illustrative_notes: data.question_data?.illustrative_notes,
    audio_url: data.audio_url ?? data.question_data?.audio_url,
    passage: data.passage ?? data.question_data?.passage,
    lesson_id: data.lesson_id,
    lesson: (data as { lesson?: Lesson | null }).lesson ?? null,
  };
}

export async function startSession(
  studentId: string,
  topic: string,
  curriculum: string,
  activeLanguage: string,
  subject: string,
  mock?: MockBundle,
  isAdaptive: boolean = false,
  questionType: QuestionType = "mcq",
  formLevel: number = 4,
): Promise<SessionResponse> {

  const safeStudentId =
    studentId && studentId !== "undefined"
      ? studentId
      : "00000000-0000-0000-0000-000000000001";
  const payload = {
    student_id: safeStudentId,
    topic: topic || "Kinematics",
    curriculum: curriculum || "KSSM",
    language: activeLanguage || "English",
    subject: subject || "Physics",
    is_adaptive: !!isAdaptive,
    question_type: questionType,
    form_level: formLevel,
  };

  if (!payload.topic || !payload.subject) {
    throw new Error("startSession: missing required fields");
  }
  try {
    const data = await postJSON<StartSessionApiResponse>("/start_session", payload, true);
    console.log("[Skor API] /start_session response:", data);

    return normalizeSessionResponse(data, topic, subject);
  } catch (err) {
    console.warn("[Skor API] startSession failed:", err);
    throw err;
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
  subject: string = "",
  sessionId?: string,
): Promise<AnswerResponse> {
  const safeStudentId =
    studentId && studentId !== "undefined"
      ? studentId
      : "00000000-0000-0000-0000-000000000001";
  const payload: Record<string, unknown> = {
    student_id: safeStudentId,
    topic: topic || "Kinematics",
    subject: subject || "",
    curriculum: curriculum ?? "",
    student_answer: studentAnswer ?? "",
    draft: draft ?? {},
    language: language || "English",
  };
  if (sessionId) payload.session_id = sessionId;
  try {
    return await postJSON<AnswerResponse>("/submit_answer", payload);
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

export interface ChatMessage {
  id?: string;
  role: "student" | "tutor";
  content: string;
  created_at?: string;
}

export interface ChatReply {
  reply: string;
  message?: ChatMessage;
}

export async function sendChatMessage(
  studentId: string,
  lessonId: string,
  message: string,
): Promise<ChatReply> {
  const safeStudentId =
    studentId && studentId !== "undefined"
      ? studentId
      : "00000000-0000-0000-0000-000000000001";
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: safeStudentId, lesson_id: lessonId, message }),
    cache: "no-store",
  });
  if (!res.ok) throw new ApiResponseError(res.status);
  const data = (await res.json()) as { reply?: string; message?: ChatMessage; content?: string };
  return { reply: data.reply ?? data.content ?? data.message?.content ?? "", message: data.message };
}

export async function fetchChatHistory(
  lessonId: string,
  studentId: string,
): Promise<ChatMessage[]> {
  const safeStudentId =
    studentId && studentId !== "undefined"
      ? studentId
      : "00000000-0000-0000-0000-000000000001";
  const res = await fetch(
    `${BASE_URL}/chat/history/${encodeURIComponent(lessonId)}/${encodeURIComponent(safeStudentId)}`,
    { method: "GET", cache: "no-store" },
  );
  if (!res.ok) throw new ApiResponseError(res.status);
  const data = (await res.json()) as { messages?: ChatMessage[] } | ChatMessage[];
  const list = Array.isArray(data) ? data : (data.messages ?? []);
  return list.filter((m) => m && typeof m.content === "string" && (m.role === "student" || m.role === "tutor"));
}

export async function generateLesson(
  topic: string,
  subject: string,
  language: string,
  formLevel: number = 4,
): Promise<Lesson> {
  const payload: Record<string, unknown> = {
    topic,
    subject,
    language,
    form_level: formLevel,
  };
  return postJSON<Lesson>("/generate_lesson", payload, true);
}


