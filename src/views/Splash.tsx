import React from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Sparkles } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export function Splash() {
  const { signIn } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Top Left Logo & Name */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute top-6 left-12 z-20 flex items-center gap-3"
      >
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
          <GraduationCap size={20} />
        </div>
        <span className="text-xl font-black text-slate-900 tracking-tight">MentorMind</span>
      </motion.div>

      {/* Background Decorative Elements */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
          rotate: [0, 90, 0]
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-indigo-500 rounded-full blur-[100px]"
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.2, 0.1],
          rotate: [0, -90, 0]
        }}
        transition={{ duration: 12, repeat: Infinity }}
        className="absolute bottom-[-10%] left-[-5%] w-[350px] h-[350px] bg-purple-500 rounded-full blur-[100px]"
      />

      <div className="z-10 text-center max-w-2xl px-4 mt-24">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-6xl font-black text-slate-900 mb-6 tracking-tight leading-[0.9]"
        >
          Unlock Your Future with <span className="text-indigo-600">MentorMind</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl text-slate-600 mb-12 leading-relaxed font-medium"
        >
          Learn subjects 10x faster with a personal AI teacher that adapts to your unique learning style and weaknesses.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={signIn}
          className="px-12 py-5 bg-indigo-600 text-white rounded-3xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-3 mx-auto"
        >
          Get Started
        </motion.button>

        {/* Stats Footer (Kept from adjustment) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-24 flex items-center justify-center gap-12"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">10x</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Faster Retention</span>
          </div>
          <div className="w-px h-12 bg-slate-200" />
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">24/7</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">AI Tutoring</span>
          </div>
          <div className="w-px h-12 bg-slate-200" />
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">100%</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Personalized</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
