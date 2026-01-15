"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSfx } from "@/hooks/useSfx";

interface QuickCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string, mode: 'text' | 'voice') => void;
}

export function QuickCapture({ isOpen, onClose, onSubmit }: QuickCaptureProps) {
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [content, setContent] = useState('');
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const { playClick, playConfirm, playHover } = useSfx();

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && mode === 'text') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, mode]);

  // Voice recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setContent(transcript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = () => {
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const handleVoiceToggle = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      playClick();
      setContent('');
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    playConfirm();
    onSubmit(content.trim(), mode);
    setContent('');
    setIsListening(false);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    } else if (e.key === 'Escape') {
      playClick();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
            onClick={() => { playClick(); onClose(); }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed top-1/4 left-1/2 -translate-x-1/2 z-[101] w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#0a0b10] border-2 border-[#eca013] rounded-lg shadow-[0_0_40px_rgba(236,160,19,0.3)] overflow-hidden">
              {/* Header */}
              <div className="bg-[#eca013]/10 border-b-2 border-[#eca013]/30 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl text-[#eca013]">bolt</span>
                  <h2 className="text-lg font-bold tracking-widest text-[#eca013] uppercase">Quick_Capture</h2>
                </div>
                
                {/* Mode Toggle */}
                <div className="flex items-center gap-2 bg-[#0a0b10] rounded border border-[#eca013]/30 p-1">
                  <button
                    onClick={() => { playHover(); setMode('text'); }}
                    className={`px-3 py-1 rounded text-xs font-bold tracking-wide transition-all ${
                      mode === 'text' 
                        ? 'bg-[#eca013] text-[#0a0b10]' 
                        : 'text-[#eca013]/50 hover:text-[#eca013]'
                    }`}
                  >
                    TEXT
                  </button>
                  <button
                    onClick={() => { playHover(); setMode('voice'); }}
                    className={`px-3 py-1 rounded text-xs font-bold tracking-wide transition-all ${
                      mode === 'voice' 
                        ? 'bg-[#39ff14] text-[#0a0b10]' 
                        : 'text-[#39ff14]/50 hover:text-[#39ff14]'
                    }`}
                  >
                    VOICE
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                {mode === 'text' ? (
                  <div className="space-y-3">
                    <textarea
                      ref={inputRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="First line = Title\nRest = Description (press Enter for new line)"
                      className="w-full h-40 bg-[#0a0b10] border-2 border-[#eca013]/30 rounded p-4 text-[#eca013] font-mono resize-none focus:outline-none focus:border-[#eca013] focus:shadow-[0_0_20px_rgba(236,160,19,0.2)] transition-all"
                    />
                    
                    {/* Preview of what card will look like */}
                    {content && (
                      <div className="bg-[#0a0b10]/80 border border-[#eca013]/20 rounded p-3">
                        <div className="text-[10px] text-[#eca013]/50 uppercase tracking-wider mb-2">Preview:</div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 border-b border-[#eca013]/20 pb-2">
                            <span className="text-[10px] bg-[#eca013]/20 text-[#eca013] px-2 py-0.5 rounded border border-[#eca013]/30">TITLE</span>
                            <span className="text-[#eca013] font-bold text-sm">
                              {content.split('\n')[0] || 'New Note'}
                            </span>
                          </div>
                          <div className="text-[#eca013]/70 text-xs font-mono">
                            {content.split('\n').slice(1).join('\n') || 'No description'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center gap-4">
                    <button
                      onClick={handleVoiceToggle}
                      className={`relative w-24 h-24 rounded-full border-4 transition-all ${
                        isListening
                          ? 'border-[#39ff14] bg-[#39ff14]/20 shadow-[0_0_30px_rgba(57,255,20,0.5)] animate-pulse'
                          : 'border-[#39ff14]/30 bg-[#39ff14]/5 hover:border-[#39ff14]/50 hover:shadow-[0_0_20px_rgba(57,255,20,0.2)]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-5xl text-[#39ff14]">
                        {isListening ? 'pause' : 'mic'}
                      </span>
                    </button>
                    
                    <p className="text-[#39ff14]/70 text-sm font-mono">
                      {isListening ? 'Listening...' : 'Click to speak'}
                    </p>
                    
                    {content && (
                      <div className="w-full mt-2 p-4 bg-[#39ff14]/5 border border-[#39ff14]/30 rounded">
                        <p className="text-[#39ff14] font-mono text-sm">{content}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-[#0a0b10] border-t-2 border-[#eca013]/30 px-6 py-4 flex items-center justify-between">
                <p className="text-xs text-[#eca013]/50 font-mono">
                  ESC to cancel • Hotkey: ALT+N
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => { playClick(); onClose(); }}
                    className="px-4 py-2 border border-[#eca013]/30 text-[#eca013]/70 hover:text-[#eca013] hover:border-[#eca013] rounded uppercase text-xs font-bold tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!content.trim()}
                    className="px-6 py-2 bg-[#eca013] text-[#0a0b10] rounded uppercase text-xs font-bold tracking-wider hover:bg-[#39ff14] hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#eca013] disabled:hover:shadow-none"
                  >
                    Create Note
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
