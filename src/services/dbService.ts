import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  orderBy, 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/utils';
import {
  UserProfile,
  Lesson,
  Quiz,
  PerformanceRecord,
  TeacherDirectoryEntry,
  EnrollmentRecord,
  UserRole,
  TeacherStatus,
  SupportTicket,
  FeedbackItem,
  TeacherLesson,
  TeacherDoubt,
  CommunityPost,
  CommunityPostType,
  CommunityComment,
} from '../types';

function generateClassCode(seed: string): string {
  const clean = seed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const suffix = (clean.slice(0, 4) || 'MIND').padEnd(4, 'X');
  const num = Math.floor(10 + Math.random() * 89);
  return `MM-${suffix}${num}`;
}

export const dbService = {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const path = `users/${userId}`;
    try {
      const docSnap = await getDoc(doc(db, path));
      return docSnap.exists() ? docSnap.data() as UserProfile : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async createUserProfile(profile: UserProfile): Promise<void> {
    const path = `users/${profile.userId}`;
    try {
      await setDoc(doc(db, path), profile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, path), { ...updates, updatedAt: new Date().toISOString() });
      if (updates.streak !== undefined || updates.totalLessons !== undefined || updates.grade || updates.subjects || updates.displayName) {
        this.syncEnrollmentProgress(userId).catch((e) => console.warn('Enrollment sync skipped:', e));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async getLessons(userId: string): Promise<Lesson[]> {
    const path = `users/${userId}/lessons`;
    try {
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lesson));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async addLesson(userId: string, lesson: Partial<Lesson>): Promise<string> {
    const path = `users/${userId}/lessons`;
    try {
      const docRef = await addDoc(collection(db, path), lesson);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      return '';
    }
  },

  async updateLesson(userId: string, lessonId: string, status: 'pending' | 'completed'): Promise<void> {
    const path = `users/${userId}/lessons/${lessonId}`;
    try {
      await updateDoc(doc(db, path), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async getQuizzes(userId: string): Promise<Quiz[]> {
    const path = `users/${userId}/quizzes`;
    try {
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async addQuiz(userId: string, quiz: Partial<Quiz>): Promise<string> {
    const path = `users/${userId}/quizzes`;
    try {
      const docRef = await addDoc(collection(db, path), quiz);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      return '';
    }
  },

  async getQuiz(userId: string, quizId: string): Promise<Quiz | null> {
    const path = `users/${userId}/quizzes/${quizId}`;
    try {
      const docSnap = await getDoc(doc(db, path));
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Quiz : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async completeQuiz(userId: string, quizId: string, score: number): Promise<void> {
    const path = `users/${userId}/quizzes/${quizId}`;
    try {
      await updateDoc(doc(db, path), { 
        score, 
        completed: true, 
        completedAt: new Date().toISOString() 
      });
      this.syncEnrollmentProgress(userId).catch((e) => console.warn('Enrollment sync skipped:', e));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async getPerformance(userId: string): Promise<PerformanceRecord[]> {
    const path = `users/${userId}/performance`;
    try {
      const q = query(collection(db, path));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as PerformanceRecord);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async updatePerformance(userId: string, subject: string, weakConcepts: string[]): Promise<void> {
    const path = `users/${userId}/performance/${subject}`;
    try {
      const docRef = doc(db, path);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const existing = docSnap.data() as PerformanceRecord;
        const mergedWeak = Array.from(new Set([...existing.weakConcepts, ...weakConcepts]));
        await updateDoc(docRef, { 
          weakConcepts: mergedWeak, 
          lastUpdated: new Date().toISOString() 
        });
      } else {
        await setDoc(docRef, {
          subject,
          weakConcepts,
          masteredConcepts: [],
          averageScore: 0,
          lastUpdated: new Date().toISOString()
        });
      }
      this.syncEnrollmentProgress(userId).catch((e) => console.warn('Enrollment sync skipped:', e));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async markConceptMastered(userId: string, subject: string, concept: string): Promise<void> {
    const path = `users/${userId}/performance/${subject}`;
    try {
      const docRef = doc(db, path);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as PerformanceRecord;
        const newWeak = data.weakConcepts.filter(c => c !== concept);
        const newMastered = Array.from(new Set([...data.masteredConcepts, concept]));
        await updateDoc(docRef, {
          weakConcepts: newWeak,
          masteredConcepts: newMastered,
          lastUpdated: new Date().toISOString()
        });
      } else {
        await setDoc(docRef, {
          subject,
          weakConcepts: [],
          masteredConcepts: [concept],
          averageScore: 0,
          lastUpdated: new Date().toISOString()
        });
      }
      this.syncEnrollmentProgress(userId).catch((e) => console.warn('Enrollment sync skipped:', e));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async removeWeakness(userId: string, subject: string, concept: string): Promise<void> {
    await this.markConceptMastered(userId, subject, concept);
  },

  async recordTopicSearch(userId: string, subject: string, topic: string): Promise<void> {
    const path = `users/${userId}`;
    try {
      const profile = await this.getUserProfile(userId);
      if (profile) {
        const newTopic = { subject, topic, date: new Date().toISOString() };
        const updatedTopics = [newTopic, ...(profile.recentTopics || [])].slice(0, 50);
        await updateDoc(doc(db, path), { recentTopics: updatedTopics, updatedAt: new Date().toISOString() });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async submitSupportTicket(userId: string, message: string): Promise<void> {
    const userPath = `users/${userId}/support_tickets`;
    const globalPath = `support_tickets`;
    const createdAt = new Date().toISOString();
    try {
      await addDoc(collection(db, userPath), {
        message,
        status: 'open',
        createdAt
      });

      await addDoc(collection(db, globalPath), {
        userId,
        userEmail: auth.currentUser?.email || '',
        message,
        status: 'open',
        createdAt
      });

      const notifyWebhook = async () => {
        try {
          const webhookUrl = (import.meta as any).env.VITE_SUPPORT_WEBHOOK;
          if (webhookUrl && webhookUrl.startsWith('http')) {
            await fetch(webhookUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                to: 'shah.rukh1122112211@gmail.com',
                subject: 'New Student Query',
                studentId: userId,
                message: message,
                timestamp: new Date().toLocaleString()
              }).toString()
            });
          }
        } catch (notifyError) {
          console.warn('Webhook notification attempted but failed.', notifyError);
        }
      };
      
      notifyWebhook();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, globalPath);
    }
  },

  async submitFeedback(userId: string, rating: number, feedback: string): Promise<void> {
    const path = `feedback`;
    try {
      await addDoc(collection(db, path), {
        userId,
        userEmail: auth.currentUser?.email || '',
        rating,
        feedback,
        createdAt: new Date().toISOString()
      });

      const notifyFeedback = async () => {
        try {
          const webhookUrl = (import.meta as any).env.VITE_SUPPORT_WEBHOOK;
          if (webhookUrl && webhookUrl.startsWith('http')) {
            await fetch(webhookUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                to: 'shah.rukh1122112211@gmail.com',
                subject: 'New App Feedback',
                studentId: userId,
                rating: `${rating}/5`,
                message: feedback,
                timestamp: new Date().toLocaleString()
              }).toString()
            });
          }
        } catch (notifyError) {
          console.warn('Feedback notification attempted but failed.', notifyError);
        }
      };

      notifyFeedback();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // --- Teacher Directory & Enrollment (Phase 1) ---
  async getApprovedTeachers(): Promise<TeacherDirectoryEntry[]> {
    const path = `teacher_directory`;
    try {
      const q = query(collection(db, path), where('approved', '==', true));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as TeacherDirectoryEntry);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getTeacherDirectoryEntry(teacherId: string): Promise<TeacherDirectoryEntry | null> {
    const path = `teacher_directory/${teacherId}`;
    try {
      const snap = await getDoc(doc(db, path));
      return snap.exists() ? (snap.data() as TeacherDirectoryEntry) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async updateTeacherDirectoryProfile(teacherId: string, updates: { displayName: string; subjects: string[]; bio: string }): Promise<void> {
    const path = `teacher_directory/${teacherId}`;
    try {
      await updateDoc(doc(db, path), {
        displayName: updates.displayName,
        subjects: updates.subjects,
        bio: updates.bio,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async findTeacherByClassCode(code: string): Promise<TeacherDirectoryEntry | null> {
    const path = `teacher_directory`;
    try {
      const normalized = code.trim().toUpperCase();
      const q = query(
        collection(db, path),
        where('approved', '==', true),
        where('classCode', '==', normalized)
      );
      const snap = await getDocs(q);
      return snap.empty ? null : (snap.docs[0].data() as TeacherDirectoryEntry);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return null;
    }
  },

  async getStudentEnrollments(studentId: string): Promise<EnrollmentRecord[]> {
    const path = `enrollments`;
    try {
      const q = query(collection(db, path), where('studentId', '==', studentId));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as EnrollmentRecord);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getTeacherStudents(teacherId: string): Promise<EnrollmentRecord[]> {
    const path = `enrollments`;
    try {
      const q = query(collection(db, path), where('teacherId', '==', teacherId));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as EnrollmentRecord).filter(e => e.status === 'active');
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async enrollWithTeacher(student: UserProfile, teacher: TeacherDirectoryEntry): Promise<EnrollmentRecord> {
    const enrollmentId = `${teacher.teacherId}_${student.userId}`;
    const path = `enrollments/${enrollmentId}`;
    try {
      // Remove any previous active enrollment if switching teachers
      if (student.teacherId && student.teacherId !== teacher.teacherId) {
        const oldId = `${student.teacherId}_${student.userId}`;
        await deleteDoc(doc(db, `enrollments/${oldId}`)).catch(() => {});
      }

      const [quizzes, perf] = await Promise.all([
        this.getQuizzes(student.userId),
        this.getPerformance(student.userId),
      ]);

      const completedQuizzes = quizzes.filter(q => q.completed);
      const averageScore = completedQuizzes.length > 0
        ? Math.round(completedQuizzes.reduce((acc, q) => acc + (q.score || 0), 0) / completedQuizzes.length)
        : 0;
      const weakConcepts: string[] = Array.from(new Set<string>(perf.flatMap(p => p.weakConcepts || []))).slice(0, 100);
      const masteredConcepts: string[] = Array.from(new Set<string>(perf.flatMap(p => p.masteredConcepts || []))).slice(0, 100);

      const record: EnrollmentRecord = {
        id: enrollmentId,
        teacherId: teacher.teacherId,
        studentId: student.userId,
        studentName: student.displayName || auth.currentUser?.displayName || student.email.split('@')[0],
        studentGrade: student.grade,
        studentSubjects: student.subjects || [],
        teacherName: teacher.displayName,
        status: 'active',
        streak: student.streak || 0,
        totalLessons: student.totalLessons || 0,
        averageScore,
        weakConcepts,
        masteredConcepts,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, path), record);
      await updateDoc(doc(db, `users/${student.userId}`), {
        teacherId: teacher.teacherId,
        updatedAt: new Date().toISOString(),
      });
      return record;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  async leaveTeacher(studentId: string, teacherId: string): Promise<void> {
    const enrollmentId = `${teacherId}_${studentId}`;
    const path = `enrollments/${enrollmentId}`;
    try {
      await deleteDoc(doc(db, path));
      await updateDoc(doc(db, `users/${studentId}`), {
        teacherId: '',
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async syncEnrollmentProgress(studentId: string): Promise<void> {
    const profile = await this.getUserProfile(studentId);
    if (!profile?.teacherId) return;

    const enrollmentId = `${profile.teacherId}_${studentId}`;
    const path = `enrollments/${enrollmentId}`;
    const existingSnap = await getDoc(doc(db, path));
    if (!existingSnap.exists()) return;

    const [quizzes, perf] = await Promise.all([
      this.getQuizzes(studentId),
      this.getPerformance(studentId),
    ]);

    const completedQuizzes = quizzes.filter(q => q.completed);
    const averageScore = completedQuizzes.length > 0
      ? Math.round(completedQuizzes.reduce((acc, q) => acc + (q.score || 0), 0) / completedQuizzes.length)
      : 0;
    const weakConcepts: string[] = Array.from(new Set<string>(perf.flatMap(p => p.weakConcepts || []))).slice(0, 100);
    const masteredConcepts: string[] = Array.from(new Set<string>(perf.flatMap(p => p.masteredConcepts || []))).slice(0, 100);

    await updateDoc(doc(db, path), {
      studentName: profile.displayName || auth.currentUser?.displayName || profile.email.split('@')[0],
      studentGrade: profile.grade,
      studentSubjects: profile.subjects || [],
      streak: profile.streak || 0,
      totalLessons: profile.totalLessons || 0,
      averageScore,
      weakConcepts,
      masteredConcepts,
      updatedAt: new Date().toISOString(),
    });
  },

  // --- Admin Portal Operations (Phase 1) ---
  async getAllUsers(): Promise<UserProfile[]> {
    const path = `users`;
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map(d => d.data() as UserProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async adminUpdateUserRole(
    targetUser: UserProfile,
    role: UserRole,
    teacherStatus?: TeacherStatus
  ): Promise<void> {
    const path = `users/${targetUser.userId}`;
    const now = new Date().toISOString();
    try {
      let classCode = targetUser.classCode || '';
      if (role === 'teacher' && teacherStatus === 'approved' && !classCode) {
        classCode = generateClassCode(targetUser.displayName || targetUser.email);
      }

      await updateDoc(doc(db, path), {
        role,
        ...(teacherStatus ? { teacherStatus } : {}),
        ...(classCode ? { classCode } : {}),
        updatedAt: now,
      });

      const dirRef = doc(db, `teacher_directory/${targetUser.userId}`);
      if (role === 'teacher' && teacherStatus === 'approved') {
        const existingDir = await getDoc(dirRef);
        await setDoc(dirRef, {
          teacherId: targetUser.userId,
          displayName: targetUser.displayName || targetUser.email.split('@')[0],
          subjects: targetUser.subjects?.length ? targetUser.subjects : ['Math'],
          bio: targetUser.bio || 'MentorMind Educator',
          classCode,
          approved: true,
          createdAt: existingDir.exists() ? (existingDir.data().createdAt || now) : now,
          updatedAt: now,
        });
      } else {
        const existingDir = await getDoc(dirRef);
        if (existingDir.exists()) {
          await updateDoc(dirRef, { approved: false, updatedAt: now });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async adminAssignStudentToTeacher(student: UserProfile, teacher: TeacherDirectoryEntry): Promise<void> {
    await this.enrollWithTeacher(student, teacher);
  },

  async getAllSupportTickets(): Promise<SupportTicket[]> {
    const path = `support_tickets`;
    try {
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportTicket));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async updateSupportTicketStatus(ticketId: string, status: 'open' | 'closed'): Promise<void> {
    const path = `support_tickets/${ticketId}`;
    try {
      await updateDoc(doc(db, path), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async getAllFeedback(): Promise<FeedbackItem[]> {
    const path = `feedback`;
    try {
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as FeedbackItem));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // --- Phase 2: Teacher Lessons & Direct Teacher Doubts ---
  async createTeacherLesson(input: {
    teacherId: string;
    teacherName: string;
    title: string;
    subject: string;
    grade: UserProfile['grade'];
    content: string;
    meetingUrl?: string;
    scheduledAt?: string;
  }): Promise<TeacherLesson> {
    const colRef = collection(db, 'teacher_lessons');
    const docRef = doc(colRef);
    const now = new Date().toISOString();
    const record: TeacherLesson = {
      id: docRef.id,
      teacherId: input.teacherId,
      teacherName: input.teacherName,
      title: input.title.trim(),
      subject: input.subject,
      grade: input.grade,
      content: input.content,
      ...(input.meetingUrl?.trim() ? { meetingUrl: input.meetingUrl.trim() } : {}),
      ...(input.scheduledAt?.trim() ? { scheduledAt: input.scheduledAt.trim() } : {}),
      status: 'published',
      createdAt: now,
      updatedAt: now,
    };
    try {
      await setDoc(docRef, record);
      return record;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `teacher_lessons/${docRef.id}`);
      throw error;
    }
  },

  async getTeacherLessonsByTeacher(teacherId: string): Promise<TeacherLesson[]> {
    const path = `teacher_lessons`;
    try {
      const q = query(collection(db, path), where('teacherId', '==', teacherId));
      const snap = await getDocs(q);
      return snap.docs
        .map(d => d.data() as TeacherLesson)
        .filter(l => l.status === 'published')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async deleteTeacherLesson(lessonId: string): Promise<void> {
    const path = `teacher_lessons/${lessonId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async createTeacherDoubt(input: {
    studentId: string;
    studentName: string;
    teacherId: string;
    teacherName: string;
    subject: string;
    topic: string;
    question: string;
  }): Promise<TeacherDoubt> {
    const colRef = collection(db, 'teacher_doubts');
    const docRef = doc(colRef);
    const now = new Date().toISOString();
    const record: TeacherDoubt = {
      id: docRef.id,
      studentId: input.studentId,
      studentName: input.studentName,
      teacherId: input.teacherId,
      teacherName: input.teacherName,
      subject: input.subject,
      topic: input.topic.trim(),
      question: input.question.trim(),
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };
    try {
      await setDoc(docRef, record);
      return record;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `teacher_doubts/${docRef.id}`);
      throw error;
    }
  },

  async getStudentDoubts(studentId: string): Promise<TeacherDoubt[]> {
    const path = `teacher_doubts`;
    try {
      const q = query(collection(db, path), where('studentId', '==', studentId));
      const snap = await getDocs(q);
      return snap.docs
        .map(d => d.data() as TeacherDoubt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getTeacherDoubts(teacherId: string): Promise<TeacherDoubt[]> {
    const path = `teacher_doubts`;
    try {
      const q = query(collection(db, path), where('teacherId', '==', teacherId));
      const snap = await getDocs(q);
      return snap.docs
        .map(d => d.data() as TeacherDoubt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async replyToTeacherDoubt(doubtId: string, reply: string): Promise<void> {
    const path = `teacher_doubts/${doubtId}`;
    try {
      await updateDoc(doc(db, path), {
        reply: reply.trim(),
        status: 'answered',
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async completeTeacherLessonForStudent(student: UserProfile, teacherLesson: TeacherLesson): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const lessonRecord: Partial<Lesson> = {
      title: `${teacherLesson.title} (Teacher: ${teacherLesson.teacherName})`,
      content: teacherLesson.content,
      subject: teacherLesson.subject,
      grade: teacherLesson.grade,
      difficulty: 'Medium',
      mode: 'text',
      status: 'completed',
      date: today,
      createdAt: new Date().toISOString(),
    };

    await this.addLesson(student.userId, lessonRecord);
    await this.markConceptMastered(student.userId, teacherLesson.subject, teacherLesson.title);

    let newStreak = student.streak || 0;
    if (!student.lastActivityDate) {
      newStreak = 1;
    } else {
      const diffDays = Math.ceil(
        Math.abs(new Date(today).getTime() - new Date(student.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === 1) newStreak += 1;
      else if (diffDays > 1) newStreak = 1;
    }

    await this.updateUserProfile(student.userId, {
      totalLessons: (student.totalLessons || 0) + 1,
      streak: newStreak,
      lastActivityDate: today,
    });
  },

  // --- Phase 3: Community Knowledge & Resource Sharing ---
  async uploadCommunityPdf(
    uploaderId: string,
    file: File
  ): Promise<{ attachmentFileId: string; attachmentName: string; attachmentSize: number }> {
    const MAX_BYTES = 3670016; // ~3.5 MB
    const CHUNK_CHAR_LIMIT = 600000;

    if (file.size <= 0 || file.size > MAX_BYTES) {
      throw new Error('PDF file must be under 3.5 MB.');
    }
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      throw new Error('Only PDF files are supported.');
    }

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const sliceSize = 8192;
    for (let i = 0; i < bytes.length; i += sliceSize) {
      const slice = bytes.subarray(i, i + sliceSize);
      binary += String.fromCharCode(...slice);
    }
    const base64 = btoa(binary);

    const chunks: string[] = [];
    for (let i = 0; i < base64.length; i += CHUNK_CHAR_LIMIT) {
      chunks.push(base64.slice(i, i + CHUNK_CHAR_LIMIT));
    }
    if (chunks.length < 1 || chunks.length > 8) {
      throw new Error('PDF exceeds maximum allowed storage chunks.');
    }

    const fileColRef = collection(db, 'community_files');
    const fileDocRef = doc(fileColRef);
    const now = new Date().toISOString();
    const cleanName = (file.name || 'study-material.pdf').trim().slice(0, 200);

    try {
      await setDoc(fileDocRef, {
        id: fileDocRef.id,
        uploaderId,
        fileName: cleanName,
        mimeType: 'application/pdf',
        sizeBytes: file.size,
        chunkCount: chunks.length,
        createdAt: now,
      });

      await Promise.all(
        chunks.map((data, index) =>
          setDoc(doc(db, `community_files/${fileDocRef.id}/chunks/${index}`), {
            fileId: fileDocRef.id,
            index,
            data,
          })
        )
      );

      return {
        attachmentFileId: fileDocRef.id,
        attachmentName: cleanName,
        attachmentSize: file.size,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `community_files/${fileDocRef.id}`);
      throw error;
    }
  },

  async downloadCommunityPdfBlobUrl(fileId: string): Promise<{ url: string; fileName: string }> {
    const metaPath = `community_files/${fileId}`;
    try {
      const metaSnap = await getDoc(doc(db, metaPath));
      if (!metaSnap.exists()) {
        throw new Error('PDF attachment not found.');
      }
      const meta = metaSnap.data() as { fileName: string; chunkCount: number };
      const chunkSnaps = await Promise.all(
        Array.from({ length: meta.chunkCount }, (_, idx) =>
          getDoc(doc(db, `community_files/${fileId}/chunks/${idx}`))
        )
      );

      const base64 = chunkSnaps.map((s) => (s.exists() ? (s.data().data as string) : '')).join('');
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'application/pdf' });
      return {
        url: URL.createObjectURL(blob),
        fileName: meta.fileName || 'study-material.pdf',
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, metaPath);
      throw error;
    }
  },

  async createCommunityPost(input: {
    authorId: string;
    authorName: string;
    authorRole: UserRole;
    postType: CommunityPostType;
    title: string;
    subject: string;
    grade: UserProfile['grade'];
    content: string;
    resourceUrl?: string;
    attachmentFileId?: string;
    attachmentName?: string;
    attachmentSize?: number;
  }): Promise<CommunityPost> {
    const colRef = collection(db, 'community_posts');
    const docRef = doc(colRef);
    const now = new Date().toISOString();
    const cleanUrl = input.resourceUrl?.trim().slice(0, 500);
    const record: CommunityPost = {
      id: docRef.id,
      authorId: input.authorId,
      authorName: (input.authorName || 'Learner').trim().slice(0, 120),
      authorRole: input.authorRole,
      postType: input.postType,
      title: input.title.trim().slice(0, 200),
      subject: input.subject.slice(0, 100),
      grade: input.grade,
      content: input.content.trim().slice(0, 20000),
      ...(cleanUrl ? { resourceUrl: cleanUrl } : {}),
      ...(input.attachmentFileId ? { attachmentFileId: input.attachmentFileId } : {}),
      ...(input.attachmentName ? { attachmentName: input.attachmentName.slice(0, 200) } : {}),
      ...(typeof input.attachmentSize === 'number' && input.attachmentSize > 0
        ? { attachmentSize: input.attachmentSize }
        : {}),
      upvoterIds: [],
      commentsCount: 0,
      status: 'published',
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(docRef, record);
      return record;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `community_posts/${docRef.id}`);
      throw error;
    }
  },

  async getCommunityPosts(includeHidden = false): Promise<CommunityPost[]> {
    const path = 'community_posts';
    try {
      const q = includeHidden
        ? query(collection(db, path))
        : query(collection(db, path), where('status', '==', 'published'));
      const snap = await getDocs(q);
      return snap.docs
        .map(d => d.data() as CommunityPost)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async toggleCommunityUpvote(postId: string, userId: string, currentUpvoters: string[]): Promise<string[]> {
    const path = `community_posts/${postId}`;
    const hasUpvoted = currentUpvoters.includes(userId);
    const nextUpvoters = hasUpvoted
      ? currentUpvoters.filter(id => id !== userId)
      : [...currentUpvoters, userId].slice(0, 500);
    try {
      await updateDoc(doc(db, path), {
        upvoterIds: nextUpvoters,
        updatedAt: new Date().toISOString(),
      });
      return nextUpvoters;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      return currentUpvoters;
    }
  },

  async getCommunityComments(postId: string): Promise<CommunityComment[]> {
    const path = `community_posts/${postId}/comments`;
    try {
      const q = query(collection(db, path), where('postId', '==', postId));
      const snap = await getDocs(q);
      return snap.docs
        .map(d => d.data() as CommunityComment)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async addCommunityComment(
    postId: string,
    input: {
      authorId: string;
      authorName: string;
      authorRole: UserRole;
      content: string;
    },
    currentCount: number
  ): Promise<CommunityComment> {
    const colRef = collection(db, `community_posts/${postId}/comments`);
    const docRef = doc(colRef);
    const now = new Date().toISOString();
    const record: CommunityComment = {
      id: docRef.id,
      postId,
      authorId: input.authorId,
      authorName: (input.authorName || 'Learner').trim().slice(0, 120),
      authorRole: input.authorRole,
      content: input.content.trim().slice(0, 3000),
      createdAt: now,
    };

    try {
      await setDoc(docRef, record);
      await updateDoc(doc(db, `community_posts/${postId}`), {
        commentsCount: currentCount + 1,
        updatedAt: now,
      });
      return record;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `community_posts/${postId}/comments/${docRef.id}`);
      throw error;
    }
  },

  async deleteCommunityComment(postId: string, commentId: string, currentCount: number): Promise<void> {
    const path = `community_posts/${postId}/comments/${commentId}`;
    try {
      await deleteDoc(doc(db, path));
      await updateDoc(doc(db, `community_posts/${postId}`), {
        commentsCount: Math.max(0, currentCount - 1),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async adminUpdateCommunityPostStatus(postId: string, status: 'published' | 'hidden'): Promise<void> {
    const path = `community_posts/${postId}`;
    try {
      await updateDoc(doc(db, path), {
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteCommunityPost(postId: string, attachmentFileId?: string): Promise<void> {
    const path = `community_posts/${postId}`;
    try {
      if (attachmentFileId) {
        const metaRef = doc(db, `community_files/${attachmentFileId}`);
        const metaSnap = await getDoc(metaRef);
        if (metaSnap.exists()) {
          const chunkCount = (metaSnap.data().chunkCount as number) || 0;
          await Promise.all(
            Array.from({ length: chunkCount }, (_, idx) =>
              deleteDoc(doc(db, `community_files/${attachmentFileId}/chunks/${idx}`)).catch(() => {})
            )
          );
          await deleteDoc(metaRef).catch(() => {});
        }
      }
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async toggleSaveCommunityPost(userId: string, postId: string, currentSaved: string[]): Promise<string[]> {
    const isSaved = currentSaved.includes(postId);
    const nextSaved = isSaved
      ? currentSaved.filter(id => id !== postId)
      : [postId, ...currentSaved].slice(0, 100);
    await this.updateUserProfile(userId, { savedPostIds: nextSaved });
    return nextSaved;
  },
};
