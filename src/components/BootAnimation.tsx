"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";

interface BootAnimationProps {
  isBooting: boolean;
  onComplete: () => void;
  children: React.ReactNode;
}

export function BootAnimation({ isBooting, onComplete, children }: BootAnimationProps) {
  const { colors, themeConfig } = useTheme();
  const [phase, setPhase] = useState<'idle' | 'scan' | 'reveal' | 'done'>('idle');

  useEffect(() => {
    if (isBooting) {
      setPhase('scan');
      
      // Scan phase: 400ms
      const scanTimer = setTimeout(() => {
        setPhase('reveal');
      }, 400);

      // Reveal phase: 300ms more
      const revealTimer = setTimeout(() => {
        setPhase('done');
        onComplete();
      }, 700);

      return () => {
        clearTimeout(scanTimer);
        clearTimeout(revealTimer);
      };
    } else {
      setPhase('idle');
    }
  }, [isBooting, onComplete]);

  // During boot animation
  if (isBooting && phase !== 'done') {
    return (
      <div className="relative w-full h-full overflow-hidden boot-flicker">
        {/* Scan line effect */}
        {phase === 'scan' && (
          <div 
            className="absolute left-0 right-0 h-1 boot-scan-line pointer-events-none z-50"
            style={{
              background: `linear-gradient(180deg, transparent, ${colors.primary}, transparent)`,
              boxShadow: `0 0 20px ${colors.primary}, 0 0 40px ${colors.primary}`,
            }}
          />
        )}
        
        {/* Loading text overlay */}
        {phase === 'scan' && (
          <div 
            className="absolute inset-0 flex items-center justify-center z-40"
            style={{ backgroundColor: `${colors.background}ee` }}
          >
            <div className="text-center">
              <div 
                className="font-mono text-xs tracking-widest uppercase animate-pulse"
                style={{ color: colors.primary }}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-2 animate-ping" style={{ backgroundColor: colors.primary }} />
                LOADING_DATA...
              </div>
            </div>
          </div>
        )}

        {/* Content (hidden during scan, reveals during reveal phase) */}
        <div className={phase === 'reveal' ? 'boot-content-reveal' : 'opacity-0'}>
          {children}
        </div>
      </div>
    );
  }

  // Normal state or boot complete
  return <>{children}</>;
}
