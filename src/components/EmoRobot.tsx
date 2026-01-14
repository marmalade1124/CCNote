"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EmoRobotProps {
  isListening: boolean;
  isLoading: boolean;
  isOpen: boolean;
  onClick: () => void;
}

type EmoExpression = 'idle' | 'happy' | 'thinking' | 'listening' | 'surprised' | 'sleepy';

export function EmoRobot({ isListening, isLoading, isOpen, onClick }: EmoRobotProps) {
  const [expression, setExpression] = useState<EmoExpression>('idle');
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);

  // Determine expression based on state
  useEffect(() => {
    if (isListening) {
      setExpression('listening');
    } else if (isLoading) {
      setExpression('thinking');
    } else if (isOpen) {
      setExpression('happy');
    } else {
      setExpression('idle');
    }
  }, [isListening, isLoading, isOpen]);

  // Random blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
      }
    }, 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Random eye movement when idle
  useEffect(() => {
    if (expression === 'idle' || expression === 'happy') {
      const moveInterval = setInterval(() => {
        setEyePosition({
          x: (Math.random() - 0.5) * 4,
          y: (Math.random() - 0.5) * 2,
        });
      }, 3000);
      return () => clearInterval(moveInterval);
    } else {
      setEyePosition({ x: 0, y: 0 });
    }
  }, [expression]);

  // Eye expressions
  const getEyeStyle = () => {
    if (isBlinking) {
      return { height: '2px', borderRadius: '1px' };
    }
    
    switch (expression) {
      case 'listening':
        return { 
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
          animation: 'pulse 0.5s infinite'
        };
      case 'thinking':
        return { 
          transform: `rotate(5deg) translateY(-1px)`,
          borderRadius: '2px 2px 50% 50%'
        };
      case 'happy':
        return { 
          clipPath: 'polygon(0 30%, 100% 30%, 80% 100%, 20% 100%)',
          height: '6px'
        };
      case 'surprised':
        return { 
          transform: 'scale(1.3)',
          borderRadius: '50%'
        };
      case 'sleepy':
        return { 
          height: '4px',
          transform: 'translateY(2px)'
        };
      default:
        return {};
    }
  };

  // Mouth expressions as pixel bars
  const getMouthBars = () => {
    switch (expression) {
      case 'happy':
        return [0.2, 0.6, 1, 0.6, 0.2]; // Smile curve
      case 'listening':
        return [0.8, 0.4, 0.9, 0.3, 0.7]; // Waveform
      case 'thinking':
        return [0.5, 0.5, 0.5, 0.5, 0.5]; // Flat
      case 'surprised':
        return [0.3, 0.8, 0.8, 0.8, 0.3]; // O shape
      default:
        return [0.4, 0.6, 0.7, 0.6, 0.4]; // Neutral
    }
  };

  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-[130] group"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={{
        y: expression === 'listening' ? [0, -2, 0, 2, 0] : 
           expression === 'thinking' ? [0, -1, 0] : 
           [0, -3, 0],
        rotate: expression === 'listening' ? [-1, 1, -1] : 0,
      }}
      transition={{
        y: { duration: expression === 'listening' ? 0.15 : 2, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: 0.1, repeat: Infinity },
      }}
    >
      <div className="relative flex items-center justify-center">
        {/* Robot Head - LCD Screen Style */}
        <motion.div 
          className={`relative w-16 h-16 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] rounded-xl border-2 transition-colors duration-300 overflow-hidden ${
            isListening ? 'border-red-500 shadow-[0_0_30px_rgba(255,0,0,0.5)]' : 
            isLoading ? 'border-yellow-500 shadow-[0_0_30px_rgba(255,200,0,0.5)]' : 
            'border-[#39ff14]/70 shadow-[0_0_25px_rgba(57,255,20,0.4)]'
          }`}
        >
          {/* Screen Glow Effect */}
          <div className={`absolute inset-0 opacity-20 ${
            isListening ? 'bg-red-500' : isLoading ? 'bg-yellow-500' : 'bg-[#39ff14]'
          }`} />

          {/* Eyes Container */}
          <div className="absolute top-3 left-0 right-0 flex justify-center gap-4 px-2">
            {/* Left Eye */}
            <motion.div 
              className={`w-4 h-5 rounded-sm flex items-center justify-center ${
                isListening ? 'bg-red-500' : isLoading ? 'bg-yellow-500' : 'bg-[#39ff14]'
              }`}
              animate={{ 
                x: eyePosition.x,
                y: eyePosition.y,
              }}
              transition={{ duration: 0.3 }}
              style={getEyeStyle()}
            >
              {/* Pupil/Highlight */}
              <div className="w-1.5 h-1.5 bg-black/30 rounded-full" />
            </motion.div>
            
            {/* Right Eye */}
            <motion.div 
              className={`w-4 h-5 rounded-sm flex items-center justify-center ${
                isListening ? 'bg-red-500' : isLoading ? 'bg-yellow-500' : 'bg-[#39ff14]'
              }`}
              animate={{ 
                x: eyePosition.x,
                y: eyePosition.y,
              }}
              transition={{ duration: 0.3, delay: 0.05 }}
              style={getEyeStyle()}
            >
              <div className="w-1.5 h-1.5 bg-black/30 rounded-full" />
            </motion.div>
          </div>
          
          {/* Mouth - Animated Bars */}
          <div className="absolute bottom-3 left-2 right-2 flex justify-center items-end gap-[2px] h-4">
            {getMouthBars().map((height, i) => (
              <motion.div 
                key={i}
                className={`w-[4px] rounded-sm ${
                  isListening ? 'bg-red-500' : isLoading ? 'bg-yellow-500' : 'bg-[#39ff14]'
                }`}
                animate={{ 
                  height: isLoading ? [height * 12, (1 - height) * 12, height * 12] : height * 12,
                  opacity: isLoading ? [0.5, 1, 0.5] : 0.7
                }}
                transition={{ 
                  duration: 0.15 + i * 0.03, 
                  repeat: isLoading ? Infinity : 0,
                  delay: i * 0.05
                }}
                style={{ height: height * 12 }}
              />
            ))}
          </div>

          {/* Screen Scanlines */}
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,black_2px,black_4px)]" />
        </motion.div>

        {/* Antenna */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-[3px] h-4 bg-gradient-to-t from-[#39ff14]/60 to-transparent rounded-full">
          <motion.div 
            className={`absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full ${
              isListening ? 'bg-red-500' : isLoading ? 'bg-yellow-500' : 'bg-[#39ff14]'
            } shadow-[0_0_10px_currentColor]`}
            animate={{
              scale: isListening ? [1, 1.5, 1] : [1, 1.2, 1],
              opacity: isListening ? [1, 0.3, 1] : 1,
            }}
            transition={{ duration: isListening ? 0.3 : 1.5, repeat: Infinity }}
          />
        </div>

        {/* Ear Speakers */}
        <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-2 h-6 bg-gradient-to-r from-[#2a2a2a] to-[#1a1a1a] rounded-l-md border border-[#39ff14]/30" />
        <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-2 h-6 bg-gradient-to-l from-[#2a2a2a] to-[#1a1a1a] rounded-r-md border border-[#39ff14]/30" />

        {/* Sound Waves when Listening */}
        <AnimatePresence>
          {isListening && (
            <>
              <motion.div 
                className="absolute inset-0 border-2 border-red-500/50 rounded-xl"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 1.4, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <motion.div 
                className="absolute inset-0 border-2 border-red-500/30 rounded-xl"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.6, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
              />
            </>
          )}
        </AnimatePresence>
      </div>
      
      {/* Status Label */}
      <motion.div 
        className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-bold tracking-wider whitespace-nowrap font-mono ${
          isListening ? 'text-red-500' : isLoading ? 'text-yellow-500' : 'text-[#39ff14]/70'
        }`}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {isListening ? '● REC' : isLoading ? '◐ THINK' : isOpen ? '◉ ACTIVE' : '○ IDLE'}
      </motion.div>
    </motion.button>
  );
}
