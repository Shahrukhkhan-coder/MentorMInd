import React, { useEffect, useState } from 'react';
import {
  Users,
  BookOpen,
  Video,
  MessageSquare,
  Send,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Clock,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { useAuth } from '../lib/AuthContext';
import { dbService } from '../services/dbService';
import { EnrollmentRecord, TeacherLesson, TeacherDoubt, SUBJECTS } from '../types';
import { ConnectTeacherCard } from '../components/ConnectTeacherCard';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export function TeacherLearningView({ onSwitchToAI }: { onSwitchToAI: () => void }) {
  const { user, profile, refreshProfile } = useAuth();
  const [enrollment, setEnrollment] = useState<EnrollmentRecord | null>(null);
  const [lessons, setLessons] = useState<TeacherLesson[]>([]);
  const [doubts, setDoubts] = useState<TeacherDoubt[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<TeacherLesson | null>(null);
  const [completedIds, setCompletedIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Ask teacher doubt form
  const [doubtSubject, setDoubtSubject] = useState(profile?.subjects?.[0] || SUBJECTS[0]);
  const [doubtTopic, setDoubtTopic] = useState('');
  const [doubtQuestion, setDoubtQuestion] = useState('');
  const [sendingDoubt, setSendingDoubt] = useState(false);

  const loadClassroom = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const enrollments = await dbService.getStudentEnrollments(user.uid);
      const active = enrollments.find((e) => e.status === 'active') || null;
      setEnrollment(active);

      if (active) {
        const [tLessons, sDoubts] = await Promise.all([
          dbService.getTeacherLessonsByTeacher(active.teacherId),
          dbService.getStudentDoubts(user.uid),
        ]);
        setLessons(tLessons);
        setDoubts(sDoubts.filter((d) => d.teacherId === active.teacherId));
        if (tLessons.length > 0 && !selectedLesson) {
          setSelectedLesson(tLessons[0]);
        }
      } else {
        setLessons([]);
        setDoubts([]);
        setSelectedLesson(null);
      }
    } catch (err) {
      console.error('Failed to load teacher classroom:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassroom();
  }, [user, profile?.teacherId]);

  const handleMarkLessonCompleted = async (lesson: TeacherLesson) => {
    if (!profile) return;
    try {
      await dbService.completeTeacherLessonForStudent(profile, lesson);
      setCompletedIds((prev) => ({ ...prev, [lesson.id]: true }));
      await refreshProfile();
      toast.success(`Completed "${lesson.title}"! Your progress & streak were updated.`);
    } catch (err) {
      toast.error('Could not mark lesson completed.');
    }
  };

  const handleAskTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !enrollment) return;
    if (!doubtTopic.trim() || !doubtQuestion.trim()) {
      toast.error('Please enter both a topic and your question.');
      return;
    }
    setSendingDoubt(true);
    try {
      const created = await dbService.createTeacherDoubt({
        studentId: user.uid,
        studentName: profile.displayName || user.displayName || profile.email.split('@')[0],
        teacherId: enrollment.teacherId,
        teacherName: enrollment.teacherName,
        subject: doubtSubject,
        topic: doubtTopic,
        question: doubtQuestion,
      });
      setDoubts((prev) => [created, ...prev]);
      setDoubtTopic('');
      setDoubtQuestion('');
      toast.success(`Question sent to ${enrollment.teacherName}!`);
    } catch (err) {
      toast.error('Failed to send your question.');
    } finally {
      setSendingDoubt(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header + Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <Users size={22} />
            </div>
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-wider">
              Teacher-Led Learning
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Learn with Your Teacher</h1>
          <p className="text-slate-500">
            Access lessons, live session links, and direct human Q&A from your connected mentor.
          </p>
        </div>

        {/* 2 Learning Paths Switcher */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm self-start">
          <button
            onClick={onSwitchToAI}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-2 transition-all"
          >
            <Sparkles size={16} />
            Self-Study (AI)
          </button>
          <button
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white shadow-sm flex items-center gap-2"
          >
            <Users size={16} />
            With My Teacher
          </button>
        </div>
      </div>

      {/* Connect Card (shows current teacher or join form) */}
      <ConnectTeacherCard />

      {enrollment && (
        <>
          {/* Teacher Lessons & Reader */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <BookOpen size={20} className="text-indigo-600" />
                Lessons from {enrollment.teacherName}
              </h2>

              {lessons.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Clock size={28} className="mx-auto opacity-40" />
                  <p className="text-sm font-medium">No lessons published by your teacher yet.</p>
                  <p className="text-xs">Ask a question below or switch to AI Self-Study anytime!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {lessons.map((l) => {
                    const isSelected = selectedLesson?.id === l.id;
                    return (
                      <button
                        key={l.id}
                        onClick={() => setSelectedLesson(l)}
                        className={cn(
                          "w-full p-4 rounded-2xl border-2 text-left transition-all space-y-1.5",
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/60"
                            : "border-slate-100 hover:border-indigo-200 bg-white"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase">
                            {l.subject}
                          </span>
                          {l.meetingUrl && (
                            <span className="text-[10px] font-bold text-purple-600 flex items-center gap-1">
                              <Video size={12} /> Live Link
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm">{l.title}</h3>
                        <p className="text-xs text-slate-400">{l.grade}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="lg:col-span-7 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
              {selectedLesson ? (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
                    <div>
                      <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                        {selectedLesson.subject} • {selectedLesson.grade}
                      </span>
                      <h2 className="text-2xl font-black text-slate-900 mt-2">{selectedLesson.title}</h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Published by {selectedLesson.teacherName} • {new Date(selectedLesson.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {selectedLesson.meetingUrl && (
                        <a
                          href={selectedLesson.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 flex items-center gap-1.5"
                        >
                          <Video size={15} />
                          Join Live Class {selectedLesson.scheduledAt ? `(${selectedLesson.scheduledAt})` : ''}
                          <ExternalLink size={13} />
                        </a>
                      )}
                      <button
                        onClick={() => handleMarkLessonCompleted(selectedLesson)}
                        disabled={completedIds[selectedLesson.id]}
                        className={cn(
                          "px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all",
                          completedIds[selectedLesson.id]
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                        )}
                      >
                        <CheckCircle2 size={15} />
                        {completedIds[selectedLesson.id] ? 'Completed' : 'Mark Completed'}
                      </button>
                    </div>
                  </div>

                  <div className="prose prose-slate max-w-none text-slate-700">
                    <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                      {selectedLesson.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-400 space-y-2">
                  <BookOpen size={36} className="mx-auto opacity-40" />
                  <p className="font-semibold text-slate-600">Select a teacher lesson to start reading</p>
                </div>
              )}
            </div>
          </div>

          {/* Ask My Teacher (Direct Doubts) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form
              onSubmit={handleAskTeacher}
              className="lg:col-span-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-4"
            >
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare size={20} className="text-indigo-600" />
                Ask {enrollment.teacherName}
              </h2>
              <p className="text-xs text-slate-500">
                Stuck on a concept? Send your question directly to your human teacher.
              </p>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</label>
                <select
                  value={doubtSubject}
                  onChange={(e) => setDoubtSubject(e.target.value)}
                  className="mt-1.5 w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Topic / Concept</label>
                <input
                  type="text"
                  placeholder="e.g. Quadratic Formula"
                  value={doubtTopic}
                  onChange={(e) => setDoubtTopic(e.target.value)}
                  className="mt-1.5 w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Question</label>
                <textarea
                  placeholder="Explain what part is confusing you..."
                  value={doubtQuestion}
                  onChange={(e) => setDoubtQuestion(e.target.value)}
                  className="mt-1.5 w-full h-28 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-400 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={sendingDoubt}
                className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={16} />
                {sendingDoubt ? 'Sending...' : 'Send Question to Teacher'}
              </button>
            </form>

            <div className="lg:col-span-7 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-4">
              <h2 className="text-xl font-bold text-slate-900">Your Questions & Teacher Replies ({doubts.length})</h2>
              {doubts.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <MessageSquare size={30} className="mx-auto opacity-40" />
                  <p className="text-sm">You haven't asked your teacher any questions yet.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                  {doubts.map((d) => (
                    <div key={d.id} className="p-5 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase",
                            d.status === 'answered' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          )}>
                            {d.status === 'answered' ? 'Answered' : 'Waiting for Reply'}
                          </span>
                          <span className="text-xs font-bold text-slate-700">{d.subject} • {d.topic}</span>
                        </div>
                        <span className="text-xs text-slate-400">{new Date(d.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-slate-800">{d.question}</p>
                      {d.reply && (
                        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-sm text-indigo-950">
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block mb-1">
                            {d.teacherName}'s Reply
                          </span>
                          {d.reply}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
