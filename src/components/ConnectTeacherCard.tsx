import React, { useEffect, useState } from 'react';
import { Users, KeyRound, CheckCircle2, LogOut } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { dbService } from '../services/dbService';
import { EnrollmentRecord, TeacherDirectoryEntry } from '../types';
import { toast } from 'sonner';

export function ConnectTeacherCard() {
  const { user, profile, refreshProfile } = useAuth();
  const [classCode, setClassCode] = useState('');
  const [teachers, setTeachers] = useState<TeacherDirectoryEntry[]>([]);
  const [enrollment, setEnrollment] = useState<EnrollmentRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const [approved, myEnrollments] = await Promise.all([
          dbService.getApprovedTeachers(),
          dbService.getStudentEnrollments(user.uid),
        ]);
        setTeachers(approved);
        setEnrollment(myEnrollments.find((e) => e.status === 'active') || null);
      } catch (err) {
        console.error('Failed to load teacher connection info:', err);
      }
    };
    load();
  }, [user, profile?.teacherId]);

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !classCode.trim()) return;
    setLoading(true);
    try {
      const teacher = await dbService.findTeacherByClassCode(classCode);
      if (!teacher) {
        toast.error('No approved teacher found with that class code.');
        return;
      }
      const record = await dbService.enrollWithTeacher(profile, teacher);
      setEnrollment(record);
      setClassCode('');
      await refreshProfile();
      toast.success(`Connected with ${teacher.displayName}!`);
    } catch (err) {
      toast.error('Failed to connect with teacher.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeacher = async (teacher: TeacherDirectoryEntry) => {
    if (!profile) return;
    setLoading(true);
    try {
      const record = await dbService.enrollWithTeacher(profile, teacher);
      setEnrollment(record);
      await refreshProfile();
      toast.success(`Connected with ${teacher.displayName}!`);
    } catch (err) {
      toast.error('Failed to connect with teacher.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!user || !enrollment) return;
    setLoading(true);
    try {
      await dbService.leaveTeacher(user.uid, enrollment.teacherId);
      setEnrollment(null);
      await refreshProfile();
      toast.success('Disconnected from teacher.');
    } catch (err) {
      toast.error('Could not disconnect right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Your Human Teacher</h3>
            <p className="text-xs text-slate-500">
              Connect with an approved teacher so they can track your progress and guide your weak concepts.
            </p>
          </div>
        </div>
      </div>

      {enrollment ? (
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-indigo-600 shrink-0" size={20} />
            <div>
              <p className="font-bold text-slate-900 text-sm">{enrollment.teacherName}</p>
              <p className="text-xs text-indigo-700">Connected & syncing your progress automatically</p>
            </div>
          </div>
          <button
            onClick={handleLeave}
            disabled={loading}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-red-600 hover:border-red-200 transition-all flex items-center gap-1.5"
          >
            <LogOut size={14} />
            Leave Class
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <form onSubmit={handleJoinByCode} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Enter teacher class code (e.g. MM-JOHN42)"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:border-indigo-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !classCode.trim()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {loading ? 'Connecting...' : 'Join Class'}
            </button>
          </form>

          {teachers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Teachers</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teachers.slice(0, 4).map((t) => (
                  <button
                    key={t.teacherId}
                    onClick={() => handleSelectTeacher(t)}
                    disabled={loading}
                    className="p-3.5 rounded-2xl border border-slate-100 hover:border-indigo-300 text-left transition-all flex items-center justify-between gap-2 bg-slate-50/50"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{t.displayName}</p>
                      <p className="text-xs text-slate-500 truncate">{t.subjects.join(', ')}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold shrink-0">
                      Connect
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
