import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, ArrowRight, Check, Sparkles } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { dbService } from '../services/dbService';
import { UserProfile, UserGrade, LearningMode, SUBJECTS } from '../types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    grade: 'High School',
    subjects: [],
    goals: '',
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
      const fullProfile: UserProfile = {
        ...formData,
        userId: user.uid,
        email: user.email!,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as UserProfile;

      await dbService.createUserProfile(fullProfile);
      await refreshProfile();
      onComplete();
      toast.success('Your personalized learning path is ready!');
    } catch (err) {
      toast.error('Failed to save profile. Please try again.');
    }
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-white rounded-3xl shadow-xl p-8 md:p-12 relative overflow-hidden"
      >
        {/* Background Sparkle */}
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Sparkles size={120} className="text-indigo-600" />
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 mb-10">
          {[1, 2, 3, 4].map((s) => (
            <div 
              key={s} 
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-300",
                step >= s ? "bg-indigo-600" : "bg-slate-100"
              )} 
            />
          ))}
        </div>

        {/* Steps */}
        <div className="min-h-[400px]">
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
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Pick your subjects</h2>
                <p className="text-slate-500">Which subjects do you want to master with MentorMind?</p>
              </div>
              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {SUBJECTS.map((subject) => {
                  const isSelected = formData.subjects?.includes(subject);
                  return (
                    <button
                      key={subject}
                      onClick={() => {
                        const newSubjects = isSelected
                          ? formData.subjects?.filter(s => s !== subject)
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

          {step === 3 && (
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

          {step === 4 && (
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
          {step > 1 && (
            <button 
              onClick={prevStep}
              className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-semibold text-slate-600 hover:bg-slate-50 transition-all"
            >
              Back
            </button>
          )}
          <button 
            onClick={step === 4 ? handleComplete : nextStep}
            disabled={step === 2 && (!formData.subjects || formData.subjects.length === 0)}
            className={cn(
              "flex-[2] py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all duration-300",
              (step === 2 && (!formData.subjects || formData.subjects.length === 0))
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100"
            )}
          >
            {step === 4 ? "Start Learning" : "Continue"}
            <ArrowRight size={20} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
