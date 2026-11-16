import React, { useEffect, useState } from 'react';
import { BookOpen, Search, Filter, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { dbService } from '../services/dbService';
import { Lesson } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export function LessonsList({ onSelectLesson }: { onSelectLesson: (l: Lesson) => void }) {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user) {
      dbService.getLessons(user.uid).then(l => {
        setLessons(l);
        setLoading(false);
      });
    }
  }, [user]);

  const filtered = lessons.filter(l => 
    l.title.toLowerCase().includes(search.toLowerCase()) || 
    l.subject.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex justify-center p-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">My Learning Library</h2>
          <p className="text-slate-500">Revisit your past lessons and complete pending ones.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search lessons..." 
            className="pl-12 pr-6 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm focus:outline-none focus:border-indigo-300 w-full md:w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((lesson) => (
          <button 
            key={lesson.id}
            onClick={() => onSelectLesson(lesson)}
            className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left group flex flex-col h-full"
          >
            <div className="flex justify-between items-start mb-6">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                lesson.status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
              )}>
                {lesson.status === 'completed' ? <CheckCircle2 size={24} /> : <BookOpen size={24} />}
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                lesson.status === 'completed' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
              )}>
                {lesson.status}
              </div>
            </div>

            <div className="flex-1">
              <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">{lesson.subject}</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors leading-tight">{lesson.title}</h3>
              <p className="text-sm text-slate-400 font-medium line-clamp-2 mb-4">{lesson.content.replace(/[#*`]/g, '').slice(0, 100)}...</p>
            </div>

            <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                {format(new Date(lesson.createdAt), 'MMM d, yyyy')}
              </span>
              <span className="group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                Open <ArrowRight size={14} />
              </span>
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
            <BookOpen className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No lessons found</h3>
            <p className="text-slate-500">Try searching for a different topic or generate a new lesson!</p>
          </div>
        )}
      </div>
    </div>
  );
}
