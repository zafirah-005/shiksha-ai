const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    // Backend error handlers (app/main.py) return {"detail": "..."} JSON;
    // fall back to raw text for anything that doesn't (e.g. a proxy error
    // page) so a parse failure never hides the underlying problem.
    const raw = await res.text();
    let message = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.detail === "string") message = parsed.detail;
    } catch {
      // not JSON -- use raw text as-is
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function mediaUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export interface LessonSegment {
  id: string;
  title: string;
  objective: string;
  order: number;
}

export interface LessonPlan {
  topic: string;
  learner_level: string;
  grounded_in_document: boolean;
  segments: LessonSegment[];
}

export interface EquationSpec {
  latex: string;
  caption: string;
}

export interface DiagramSpec {
  mermaid_code: string;
  caption: string;
}

export interface CodeSpec {
  code: string;
  language: string;
  caption: string;
}

export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
}

export interface TimelineSpec {
  events: TimelineEvent[];
  caption: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface ChartSpec {
  data: ChartDataPoint[];
  x_label: string;
  y_label: string;
  caption: string;
}

export interface PhotoSpec {
  image_url: string;
  photographer: string;
  photographer_url: string;
  caption: string;
}

export interface VisualSpec {
  visual_type: "equation" | "diagram" | "code" | "timeline" | "chart" | "photo" | "none";
  equation: EquationSpec | null;
  diagram: DiagramSpec | null;
  code: CodeSpec | null;
  timeline: TimelineSpec | null;
  chart: ChartSpec | null;
  photo_query: string | null;
  photo: PhotoSpec | null;
}

export interface AvatarAsset {
  mode: string;
  video_url: string | null;
}

export interface Explanation {
  segment_id: string;
  explanation: string;
  key_points: string[];
  analogy_used: string;
  visual: VisualSpec;
  audio_url: string;
  avatar: AvatarAsset;
}

export interface QuizOption {
  text: string;
}

export interface QuizItem {
  segment_id: string;
  question_type: "mcq" | "short_answer";
  question: string;
  options: QuizOption[];
}

export interface EvaluationResult {
  correct: boolean;
  misconception_label: string | null;
  misconception_explanation: string | null;
  feedback: string;
  reaction_text: string;
  reaction_gesture: "positive" | "attentive" | "neutral";
}

export interface Adaptation {
  segment_id: string;
  targeted_misconception: string;
  new_analogy: string;
  reteach_explanation: string;
  audio_url: string;
  avatar: AvatarAsset;
}

export interface FurtherReadingLink {
  title: string;
  url: string;
  source_name: string;
}

export interface FinalReport {
  overall_score_percent: number;
  strong_areas: string[];
  weak_areas: string[];
  misconceptions_found: string[];
  recommended_next_topics: string[];
  summary: string;
  learner_id: string;
  further_reading: FurtherReadingLink[];
}

export interface LearnerHistoryEntry {
  id: number;
  topic: string;
  created_at: string;
  overall_score_percent: number;
  strong_areas: string[];
  weak_areas: string[];
  misconceptions_found: string[];
  recommended_next_topics: string[];
  summary: string;
}

export interface RecurringItem {
  item: string;
  count: number;
}

export interface LearnerProfile {
  learner_id: string;
  display_name: string;
  history: LearnerHistoryEntry[];
  recurring_weak_areas: RecurringItem[];
  recurring_misconceptions: RecurringItem[];
  latest_recommended_topics: string[];
}

// Mirrors the backend's own normalization (app/profile/store.py::_normalize_id)
// so a link built from a display name always resolves to the same learner.
export function normalizeLearnerId(identifier: string): string {
  return identifier.trim().toLowerCase().replace(/ /g, "-");
}

export interface CreateLessonResponse {
  lesson_id: string;
  plan: LessonPlan;
  current_segment: LessonSegment;
}

export interface ContinueResponse {
  done: boolean;
  current_segment: LessonSegment | null;
}

export interface GetLessonResponse {
  plan: LessonPlan;
  segment_index: number;
  current_segment: LessonSegment | null;
  done: boolean;
}

export async function uploadDocument(file: File): Promise<{ doc_path: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/upload`, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export function createLesson(body: {
  topic: string;
  learner_id: string;
  level: string;
  doc_path?: string | null;
  language?: string;
  time_minutes?: number | null;
}): Promise<CreateLessonResponse> {
  return request("/api/lessons", { method: "POST", body: JSON.stringify(body) });
}

export function getLearnerProfile(learnerId: string): Promise<LearnerProfile> {
  return request(`/api/learners/${learnerId}/profile`);
}

export function getLesson(lessonId: string): Promise<GetLessonResponse> {
  return request(`/api/lessons/${lessonId}`);
}

export function explainSegment(lessonId: string): Promise<Explanation> {
  return request(`/api/lessons/${lessonId}/explain`, { method: "POST" });
}

export function questionForSegment(lessonId: string): Promise<QuizItem> {
  return request(`/api/lessons/${lessonId}/question`, { method: "POST" });
}

export function evaluateAnswer(lessonId: string, answer: string): Promise<EvaluationResult> {
  return request(`/api/lessons/${lessonId}/evaluate`, {
    method: "POST",
    body: JSON.stringify({ answer }),
  });
}

export function adaptSegment(lessonId: string): Promise<Adaptation> {
  return request(`/api/lessons/${lessonId}/adapt`, { method: "POST" });
}

export function continueLesson(lessonId: string): Promise<ContinueResponse> {
  return request(`/api/lessons/${lessonId}/continue`, { method: "POST" });
}

export function getReport(lessonId: string): Promise<FinalReport> {
  return request(`/api/lessons/${lessonId}/report`);
}
