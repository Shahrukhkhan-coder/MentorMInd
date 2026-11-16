import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Sparkles, 
  BookOpen, 
  CheckCircle2, 
  Volume2,
  VolumeX,
  Square,
  Play, 
  ChevronRight,
  Headphones,
  Layout,
  FileText,
  BrainCircuit,
  Lightbulb,
  Puzzle,
  Star,
  HelpCircle,
  GraduationCap
} from 'lucide-react';
import { Lesson } from '../types';
import { cn } from '../lib/utils';
import { aiService } from '../services/aiService';
import { dbService } from '../services/dbService';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';
import { DoubtModal } from '../components/DoubtModal';
import { AnimatePresence } from 'motion/react';

function ModuleIcon({ type }: { type: string }) {
  switch (type) {
    case 'theory': return <BookOpen size={24} />;
    case 'example': return <Lightbulb size={24} />;
    case 'analogy': return <Puzzle size={24} />;
    case 'key-takeaway': return <Star size={24} />;
    case 'socratic-question': return <HelpCircle size={24} />;
    default: return <GraduationCap size={24} />;
  }
}

function ModuleStyles({ type }: { type: string }) {
  switch (type) {
    case 'theory': return "bg-white border-slate-200 text-slate-900";
    case 'example': return "bg-emerald-50/30 border-emerald-100 text-emerald-900";
    case 'analogy': return "bg-purple-50/30 border-purple-100 text-purple-900";
    case 'key-takeaway': return "bg-amber-50/30 border-amber-100 text-amber-900";
    case 'socratic-question': return "bg-indigo-50/30 border-indigo-100 text-indigo-900";
    default: return "bg-white border-slate-200";
  }
}

function ModuleHeaderStyles({ type }: { type: string }) {
  switch (type) {
    case 'theory': return "text-slate-600 bg-slate-100";
    case 'example': return "text-emerald-600 bg-emerald-100";
    case 'analogy': return "text-purple-600 bg-purple-100";
    case 'key-takeaway': return "text-amber-600 bg-amber-100";
    case 'socratic-question': return "text-indigo-600 bg-indigo-100";
    default: return "text-slate-600 bg-slate-100";
  }
}

export function LessonView({ lesson, onBack, onStartQuiz }: { 
  lesson: Lesson; 
  onBack: () => void;
  onStartQuiz: (lessonId: string) => void;
}) {
  const { user, profile } = useAuth();
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [showDoubtModal, setShowDoubtModal] = useState(false);

  React.useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = lesson.modules 
      ? lesson.modules.map(m => `${m.title}. ${m.content}`).join(' ')
      : lesson.content.replace(/[#*`]/g, ''); 

    const newUtterance = new SpeechSynthesisUtterance(textToSpeak);
    newUtterance.onend = () => setIsSpeaking(false);
    newUtterance.onerror = () => setIsSpeaking(false);
    
    // Pick a nice voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) || voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) newUtterance.voice = englishVoice;
    
    setUtterance(newUtterance);
    window.speechSynthesis.speak(newUtterance);
    setIsSpeaking(true);
  };

  const [activeScene, setActiveScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Parse scenes for video mode
  const scenes = React.useMemo(() => {
    if (lesson.mode !== 'video') return [];
    
    const content = lesson.content;
    const sceneBlocks = content.split(/(?=## (?:SCENE|SEGMENT|PART) \d+)/gi).filter(Boolean);
    const titles = content.match(/## (?:SCENE|SEGMENT|PART) \d+:? (.*)/gi)?.map(t => t.replace(/## (?:SCENE|SEGMENT|PART) \d+:? /i, '')) || [];
    
    if (sceneBlocks.length === 0) return [];

    return sceneBlocks.map((block, idx) => {
      const visualMatch = block.match(/\*\*VISUAL\*\*:(.*)/i);
      const audioMatch = block.match(/\*\*AUDIO\*\*:(.*)/i);
      const visual = visualMatch ? visualMatch[1].trim() : "Visualizing key concepts...";
      const audio = audioMatch ? audioMatch[1].trim() : block.replace(/##.*?\n/, '').trim();
      return {
        title: titles[idx] || `Scene ${idx + 1}`,
        visual,
        audio
      };
    });
  }, [lesson]);

  React.useEffect(() => {
    if (lesson.mode === 'video' && isPlaying && scenes[activeScene]) {
      const textToSpeak = scenes[activeScene].audio;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      
      utterance.onend = () => {
        if (activeScene < scenes.length - 1) {
          setActiveScene(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      };

      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) || voices.find(v => v.lang.startsWith('en'));
      if (voice) utterance.voice = voice;

      window.speechSynthesis.speak(utterance);
      return () => window.speechSynthesis.cancel();
    }
  }, [isPlaying, activeScene, scenes, lesson.mode]);

  const toggleVideo = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
    }
  };

  const startQuiz = async () => {
    if (!user || isGeneratingQuiz) return;
    setIsGeneratingQuiz(true);
    try {
      const existingQuizzes = await dbService.getQuizzes(user.uid);
      const quiz = existingQuizzes.find(q => q.lessonId === lesson.id);
      
      if (quiz) {
        onStartQuiz(quiz.id);
      } else {
        const quizData = await aiService.generateQuiz(lesson);
        const quizId = await dbService.addQuiz(user.uid, quizData);
        onStartQuiz(quizId);
      }
    } catch (err: any) {
      const errorMessage = err?.message?.toLowerCase() || '';
      if (err?.status === 429 || errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('exhausted') || errorMessage.includes('rate limit')) {
        toast.error('AI quota limit reached. Please wait a moment or check your API key billing in Settings > Secrets.');
      } else if (err?.status === 403 || err?.status === 400 || errorMessage.includes('api_key') || errorMessage.includes('permission_denied')) {
        toast.error('Please check your Gemini API key in Settings > Secrets.');
      } else {
        toast.error('Failed to generate quiz. Please check your connection.');
      }
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
        <div className="flex gap-2">
          {lesson.mode === 'voice' && (
            <button className="p-3 bg-white border border-slate-100 rounded-2xl text-indigo-600 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
              <Headphones size={20} />
              <span className="text-xs font-bold uppercase">Voice Mode</span>
            </button>
          )}
          {lesson.mode === 'video' && (
            <button className="p-3 bg-white border border-slate-100 rounded-2xl text-indigo-600 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
              <Layout size={20} />
              <span className="text-xs font-bold uppercase">Video Mode</span>
            </button>
          )}
          {lesson.mode === 'text' && (
            <button className="p-3 bg-white border border-slate-100 rounded-2xl text-indigo-600 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
              <FileText size={20} />
              <span className="text-xs font-bold uppercase">Text Mode</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Relief Floating Button */}
      <div className="fixed bottom-8 right-8 z-[60] hidden md:block">
        <button 
          onClick={() => setShowDoubtModal(true)}
          className="w-14 h-14 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-2xl border border-indigo-100 hover:scale-110 active:scale-95 transition-all group relative"
        >
          <div className="absolute inset-0 bg-indigo-600 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300 opacity-10" />
          <BrainCircuit size={28} />
          <span className="absolute right-full mr-4 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all pointer-events-none">
            Stuck? Ask Mentor
          </span>
        </button>
      </div>

      {/* Lesson Content Card */}
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-indigo-50/50 border border-slate-100 overflow-hidden relative">
        {lesson.mode !== 'video' && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-10 md:p-14 border-b border-indigo-100/50">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-6">
              <BookOpen size={14} />
              <span>{lesson.subject}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6 leading-tight">{lesson.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm font-medium">
              <span className="flex items-center gap-1.5 bg-white/50 px-3 py-1 rounded-lg border border-white/80">
                <Sparkles size={14} className="text-amber-500" />
                {lesson.difficulty} Level
              </span>
              <span className="flex items-center gap-1.5 bg-white/50 px-3 py-1 rounded-lg border border-white/80">
                <CheckCircle2 size={14} className="text-emerald-500" />
                Interactive Lesson
              </span>
              <span className="flex items-center gap-1.5 bg-white/50 px-3 py-1 rounded-lg border border-white/80">
                <GraduationCap size={14} className="text-indigo-500" />
                {lesson.grade}
              </span>
            </div>
          </div>
        )}

        {/* Content Section */}
        <div className={cn("p-6 md:p-10", lesson.mode === 'video' ? "bg-slate-900 p-0" : "bg-slate-50/30")}>
          {lesson.mode === 'voice' && (
            <div className="mb-8 p-8 bg-white rounded-3xl border border-indigo-100 flex items-center justify-between gap-6 group shadow-sm">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Headphones size={32} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xl">Listen to Lesson</h4>
                  <p className="text-slate-500">Perfect for hands-free learning</p>
                </div>
              </div>
              <button 
                onClick={toggleSpeech}
                className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95"
              >
                {isSpeaking ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
              </button>
            </div>
          )}

          {lesson.mode === 'video' && scenes.length > 0 ? (
            <div className="aspect-video bg-black relative overflow-hidden flex flex-col group">
              <div className="flex-1 relative flex items-center justify-center p-12 overflow-hidden">
                <motion.div 
                  key={activeScene}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.1, y: -20 }}
                  className="text-center space-y-8 z-10 max-w-2xl"
                >
                  <div className="inline-block px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-4">
                    Scene {activeScene + 1}: {scenes[activeScene].title}
                  </div>
                  
                  <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 shadow-2xl">
                    <p className="text-2xl md:text-3xl font-bold text-white leading-tight">
                      {scenes[activeScene].visual}
                    </p>
                  </div>
                  
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-indigo-200 text-lg font-medium opacity-80"
                  >
                    "{scenes[activeScene].audio}"
                  </motion.p>
                </motion.div>

                <div className="absolute inset-0 z-0">
                  <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
                  <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[140px] animate-pulse delay-700" />
                </div>
              </div>

              <div className="p-6 bg-gradient-to-t from-black/80 to-transparent relative z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="h-1.5 bg-white/20 rounded-full mb-6 overflow-hidden cursor-pointer">
                  <motion.div 
                    initial={false}
                    animate={{ width: `${((activeScene + 1) / scenes.length) * 100}%` }}
                    className="h-full bg-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={toggleVideo}
                      className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                    >
                      {isPlaying ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                    </button>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        disabled={activeScene === 0}
                        onClick={() => {
                          window.speechSynthesis.cancel();
                          setActiveScene(prev => Math.max(0, prev - 1));
                        }}
                        className="p-2 text-white/60 hover:text-white disabled:opacity-30 transition-colors"
                      >
                        <ArrowLeft size={24} />
                      </button>
                      <button 
                        disabled={activeScene === scenes.length - 1}
                        onClick={() => {
                          window.speechSynthesis.cancel();
                          setActiveScene(prev => Math.min(scenes.length - 1, prev + 1));
                        }}
                        className="p-2 text-white/60 hover:text-white disabled:opacity-30 transition-colors"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </div>

                    <div className="text-white/60 text-xs font-black tracking-widest uppercase">
                      Scene {activeScene + 1} of {scenes.length}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
                      <span className="text-[10px] text-white font-bold uppercase tracking-wider">AI Narrative</span>
                    </div>
                    <Layout size={20} className="text-white opacity-40" />
                  </div>
                </div>
              </div>
            </div>
          ) : lesson.modules ? (
            <div className="space-y-8">
              {lesson.modules.map((module, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={cn(
                    "p-8 rounded-[2rem] border-2 shadow-sm transition-all hover:shadow-md",
                    ModuleStyles({ type: module.type })
                  )}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className={cn(
                      "p-3 rounded-2xl",
                      ModuleHeaderStyles({ type: module.type })
                    )}>
                      <ModuleIcon type={module.type} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-0.5">
                        {module.type.replace('-', ' ')}
                      </span>
                      <h3 className="text-xl font-bold">{module.title}</h3>
                    </div>
                  </div>
                  
                  <div className="prose prose-slate max-w-none prose-p:text-lg prose-p:leading-relaxed prose-p:text-slate-700 font-medium">
                    <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                      {module.content}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="markdown-body p-8 bg-white rounded-[2rem] border border-slate-200 text-lg text-slate-700 leading-relaxed font-medium">
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                {lesson.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-10 md:p-14 bg-white border-t border-slate-100 grid md:grid-cols-2 gap-10 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="pb-10 md:pb-0 md:pr-10 text-center md:text-left flex flex-col items-center md:items-start justify-center">
            <div className="bg-indigo-50 p-4 rounded-2xl mb-6 text-indigo-600">
              <BrainCircuit size={28} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">Still confused?</h3>
            <p className="text-slate-500 mb-8 text-base max-w-sm leading-relaxed">Our AI mentor can explain this in even simpler terms or focus on a specific part you missed.</p>
            <button 
              onClick={() => setShowDoubtModal(true)}
              className="inline-flex items-center gap-3 px-8 py-4 bg-white border-2 border-indigo-100 text-indigo-600 rounded-2xl font-bold hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-sm"
            >
              Ask your AI Teacher
            </button>
          </div>
          
          <div className="pt-10 md:pt-0 md:pl-10 text-center md:text-left flex flex-col items-center md:items-start justify-center">
            <div className="bg-emerald-50 p-4 rounded-2xl mb-6 text-emerald-600">
              <CheckCircle2 size={28} />
            </div>
            <div className="mb-8 space-y-3">
              <h3 className="text-2xl font-bold text-slate-900">Ready to level up?</h3>
              <p className="text-slate-500 text-base max-w-sm leading-relaxed">Complete the assessment to unlock the next topic and see your progress.</p>
            </div>
            <button 
              onClick={startQuiz}
              disabled={isGeneratingQuiz}
              className="group px-12 py-5 bg-indigo-600 text-white rounded-2xl font-bold text-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-4 disabled:opacity-70"
            >
              {isGeneratingQuiz ? 'Syncing...' : 'Take the Quiz'}
              <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Doubt Modal Integration */}
      <AnimatePresence>
        {showDoubtModal && (
          <DoubtModal 
            concept={lesson.title}
            subject={lesson.subject}
            onClose={() => setShowDoubtModal(false)}
            onResolve={() => {
              setShowDoubtModal(false);
              toast.success("Great! Keep learning.");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
