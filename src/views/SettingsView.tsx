import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Save, User, BookOpen, GraduationCap, Check, MessageSquare, Star, Send } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { dbService } from '../services/dbService';
import { SUBJECTS, UserGrade, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export function SettingsView({ subjectsOnly, onBack }: { subjectsOnly?: boolean; onBack?: () => void }) {
  const { profile, user, refreshProfile } = useAuth();
  const [formData, setFormData] = useState<Partial<UserProfile>>(profile || {});
  const [isSaving, setIsSaving] = useState(false);
  
  // Feedback state
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const grades: UserGrade[] = ['Elementary', 'Middle School', 'High School', 'College', 'University'];

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const safeUpdates: Partial<UserProfile> = {
        displayName: formData.displayName || profile?.displayName || user.displayName || '',
        bio: formData.bio || '',
        grade: formData.grade || 'High School',
        subjects: formData.subjects || [],
        goals: formData.goals || '',
        learningMode: formData.learningMode || 'text',
      };
      await dbService.updateUserProfile(user.uid, safeUpdates);
      if (profile?.role === 'teacher' && profile?.teacherStatus === 'approved') {
        await dbService.updateTeacherDirectoryProfile(user.uid, {
          displayName: safeUpdates.displayName || user.email?.split('@')[0] || 'Educator',
          subjects: safeUpdates.subjects || [],
          bio: safeUpdates.bio || '',
        });
      }
      await refreshProfile();
      toast.success('Settings updated successfully!');
      if (onBack) onBack();
    } catch (err) {
      toast.error('Failed to update settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!user || !feedback.trim()) return;
    setIsSubmittingFeedback(true);
    try {
      await dbService.submitFeedback(user.uid, rating, feedback);
      toast.success('Thank you for your feedback!');
      setFeedback('');
      setRating(5);
    } catch (err) {
      toast.error('Failed to submit feedback.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const setSubject = (subject: string) => {
    setFormData({ ...formData, subjects: [subject] });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            {subjectsOnly ? 'Switch Subjects' : 'Settings'}
          </h2>
          <p className="text-slate-500">
            {subjectsOnly ? 'Select the subjects you want to focus on right now.' : 'Manage your profile and learning preferences.'}
          </p>
        </div>
        <div className="flex gap-3">
          {subjectsOnly && (
            <button
              onClick={onBack}
              className="px-6 py-3 bg-white border border-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-70"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className={cn("grid grid-cols-1 gap-8", !subjectsOnly && "lg:grid-cols-3")}>
        {/* Profile Section - Hidden if subjectsOnly */}
        {!subjectsOnly && (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <User size={20} className="text-indigo-600" />
                Academic Profile
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Grade Level</label>
                  <div className="space-y-2">
                    {grades.map((grade) => (
                      <button
                        key={grade}
                        onClick={() => setFormData({ ...formData, grade })}
                        className={cn(
                          "w-full p-3 rounded-xl border-2 text-left text-sm transition-all",
                          formData.grade === grade 
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold" 
                            : "border-slate-50 text-slate-500 hover:border-slate-200"
                        )}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subjects Section */}
        <div className={cn("space-y-6", !subjectsOnly ? "lg:col-span-2" : "w-full")}>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BookOpen size={20} className="text-indigo-600" />
              My Subjects
            </h3>
            <p className="text-sm text-slate-500">Select the subjects you want MentorMind to focus on.</p>
            
            <div className={cn(
              "grid gap-3",
              subjectsOnly ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-5" : "grid-cols-2 md:grid-cols-3"
            )}>
              {SUBJECTS.map((subject) => {
                const isSelected = formData.subjects?.includes(subject);
                return (
                  <button
                    key={subject}
                    onClick={() => setSubject(subject)}
                    className={cn(
                      "p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center justify-between",
                      isSelected 
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold" 
                        : "border-slate-50 text-slate-500 hover:border-slate-200"
                    )}
                  >
                    <span className="text-sm">{subject}</span>
                    {isSelected && <Check size={16} className="text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Goals - Hidden if subjectsOnly */}
          {!subjectsOnly && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap size={20} className="text-indigo-600" />
                Learning Goals
              </h3>
              <textarea
                className="w-full h-32 p-4 rounded-2xl border-2 border-slate-50 focus:border-indigo-300 focus:outline-none transition-all resize-none text-slate-600"
                value={formData.goals}
                onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                placeholder="What are you currently working towards?"
              />
            </div>
          )}
        </div>
      </div>

      {/* Feedback Section - Bottom of page */}
      {!subjectsOnly && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare size={24} className="text-indigo-600" />
                Feedback
              </h3>
              <p className="text-sm text-slate-500">Help us improve MentorMind by sharing your experience.</p>
            </div>
            
            <div className="flex-1 max-w-lg w-full space-y-4">
              <div className="flex items-center gap-2 justify-center md:justify-start py-2 bg-slate-50 rounded-2xl px-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={cn(
                      "transition-all hover:scale-110",
                      rating >= star ? "text-amber-400 fill-amber-400" : "text-slate-200"
                    )}
                  >
                    <Star size={24} />
                  </button>
                ))}
                <span className="ml-4 text-xs font-bold text-slate-400 uppercase">{rating}/5 stars</span>
              </div>
              
              <div className="flex gap-3">
                <textarea
                  className="flex-1 h-20 p-4 rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-sm text-slate-600 resize-none"
                  placeholder="What's on your mind? Suggestions, bugs, or things you love..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />

                <button
                  onClick={handleSubmitFeedback}
                  disabled={isSubmittingFeedback || !feedback.trim()}
                  className="px-8 bg-slate-900 text-white rounded-2xl font-bold flex flex-col items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 min-w-[100px]"
                >
                  {isSubmittingFeedback ? (
                    "..."
                  ) : (
                    <>
                      <Send size={18} />
                      <span className="text-xs">Send</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
