"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSfx } from "@/hooks/useSfx";

// Presets
const MODES = {
  FOCUS: { label: "FOCUS", time: 25 * 60 },
  SHORT: { label: "SHORT_BRK", time: 5 * 60 },
  LONG: { label: "LONG_BRK", time: 15 * 60 },
};

export function PomodoroTimer({ onClose }: { onClose: () => void }) {
  const [timeLeft, setTimeLeft] = useState(MODES.FOCUS.time);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<keyof typeof MODES>("FOCUS");
  const [customTime, setCustomTime] = useState(25);
  const { playConfirm, playClick, playError } = useSfx();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleTimer = () => {
    playConfirm();
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    playClick();
    setIsActive(false);
    setTimeLeft(MODES[mode].time);
  };

  const setTimerMode = (newMode: keyof typeof MODES) => {
    playClick();
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(MODES[newMode].time);
  };

  const applyCustomTime = () => {
      if (customTime < 1 || customTime > 120) {
          playError();
          return;
      }
      playConfirm();
      setIsActive(false);
      setTimeLeft(customTime * 60);
      // We don't change 'mode' key technically but we override the time
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      // Create a sound for finish later or reuse one
      playConfirm(); 
      setIsActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, playConfirm]);

  const progress = 1 - (timeLeft / (MODES[mode].time)); // Inverted for "filling up" or 0->1 based on elapsed? 
  // Let's do remaining bar
  const progressPercent = (timeLeft / (MODES[mode].time)) * 100;

  return (
    <div className="fixed top-20 right-6 z-50 w-72 bg-[#0a0b10]/95 border border-[#eca013]/30 shadow-[0_0_30px_rgba(236,160,19,0.15)] rounded-lg backdrop-blur-md p-6 animate-in fade-in slide-in-from-right duration-300 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-[#eca013]/20 pb-2">
        <div className="flex items-center gap-2 text-[#eca013]">
          <span className="material-symbols-outlined text-[20px] animate-pulse">timer</span>
          <span className="text-xs font-bold tracking-widest uppercase">CHRONO_SYNC</span>
        </div>
        <button onClick={onClose} className="text-[#eca013]/50 hover:text-[#eca013] transition-colors">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      {/* Main Display */}
      <div className="relative mb-8 text-center">
        <div className="text-6xl font-bold text-[#eca013] tracking-tighter tabular-nums drop-shadow-[0_0_10px_rgba(236,160,19,0.5)]">
          {formatTime(timeLeft)}
        </div>
        <div className="text-[10px] text-[#eca013]/50 tracking-[0.2em] mt-1 uppercase">
            {isActive ? "SEQUENCE_RUNNING" : "SEQUENCE_IDLE"}
        </div>
        
        {/* Progress Line */}
        <div className="absolute -bottom-4 left-0 w-full h-1 bg-[#eca013]/10">
            <div 
                className="h-full bg-[#eca013] transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
            ></div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-3 gap-2 mb-6">
         {(Object.keys(MODES) as Array<keyof typeof MODES>).map((m) => (
             <button
                key={m}
                onClick={() => setTimerMode(m)}
                className={`
                    py-2 text-[10px] font-bold border rounded transition-all uppercase
                    ${mode === m 
                        ? "bg-[#eca013] text-[#0a0b10] border-[#eca013]" 
                        : "text-[#eca013]/70 border-[#eca013]/30 hover:border-[#eca013] hover:text-[#eca013]"
                    }
                `}
             >
                 {MODES[m].label}
             </button>
         ))}
      </div>

      <div className="flex gap-4 mb-6">
          <button
            onClick={toggleTimer}
            className={`
                flex-1 h-10 flex items-center justify-center gap-2 rounded text-xs font-bold tracking-wider transition-all uppercase
                ${isActive 
                    ? "bg-transparent border border-red-500/50 text-red-500 hover:bg-red-500/10" 
                    : "bg-[#eca013] text-[#0a0b10] hover:shadow-[0_0_15px_rgba(236,160,19,0.4)]"
                }
            `}
          >
              <span className="material-symbols-outlined text-[16px]">
                  {isActive ? "pause" : "play_arrow"}
              </span>
              {isActive ? "HALT" : "INITIATE"}
          </button>
          <button
             onClick={resetTimer}
             className="size-10 flex items-center justify-center border border-[#eca013]/30 text-[#eca013] rounded hover:bg-[#eca013]/10 transition-colors"
          >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
      </div>

      {/* Manual Input */}
      <div className="pt-4 border-t border-[#eca013]/20">
          <label className="text-[10px] text-[#eca013]/50 uppercase tracking-widest block mb-2">Manual_Override (Mins)</label>
          <div className="flex gap-2">
              <input 
                 type="number" 
                 value={customTime}
                 onChange={(e) => setCustomTime(parseInt(e.target.value) || 0)}
                 className="flex-1 bg-[#0a0b10] border border-[#eca013]/30 rounded text-[#eca013] px-3 py-1 text-xs font-mono focus:border-[#eca013] focus:outline-none"
              />
              <button 
                onClick={applyCustomTime}
                className="px-3 py-1 bg-[#eca013]/10 text-[#eca013] text-[10px] border border-[#eca013]/30 rounded hover:bg-[#eca013]/20 uppercase"
              >
                  Set
              </button>
          </div>
      </div>
    </div>
  );
}
