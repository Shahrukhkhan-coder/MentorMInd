import React, { useState } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Headphones, 
  PlayCircle, 
  BrainCircuit, 
  GraduationCap, 
  BarChart3,
  Calendar,
  Zap,
  Info,
  ChevronRight,
  Target,
  Send,
  X as CloseIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { dbService } from '../services/dbService';
import { useAuth } from '../lib/AuthContext';

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  color: string;
}

function DocSection({ icon, title, description, features, color }: SectionProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group"
    >
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", color)}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 mb-6 leading-relaxed">{description}</p>
      <ul className="space-y-3">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            {feature}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export function DocumentationView() {
  const { user } = useAuth();
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await dbService.submitSupportTicket(user.uid, message);
      
      toast.success("Message sent! Our team will get back to you soon.");
      setMessage('');
      setShowSupportModal(false);
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      {/* Header */}
      <header className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-widest">
          <Info size={14} />
          Help & Documentation
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Master Your Learning Journey</h1>
        <p className="text-slate-500 max-w-2xl mx-auto text-lg">
          Welcome to your AI Personal Study Assistant. Here's a quick guide on how to make the most of our smart features.
        </p>
      </header>

      {/* Main Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DocSection 
          icon={<Zap size={28} />}
          title="Personalized Lessons"
          description="Every lesson is crafted specifically for your grade level and learning preferences."
          color="bg-amber-50 text-amber-600"
          features={[
            "Grade-specific content",
            "Socratic teaching method",
            "Analogies & real-world examples",
            "Interactive theory modules"
          ]}
        />
        <DocSection 
          icon={<Sparkles size={28} />}
          title="Learning Modes"
          description="Choose the mode that fits your current environment and learning style."
          color="bg-indigo-50 text-indigo-600"
          features={[
            "Text: Deep focus reading",
            "Audio: Learn while traveling",
            "Video: Visual conceptualization",
            "Seamless mode switching"
          ]}
        />
        <DocSection 
          icon={<BrainCircuit size={28} />}
          title="AI Mentor"
          description="Never stay stuck. Our AI mentor is available inside every lesson to clear your doubts."
          color="bg-purple-50 text-purple-600"
          features={[
            "Instant doubt clearing",
            "Simplified explanations",
            "Follow-up questions",
            "Concept breakdowns"
          ]}
        />
        <DocSection 
          icon={<GraduationCap size={28} />}
          title="Smart Assessments"
          description="Validate your knowledge with adaptive quizzes generated from your lessons."
          color="bg-emerald-50 text-emerald-600"
          features={[
            "Lesson-specific questions",
            "Instant score & feedback",
            "Difficulty adaptation",
            "Concept mastery tracking"
          ]}
        />
        <DocSection 
          icon={<BarChart3 size={28} />}
          title="Progress Tracking"
          description="Watch your growth over time with detailed performance analytics."
          color="bg-blue-50 text-blue-600"
          features={[
            "Average score trends",
            "Weekly study activity",
            "Topic mastery levels",
            "Daily study streaks"
          ]}
        />
        <DocSection 
          icon={<Target size={28} />}
          title="Study Goals"
          description="Set your targets and let the AI guide your learning path to achieve them."
          color="bg-rose-50 text-rose-600"
          features={[
            "Custom learning targets",
            "Goal-aligned content",
            "Performance insights",
            "Subject-wise focus"
          ]}
        />
      </div>

      {/* FAQs or Tips */}
      <div className="bg-slate-900 rounded-[3rem] p-10 md:p-16 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] -mr-48 -mt-48" />
        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-black leading-tight">Pro Tips for Maximum Learning</h2>
            <div className="space-y-4">
              {[
                { label: "Switch Modes", text: "Stuck on a text concept? Try switching to Video mode for a visual breakdown." },
                { label: "Ask the Mentor", text: "Use the 'Ask Mentor' button frequently. There's no such thing as a bad question." },
                { label: "Daily Streaks", text: "Studying just 15 mins daily is better than 2 hours once a week. Keep that streak alive!" }
              ].map((tip, idx) => (
                <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400 font-bold text-xs">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">{tip.label}</h4>
                    <p className="text-slate-400 text-sm">{tip.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/10 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="text-indigo-400" />
              <h3 className="text-xl font-bold">Need more help?</h3>
            </div>
            <p className="text-slate-300">
              Our support team is always ready to assist you with any technical issues or feature requests. 
              We update the app weekly with new teaching strategies and AI improvements.
            </p>
            <div className="pt-4">
              <button 
                onClick={() => setShowSupportModal(true)}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 transition-colors rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                Contact Support
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Support Modal */}
      <AnimatePresence>
        {showSupportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSupportModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                      <HelpCircle size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">How can we help?</h3>
                      <p className="text-sm text-slate-500">Ask us anything about the app</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowSupportModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <CloseIcon size={20} className="text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleSubmitSupport} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Message</label>
                    <textarea 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your issue or suggestions..."
                      className="w-full h-40 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none text-slate-700"
                      required
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      "Sending..."
                    ) : (
                      <>
                        Send Message
                        <Send size={18} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Help elements needed for modal
const HelpCircle = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

