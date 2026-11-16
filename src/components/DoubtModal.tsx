import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Send, BrainCircuit, MessageSquare, Loader2 } from 'lucide-react';
import { aiService } from '../services/aiService';
import { useAuth } from '../lib/AuthContext';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

export function DoubtModal({ 
  concept, 
  subject, 
  onClose,
  onResolve 
}: { 
  concept: string; 
  subject: string; 
  onClose: () => void;
  onResolve: () => void;
}) {
  const { profile } = useAuth();
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const getInitialExplanation = async () => {
      if (!profile) return;
      try {
        const response = await aiService.generateQuickRelief(concept, subject, profile.grade, profile.goals);
        setExplanation(response);
        setMessages([{ role: 'assistant', content: response }]);
      } catch (err) {
        setExplanation("Sorry, I couldn't generate an explanation right now.");
      } finally {
        setLoading(false);
      }
    };
    getInitialExplanation();
  }, [concept, subject, profile]);

  const handleSend = async () => {
    if (!input.trim() || loading || !profile) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const response = await aiService.chatAboutConcept(concept, subject, userMsg, messages, profile.grade, profile.goals);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-white shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider">
              <BrainCircuit size={14} />
              <span>{subject} Doubt Relief</span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          <h2 className="text-2xl font-black">{concept}</h2>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {messages.map((msg, i) => (
            <div key={i} className={cn(
              "flex gap-3 max-w-[85%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                msg.role === 'assistant' ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
              )}>
                {msg.role === 'assistant' ? <Sparkles size={16} /> : <MessageSquare size={16} />}
              </div>
              <div className={cn(
                "p-4 rounded-2xl text-sm leading-relaxed",
                msg.role === 'assistant' 
                  ? "bg-white border border-slate-100 text-slate-800 shadow-sm" 
                  : "bg-indigo-600 text-white"
              )}>
                <div className="markdown-body">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 mr-auto items-center text-slate-400 text-xs font-medium animate-pulse">
              <Loader2 className="animate-spin" size={14} />
              MentorMind is thinking...
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-slate-100 shrink-0">
          <div className="flex gap-2 mb-4">
            <input 
              type="text"
              placeholder="Ask anything about this concept..."
              className="flex-1 px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:border-indigo-300 transition-all text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-400 font-medium">Concept clear? Resolve it to remove from focus areas.</p>
            <button 
              onClick={onResolve}
              className="px-4 py-2 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-xl hover:bg-emerald-100 transition-all"
            >
              Mark concept clear
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
