import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Copy,
  Check,
  GraduationCap,
  Flame,
  BookOpen,
  Target,
  AlertTriangle,
  CheckCircle2,
  Search,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Video,
  MessageSquare,
  Send,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { dbService } from '../services/dbService';
import { aiService } from '../services/aiService';
import {
  EnrollmentRecord,
  TeacherDirectoryEntry,
  TeacherLesson,
  TeacherDoubt,
  SUBJECTS,
  UserGrade,
} from '../types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export function TeacherDashboard() {
  const { user, profile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'roster' | 'lessons' | 'doubts'>('roster');
  const [students, setStudents] = useState<EnrollmentRecord[]>([]);
  const [dirEntry, setDirEntry] = useState<TeacherDirectoryEntry | null>(null);
  const [lessons, setLessons] = useState<TeacherLesson[]>([]);
  const [doubts, setDoubts] = useState<TeacherDoubt[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<EnrollmentRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Create lesson form
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonSubject, setLessonSubject] = useState(profile?.subjects?.[0] || SUBJECTS[0]);
  const [lessonGrade, setLessonGrade] = useState<UserGrade>('High School');
  const [lessonContent, setLessonContent] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [draftingAI, setDraftingAI] = useState(false);

  // Doubt replies map
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);

  const grades: UserGrade[] = ['Elementary', 'Middle School', 'High School', 'College', 'University'];

  const loadData = async () => {
    if (!user) return;
    try {
      const [enrolled, directory, tLessons, tDoubts] = await Promise.all([
        dbService.getTeacherStudents(user.uid),
        dbService.getTeacherDirectoryEntry(user.uid),
        dbService.getTeacherLessonsByTeacher(user.uid),
        dbService.getTeacherDoubts(user.uid),
      ]);
      setStudents(enrolled);
      setDirEntry(directory);
      setLessons(tLessons);
      setDoubts(tDoubts);
      if (enrolled.length > 0 && !selectedStudent) {
        setSelectedStudent(enrolled[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const classCode = dirEntry?.classCode || profile?.classCode || '';
  const isApproved = isAdmin || dirEntry?.approved || profile?.teacherStatus === 'approved';
  const isRejected = !isAdmin && profile?.teacherStatus === 'rejected';
  const teacherName = dirEntry?.displayName || profile?.displayName || user?.displayName || 'Educator';

  const copyCode = () => {
    if (!classCode) return;
    navigator.clipboard.writeText(classCode);
    setCopiedCode(true);
    toast.success(`Copied class code ${classCode}`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDraftWithAI = async () => {
    if (!lessonTitle.trim()) {
      toast.error('Enter a lesson title/topic first to draft with AI.');
      return;
    }
    setDraftingAI(true);
    try {
      const drafted = await aiService.generateLesson(lessonSubject, lessonGrade, 'text', lessonTitle.trim());
      const formatted = drafted.modules?.length
        ? drafted.modules.map((m) => `### ${m.title}\n${m.content}`).join('\n\n')
        : drafted.content || '';
      setLessonContent(formatted);
      toast.success('AI draft ready! You can review and customize it before publishing.');
    } catch (err) {
      toast.error('Could not generate AI draft right now.');
    } finally {
      setDraftingAI(false);
    }
  };

  const handlePublishLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isApproved) return;
    if (!lessonTitle.trim() || !lessonContent.trim()) {
      toast.error('Please enter both a lesson title and content.');
      return;
    }
    setPublishing(true);
    try {
      const created = await dbService.createTeacherLesson({
        teacherId: user.uid,
        teacherName,
        title: lessonTitle,
        subject: lessonSubject,
        grade: lessonGrade,
        content: lessonContent,
        meetingUrl,
        scheduledAt,
      });
      setLessons((prev) => [created, ...prev]);
      setLessonTitle('');
      setLessonContent('');
      setMeetingUrl('');
      setScheduledAt('');
      toast.success('Lesson published to your students!');
    } catch (err) {
      toast.error('Failed to publish lesson. Ensure your teacher account is approved.');
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      await dbService.deleteTeacherLesson(lessonId);
      setLessons((prev) => prev.filter((l) => l.id !== lessonId));
      toast.success('Lesson removed.');
    } catch (err) {
      toast.error('Failed to delete lesson.');
    }
  };

  const handleReplyDoubt = async (doubtId: string) => {
    const replyText = (replyInputs[doubtId] || '').trim();
    if (!replyText) return;
    setReplyingId(doubtId);
    try {
      await dbService.replyToTeacherDoubt(doubtId, replyText);
      setDoubts((prev) =>
        prev.map((d) =>
          d.id === doubtId ? { ...d, reply: replyText, status: 'answered', updatedAt: new Date().toISOString() } : d
        )
      );
      setReplyInputs((prev) => ({ ...prev, [doubtId]: '' }));
      toast.success('Reply sent to student!');
    } catch (err) {
      toast.error('Failed to send reply.');
    } finally {
      setReplyingId(null);
    }
  };

  const filteredStudents = students.filter((s) =>
    s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.studentGrade.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.studentSubjects.some((sub) => sub.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const avgClassScore = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + (s.averageScore || 0), 0) / students.length)
    : 0;
  const totalWeakCount = students.reduce((sum, s) => sum + (s.weakConcepts?.length || 0), 0);
  const openDoubtsCount = doubts.filter((d) => d.status === 'open').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <Users size={22} />
            </div>
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-wider">
              Teacher Portal
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Welcome, {teacherName}
          </h1>
          <p className="text-slate-500">
            Monitor enrolled students, publish custom lessons & live sessions, and resolve student doubts.
          </p>
        </div>

        {/* Class Code Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-3xl p-6 shadow-xl shadow-indigo-100 flex items-center justify-between gap-6 min-w-[280px]">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">
              Your Class Code
            </span>
            <p className="text-2xl font-black tracking-wider mt-1">
              {classCode || 'Pending'}
            </p>
            <p className="text-xs text-indigo-100 mt-1">
              Share with students to enroll
            </p>
          </div>
          {classCode && (
            <button
              onClick={copyCode}
              className="p-3 bg-white/15 hover:bg-white/25 rounded-2xl transition-all"
              title="Copy class code"
            >
              {copiedCode ? <Check size={20} /> : <Copy size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Approval Status Banner */}
      {!isApproved && (
        <div className={cn(
          "p-6 rounded-3xl border flex items-start gap-4",
          isRejected
            ? "bg-red-50 border-red-200 text-red-900"
            : "bg-amber-50 border-amber-200 text-amber-900"
        )}>
          <Clock className="shrink-0 mt-0.5" size={22} />
          <div>
            <h3 className="font-bold text-lg">
              {isRejected ? 'Teacher Application Not Approved' : 'Teacher Account Pending Admin Approval'}
            </h3>
            <p className="text-sm opacity-85 mt-1">
              {isRejected
                ? 'Please contact the MentorMind administrator if you believe this was a mistake.'
                : 'Your teacher profile is waiting for administrator approval. Once approved, your Class Code activates and you can publish lessons.'}
            </p>
          </div>
        </div>
      )}

      {/* KPI Row + Section Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="grid grid-cols-3 gap-4 flex-1">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Students</p>
              <p className="text-xl font-black text-slate-900">{students.length}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Target size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Quiz</p>
              <p className="text-xl font-black text-slate-900">{avgClassScore}%</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Weak Spots</p>
              <p className="text-xl font-black text-slate-900">{totalWeakCount}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm self-start">
          {[
            { id: 'roster', label: 'Student Roster' },
            { id: 'lessons', label: `Lessons (${lessons.length})` },
            { id: 'doubts', label: `Doubts (${openDoubtsCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-indigo-600"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: STUDENT ROSTER */}
      {activeTab === 'roster' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Student Roster</h2>
              <span className="text-xs font-bold text-slate-400">{filteredStudents.length} shown</span>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search student, grade, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:border-indigo-300"
              />
            </div>

            {filteredStudents.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-14 h-14 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto">
                  <GraduationCap size={28} />
                </div>
                <p className="text-sm font-semibold text-slate-600">No enrolled students yet</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {classCode
                    ? `Share your class code (${classCode}) with students so they can connect from their dashboard.`
                    : 'Once your account is approved, share your class code with students.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {filteredStudents.map((student) => {
                  const isSelected = selectedStudent?.id === student.id;
                  return (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={cn(
                        "w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3",
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/60"
                          : "border-slate-100 hover:border-indigo-200 bg-white"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{student.studentName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{student.studentGrade}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">
                          {student.averageScore}% avg
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {student.weakConcepts.length} weak topics
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 space-y-6">
            {selectedStudent ? (
              <motion.div
                key={selectedStudent.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-8"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      {selectedStudent.studentGrade}
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">
                      {selectedStudent.studentName}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedStudent.studentSubjects.map((sub) => (
                        <span
                          key={sub}
                          className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="px-4 py-3 rounded-2xl bg-orange-50 text-orange-700 text-center">
                      <Flame size={18} className="mx-auto mb-1" />
                      <div className="text-lg font-black">{selectedStudent.streak}</div>
                      <div className="text-[10px] font-bold uppercase">Streak</div>
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-indigo-50 text-indigo-700 text-center">
                      <BookOpen size={18} className="mx-auto mb-1" />
                      <div className="text-lg font-black">{selectedStudent.totalLessons}</div>
                      <div className="text-[10px] font-bold uppercase">Lessons</div>
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-emerald-50 text-emerald-700 text-center">
                      <Target size={18} className="mx-auto mb-1" />
                      <div className="text-lg font-black">{selectedStudent.averageScore}%</div>
                      <div className="text-[10px] font-bold uppercase">Quiz Avg</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500" />
                    AI-Detected Weak Concepts (Needs Human Guidance)
                  </h4>
                  {selectedStudent.weakConcepts.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedStudent.weakConcepts.map((c, idx) => (
                        <span
                          key={idx}
                          className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No active weak concepts flagged yet.</p>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    Mastered Concepts
                  </h4>
                  {selectedStudent.masteredConcepts.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedStudent.masteredConcepts.map((c, idx) => (
                        <span
                          key={idx}
                          className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No mastered concepts recorded yet.</p>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto">
                  <Sparkles size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Select a Student to Inspect Progress</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Click any student in your roster to view their quiz average, active streaks, mastered topics, and areas where AI detected struggles.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LESSONS & LIVE SESSIONS */}
      {activeTab === 'lessons' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={handlePublishLesson}
            className="lg:col-span-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-5"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Plus size={20} className="text-indigo-600" />
                Publish Lesson or Live Class
              </h2>
              <button
                type="button"
                onClick={handleDraftWithAI}
                disabled={draftingAI || !isApproved}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {draftingAI ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Draft with AI
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lesson Title / Topic</label>
                <input
                  type="text"
                  placeholder="e.g. Newton's Laws of Motion - Live Workshop"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="mt-1.5 w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</label>
                  <select
                    value={lessonSubject}
                    onChange={(e) => setLessonSubject(e.target.value)}
                    className="mt-1.5 w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grade Level</label>
                  <select
                    value={lessonGrade}
                    onChange={(e) => setLessonGrade(e.target.value as UserGrade)}
                    className="mt-1.5 w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium"
                  >
                    {grades.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lesson Content (Markdown Supported)</label>
                <textarea
                  placeholder="Write your lesson explanation, key points, examples, or homework instructions..."
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                  className="mt-1.5 w-full h-44 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Meeting Link (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    className="mt-1.5 w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Session Time (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Fri 4:00 PM"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="mt-1.5 w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={publishing || !isApproved}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                {publishing ? 'Publishing...' : 'Publish Lesson to Students'}
              </button>
            </div>
          </form>

          <div className="lg:col-span-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-5">
            <h2 className="text-xl font-bold text-slate-900">Published Lessons ({lessons.length})</h2>
            {lessons.length === 0 ? (
              <div className="text-center py-14 space-y-2 text-slate-400">
                <BookOpen size={32} className="mx-auto opacity-40" />
                <p className="text-sm font-medium">No lessons published yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {lessons.map((l) => (
                  <div key={l.id} className="p-5 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase">
                            {l.subject}
                          </span>
                          <span className="text-xs text-slate-400">{l.grade}</span>
                        </div>
                        <h3 className="font-bold text-slate-900 mt-1">{l.title}</h3>
                      </div>
                      <button
                        onClick={() => handleDeleteLesson(l.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete lesson"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{l.content}</p>
                    {(l.meetingUrl || l.scheduledAt) && (
                      <div className="flex items-center gap-3 pt-1 text-xs text-purple-700 font-semibold">
                        <Video size={14} />
                        <span>{l.scheduledAt || 'Live session linked'}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: STUDENT DOUBTS INBOX */}
      {activeTab === 'doubts' && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare size={20} className="text-indigo-600" />
                Direct Student Doubts
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Questions sent directly by your enrolled students for human guidance.
              </p>
            </div>
          </div>

          {doubts.length === 0 ? (
            <div className="text-center py-14 text-slate-400 space-y-2">
              <MessageSquare size={32} className="mx-auto opacity-40" />
              <p className="text-sm font-medium">No student doubts received yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {doubts.map((d) => (
                <div key={d.id} className="p-6 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase",
                        d.status === 'open' ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                      )}>
                        {d.status}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{d.studentName}</span>
                      <span className="text-xs text-slate-400">• {d.subject} ({d.topic})</span>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(d.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 text-sm text-slate-800">
                    {d.question}
                  </div>

                  {d.reply && (
                    <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-sm text-indigo-950">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block mb-1">
                        Your Reply
                      </span>
                      {d.reply}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder={d.reply ? 'Update your reply...' : 'Write a clear explanation for this student...'}
                      value={replyInputs[d.id] || ''}
                      onChange={(e) => setReplyInputs((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      onClick={() => handleReplyDoubt(d.id)}
                      disabled={replyingId === d.id || !(replyInputs[d.id] || '').trim()}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Send size={15} />
                      {replyingId === d.id ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
