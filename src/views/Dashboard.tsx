import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  BookOpen, 
  TrendingUp, 
  Target, 
  Zap, 
  ArrowRight,
  Clock,
  BrainCircuit,
  AlertTriangle,
  Search,
  Check,
  GraduationCap,
  HelpCircle,
  MessageSquare,
  ChevronDown,
  FileText,
  Video,
  Headphones,
  Users
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useAuth } from '../lib/AuthContext';
import { dbService } from '../services/dbService';
import { aiService } from '../services/aiService';
import { Lesson, PerformanceRecord } from '../types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { DoubtModal } from '../components/DoubtModal';
import { ConnectTeacherCard } from '../components/ConnectTeacherCard';

const SUBJECT_PLACEHOLDERS: Record<string, string> = {
  'Math': 'e.g. Algebra, Calculus, Trigonometry...',
  'Physics': 'e.g. Thermodynamics, Kinematics...',
  'Chemistry': 'e.g. Organic Chemistry, Stoichiometry...',
  'Biology': 'e.g. Genetics, Cell Structure...',
  'English': 'e.g. Grammar, Essay Writing...',
  'Computer Science': 'e.g. Data Structures, Python...',
  'History': 'e.g. World War II, Ancient Rome...',
  'Geography': 'e.g. Topography, Climate Change...',
  'Economics': 'e.g. Microeconomics, Inflation...',
  'Business': 'e.g. Marketing, Accounting...',
  'Language learning': 'e.g. Spanish conjugation, Vocab...'
};

export function Dashboard({ onStartLesson, onSetView }: { 
  onStartLesson: (l: Lesson) => void;
  onSetView: (v: string) => void;
}) {
  const { profile, user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeDoubt, setActiveDoubt] = useState<{ concept: string; subject: string } | null>(null);

  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [customTopic, setCustomTopic] = useState('');
  const [learningMode, setLearningMode] = useState<'text' | 'voice' | 'video'>('text');
  const [isModeOpen, setIsModeOpen] = useState(false);

  useEffect(() => {
    if (profile?.learningMode) {
      setLearningMode(profile.learningMode);
    }
  }, [profile]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const [l, p] = await Promise.all([
        dbService.getLessons(user.uid),
        dbService.getPerformance(user.uid)
      ]);
      setLessons(l);
      setPerformance(p);
      if (profile?.subjects.length) {
        setSelectedSubject(profile.subjects[0]);
      }
      setLoading(false);
    };
    fetchData();
  }, [user, profile]);

  const generateDailyLesson = async () => {
    if (!profile || !user) return;
    setIsGenerating(true);
    try {
      const subject = selectedSubject || profile.subjects[0];
      const topic = customTopic.trim() || undefined;
      
      // Get current weaknesses for this subject
      const subjectPerf = performance.find(p => p.subject === subject);
      
      const newLessonData = await aiService.generateLesson(
        subject, 
        profile.grade, 
        learningMode,
        topic,
        subjectPerf?.weakConcepts,
        profile.goals
      );

      const lessonId = await dbService.addLesson(user.uid, newLessonData);
      const newLesson = { id: lessonId, ...newLessonData } as Lesson;
      
      // Record search history for personalized quizzes
      if (topic || subject) {
        await dbService.recordTopicSearch(user.uid, subject, topic || subject);
      }
      
      setLessons([newLesson, ...lessons]);
      setCustomTopic('');
      toast.success(`Generated a new lesson for ${subject}!`);
      onStartLesson(newLesson);
    } catch (err: any) {
      const errorMessage = err?.message?.toLowerCase() || '';
      if (err?.status === 429 || errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('exhausted') || errorMessage.includes('rate limit')) {
        toast.error('AI quota limit reached. Please wait a moment or check your API key billing in Settings > Secrets.');
      } else if (err?.status === 403 || err?.status === 400 || errorMessage.includes('api_key') || errorMessage.includes('permission_denied')) {
        toast.error('Please check your Gemini API key in Settings > Secrets.');
      } else {
        toast.error('Failed to generate lesson. Please check your topic.');
      }
      console.error('Lesson Generation Error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const pendingLesson = lessons.find(l => l.status === 'pending');
  const weaknessesWithSubject = performance.flatMap(p => 
    p.weakConcepts.map(c => ({ concept: c, subject: p.subject }))
  ).slice(0, 5);

  // Real-time Calculations
  const totalMastered = performance.reduce((acc, p) => acc + (p.masteredConcepts?.length || 0), 0);
  const totalWeak = performance.reduce((acc, p) => acc + (p.weakConcepts?.length || 0), 0);
  const totalConcepts = totalMastered + totalWeak;
  const growthPercent = totalConcepts > 0 ? Math.round((totalMastered / totalConcepts) * 100) : 0;
  
  // Calculate if streak is still active
  const getActiveStreak = () => {
    if (!profile?.lastActivityDate || !profile?.streak) return 0;
    
    const today = new Date().toISOString().split('T')[0];
    const lastActivity = profile.lastActivityDate;
    
    if (lastActivity === today) return profile.streak;
    
    const lastDate = new Date(lastActivity);
    const currentDate = new Date(today);
    const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) return profile.streak; // Last activity was yesterday or today
    return 0; // Missed more than a day
  };

  const currentStreak = getActiveStreak();

  const performanceData = performance.map(p => ({
    name: p.subject,
    mastered: p.masteredConcepts?.length || 0,
    total: (p.masteredConcepts?.length || 0) + (p.weakConcepts?.length || 0)
  })).filter(p => p.total > 0);

  const handleResolveWeakness = async (subject: string, concept: string) => {
    if (!user) return;
    try {
      await dbService.removeWeakness(user.uid, subject, concept);
      // Update local state to reflect change immediately
      setPerformance(prev => prev.map(p => {
        if (p.subject === subject) {
          return {
            ...p,
            weakConcepts: p.weakConcepts.filter(c => c !== concept),
            masteredConcepts: [...p.masteredConcepts, concept]
          };
        }
        return p;
      }));
      toast.success(`Marked "${concept}" as resolved!`);
    } catch (err) {
      toast.error('Failed to update progress.');
    }
  };

  const handleTeachTopic = (subject: string, topic: string) => {
    setSelectedSubject(subject);
    setCustomTopic(topic);
    // Smooth scroll to top to see the generator
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8 pb-2">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-indigo-100 flex-shrink-0">
              <GraduationCap className="text-white" size={36} />
            </div>
            <h1 className="text-4xl font-black text-indigo-600 tracking-tighter">MentorMind</h1>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Welcome back, {user?.displayName?.split(' ')[0]}!</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative z-10 lg:mt-4">
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm flex items-center gap-1.5"
            >
              <Sparkles size={14} />
              Self-Study (AI)
            </button>
            <button
              type="button"
              onClick={() => onSetView('teacher-class')}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-all"
            >
              <Users size={14} />
              With My Teacher
            </button>
          </div>
          <button 
            type="button"
            onClick={() => onSetView('switch-subjects')}
            className="group bg-white px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 relative"
          >
            <BookOpen size={18} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
            Switch Subject
          </button>
          <div className="bg-white p-3 px-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
            <Zap className="text-amber-500" size={20} fill="currentColor" />
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Streak</p>
              <p className="text-xl font-bold text-slate-900">{currentStreak} Days</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Recommendation */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-8 text-white relative shadow-2xl shadow-indigo-100 z-20">
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
              <div className="absolute top-0 right-0 p-8 opacity-20 transform -rotate-12">
                <Sparkles size={160} />
              </div>
            </div>
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black leading-tight">What do you want to learn?</h3>
                  <p className="text-indigo-100 opacity-90 text-sm md:text-base">Choose a subject and type a specific topic you want to master.</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {profile?.subjects.map(s => (
                    <button
                      key={s}
                      onClick={() => setSelectedSubject(s)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                        selectedSubject === s 
                          ? "bg-white text-indigo-600 border-white shadow-lg" 
                          : "bg-indigo-500/30 text-white border-white/20 hover:bg-indigo-500/50"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-end">
                  <div className="flex-1 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" size={18} />
                      <input 
                        type="text"
                        placeholder={selectedSubject ? SUBJECT_PLACEHOLDERS[selectedSubject] || `Specific topic in ${selectedSubject}...` : "Specific topic (e.g. Thermodynamics, Algebra Basics)..."}
                        className="w-full pl-12 pr-6 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder:text-indigo-200 focus:outline-none focus:bg-white/20 transition-all font-medium"
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (selectedSubject || customTopic) && !isGenerating && generateDailyLesson()}
                      />
                    </div>
                  </div>

                  <div className="relative min-w-[160px]">
                    <button
                      type="button"
                      onClick={() => setIsModeOpen(!isModeOpen)}
                      className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-2xl text-white font-bold flex items-center justify-between gap-3 hover:bg-white/20 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        {learningMode === 'text' && <FileText size={18} className="text-indigo-200" />}
                        {learningMode === 'voice' && <Headphones size={18} className="text-indigo-200" />}
                        {learningMode === 'video' && <Video size={18} className="text-indigo-200" />}
                        <span className="capitalize">{learningMode}</span>
                      </div>
                      <ChevronDown size={16} className={cn("transition-transform duration-300", isModeOpen && "rotate-180")} />
                    </button>

                    {isModeOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200 max-h-[250px] overflow-y-auto">
                        {[
                          { id: 'text', label: 'Text Mode', icon: FileText, desc: 'Deep reading' },
                          { id: 'voice', label: 'Voice Mode', icon: Headphones, desc: 'Listen & learn' },
                          { id: 'video', label: 'Video Mode', icon: Video, desc: 'Visual scenes' }
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => {
                              setLearningMode(mode.id as any);
                              setIsModeOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 p-4 hover:bg-indigo-50 transition-colors text-left",
                              learningMode === mode.id ? "bg-indigo-50/50" : ""
                            )}
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0",
                              learningMode === mode.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                            )}>
                              <mode.icon size={20} />
                            </div>
                            <div>
                              <p className={cn("font-bold text-sm", learningMode === mode.id ? "text-indigo-600" : "text-slate-700")}>{mode.label}</p>
                              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{mode.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      if (!isGenerating && (selectedSubject || customTopic)) {
                        generateDailyLesson();
                      }
                    }}
                    disabled={isGenerating || (!selectedSubject && !customTopic)}
                    className="w-full bg-white text-indigo-700 px-8 py-5 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-[0_20px_50px_rgba(79,70,229,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] group"
                  >
                    {isGenerating ? (
                      <span className="flex items-center gap-3">
                        <div className="w-5 h-5 border-3 border-indigo-600 border-t-transparent animate-spin rounded-full" />
                        Designing Your Experience...
                      </span>
                    ) : (
                      <>
                        Start Learning 
                        <div className="bg-indigo-600 text-white p-2 rounded-xl group-hover:rotate-12 transition-transform">
                          <Sparkles size={20} />
                        </div>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={24} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900">Learning Growth</h4>
                    <p className="text-sm text-slate-500">
                      Overall Progress: {totalMastered} topics mastered so far.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-600 leading-none">{totalMastered}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Mastered</div>
                </div>
              </div>
              
              {performanceData.length > 0 ? (
                <div className="space-y-4 pt-2">
                  {performanceData.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between group p-1">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{p.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                        {p.mastered} Topics Mastered
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center border border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                  <BookOpen size={24} className="text-slate-300 mb-2" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center px-4">
                    Complete your first quiz to track learning growth
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Status */}
        <div className="space-y-6">
          {/* Weakness Detector */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 overflow-hidden relative">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
              <AlertTriangle className="text-amber-500" size={18} />
              Focus Areas
            </h4>
            {weaknessesWithSubject.length > 0 ? (
              <div className="space-y-4">
                {weaknessesWithSubject.map((w, i) => (
                  <div key={i} className="group p-4 bg-slate-50 rounded-[1.5rem] border border-transparent hover:border-indigo-100 hover:bg-white hover:shadow-sm transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{w.subject}</span>
                       <button 
                         onClick={() => handleResolveWeakness(w.subject, w.concept)}
                         className="p-1.5 hover:bg-emerald-50 rounded-lg text-slate-300 hover:text-emerald-500 transition-all"
                         title="Mark as Resolved"
                       >
                         <Check size={14} />
                       </button>
                    </div>
                    <p className="text-sm font-bold text-slate-800 mb-4">{w.concept}</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleTeachTopic(w.subject, w.concept)}
                        className="flex-1 py-2.5 bg-white rounded-xl text-[11px] font-bold text-indigo-600 border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all flex items-center justify-center gap-2"
                      >
                        <Sparkles size={14} />
                        Teach Me
                      </button>
                      <button 
                        onClick={() => setActiveDoubt({ concept: w.concept, subject: w.subject })}
                        className="py-2.5 px-4 bg-indigo-50 rounded-xl text-[11px] font-bold text-indigo-600 border border-transparent hover:border-indigo-100 transition-all flex items-center justify-center gap-2"
                        title="Clear Doubt"
                      >
                        <HelpCircle size={14} />
                        Clear Doubt
                      </button>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => onSetView('progress')}
                  className="w-full text-indigo-600 text-xs font-bold flex items-center justify-center gap-1 mt-4 p-2 rounded-xl hover:bg-indigo-50 transition-all border border-dashed border-indigo-100"
                >
                  View full report <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <BrainCircuit className="mx-auto text-slate-200 mb-2" size={32} />
                <p className="text-xs text-slate-400">No weaknesses detected yet. Complete some quizzes to get analysis!</p>
              </div>
            )}
          </div>

          {/* History / Recently Studied */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center">
                  <Clock size={20} />
                </div>
                <h4 className="font-bold text-slate-900">History</h4>
              </div>
              <button 
                onClick={() => onSetView('lessons')}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                View All
              </button>
            </div>

            {lessons.length > 0 ? (
              <div className="space-y-3">
                {lessons.slice(0, 4).map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => onStartLesson(lesson)}
                    className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-md transition-all group flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                          {lesson.subject}
                        </span>
                      </div>
                      <h5 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {lesson.title}
                      </h5>
                    </div>
                    {lesson.status === 'completed' && (
                      <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg flex-shrink-0">
                        <Check size={14} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No history yet</p>
              </div>
            )}
          </div>

        </div>
      </div>

      <ConnectTeacherCard />

      {activeDoubt && (
        <DoubtModal 
          concept={activeDoubt.concept}
          subject={activeDoubt.subject}
          onClose={() => setActiveDoubt(null)}
          onResolve={() => {
            handleResolveWeakness(activeDoubt.subject, activeDoubt.concept);
            setActiveDoubt(null);
          }}
        />
      )}
    </div>
  );
}
