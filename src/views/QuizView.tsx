import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Trophy, 
  RotateCcw,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { Quiz, QuizQuestion } from '../types';
import { cn } from '../lib/utils';
import { dbService } from '../services/dbService';
import { useAuth } from '../lib/AuthContext';
import { aiService } from '../services/aiService';
import { toast } from 'sonner';

export function QuizView({ quiz, onFinish }: { 
  quiz: Quiz; 
  onFinish: () => void;
}) {
  const { user, profile, refreshProfile } = useAuth();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = quiz.questions[currentIdx];
  const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

  const handleAnswer = (option: string) => {
    if (showExplanation) return;
    setSelectedAnswer(option);
    setShowExplanation(true);
    if (option === currentQuestion.correctAnswer) {
      setScore(s => s + 1);
    }
    setAnswers([...answers, option]);
  };

  const nextQuestion = () => {
    if (currentIdx < quiz.questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    if (!user || !profile) return;
    setIsSubmitting(true);
    const finalScore = Math.round((score / quiz.questions.length) * 100);
    
    try {
      await dbService.completeQuiz(user.uid, quiz.id, finalScore);
      
      // Mark lesson as completed
      await dbService.updateLesson(user.uid, quiz.lessonId, 'completed');
      
      const lesson = await dbService.getLessons(user.uid).then(ls => ls.find(l => l.id === quiz.lessonId));
      
      // Update weaknesses if they missed some questions
      const missedQuestions = quiz.questions.filter((q, i) => answers[i] !== q.correctAnswer);
      if (missedQuestions.length > 0 && lesson) {
        try {
          const weakConcepts = await aiService.analyzeWeaknesses(quiz, answers);
          await dbService.updatePerformance(user.uid, lesson.subject, weakConcepts);
        } catch (aiErr) {
          console.error("Failed to analyze weaknesses:", aiErr);
          // Don't fail the whole quiz completion if AI analysis fails
        }
      }

      // Mark main lesson topic as mastered if score is good (>60%)
      if (finalScore >= 60 && lesson) {
        await dbService.markConceptMastered(user.uid, lesson.subject, lesson.title);
      }

      // Update user stats
      const today = new Date().toISOString().split('T')[0];
      const lastActivity = profile.lastActivityDate;
      let newStreak = profile.streak || 0;

      if (!lastActivity) {
        newStreak = 1;
      } else {
        const lastDate = new Date(lastActivity);
        const currentDate = new Date(today);
        const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive day
          newStreak += 1;
        } else if (diffDays > 1) {
          // Missed at least one day
          newStreak = 1;
        }
        // If diffDays is 0, they already learned today, streak remains the same
      }

      await dbService.updateUserProfile(user.uid, {
        totalLessons: (profile.totalLessons || 0) + 1,
        streak: newStreak,
        lastActivityDate: today,
      });

      await refreshProfile();
      setIsFinished(true);
    } catch (err) {
      toast.error('Failed to save your progress.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFinished) {
    const finalScore = Math.round((score / quiz.questions.length) * 100);
    return (
      <div className="max-w-xl mx-auto text-center space-y-8 animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] mx-auto flex items-center justify-center text-white shadow-2xl shadow-indigo-200">
          <Trophy size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Quiz Complete!</h2>
          <p className="text-slate-500 text-lg font-medium">Excellent work! You've mastered another topic.</p>
        </div>

        <div className="bg-white rounded-3xl p-10 shadow-xl border border-slate-100 relative overflow-hidden">
           {/* Background Celebration */}
           <div className="absolute top-0 right-0 p-6 opacity-5">
            <Sparkles size={80} className="text-indigo-600" />
           </div>
           
           <div className="text-6xl font-black text-indigo-600 mb-2">{finalScore}%</div>
           <div className="text-slate-400 font-bold uppercase tracking-widest text-xs">Final Success Rate</div>
           
           <div className="mt-10 grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl">
              <div className="text-xl font-bold text-slate-900">{score}/{quiz.questions.length}</div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Correct Answers</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl">
              <div className="text-xl font-bold text-slate-900">+10</div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Skill XP</div>
            </div>
           </div>
        </div>

        <button 
          onClick={onFinish}
          className="w-full flex items-center justify-center gap-2 py-5 bg-indigo-600 text-white rounded-[2rem] font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
        >
          Finish & Return <ArrowRight size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Quiz Progress */}
      <div className="flex items-center justify-between">
        <div className="text-slate-400 font-bold uppercase tracking-widest text-xs">
          Question {currentIdx + 1} of {quiz.questions.length}
        </div>
        <div className="flex gap-1.5">
          {quiz.questions.map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "w-8 h-1.5 rounded-full transition-all duration-300",
                i === currentIdx ? "bg-indigo-600" : i < currentIdx ? "bg-emerald-500" : "bg-slate-100"
              )} 
            />
          ))}
        </div>
      </div>

      {/* Question Card */}
      <motion.div 
        key={currentIdx}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-10"
      >
        <div className="flex items-start gap-4 mb-8">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <HelpCircle size={24} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 leading-tight">{currentQuestion.question}</h3>
        </div>

        <div className="space-y-3">
          {currentQuestion.options.map((option, i) => (
            <button
              key={i}
              onMouseDown={() => handleAnswer(option)}
              disabled={showExplanation}
              className={cn(
                "w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 flex items-center justify-between group",
                selectedAnswer === option
                  ? (option === currentQuestion.correctAnswer ? "border-emerald-500 bg-emerald-50/50" : "border-red-500 bg-red-50/50")
                  : showExplanation && option === currentQuestion.correctAnswer
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-slate-100 hover:border-indigo-200 text-slate-600"
              )}
            >
              <span className="font-semibold text-lg">{option}</span>
              {showExplanation && option === currentQuestion.correctAnswer && <CheckCircle2 className="text-emerald-500" />}
              {showExplanation && selectedAnswer === option && option !== currentQuestion.correctAnswer && <XCircle className="text-red-500" />}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {showExplanation && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 overflow-hidden"
            >
              <h4 className={cn("font-bold text-sm uppercase tracking-wider", isCorrect ? "text-emerald-600" : "text-red-600")}>
                {isCorrect ? "Correct!" : `Incorrect. The answer is ${currentQuestion.correctAnswer}`}
              </h4>
              <p className="text-slate-600 text-sm font-medium leading-relaxed">{currentQuestion.explanation}</p>
              
              <div className="pt-4">
                <button 
                  onClick={nextQuestion}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-70"
                >
                  {isSubmitting ? 'Syncing Result...' : currentIdx === quiz.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                  <ArrowRight size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
