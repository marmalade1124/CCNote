"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";

interface EmoRobotProps {
  isListening: boolean;
  isLoading: boolean;
  isOpen: boolean;
  onClick: () => void;
  onMotivate?: (message: string) => void;
}

type EmoExpression = 'idle' | 'happy' | 'thinking' | 'listening' | 'wink' | 'sleepy' | 'sad';

const MOTIVATIONAL_MESSAGES = [
  "You're doing great! 🚀",
  "Keep up the awesome work!",
  "Ideas are flowing today!",
  "Your canvas is looking good!",
  "Stay focused, you got this!",
  "Time for a creative burst!",
  "You're on fire today! 🔥",
  "Amazing progress!",
  "Keep building! 💪",
  "Your ideas matter!",
];

export function EmoRobot({ isListening, isLoading, isOpen, onClick, onMotivate }: EmoRobotProps) {
  const [expression, setExpression] = useState<EmoExpression>('idle');
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const robotRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

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

  // Track cursor with eyes (throttled)
  useEffect(() => {
    let animationFrame: number;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!robotRef.current || isListening || isLoading) return;
      
      const robot = robotRef.current.getBoundingClientRect();
      const robotCenterX = robot.left + robot.width / 2;
      const robotCenterY = robot.top + robot.height / 2;
      
      // Calculate offset (max 4px)
      const dx = e.clientX - robotCenterX;
      const dy = e.clientY - robotCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxOffset = 4;
      
      if (distance > 50) { // Only track if cursor is far enough
        setEyeOffset({
          x: Math.max(-maxOffset, Math.min(maxOffset, dx / 50)),
          y: Math.max(-maxOffset, Math.min(maxOffset, dy / 50)),
        });
      } else {
        setEyeOffset({ x: 0, y: 0 });
      }
    };
    
    const throttledHandler = (e: MouseEvent) => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => handleMouseMove(e));
    };
    
    window.addEventListener('mousemove', throttledHandler);
    return () => {
      window.removeEventListener('mousemove', throttledHandler);
      cancelAnimationFrame(animationFrame);
    };
  }, [isListening, isLoading]);

  // Random expressions and motivational messages
  useEffect(() => {
    if (isListening || isLoading) return;
    
    const interval = setInterval(() => {
      const rand = Math.random();
      
      // Random expression
      if (rand < 0.1) {
        setExpression('wink');
        setTimeout(() => setExpression(isOpen ? 'happy' : 'idle'), 300);
      } else if (rand < 0.15) {
        setExpression('sleepy');
        setTimeout(() => setExpression(isOpen ? 'happy' : 'idle'), 200);
      }
      
      // Random motivational message (5% chance every 10 seconds)
      if (rand < 0.05 && !speechBubble) {
        const msg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
        setSpeechBubble(msg);
        onMotivate?.(msg);
        setTimeout(() => setSpeechBubble(null), 4000);
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [isListening, isLoading, isOpen, speechBubble, onMotivate]);

  // Eye styles based on expression
  const getEyeStyle = (isLeft: boolean) => {
    const base = { width: '14px', height: '18px', borderRadius: '3px' };
    
    switch (expression) {
      case 'happy':
        return { ...base, clipPath: 'polygon(0 30%, 100% 30%, 80% 100%, 20% 100%)', height: '12px' };
      case 'listening':
        return { ...base, transform: 'scaleY(1.15)' };
      case 'thinking':
        return { ...base, transform: isLeft ? 'rotate(-12deg) translateY(-2px)' : 'rotate(12deg) translateY(-2px)' };
      case 'wink':
        return isLeft ? { ...base, height: '3px', transform: 'translateY(8px)' } : base;
      case 'sleepy':
        return { ...base, height: '5px', transform: 'translateY(6px)' };
      case 'sad':
        return { ...base, transform: 'rotate(10deg) translateY(2px)' };
      default:
        return base;
    }
  };

  const eyeColor = isListening ? 'bg-red-400' : isLoading ? 'bg-yellow-400' : 'bg-[#39ff14]';
  const glowColor = isListening ? 'shadow-[0_0_12px_rgba(248,113,113,0.8)]' : 
                    isLoading ? 'shadow-[0_0_12px_rgba(250,204,21,0.8)]' : 
                    'shadow-[0_0_12px_rgba(57,255,20,0.8)]';
  const borderColor = isListening ? 'border-red-500/50' : isLoading ? 'border-yellow-500/50' : 'border-[#39ff14]/40';

  return (
    <motion.div
      ref={robotRef}
      drag
      dragMomentum={false}
      dragElastic={0.1}
      onDragEnd={(_, info) => {
        setPosition({ x: position.x + info.offset.x, y: position.y + info.offset.y });
      }}
      className="fixed bottom-6 right-6 z-[130] cursor-grab active:cursor-grabbing"
      style={{ x: position.x, y: position.y }}
    >
      {/* Speech Bubble */}
      <AnimatePresence>
        {speechBubble && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            className="absolute -top-16 left-1/2 -translate-x-1/2 bg-[#0a0b10] border border-[#39ff14]/50 rounded-lg px-3 py-2 text-[10px] text-[#39ff14] whitespace-nowrap shadow-[0_0_15px_rgba(57,255,20,0.2)]"
          >
            {speechBubble}
            {/* Bubble Arrow */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#39ff14]/50" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          y: isListening ? [0, -2, 0, 2, 0] : [0, -3, 0],
          rotate: isListening ? [-1.5, 1.5, -1.5] : 0,
        }}
        transition={{
          y: { duration: isListening ? 0.2 : 2.5, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 0.12, repeat: Infinity },
        }}
        className="relative"
      >
        {/* TV-shaped Robot Head */}
        <motion.div 
          className={`relative w-14 h-12 bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-xl border-2 ${borderColor} overflow-hidden`}
          style={{
            boxShadow: isListening ? '0 0 25px rgba(248,113,113,0.3)' :
                      isLoading ? '0 0 25px rgba(250,204,21,0.3)' :
                      '0 0 20px rgba(57,255,20,0.25)'
          }}
        >
          {/* Screen Glow */}
          <div className={`absolute inset-0 opacity-10 ${isListening ? 'bg-red-500' : isLoading ? 'bg-yellow-500' : 'bg-[#39ff14]'}`} />
          
          {/* Screen Reflection */}
          <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/5 to-transparent rounded-t-lg" />

          {/* Eyes Container */}
          <div className="absolute inset-0 flex items-center justify-center gap-2">
            {/* Left Eye */}
            <motion.div 
              className={`${eyeColor} ${glowColor}`}
              style={{
                ...getEyeStyle(true),
                transform: `${getEyeStyle(true).transform || ''} translateX(${eyeOffset.x}px) translateY(${eyeOffset.y}px)`,
              }}
              animate={isListening ? { opacity: [1, 0.4, 1] } : {}}
              transition={{ duration: 0.4, repeat: Infinity }}
            />
            
            {/* Right Eye */}
            <motion.div 
              className={`${eyeColor} ${glowColor}`}
              style={{
                ...getEyeStyle(false),
                transform: `${getEyeStyle(false).transform || ''} translateX(${eyeOffset.x}px) translateY(${eyeOffset.y}px)`,
              }}
              animate={isListening ? { opacity: [1, 0.4, 1] } : {}}
              transition={{ duration: 0.4, repeat: Infinity, delay: 0.2 }}
            />
          </div>

          {/* Scanlines */}
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,black_2px,black_4px)]" />
        </motion.div>

        {/* Stand */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-b border-x border-b border-[#39ff14]/20" />

        {/* Listening Waves */}
        <AnimatePresence>
          {isListening && (
            <>
              <motion.div 
                className="absolute inset-0 border-2 border-red-400/30 rounded-xl"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </>
          )}
        </AnimatePresence>
      </motion.button>
      
      {/* Status Label */}
      <motion.div 
        className={`absolute -bottom-4 left-1/2 -translate-x-1/2 text-[7px] font-bold tracking-widest whitespace-nowrap font-mono ${
          isListening ? 'text-red-400' : isLoading ? 'text-yellow-400' : 'text-[#39ff14]/60'
        }`}
      >
        {isListening ? '● REC' : isLoading ? '◐ AI' : isOpen ? '◉ ON' : '○'}
      </motion.div>
    </motion.div>
  );
}
