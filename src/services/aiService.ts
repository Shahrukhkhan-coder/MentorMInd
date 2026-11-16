import { UserGrade, Lesson, Quiz } from '../types';

async function postGemini<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data?.error || `Request failed with status ${res.status}`) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }

  return data as T;
}

export const aiService = {
  async generateLesson(
    subject: string,
    grade: UserGrade,
    mode: string,
    topic?: string,
    currentWeaknesses?: string[],
    goals?: string
  ): Promise<Partial<Lesson>> {
    return postGemini<Partial<Lesson>>('/api/gemini/lesson', {
      subject,
      grade,
      mode,
      topic,
      currentWeaknesses,
      goals,
    });
  },

  async generateQuiz(lesson: Lesson): Promise<Partial<Quiz>> {
    return postGemini<Partial<Quiz>>('/api/gemini/quiz', { lesson });
  },

  async generateReviewQuiz(
    grade: UserGrade,
    recentTopics: { subject: string; topic: string }[],
    type: 'daily' | 'weekly',
    goals?: string
  ): Promise<Partial<Quiz>> {
    return postGemini<Partial<Quiz>>('/api/gemini/review-quiz', {
      grade,
      recentTopics,
      type,
      goals,
    });
  },

  async analyzeWeaknesses(quiz: Quiz, responses: string[]): Promise<string[]> {
    const data = await postGemini<{ weakConcepts: string[] }>('/api/gemini/analyze-weaknesses', {
      quiz,
      responses,
    });
    return data.weakConcepts || [];
  },

  async generateQuickRelief(
    concept: string,
    subject: string,
    grade: UserGrade,
    goals?: string
  ): Promise<string> {
    const data = await postGemini<{ text: string }>('/api/gemini/quick-relief', {
      concept,
      subject,
      grade,
      goals,
    });
    return data.text || '';
  },

  async chatAboutConcept(
    concept: string,
    subject: string,
    message: string,
    history: { role: 'user' | 'assistant'; content: string }[],
    grade: UserGrade,
    goals?: string
  ): Promise<string> {
    const data = await postGemini<{ text: string }>('/api/gemini/chat', {
      concept,
      subject,
      message,
      history,
      grade,
      goals,
    });
    return data.text || '';
  },
};
