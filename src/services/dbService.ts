import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/utils';
import { UserProfile, Lesson, Quiz, PerformanceRecord } from '../types';

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
        // Merge weak concepts, keeping it unique
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
        const updatedTopics = [newTopic, ...(profile.recentTopics || [])].slice(0, 50); // Keep last 50
        await updateDoc(doc(db, path), { recentTopics: updatedTopics });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async submitSupportTicket(userId: string, message: string): Promise<void> {
    const path = `users/${userId}/support_tickets`;
    try {
      // 1. Save to Database (Permanent Record)
      await addDoc(collection(db, path), {
        message,
        status: 'open',
        createdAt: new Date().toISOString()
      });

      // 2. Trigger Email Notification via Webhook (Non-blocking)
      const notifyWebhook = async () => {
        try {
          const webhookUrl = (import.meta as any).env.VITE_SUPPORT_WEBHOOK;
          if (webhookUrl && webhookUrl.startsWith('http')) {
            // Using URLSearchParams or plain text can help avoid CORS preflight (OPTIONS) 
            // which is often the cause of "Failed to fetch"
            await fetch(webhookUrl, {
              method: 'POST',
              mode: 'no-cors', // Bypasses most CORS errors if we don't need the response
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
          console.warn('Webhook notification attempted but failed (this is usually a CORS restriction). The data was still saved to the database.', notifyError);
        }
      };
      
      notifyWebhook();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async submitFeedback(userId: string, rating: number, feedback: string): Promise<void> {
    const path = `feedback`;
    try {
      await addDoc(collection(db, path), {
        userId,
        rating,
        feedback,
        createdAt: new Date().toISOString()
      });

      // 2. Notification hook (Non-blocking)
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
          console.warn('Feedback notification attempted but failed (CORS restriction). Data saved to Firestore.', notifyError);
        }
      };

      notifyFeedback();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};
