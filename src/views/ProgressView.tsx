import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Target, 
  Award, 
  BrainCircuit, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  BookOpen, 
  Activity,
  ChevronRight,
  Star
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { dbService } from '../services/dbService';
import { PerformanceRecord, Quiz, Lesson } from '../types';
import { cn } from '../lib/utils';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip,
  BarChart,
  Bar,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar
} from 'recharts';
import { motion } from 'motion/react';

export function ProgressView() {
  const { user, profile } = useAuth();
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      Promise.all([
        dbService.getPerformance(user.uid),
        dbService.getQuizzes(user.uid),
        dbService.getLessons(user.uid)
      ]).then(([p, q, l]) => {
        setPerformance(p);
        setQuizzes(q);
        setLessons(l);
        setLoading(false);
      });
    }
  }, [user]);

  // Calculate if streak is still active (same logic as dashboard)
  const getActiveStreak = () => {
    if (!profile?.lastActivityDate || !profile?.streak) return 0;
    const today = new Date().toISOString().split('T')[0];
    const lastActivity = profile.lastActivityDate;
    if (lastActivity === today) return profile.streak;
    const lastDate = new Date(lastActivity);
    const currentDate = new Date(today);
    const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return profile.streak;
    return 0;
  };

  const currentStreak = getActiveStreak();

  // Radar chart data for mastery map
  const radarData = performance.map(p => ({
    subject: p.subject,
    score: p.averageScore || 0,
    fullMark: 100
  })).filter(p => p.score > 0);

  const completedQuizzes = quizzes.filter(q => q.completed).reverse();
  const averageScore = completedQuizzes.length > 0 
    ? Math.round(completedQuizzes.reduce((acc, q) => acc + (q.score || 0), 0) / completedQuizzes.length)
    : 0;

  // Badge Definition with logic
  const allBadges = [
    // Lessons
    { id: 'starter', icon: '🌱', name: 'Starter', desc: 'Complete your first lesson', requirement: () => lessons.length >= 1, progress: lessons.length, target: 1 },
    { id: 'novice', icon: '🌿', name: 'Novice', desc: 'Complete 5 lessons', requirement: () => lessons.length >= 5, progress: lessons.length, target: 5 },
    { id: 'scholar', icon: '📚', name: 'Scholar', desc: 'Complete 10 different lessons', requirement: () => lessons.length >= 10, progress: lessons.length, target: 10 },
    { id: 'academic', icon: '🏫', name: 'Academic', desc: 'Reach 20 completed lessons', requirement: () => lessons.length >= 20, progress: lessons.length, target: 20 },
    { id: 'high-scholar', icon: '🏛️', name: 'High Scholar', desc: 'Complete 50 lessons total', requirement: () => (profile?.totalLessons || lessons.length) >= 50, progress: profile?.totalLessons || lessons.length, target: 50 },
    { id: 'master-sage', icon: '🧘', name: 'Master Sage', desc: 'The ultimate learner: 100 lessons', requirement: () => (profile?.totalLessons || lessons.length) >= 100, progress: profile?.totalLessons || lessons.length, target: 100 },
    
    // Quizzes
    { id: 'quiz-init', icon: '🎯', name: 'Assessment Ready', desc: 'Complete your first practice quiz', requirement: () => completedQuizzes.length >= 1, progress: completedQuizzes.length, target: 1 },
    { id: 'quiz-pro', icon: '🧠', name: 'Quiz Pro', desc: 'Successfully finish 5 assessments', requirement: () => completedQuizzes.length >= 5, progress: completedQuizzes.length, target: 5 },
    { id: 'quiz-enthusiast', icon: '🧪', name: 'Enthusiast', desc: 'Complete 10 assessments', requirement: () => completedQuizzes.length >= 10, progress: completedQuizzes.length, target: 10 },
    { id: 'quiz-master', icon: '🧬', name: 'Quiz Master', desc: 'Mastery verified: 25 quizzes', requirement: () => completedQuizzes.length >= 25, progress: completedQuizzes.length, target: 25 },
    { id: 'quiz-legend', icon: '🏆', name: 'Quiz Legend', desc: 'Legendary status: 50 quizzes', requirement: () => completedQuizzes.length >= 50, progress: completedQuizzes.length, target: 50 },
    
    // Performance
    { id: 'perfect', icon: '💎', name: 'Perfect Score', desc: 'Get 100% on any assessment', requirement: () => quizzes.some(q => (q.score || 0) >= 100), progress: quizzes.some(q => (q.score || 0) >= 100) ? 1 : 0, target: 1 },
    { id: 'accurate', icon: '🛡️', name: 'Sharpshooter', desc: 'Average quiz accuracy above 90%', requirement: () => averageScore >= 90 && completedQuizzes.length >= 3, progress: averageScore, target: 90 },
    { id: 'beyond-limits', icon: '🛸', name: 'Beyond Limits', desc: 'Exceptional accuracy: >95% average', requirement: () => averageScore >= 95 && completedQuizzes.length >= 5, progress: averageScore, target: 95 },
    { id: 'honor-roll', icon: '📜', name: 'Honor Roll', desc: 'Score above 90% in 5 different assessments', requirement: () => completedQuizzes.filter(q => (q.score || 0) >= 90).length >= 5, progress: completedQuizzes.filter(q => (q.score || 0) >= 90).length, target: 5 },

    // Streaks
    { id: 'streak-3', icon: '🔥', name: 'Consistent', desc: 'Maintain a 3-day learning streak', requirement: () => currentStreak >= 3, progress: currentStreak, target: 3 },
    { id: 'streak-7', icon: '⚡', name: 'Unstoppable', desc: 'Maintain a 7-day learning streak', requirement: () => currentStreak >= 7, progress: currentStreak, target: 7 },
    { id: 'streak-14', icon: '🏔️', name: 'Two Weeks', desc: 'Two weeks of pure dedication', requirement: () => currentStreak >= 14, progress: currentStreak, target: 14 },
    { id: 'streak-30', icon: '🌋', name: 'Monthly Warrior', desc: 'A full month of learning', requirement: () => currentStreak >= 30, progress: currentStreak, target: 30 },
    
    // Breadth
    { id: 'explorer', icon: '🧭', name: 'Subject Explorer', desc: 'Study at least 3 different subjects', requirement: () => performance.length >= 3, progress: performance.length, target: 3 },
    { id: 'versatile', icon: '🧩', name: 'Versatile', desc: 'Engage with 5 different subjects', requirement: () => performance.length >= 5, progress: performance.length, target: 5 },
    
    // Volume
    { id: 'veteran', icon: '🏅', name: 'Veteran', desc: 'Complete 25 total activities', requirement: () => (lessons.length + quizzes.length) >= 25, progress: lessons.length + quizzes.length, target: 25 },
    { id: 'elite-veteran', icon: '🎖️', name: 'Elite Veteran', desc: 'Complete 50 total activities', requirement: () => (lessons.length + quizzes.length) >= 50, progress: lessons.length + quizzes.length, target: 50 },
    { id: 'century-club', icon: '💎', name: 'Century Club', desc: 'Total of 100 learning actions', requirement: () => (lessons.length + quizzes.length) >= 100, progress: lessons.length + quizzes.length, target: 100 },
  ];

  const [selectedBadge, setSelectedBadge] = useState<typeof allBadges[0] | null>(null);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  // Prepare quiz score trends
  const quizHistoryData = completedQuizzes.slice(-10).map((q, i) => ({
    name: i + 1,
    score: q.score || 0
  }));

  // Activity data for the last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = lessons.filter(l => l.createdAt.startsWith(dateStr)).length + 
                  quizzes.filter(q => q.createdAt.startsWith(dateStr)).length;
    return {
      date: dateStr,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      activity: count
    };
  }).reverse();

  const earnedBadgesCount = allBadges.filter(b => b.requirement()).length;

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Learning Analytics</h1>
          <p className="text-slate-500 text-lg">Your cognitive growth, visualized.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-4 py-2 bg-indigo-50 rounded-xl flex items-center gap-2">
            <Flame className="text-orange-500 fill-orange-500" size={20} />
            <span className="font-black text-indigo-900">{currentStreak} Day Streak</span>
          </div>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Lessons Mastered', value: profile?.totalLessons || 0, icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Quizzes Taken', value: quizzes.length, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Avg. Accuracy', value: `${averageScore}%`, icon: Target, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Badges Earned', value: earnedBadgesCount, icon: Award, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", stat.bg, stat.color)}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900 leading-none">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Score Consistency (Area Chart) */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900">Score Consistency</h3>
              <p className="text-sm text-slate-400 font-medium">Your quiz performance over time</p>
            </div>
            <TrendingUp className="text-emerald-500" size={24} />
          </div>
          
          <div className="h-[300px] w-full">
            {completedQuizzes.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={quizHistoryData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ fontWeight: 'black', color: '#1e293b' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#4f46e5" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                  <Activity size={48} className="mb-4 opacity-20" />
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Not enough data for trending</p>
                </div>
            )}
          </div>
        </div>

        {/* Weekly Activity Pulse */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900">Weekly Pulse</h3>
              <p className="text-sm text-slate-400 font-medium">Daily activity volume</p>
            </div>
            <Activity className="text-indigo-600" size={24} />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7Days}>
                <XAxis dataKey="dayName" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }} 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                />
                <Bar dataKey="activity" radius={[12, 12, 12, 12]} barSize={24}>
                  {last7Days.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.activity > 0 ? '#4f46e5' : '#f1f5f9'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Badge Collection Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Achievements</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {allBadges.map((badge) => {
            const isEarned = badge.requirement();
            return (
              <motion.button
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "p-4 rounded-2xl border transition-all flex flex-col items-center text-center group relative",
                  isEarned 
                    ? "bg-white border-slate-100 shadow-sm hover:border-indigo-200" 
                    : "bg-slate-50 border-slate-100 opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                )}
              >
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{badge.icon}</div>
                <p className="text-[10px] font-black text-slate-900 leading-tight mb-1">{badge.name}</p>
                {isEarned && (
                  <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5 shadow-sm">
                    <CheckCircle2 size={10} className="text-white" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Selected Badge Detail Modal-like expanded view */}
      {selectedBadge && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden"
        >
          <button 
            onClick={() => setSelectedBadge(null)}
            className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ChevronRight size={24} className="rotate-90 md:rotate-0" />
          </button>
          
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="w-40 h-40 bg-white/20 rounded-full flex items-center justify-center text-7xl shadow-inner backdrop-blur-sm">
              {selectedBadge.icon}
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                <h3 className="text-4xl font-black">{selectedBadge.name}</h3>
                {selectedBadge.requirement() ? (
                  <span className="bg-emerald-400 text-emerald-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Earned</span>
                ) : (
                  <span className="bg-white/20 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">In Progress</span>
                )}
              </div>
              <p className="text-xl text-indigo-100 font-medium mb-8 max-w-xl">{selectedBadge.desc}</p>
              
              <div className="space-y-4 max-w-md mx-auto md:mx-0">
                <div className="flex justify-between text-sm font-black uppercase tracking-widest text-indigo-200">
                  <span>Progress</span>
                  <span>{Math.min(selectedBadge.progress, selectedBadge.target)} / {selectedBadge.target}</span>
                </div>
                <div className="w-full bg-indigo-900/40 h-4 rounded-full overflow-hidden border border-white/10 p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (selectedBadge.progress / selectedBadge.target) * 100)}%` }}
                    className="h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
}
