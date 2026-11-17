import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, ArrowRight, Check, Sparkles, BookOpenCheck, Users } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { dbService } from '../services/dbService';
import { UserProfile, UserGrade, LearningMode, SUBJECTS, UserRole } from '../types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const { user, isAdmin, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState<UserRole>(isAdmin ? 'admin' : 'student');
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    displayName: user?.displayName || user?.email?.split('@')[0] || '',
    grade: 'High School',
    subjects: [],
    goals: '',
    bio: '',
    learningMode: 'text',
    studyFrequency: 'daily',
    streak: 0,
    lastActivityDate: '',
    totalLessons: 0,
  });

  const grades: UserGrade[] = ['Elementary', 'Middle School', 'High School', 'College', 'University'];
  const modes: { id: LearningMode; label: string; icon: string }[] = [
    { id: 'text', label: 'Simple Text', icon: '📝' },
    { id: 'voice', label: 'Voice Interaction', icon: '🎙️' },
    { id: 'video', label: 'Visual/Video', icon: '📺' },
  ];

  const handleComplete = async () => {
    if (!user) return;
    try {
      const roleToSave: UserRole = isAdmin ? 'admin' : selectedRole;
      const fullProfile: UserProfile = {
        userId: user.uid,
        email: user.email!,
        displayName: (formData.displayName || user.displayName || user.email?.split('@')[0] || 'Learner').trim(),
        role: roleToSave,
        ...(roleToSave === 'teacher' ? { teacherStatus: 'pending' as const } : {}),
        bio: formData.bio || '',
        grade: formData.grade || 'High School',
        subjects: formData.subjects || [],
        goals: formData.goals || (roleToSave === 'teacher' ? 'Guide students to mastery' : ''),
        learningMode: formData.learningMode || 'text',
        studyFrequency: formData.studyFrequency || 'daily',
        streak: 0,
        lastActivityDate: '',
        totalLessons: 0,
        recentTopics: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await dbService.createUserProfile(fullProfile);
      await refreshProfile();
      onComplete();
      toast.success(
        roleToSave === 'teacher'
          ? 'Teacher application submitted! An admin will approve your account shortly.'
          : 'Your personalized learning path is ready!'
      );
    } catch (err) {
      toast.error('Failed to save profile. Please try again.');
    }
  };

  const isTeacherFlow = !isAdmin && selectedRole === 'teacher';
  const totalSteps = isTeacherFlow ? 3 : 5;
  const currentProgressIndex = step + 1;

  const nextStep = () => {
    if (step === 0 && isTeacherFlow) {
      setStep(2); // jump straight to subjects
      return;
    }
    setStep((s) => s + 1);
  };

  const prevStep = () => {
    if (step === 2 && isTeacherFlow) {
      setStep(0);
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  };

  const isFinalStep = isTeacherFlow ? step === 3 : step === 4;

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-white rounded-3xl shadow-xl p-8 md:p-12 relative overflow-hidden my-auto"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Sparkles size={120} className="text-indigo-600" />
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 mb-10">
          {Array.from({ length: totalSteps }).map((_, idx) => {
            const active = isTeacherFlow
              ? (step === 0 ? idx === 0 : step === 2 ? idx <= 1 : idx <= 2)
              : currentProgressIndex > idx;
            return (
              <div
                key={idx}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-300",
                  active ? "bg-indigo-600" : "bg-slate-100"
                )}
              />
            );
          })}
        </div>

        <div className="min-h-[400px]">
          {step === 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {isAdmin ? 'Admin Profile Setup' : 'How will you use MentorMind?'}
                </h2>
                <p className="text-slate-500">
                  {isAdmin
                    ? 'Confirm your display name to enter your MentorMind portals.'
                    : 'Choose your role to personalize your workspace.'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Display Name</label>
                <input
                  type="text"
                  placeholder="Your full name"
                  value={formData.displayName || ''}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-300 focus:outline-none text-slate-700 font-medium"
                />
              </div>

              {!isAdmin && (
                <div className="grid grid-cols-1 gap-4 pt-2">
                  <button
                    onClick={() => setSelectedRole('student')}
                    className={cn(
                      "p-5 rounded-2xl border-2 text-left transition-all flex items-start gap-4",
                      selectedRole === 'student'
                        ? "border-indigo-600 bg-indigo-50/50"
                        : "border-slate-100 hover:border-indigo-200"
                    )}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <GraduationCap size={24} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-lg">I am a Student</div>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Learn with the AI Mentor, take adaptive quizzes, and connect with real teachers.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedRole('teacher')}
                    className={cn(
                      "p-5 rounded-2xl border-2 text-left transition-all flex items-start gap-4",
                      selectedRole === 'teacher'
                        ? "border-indigo-600 bg-indigo-50/50"
                        : "border-slate-100 hover:border-indigo-200"
                    )}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <Users size={24} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-lg">I am a Teacher</div>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Get a class code, monitor student progress & weak concepts, and mentor learners.
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">What's your current level?</h2>
                <p className="text-slate-500">We'll tailor your lessons to match your academic stage.</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {grades.map((grade) => (
                  <button
                    key={grade}
                    onClick={() => setFormData({ ...formData, grade })}
                    className={cn(
                      "p-4 rounded-2xl border-2 text-left transition-all duration-200",
                      formData.grade === grade
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 font-semibold"
                        : "border-slate-100 hover:border-indigo-200 text-slate-600"
                    )}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {isTeacherFlow ? 'Select your teaching subjects' : 'Pick your subjects'}
                </h2>
                <p className="text-slate-500">
                  {isTeacherFlow
                    ? 'Which subjects do you teach and mentor students in?'
                    : 'Which subjects do you want to master with MentorMind?'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {SUBJECTS.map((subject) => {
                  const isSelected = formData.subjects?.includes(subject);
                  return (
                    <button
                      key={subject}
                      onClick={() => {
                        const newSubjects = isSelected
                          ? formData.subjects?.filter((s) => s !== subject)
                          : [...(formData.subjects || []), subject];
                        setFormData({ ...formData, subjects: newSubjects });
                      }}
                      className={cn(
                        "p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center justify-between",
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 font-semibold"
                          : "border-slate-100 hover:border-indigo-200 text-slate-600"
                      )}
                    >
                      <span>{subject}</span>
                      {isSelected && <Check size={18} />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 3 && isTeacherFlow && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Tell students about yourself</h2>
                <p className="text-slate-500">
                  Add a short bio so students and admins know your background.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700">Teaching Bio</label>
                <textarea
                  placeholder="e.g. High school Physics & Math teacher with 5 years of experience helping students ace exams..."
                  className="w-full h-32 p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-300 focus:outline-none transition-all resize-none text-slate-600"
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>

              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
                <BookOpenCheck className="text-indigo-600 shrink-0 mt-0.5" size={20} />
                <p className="text-xs text-indigo-800 leading-relaxed">
                  After submitting, your Teacher account starts in <strong>Pending Approval</strong> until an Admin activates your Class Code.
                </p>
              </div>
            </motion.div>
          )}

          {step === 3 && !isTeacherFlow && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Learning goals & Mode</h2>
                <p className="text-slate-500">How do you prefer to learn every day?</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {modes.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setFormData({ ...formData, learningMode: mode.id })}
                      className={cn(
                        "p-4 rounded-2xl border-2 text-center transition-all duration-200",
                        formData.learningMode === mode.id
                          ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 font-semibold"
                          : "border-slate-100 hover:border-indigo-200 text-slate-600"
                      )}
                    >
                      <div className="text-2xl mb-1">{mode.icon}</div>
                      <div className="text-xs">{mode.label}</div>
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">What's your primary learning goal?</label>
                  <textarea
                    placeholder="e.g. Ace my midterms, understand Quantum Physics better..."
                    className="w-full h-24 p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-300 focus:outline-none transition-all resize-none text-slate-600"
                    value={formData.goals}
                    onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && !isTeacherFlow && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8 text-center"
            >
              <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                <Sparkles size={40} />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Ready to begin!</h2>
                <p className="text-slate-500">MentorMind is ready to create your personalized study plan. Your journey to excellence starts now.</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 text-left space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Level:</span>
                  <span className="text-slate-900 font-medium">{formData.grade}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subjects:</span>
                  <span className="text-slate-900 font-medium text-right">{formData.subjects?.join(', ') || 'None selected'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Mode:</span>
                  <span className="text-slate-900 font-medium capitalize">{formData.learningMode}</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-10 flex gap-3">
          {step > 0 && (
            <button
              onClick={prevStep}
              className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-semibold text-slate-600 hover:bg-slate-50 transition-all"
            >
              Back
            </button>
          )}
          <button
            onClick={isFinalStep ? handleComplete : nextStep}
            disabled={
              (step === 0 && !(formData.displayName || '').trim()) ||
              (step === 2 && (!formData.subjects || formData.subjects.length === 0))
            }
            className={cn(
              "flex-[2] py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all duration-300",
              ((step === 0 && !(formData.displayName || '').trim()) ||
                (step === 2 && (!formData.subjects || formData.subjects.length === 0)))
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100"
            )}
          >
            {isFinalStep ? (isTeacherFlow ? "Submit Application" : "Start Learning") : "Continue"}
            <ArrowRight size={20} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
