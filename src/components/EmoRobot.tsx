"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EmoRobotProps {
  isListening: boolean;
  isLoading: boolean;
  isOpen: boolean;
  onClick: () => void;
}

type EmoExpression = 'idle' | 'happy' | 'thinking' | 'listening' | 'wink' | 'sleepy' | 'look_left' | 'look_right';

export function EmoRobot({ isListening, isLoading, isOpen, onClick }: EmoRobotProps) {
  const [expression, setExpression] = useState<EmoExpression>('idle');
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });

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

  // Random expressions when idle
  useEffect(() => {
    if (!isListening && !isLoading) {
      const expressionInterval = setInterval(() => {
        const rand = Math.random();
        if (rand < 0.15) {
          // Wink
          setExpression('wink');
          setTimeout(() => setExpression(isOpen ? 'happy' : 'idle'), 300);
        } else if (rand < 0.3) {
          // Look around
          const dir = Math.random() > 0.5 ? 'look_left' : 'look_right';
          setExpression(dir);
          setTimeout(() => setExpression(isOpen ? 'happy' : 'idle'), 800);
        } else if (rand < 0.4) {
          // Sleepy blink
          setExpression('sleepy');
          setTimeout(() => setExpression(isOpen ? 'happy' : 'idle'), 200);
        }
      }, 3000);
      return () => clearInterval(expressionInterval);
    }
  }, [isListening, isLoading, isOpen]);

  // Eye styles based on expression
  const getLeftEyeStyle = () => {
    const base = "w-4 h-5 rounded-sm transition-all duration-150";
    
    switch (expression) {
      case 'happy':
        return { className: base, style: { clipPath: 'polygon(0 30%, 100% 30%, 80% 100%, 20% 100%)', height: '12px' } };
      case 'listening':
        return { className: base, style: { transform: 'scaleY(1.1)' } };
      case 'thinking':
        return { className: base, style: { transform: 'rotate(-10deg) translateY(-2px)' } };
      case 'wink':
        return { className: base, style: { height: '3px', transform: 'translateY(8px)' } };
      case 'sleepy':
        return { className: base, style: { height: '4px', transform: 'translateY(6px)' } };
      case 'look_left':
        return { className: base, style: { transform: 'translateX(-3px)' } };
      case 'look_right':
        return { className: base, style: { transform: 'translateX(3px)' } };
      default:
        return { className: base, style: {} };
    }
  };

  const getRightEyeStyle = () => {
    const base = "w-4 h-5 rounded-sm transition-all duration-150";
    
    switch (expression) {
      case 'happy':
        return { className: base, style: { clipPath: 'polygon(0 30%, 100% 30%, 80% 100%, 20% 100%)', height: '12px' } };
      case 'listening':
        return { className: base, style: { transform: 'scaleY(1.1)' } };
      case 'thinking':
        return { className: base, style: { transform: 'rotate(10deg) translateY(-2px)' } };
      case 'wink':
        return { className: base, style: {} }; // Right eye stays open during wink
      case 'sleepy':
        return { className: base, style: { height: '4px', transform: 'translateY(6px)' } };
      case 'look_left':
        return { className: base, style: { transform: 'translateX(-3px)' } };
      case 'look_right':
        return { className: base, style: { transform: 'translateX(3px)' } };
      default:
        return { className: base, style: {} };
    }
  };

  const eyeColor = isListening ? 'bg-red-400' : isLoading ? 'bg-yellow-400' : 'bg-cyan-400';
  const glowColor = isListening ? 'shadow-[0_0_15px_rgba(248,113,113,0.8)]' : 
                    isLoading ? 'shadow-[0_0_15px_rgba(250,204,21,0.8)]' : 
                    'shadow-[0_0_15px_rgba(34,211,238,0.8)]';

  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-[130] group"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={{
        y: isListening ? [0, -2, 0, 2, 0] : [0, -4, 0],
        rotate: isListening ? [-2, 2, -2] : 0,
      }}
      transition={{
        y: { duration: isListening ? 0.2 : 2.5, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: 0.15, repeat: Infinity },
      }}
    >
      <div className="relative flex items-center justify-center">
        {/* TV-shaped Robot Head */}
        <div className="relative">
          {/* Main Head - Rounded Rectangle TV Shape */}
          <motion.div 
            className={`relative w-16 h-14 bg-gradient-to-b from-[#2a2a3a] to-[#1a1a2a] rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
              isListening ? 'border-red-400/60' : 
              isLoading ? 'border-yellow-400/60' : 
              'border-cyan-400/40'
            }`}
            style={{
              boxShadow: isListening ? '0 0 30px rgba(248,113,113,0.4), inset 0 0 20px rgba(248,113,113,0.1)' :
                        isLoading ? '0 0 30px rgba(250,204,21,0.4), inset 0 0 20px rgba(250,204,21,0.1)' :
                        '0 0 25px rgba(34,211,238,0.3), inset 0 0 15px rgba(34,211,238,0.05)'
            }}
          >
            {/* Screen Reflection */}
            <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/5 to-transparent rounded-t-xl" />

            {/* Eyes Container - Centered */}
            <div className="absolute inset-0 flex items-center justify-center gap-3">
              {/* Left Eye */}
              <motion.div 
                className={`${getLeftEyeStyle().className} ${eyeColor} ${glowColor}`}
                style={getLeftEyeStyle().style}
                animate={isListening ? { opacity: [1, 0.5, 1] } : {}}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
              
              {/* Right Eye */}
              <motion.div 
                className={`${getRightEyeStyle().className} ${eyeColor} ${glowColor}`}
                style={getRightEyeStyle().style}
                animate={isListening ? { opacity: [1, 0.5, 1] } : {}}
                transition={{ duration: 0.5, repeat: Infinity, delay: 0.25 }}
              />
            </div>

            {/* Scanlines Effect */}
            <div className="absolute inset-0 pointer-events-none opacity-5 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,black_2px,black_4px)]" />
          </motion.div>

          {/* Small Stand/Base */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-gradient-to-b from-[#2a2a3a] to-[#1a1a2a] rounded-b-lg border-x border-b border-cyan-400/20" />
        </div>

        {/* Listening Waves */}
        <AnimatePresence>
          {isListening && (
            <>
              <motion.div 
                className="absolute inset-0 border-2 border-red-400/40 rounded-2xl"
                initial={{ scale: 1, opacity: 0.7 }}
                animate={{ scale: 1.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <motion.div 
                className="absolute inset-0 border-2 border-red-400/20 rounded-2xl"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.8, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
              />
            </>
          )}
        </AnimatePresence>
      </div>
      
      {/* Status Label */}
      <motion.div 
        className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-bold tracking-widest whitespace-nowrap font-mono ${
          isListening ? 'text-red-400' : isLoading ? 'text-yellow-400' : 'text-cyan-400/70'
        }`}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {isListening ? '● REC' : isLoading ? '◐ THINK' : isOpen ? '◉ READY' : '○ IDLE'}
      </motion.div>
    </motion.button>
  );
}
