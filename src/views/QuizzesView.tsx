import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { dbService } from '../services/dbService';
import { aiService } from '../services/aiService';
import { Quiz, UserProfile } from '../types';
import { 
  Zap, 
  Calendar, 
  Brain, 
  BookOpen,
  History, 
  CheckCircle2, 
  Clock,
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';

interface QuizzesViewProps {
  onStartQuiz: (quizId: string) => void;
}

export function QuizzesView({ onStartQuiz }: QuizzesViewProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [hasDailyToday, setHasDailyToday] = useState(false);

  useEffect(() => {
    if (user) {
      fetchQuizzes();
    }
  }, [user]);

  const fetchQuizzes = async () => {
    if (!user) return;
    try {
      const data = await dbService.getQuizzes(user.uid);
      setQuizzes(data);
      
      // Check if daily quiz exists for today
      const today = new Date().toISOString().split('T')[0];
      const dailyToday = data.find(q => q.type === 'daily' && q.createdAt.startsWith(today));
      setHasDailyToday(!!dailyToday);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateQuiz = async (type: 'daily' | 'weekly') => {
    if (!user || !profile) return;
    
    const recentTopics = profile.recentTopics || [];
    if (recentTopics.length === 0) {
      toast.error("Finish a few lessons first so I can generate a quiz based on your learning history!");
      return;
    }

    setGenerating(type);
    try {
      // For daily, take topics from the last 24h or last 5 topics
      // For weekly, take topics from last 7 days or last 20 topics
      const topicsToUse = type === 'daily' 
        ? recentTopics.slice(0, 5) 
        : recentTopics.slice(0, 15);

      const quizData = await aiService.generateReviewQuiz(profile.grade, topicsToUse, type, profile.goals);
      const quizId = await dbService.addQuiz(user.uid, quizData);
      
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} Quiz generated!`);
      onStartQuiz(quizId);
    } catch (err: any) {
      const errorMessage = err?.message?.toLowerCase() || '';
      if (err?.status === 429 || errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('exhausted') || errorMessage.includes('rate limit')) {
        toast.error('AI quota limit reached. Please wait a moment or check your API key billing in Settings > Secrets.');
      } else if (err?.status === 403 || err?.status === 400 || errorMessage.includes('api_key') || errorMessage.includes('permission_denied')) {
        toast.error('Please check your Gemini API key in Settings > Secrets.');
      } else {
        toast.error("Failed to generate quiz. Please check your connection.");
      }
      console.error(err);
    } finally {
      setGenerating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const completedQuizzes = quizzes.filter(q => q.completed);
  const averageScore = completedQuizzes.length > 0 
    ? Math.round(completedQuizzes.reduce((acc, q) => acc + (q.score || 0), 0) / completedQuizzes.length)
    : 0;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Assessments</h1>
        <p className="text-slate-500 text-lg">Test your knowledge and track your mastery.</p>
      </div>

      {/* Stats Mini Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <Award size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg. Score</p>
            <p className="text-2xl font-black text-slate-900">{averageScore}%</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-black text-slate-900">{completedQuizzes.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mastery</p>
            <p className="text-2xl font-black text-slate-900">Level 4</p>
          </div>
        </div>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Quiz Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Zap size={140} className="fill-current" />
          </div>
          <div className="relative z-10">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
              <Zap size={28} />
            </div>
            <h3 className="text-2xl font-black mb-2">Daily Assessment</h3>
            <p className="text-indigo-100 mb-8 max-w-sm">
              A quick 5-question mix of everything you've learned in the last 24 hours.
            </p>
            
            {hasDailyToday ? (
              <div className="flex items-center gap-2 text-indigo-200 font-bold bg-white/10 w-fit px-4 py-2 rounded-full">
                <CheckCircle2 size={20} />
                Completed for today
              </div>
            ) : (
              <button 
                onClick={() => generateQuiz('daily')}
                disabled={!!generating}
                className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                {generating === 'daily' ? 'Generating...' : 'Start Assessment'}
                <ArrowRight size={20} />
              </button>
            )}
          </div>
        </motion.div>

        {/* Weekly Quiz Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-200 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Calendar size={140} />
          </div>
          <div className="relative z-10">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
              <Calendar size={28} />
            </div>
            <h3 className="text-2xl font-black mb-2">Weekly Mastery Review</h3>
            <p className="text-slate-400 mb-8 max-w-sm">
              Comprehensive 10-question review of all subjects studied this week. 
            </p>
            
            <button 
              onClick={() => generateQuiz('weekly')}
              disabled={!!generating}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-indigo-500 transition-all disabled:opacity-50"
            >
               {generating === 'weekly' ? 'Generating...' : 'Start Weekly Review'}
              <ArrowRight size={20} />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Quiz History */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
              <History size={20} />
            </div>
            <h3 className="text-xl font-black text-slate-900">Quiz History</h3>
          </div>
        </div>
        
        <div className="divide-y divide-slate-50">
          {quizzes.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Brain size={32} />
              </div>
              <p className="text-slate-400 font-medium">No assessments completed yet.</p>
            </div>
          ) : (
            quizzes.map((quiz) => (
              <div key={quiz.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    quiz.type === 'daily' ? 'bg-indigo-50 text-indigo-600' : 
                    quiz.type === 'lesson' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {quiz.type === 'daily' ? <Zap size={24} /> : quiz.type === 'lesson' ? <BookOpen size={24} /> : <Calendar size={24} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 leading-tight">
                      {quiz.type.charAt(0).toUpperCase() + quiz.type.slice(1)} Quiz
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-slate-400 font-medium whitespace-nowrap">
                        <Clock size={12} />
                        {new Date(quiz.createdAt).toLocaleDateString()}
                      </span>
                      {quiz.completed && (
                        <span className="text-xs font-bold px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  {quiz.completed ? (
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-900">{quiz.score}%</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Score</p>
                    </div>
                  ) : (
                    <button 
                      onClick={() => onStartQuiz(quiz.id)}
                      className="text-indigo-600 font-black text-sm hover:underline"
                    >
                      Finish Now
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
