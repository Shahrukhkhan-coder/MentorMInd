import React, { useEffect, useState } from 'react';
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
import { TeacherDashboard } from './views/TeacherDashboard';
import { AdminDashboard } from './views/AdminDashboard';
import { TeacherLearningView } from './views/TeacherLearningView';
import { CommunityView } from './views/CommunityView';
import { Toaster } from 'sonner';
import { Lesson, Quiz } from './types';
import { dbService } from './services/dbService';

function AuthenticatedApp() {
  const { profile, user, loading, activePortal } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    if (activePortal === 'admin') {
      setCurrentView('admin-home');
    } else if (activePortal === 'teacher') {
      setCurrentView('teacher-home');
    } else {
      setCurrentView('dashboard');
    }
  }, [activePortal]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <Splash />;
  }

  if (!profile) {
    return <Onboarding onComplete={() => setCurrentView(activePortal === 'admin' ? 'admin-home' : activePortal === 'teacher' ? 'teacher-home' : 'dashboard')} />;
  }

  const handleStartLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    setCurrentView('lesson');
  };

  const handleStartQuiz = async (quizId: string) => {
    const quizzes = await dbService.getQuizzes(user.uid);
    let quiz = quizzes.find(q => q.id === quizId);
    
    if (!quiz) {
      const snap = await dbService.getQuiz(user.uid, quizId);
      if (snap) quiz = snap;
    }

    if (quiz) {
      setActiveQuiz(quiz);
      setCurrentView('quiz');
    }
  };

  const renderView = () => {
    if (currentView === 'community') return <CommunityView />;
    if (currentView === 'settings') return <SettingsView />;
    if (currentView === 'help') return <DocumentationView />;

    if (activePortal === 'admin') {
      return <AdminDashboard />;
    }

    if (activePortal === 'teacher') {
      return <TeacherDashboard />;
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard onStartLesson={handleStartLesson} onSetView={setCurrentView} />;
      case 'teacher-class':
        return <TeacherLearningView onSwitchToAI={() => setCurrentView('dashboard')} />;
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
