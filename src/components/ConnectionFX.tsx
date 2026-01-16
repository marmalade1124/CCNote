"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";

interface ConnectionFXProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  onComplete: () => void;
}

export function ConnectionFX({ from, to, onComplete }: ConnectionFXProps) {
  const { colors } = useTheme();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 600);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  // Calculate line length for dash animation
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  return (
    <svg
      className="fixed inset-0 pointer-events-none z-[100]"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Glow filter */}
        <filter id="connection-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main animated line */}
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={colors.primary}
        strokeWidth="3"
        strokeLinecap="round"
        filter="url(#connection-glow)"
        className="connection-fx-line"
        style={{
          strokeDasharray: length,
          strokeDashoffset: length,
          animation: `connection-draw 0.5s ease-out forwards`,
        }}
      />

      {/* Secondary glow line */}
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={colors.accent}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
        style={{
          strokeDasharray: length,
          strokeDashoffset: length,
          animation: `connection-draw 0.4s ease-out 0.1s forwards`,
        }}
      />

      {/* Start endpoint burst */}
      <circle
        cx={from.x}
        cy={from.y}
        r="8"
        fill="none"
        stroke={colors.primary}
        strokeWidth="2"
        className="connection-fx-endpoint"
      />

      {/* End endpoint burst */}
      <circle
        cx={to.x}
        cy={to.y}
        r="8"
        fill="none"
        stroke={colors.primary}
        strokeWidth="2"
        className="connection-fx-endpoint"
        style={{ animationDelay: '0.1s' }}
      />

      {/* Spark particles at endpoints */}
      {[...Array(4)].map((_, i) => {
        const angle = (i * 90 + 45) * (Math.PI / 180);
        const sparkDist = 20;
        return (
          <circle
            key={`spark-start-${i}`}
            cx={from.x + Math.cos(angle) * sparkDist}
            cy={from.y + Math.sin(angle) * sparkDist}
            r="2"
            fill={colors.primary}
            className="connection-fx-endpoint"
            style={{ animationDelay: `${i * 0.05}s` }}
          />
        );
      })}
      {[...Array(4)].map((_, i) => {
        const angle = (i * 90 + 45) * (Math.PI / 180);
        const sparkDist = 20;
        return (
          <circle
            key={`spark-end-${i}`}
            cx={to.x + Math.cos(angle) * sparkDist}
            cy={to.y + Math.sin(angle) * sparkDist}
            r="2"
            fill={colors.primary}
            className="connection-fx-endpoint"
            style={{ animationDelay: `${0.1 + i * 0.05}s` }}
          />
        );
      })}
    </svg>
  );
}
