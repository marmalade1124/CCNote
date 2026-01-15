"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EmoRobotProps {
  isListening: boolean;
  isLoading: boolean;
  isOpen: boolean;
  onClick: () => void;
  onMotivate?: (message: string) => void;
  onBeep?: () => void;
  onHappyBeep?: () => void;
  onGiggle?: () => void;
}

type EmoExpression = 'idle' | 'happy' | 'thinking' | 'listening' | 'wink' | 'sleepy' | 'giggle';

const MOTIVATIONAL_MESSAGES = [
  "You're doing great! 🚀",
  "Keep up the awesome work!",
  "Ideas are flowing today!",
  "Stay focused, you got this!",
  "You're on fire today! 🔥",
  "Amazing progress!",
  "Beep boop! 🤖",
  "I believe in you!",
  "*happy robot noises*",
  "Let's create magic! ✨",
  "Brain power activated!",
  "Ready when you are!",
  "I love your ideas!",
  "Remember to hydrate! 💧",
  "Progress, not perfection!",
  "Bloop! 💚",
  "Hehe! 😊",
  "You make me happy!",
];

export function EmoRobot({ 
  isListening, isLoading, isOpen, onClick, onMotivate, onBeep, 
  onHappyBeep, onGiggle
}: EmoRobotProps) {
  const [expression, setExpression] = useState<EmoExpression>('idle');
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [blinkState, setBlinkState] = useState(false);
  const robotRef = useRef<HTMLDivElement>(null);
  const hoverCountRef = useRef(0);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Natural blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        setBlinkState(true);
        setTimeout(() => setBlinkState(false), 150);
      }
    }, 2500);
    return () => clearInterval(blinkInterval);
  }, []);

  // Track cursor with eyes
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!robotRef.current) return;
      
      const robot = robotRef.current.getBoundingClientRect();
      const robotCenterX = robot.left + robot.width / 2;
      const robotCenterY = robot.top + robot.height / 2;
      
      const dx = e.clientX - robotCenterX;
      const dy = e.clientY - robotCenterY;
      const maxOffset = 4;
      
      setEyeOffset({
        x: Math.max(-maxOffset, Math.min(maxOffset, dx / 50)),
        y: Math.max(-maxOffset, Math.min(maxOffset, dy / 50)),
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Random expressions, beeps, and motivational messages
  useEffect(() => {
    if (isListening || isLoading) return;
    
    const interval = setInterval(() => {
      const rand = Math.random();
      
      // Random beep (30% chance)
      if (rand < 0.3) {
        if (Math.random() < 0.5) {
          onBeep?.();
        } else {
          onHappyBeep?.();
          setExpression('happy');
          setTimeout(() => setExpression(isOpen ? 'happy' : 'idle'), 500);
        }
      }
      
      // Random expression (15% chance)
      if (rand < 0.1) {
        setExpression('wink');
        setTimeout(() => setExpression(isOpen ? 'happy' : 'idle'), 300);
      } else if (rand < 0.15) {
        setExpression('sleepy');
        setTimeout(() => setExpression(isOpen ? 'happy' : 'idle'), 200);
      }
      
      // Random motivational message (10% chance)
      if (rand < 0.1 && !speechBubble) {
        const msg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
        setSpeechBubble(msg);
        onMotivate?.(msg);
        onHappyBeep?.();
        setTimeout(() => setSpeechBubble(null), 4000);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isListening, isLoading, isOpen, speechBubble, onMotivate, onBeep, onHappyBeep]);

  // Handle rapid hover for giggle
  const handleMouseEnter = () => {
    hoverCountRef.current += 1;
    
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    
    if (hoverCountRef.current >= 4) {
      setExpression('giggle');
      onGiggle?.();
      hoverCountRef.current = 0;
      setTimeout(() => setExpression(isOpen ? 'happy' : 'idle'), 500);
    }
    
    hoverTimeoutRef.current = setTimeout(() => {
      hoverCountRef.current = 0;
    }, 1500);
  };

  // Eye styles based on expression
  const getEyeStyle = useCallback((isLeft: boolean) => {
    const base = { 
      width: '18px', 
      height: blinkState ? '3px' : '24px', 
      borderRadius: '4px',
      transform: '',
      transition: 'all 0.15s ease-out',
    };
    
    switch (expression) {
      case 'happy':
        return { ...base, clipPath: 'polygon(0 30%, 100% 30%, 80% 100%, 20% 100%)', height: blinkState ? '3px' : '16px' };
      case 'listening':
        return { ...base, transform: 'scaleY(1.1)' };
      case 'thinking':
        return { ...base, transform: isLeft ? 'rotate(-10deg) translateY(-2px)' : 'rotate(10deg) translateY(-2px)', height: blinkState ? '3px' : '18px' };
      case 'wink':
        return isLeft ? { ...base, height: '4px', transform: 'translateY(10px)' } : base;
      case 'sleepy':
        return { ...base, height: '6px', transform: 'translateY(8px)' };
      case 'giggle':
        return { ...base, transform: 'scaleX(1.2) scaleY(0.8)' };
      default:
        return base;
    }
  }, [expression, blinkState]);

  const eyeColor = isListening ? 'bg-red-400' : isLoading ? 'bg-yellow-400' : 'bg-[#39ff14]';
  const glowColor = isListening ? 'shadow-[0_0_15px_rgba(248,113,113,0.8)]' : 
                    isLoading ? 'shadow-[0_0_15px_rgba(250,204,21,0.8)]' : 
                    'shadow-[0_0_15px_rgba(57,255,20,0.8)]';
  const borderColor = isListening ? 'border-red-500/50' : isLoading ? 'border-yellow-500/50' : 'border-[#39ff14]/40';

  return (
    <motion.div
      ref={robotRef}
      className="fixed bottom-36 right-6 z-[130]"
    >
      {/* Speech Bubble */}
      <AnimatePresence>
        {speechBubble && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            className="absolute -top-16 left-1/2 -translate-x-1/2 bg-[#0a0b10] border border-[#39ff14]/50 rounded-lg px-3 py-2 text-[11px] text-[#39ff14] whitespace-nowrap shadow-[0_0_15px_rgba(57,255,20,0.2)]"
          >
            {speechBubble}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#39ff14]/50" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          y: isListening ? [0, -2, 0, 2, 0] : [0, -4, 0],
          rotate: isListening ? [-1, 1, -1] : expression === 'giggle' ? [-3, 3, -3, 3, 0] : 0,
        }}
        transition={{
          y: { duration: isListening ? 0.2 : 3, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: expression === 'giggle' ? 0.1 : 0.15, repeat: expression === 'giggle' ? 3 : Infinity },
        }}
        className="relative cursor-pointer"
      >
        {/* TV-shaped Robot Head - BIGGER */}
        <motion.div 
          className={`relative w-20 h-16 bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-xl border-2 ${borderColor} overflow-hidden`}
          style={{
            boxShadow: isListening ? '0 0 30px rgba(248,113,113,0.3)' :
                      isLoading ? '0 0 30px rgba(250,204,21,0.3)' :
                      '0 0 25px rgba(57,255,20,0.25)'
          }}
        >
          {/* Screen Glow */}
          <div className={`absolute inset-0 opacity-10 ${isListening ? 'bg-red-500' : isLoading ? 'bg-yellow-500' : 'bg-[#39ff14]'}`} />
          
          {/* Screen Reflection */}
          <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/5 to-transparent rounded-t-lg" />

          {/* Eyes Container */}
          <div className="absolute inset-0 flex items-center justify-center gap-3">
            {/* Left Eye */}
            <motion.div 
              className={`${eyeColor} ${glowColor}`}
              style={{
                ...getEyeStyle(true),
                transform: `${getEyeStyle(true).transform} translateX(${eyeOffset.x}px) translateY(${eyeOffset.y}px)`,
              }}
              animate={isListening ? { opacity: [1, 0.4, 1] } : {}}
              transition={{ duration: 0.4, repeat: Infinity }}
            />
            
            {/* Right Eye */}
            <motion.div 
              className={`${eyeColor} ${glowColor}`}
              style={{
                ...getEyeStyle(false),
                transform: `${getEyeStyle(false).transform} translateX(${eyeOffset.x}px) translateY(${eyeOffset.y}px)`,
              }}
              animate={isListening ? { opacity: [1, 0.4, 1] } : {}}
              transition={{ duration: 0.4, repeat: Infinity, delay: 0.2 }}
            />
          </div>

          {/* Scanlines */}
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,black_2px,black_4px)]" />
        </motion.div>

        {/* Stand */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-2 bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-b border-x border-b border-[#39ff14]/20" />

        {/* Listening Waves */}
        <AnimatePresence>
          {isListening && (
            <motion.div 
              className="absolute inset-0 border-2 border-red-400/30 rounded-xl"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </AnimatePresence>
      </motion.button>
      
      {/* Status Label */}
      <motion.div 
        className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-bold tracking-widest whitespace-nowrap font-mono ${
          isListening ? 'text-red-400' : isLoading ? 'text-yellow-400' : 'text-[#39ff14]/60'
        }`}
      >
        {isListening ? '● REC' : isLoading ? '◐ AI' : isOpen ? '◉ ON' : '○'}
      </motion.div>
    </motion.div>
  );
}
