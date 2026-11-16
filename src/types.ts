export type UserGrade = 'Elementary' | 'Middle School' | 'High School' | 'College' | 'University';

export type LearningMode = 'text' | 'voice' | 'video';

export interface UserProfile {
  userId: string;
  email: string;
  grade: UserGrade;
  subjects: string[];
  goals: string;
  learningMode: LearningMode;
  studyFrequency: string;
  streak: number;
  lastActivityDate?: string;
  totalLessons: number;
  recentTopics: { subject: string; topic: string; date: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  id: string;
  title: string;
  content: string; // Deprecated, but keeping for compatibility
  modules?: {
    type: 'theory' | 'example' | 'analogy' | 'key-takeaway' | 'socratic-question';
    title: string;
    content: string;
  }[];
  subject: string;
  grade: UserGrade;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  mode: LearningMode;
  status: 'pending' | 'completed';
  date: string;
  createdAt: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface Quiz {
  id: string;
  lessonId: string;
  type: 'daily' | 'weekly' | 'monthly' | 'lesson';
  questions: QuizQuestion[];
  score?: number;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface PerformanceRecord {
  subject: string;
  weakConcepts: string[];
  masteredConcepts: string[];
  averageScore: number;
  lastUpdated: string;
}

export const SUBJECTS = [
  'Math', 'Physics', 'Chemistry', 'Biology', 'English', 
  'Computer Science', 'History', 'Geography', 'Economics', 
  'Business', 'Language learning'
];
