import React, { useState } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Sidebar } from './components/Navigation';
import { Dashboard } from './views/Dashboard';
import { Onboarding } from './views/Onboarding';
import { Splash } from './views/Splash';
import { LessonView } from './views/LessonView';
import { QuizView } from './views/QuizView';
import { LessonsList } from './views/LessonsList';
import { ProgressView } from './views/ProgressView';
import { SettingsView } from './views/SettingsView';
import { DocumentationView } from './views/DocumentationView';
import { QuizzesView } from './views/QuizzesView';
import { Toaster } from 'sonner';
import { Lesson, Quiz } from './types';
import { dbService } from './services/dbService';

function AuthenticatedApp() {
  const { profile, user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);

  if (loading) return null;

  if (!user) {
    return <Splash />;
  }

  if (!profile) {
    return <Onboarding onComplete={() => setCurrentView('dashboard')} />;
  }

  const handleStartLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    setCurrentView('lesson');
  };

  const handleStartQuiz = async (quizId: string) => {
    // Try to find it in already fetched results or fetch by ID
    const quizzes = await dbService.getQuizzes(user.uid);
    let quiz = quizzes.find(q => q.id === quizId);
    
    if (!quiz) {
      // Direct fetch fallback
      const path = `users/${user.uid}/quizzes/${quizId}`;
      const snap = await dbService.getQuiz(user.uid, quizId);
      if (snap) quiz = snap;
    }

    if (quiz) {
      setActiveQuiz(quiz);
      setCurrentView('quiz');
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onStartLesson={handleStartLesson} onSetView={setCurrentView} />;
      case 'lessons':
        return <LessonsList onSelectLesson={handleStartLesson} />;
      case 'quizzes':
        return <QuizzesView onStartQuiz={handleStartQuiz} />;
      case 'quiz':
        return activeQuiz ? (
          <QuizView 
            quiz={activeQuiz} 
            onFinish={() => {
              setActiveQuiz(null);
              setCurrentView('dashboard');
            }} 
          />
        ) : null;
      case 'lesson':
        return activeLesson ? (
          <LessonView 
            lesson={activeLesson} 
            onBack={() => {
              setActiveLesson(null);
              setCurrentView('dashboard');
            }} 
            onStartQuiz={handleStartQuiz}
          />
        ) : null;
      case 'progress':
          return <ProgressView />;
      case 'switch-subjects':
        return <SettingsView subjectsOnly onBack={() => setCurrentView('dashboard')} />;
      case 'settings':
        return <SettingsView />;
      case 'help':
        return <DocumentationView />;
      default:
        return <Dashboard onStartLesson={handleStartLesson} onSetView={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar currentView={currentView} setView={setCurrentView} />
      <main className="flex-1 p-6 lg:ml-64 lg:p-12 pb-24">
        {renderView()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" richColors />
      <AuthenticatedApp />
    </AuthProvider>
  );
}
