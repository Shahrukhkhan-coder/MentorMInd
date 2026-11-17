export type UserGrade = 'Elementary' | 'Middle School' | 'High School' | 'College' | 'University';

export type LearningMode = 'text' | 'voice' | 'video';

export type UserRole = 'student' | 'teacher' | 'admin';

export type TeacherStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  userId: string;
  email: string;
  displayName?: string;
  role?: UserRole;
  teacherStatus?: TeacherStatus;
  bio?: string;
  classCode?: string;
  teacherId?: string;
  savedPostIds?: string[];
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

export interface TeacherDirectoryEntry {
  teacherId: string;
  displayName: string;
  subjects: string[];
  bio: string;
  classCode: string;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentRecord {
  id: string;
  teacherId: string;
  studentId: string;
  studentName: string;
  studentGrade: UserGrade;
  studentSubjects: string[];
  teacherName: string;
  status: 'active' | 'inactive';
  streak: number;
  totalLessons: number;
  averageScore: number;
  weakConcepts: string[];
  masteredConcepts: string[];
  updatedAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail?: string;
  message: string;
  status: 'open' | 'closed';
  createdAt: string;
}

export interface FeedbackItem {
  id: string;
  userId: string;
  userEmail?: string;
  rating: number;
  feedback: string;
  createdAt: string;
}

export interface TeacherLesson {
  id: string;
  teacherId: string;
  teacherName: string;
  title: string;
  subject: string;
  grade: UserGrade;
  content: string;
  meetingUrl?: string;
  scheduledAt?: string;
  status: 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface TeacherDoubt {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  topic: string;
  question: string;
  reply?: string;
  status: 'open' | 'answered';
  createdAt: string;
  updatedAt: string;
}

export type CommunityPostType = 'note' | 'resource' | 'question';

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  postType: CommunityPostType;
  title: string;
  subject: string;
  grade: UserGrade;
  content: string;
  resourceUrl?: string;
  attachmentFileId?: string;
  attachmentName?: string;
  attachmentSize?: number;
  upvoterIds: string[];
  commentsCount: number;
  status: 'published' | 'hidden';
  createdAt: string;
  updatedAt: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
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
