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
  onExcitedBeep?: () => void;
  onCuriousBeep?: () => void;
  onSadBeep?: () => void;
  position: { x: number; y: number };
  onPositionChange: (pos: { x: number; y: number }) => void;
  onGiggle?: () => void;
}

type EmoExpression = 'idle' | 'happy' | 'thinking' | 'listening' | 'wink' | 'sleepy' | 'sad' | 'giggle' | 'excited' | 'curious';

const MOTIVATIONAL_MESSAGES = [
  // Encouraging
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
  // Cute & Playful
  "Beep boop! 🤖",
  "I believe in you!",
  "You're my favorite human!",
  "*happy robot noises*",
  "Let's create magic! ✨",
  "Yay teamwork! 🎉",
  "Brain power activated!",
  "Ready when you are!",
  "Let's gooo! 🚀",
  "I love your ideas!",
  // Supportive
  "Take a break if needed!",
  "You've got this!",
  "One step at a time!",
  "Remember to hydrate! 💧",
  "Breathe... you're doing fine!",
  "Progress, not perfection!",
  "Every idea counts!",
  "Small wins add up!",
  "Trust the process!",
  "Magic takes time! ⏳",
  // Excited
  "Ooh, what are we making?",
  "This is exciting!",
  "I'm helping! ...I think",
  "Canvas vibes! 🎨",
  "Creativity mode: ON",
  "Big brain time! 🧠",
  "Idea incoming...",
  "Something cool brewing!",
  "We got this together!",
  "Dream big! ⭐",
  // Random cute
  "Bloop! 💚",
  "*wiggles excitedly*",
  "Hehe! 😊",
  "Focus mode! 🎯",
  "You make me happy!",
  "Best team ever!",
];

export function EmoRobot({ 
  isListening, isLoading, isOpen, onClick, onMotivate, onBeep, 
  position, onPositionChange, onGiggle,
  onHappyBeep, onExcitedBeep, onCuriousBeep, onSadBeep
}: EmoRobotProps) {
  const [expression, setExpression] = useState<EmoExpression>('idle');
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [pupilSize, setPupilSize] = useState(1);
  const [blinkState, setBlinkState] = useState(false);
  const robotRef = useRef<HTMLDivElement>(null);
  const hoverCountRef = useRef(0);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wanderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);

  // Determine expression based on state
  useEffect(() => {
    if (isListening) {
      setExpression('listening');
      setPupilSize(1.2);
    } else if (isLoading) {
      setExpression('thinking');
      setPupilSize(0.8);
    } else if (isOpen) {
      setExpression('happy');
      setPupilSize(1.1);
    } else {
      setExpression('idle');
      setPupilSize(1);
    }
  }, [isListening, isLoading, isOpen]);

  // Natural blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        setBlinkState(true);
        setTimeout(() => setBlinkState(false), 150);
      }
    }, 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Autonomous wandering when idle (only if user hasn't dragged recently)
  const userDraggedRef = useRef(false);
  const lastDragTimeRef = useRef(0);
  
  useEffect(() => {
    if (isListening || isLoading || isOpen) {
      if (wanderTimeoutRef.current) clearTimeout(wanderTimeoutRef.current);
      return;
    }

    const wander = () => {
      // Don't wander if user dragged within last 30 seconds
      if (Date.now() - lastDragTimeRef.current < 30000) {
        wanderTimeoutRef.current = setTimeout(wander, 5000);
        return;
      }
      
      // Get safe bounds (keep robot visible on screen)
      // Robot is fixed bottom-right with animate={{ x, y }}
      // NEGATIVE X = moves LEFT (into viewport) ✓
      // POSITIVE X = moves RIGHT (off screen) ✗
      // NEGATIVE Y = moves UP (into viewport) ✓  
      // POSITIVE Y = moves DOWN (off screen) ✗
      // So we want mostly NEGATIVE values to keep it visible
      const minX = -200;  // Max 200px left into viewport
      const maxX = 0;     // Don't go right (off screen)
      const minY = -150;  // Max 150px up into viewport
      const maxY = 0;     // Don't go down (off screen)
      
      const newX = minX + Math.random() * (maxX - minX);
      const newY = minY + Math.random() * (maxY - minY);
      
      onPositionChange({ x: newX, y: newY });
      
      // Play curious beep sometimes when wandering
      if (Math.random() < 0.3) {
        onCuriousBeep?.();
        setExpression('curious');
        setTimeout(() => setExpression('idle'), 800);
      }
      
      // Schedule next wander (15-25 seconds - less frequent)
      wanderTimeoutRef.current = setTimeout(wander, 15000 + Math.random() * 10000);
    };

    // Start wandering after 10 seconds of idle
    wanderTimeoutRef.current = setTimeout(wander, 10000);
    
    return () => {
      if (wanderTimeoutRef.current) clearTimeout(wanderTimeoutRef.current);
    };
  }, [isListening, isLoading, isOpen, onCuriousBeep]); // Removed onPositionChange to prevent re-triggering

  // Track cursor with eyes (throttled with smooth following)
  useEffect(() => {
    let animationFrame: number;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!robotRef.current) return;
      
      const robot = robotRef.current.getBoundingClientRect();
      const robotCenterX = robot.left + robot.width / 2;
      const robotCenterY = robot.top + robot.height / 2;
      
      const dx = e.clientX - robotCenterX;
      const dy = e.clientY - robotCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxOffset = 5;
      
      if (distance > 30) {
        setEyeOffset(prev => ({
          x: prev.x + (Math.max(-maxOffset, Math.min(maxOffset, dx / 40)) - prev.x) * 0.2,
          y: prev.y + (Math.max(-maxOffset, Math.min(maxOffset, dy / 40)) - prev.y) * 0.2,
        }));
      } else {
        setEyeOffset(prev => ({
          x: prev.x * 0.9,
          y: prev.y * 0.9,
        }));
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
  }, []);

  // Random expressions, beeps, and motivational messages
  useEffect(() => {
    if (isListening || isLoading) return;
    
    const interval = setInterval(() => {
      const rand = Math.random();
      
      // Mood-matched beeps (40% chance)
      if (rand < 0.4) {
        const mood = Math.random();
        if (mood < 0.4) {
          onBeep?.(); // Normal beep
        } else if (mood < 0.6) {
          onHappyBeep?.();
          setExpression('happy');
          setTimeout(() => setExpression(isOpen ? 'happy' : 'idle'), 500);
        } else if (mood < 0.8) {
          onExcitedBeep?.();
          setExpression('excited');
          setPupilSize(1.3);
          setTimeout(() => {
            setExpression(isOpen ? 'happy' : 'idle');
            setPupilSize(1);
          }, 600);
        } else {
          onCuriousBeep?.();
          setExpression('curious');
          setTimeout(() => setExpression(isOpen ? 'happy' : 'idle'), 500);
        }
      }
      
      // Random expression (20% chance)
      if (rand < 0.15) {
        setExpression('wink');
        setTimeout(() => setExpression(isOpen ? 'happy' : 'idle'), 300);
      } else if (rand < 0.2) {
        setExpression('sleepy');
        setTimeout(() => setExpression(isOpen ? 'happy' : 'idle'), 200);
      }
      
      // Random motivational message (20% chance)
      if (rand < 0.2 && !speechBubble) {
        const msg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
        setSpeechBubble(msg);
        onMotivate?.(msg);
        onHappyBeep?.();
        setTimeout(() => setSpeechBubble(null), 4000);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isListening, isLoading, isOpen, speechBubble, onMotivate, onBeep, onHappyBeep, onExcitedBeep, onCuriousBeep]);

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

  // Fluid eye styles based on expression
  const getEyeStyle = useCallback((isLeft: boolean) => {
    const base = { 
      width: '14px', 
      height: blinkState ? '2px' : '18px', 
      borderRadius: '3px',
      transform: '',
      transition: 'all 0.15s ease-out',
    };
    
    switch (expression) {
      case 'happy':
        return { ...base, clipPath: 'polygon(0 30%, 100% 30%, 80% 100%, 20% 100%)', height: blinkState ? '2px' : '12px' };
      case 'listening':
        return { ...base, transform: `scaleY(1.15) scaleX(${pupilSize})` };
      case 'thinking':
        return { ...base, transform: isLeft ? 'rotate(-12deg) translateY(-2px)' : 'rotate(12deg) translateY(-2px)', height: blinkState ? '2px' : '14px' };
      case 'wink':
        return isLeft ? { ...base, height: '3px', transform: 'translateY(8px)' } : base;
      case 'sleepy':
        return { ...base, height: '5px', transform: 'translateY(6px)' };
      case 'sad':
        return { ...base, transform: 'rotate(10deg) translateY(2px)' };
      case 'giggle':
        return { ...base, transform: 'scaleX(1.2) scaleY(0.8)' };
      case 'excited':
        return { ...base, transform: `scale(${pupilSize})`, height: blinkState ? '2px' : '20px' };
      case 'curious':
        return { ...base, transform: isLeft ? 'rotate(-8deg) scale(1.1)' : 'rotate(8deg) scale(0.9)' };
      default:
        return base;
    }
  }, [expression, blinkState, pupilSize]);

  const eyeColor = isListening ? 'bg-red-400' : isLoading ? 'bg-yellow-400' : 'bg-[#39ff14]';
  const glowColor = isListening ? 'shadow-[0_0_12px_rgba(248,113,113,0.8)]' : 
                    isLoading ? 'shadow-[0_0_12px_rgba(250,204,21,0.8)]' : 
                    'shadow-[0_0_12px_rgba(57,255,20,0.8)]';
  const borderColor = isListening ? 'border-red-500/50' : isLoading ? 'border-yellow-500/50' : 'border-[#39ff14]/40';

  const [isDragging, setIsDragging] = useState(false);

  return (
    <motion.div
      ref={robotRef}
      drag
      dragMomentum={false}
      dragElastic={0.05}
      dragListener={false} // Disable drag on main container, only on handle
      onDragStart={() => {
        isDraggingRef.current = true;
        setIsDragging(true);
      }}
      onDragEnd={(_, info) => {
        setTimeout(() => {
          isDraggingRef.current = false;
          setIsDragging(false);
        }, 100);
        
        lastDragTimeRef.current = Date.now();
        
        // Free movement - no constraints, just update position
        const newX = position.x + info.offset.x;
        const newY = position.y + info.offset.y;
        
        onPositionChange({ x: newX, y: newY });
      }}
      className="fixed bottom-6 right-6 z-[130]"
      animate={{ 
        x: position.x, 
        y: position.y,
        rotate: isDragging ? [-2, 2, -2] : 0, // Wobble when dragging
      }}
      transition={{ 
        x: { type: "spring", stiffness: 300, damping: 30 },
        y: { type: "spring", stiffness: 300, damping: 30 },
        rotate: { duration: 0.15, repeat: isDragging ? Infinity : 0 }
      }}
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
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#39ff14]/50" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={(e) => {
          // Prevent click if we just finished dragging
          if (isDraggingRef.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          onClick();
        }}
        onMouseEnter={handleMouseEnter}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          y: isListening ? [0, -2, 0, 2, 0] : [0, -3, 0],
          rotate: isListening ? [-1.5, 1.5, -1.5] : expression === 'giggle' ? [-3, 3, -3, 3, 0] : 0,
        }}
        transition={{
          y: { duration: isListening ? 0.2 : 2.5, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: expression === 'giggle' ? 0.1 : 0.12, repeat: expression === 'giggle' ? 3 : Infinity },
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
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-b border-x border-b border-[#39ff14]/20" />

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
        className={`absolute -bottom-4 left-1/2 -translate-x-1/2 text-[7px] font-bold tracking-widest whitespace-nowrap font-mono ${
          isListening ? 'text-red-400' : isLoading ? 'text-yellow-400' : 'text-[#39ff14]/60'
        }`}
      >
        {isListening ? '● REC' : isLoading ? '◐ AI' : isOpen ? '◉ ON' : '○'}
      </motion.div>
      
      {/* Drag Handle - only this area is draggable */}
      <motion.div
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing px-3 py-1 rounded-full bg-[#39ff14]/10 border border-[#39ff14]/30 hover:bg-[#39ff14]/20 transition-colors"
        onPointerDown={(e) => {
          // This allows the parent motion.div to receive the drag
          const parent = robotRef.current;
          if (parent) {
            parent.dispatchEvent(new PointerEvent('pointerdown', {
              bubbles: true,
              clientX: e.clientX,
              clientY: e.clientY,
              pointerId: e.pointerId,
              pointerType: e.pointerType,
            }));
          }
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="flex items-center gap-1">
          <span className="text-[#39ff14]/50 text-[8px]">⋮⋮</span>
          <span className="text-[#39ff14]/40 text-[6px] font-mono uppercase">drag</span>
          <span className="text-[#39ff14]/50 text-[8px]">⋮⋮</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
