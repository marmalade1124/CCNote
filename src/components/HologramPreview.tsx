"use client";

import { useState, useEffect } from "react";
import { useCanvas } from "@/context/CanvasContext";
import { motion, AnimatePresence } from "framer-motion";

interface HologramPreviewProps {
  linkText: string;
  position: { x: number; y: number };
  onNavigate?: () => void;
}

export function HologramPreview({ linkText, position, onNavigate }: HologramPreviewProps) {
  const { activeCanvas } = useCanvas();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  console.log('[HOLOGRAM] Rendering preview for:', linkText, 'at position:', position);
  
  // Find the linked element
  const linkedElement = activeCanvas?.elements.find(el => {
    if (el.type === 'card' && el.content.startsWith(linkText + '||')) return true;
    if ((el.type === 'text' || el.type === 'sticky') && (el.content.startsWith(linkText) || el.content === linkText)) return true;
    if (el.type === 'folder') {
      try {
        const parsed = JSON.parse(el.content);
        return parsed.title === linkText;
      } catch { return false; }
    }
    return false;
  });

  // Track mouse for parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = { x: position.x, y: position.y, width: 300, height: 200 };
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      const deltaX = (e.clientX - centerX) / 50;
      const deltaY = (e.clientY - centerY) / 50;
      setMousePos({ x: deltaX, y: deltaY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [position]);

  if (!linkedElement) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -10 }}
        transition={{ type: "spring", duration: 0.3 }}
        className="fixed z-[90] pointer-events-none"
        style={{
          left: position.x,
          top: position.y,
          transform: `perspective(1000px) rotateX(${mousePos.y}deg) rotateY(${mousePos.x}deg)`
        }}
      >
        <div className="bg-[#0a0b10]/95 border-2 border-[#ff4444]/50 rounded-lg p-4 shadow-[0_0_30px_rgba(255,68,68,0.4)] backdrop-blur-sm">
          <p className="text-[#ff4444] font-mono text-xs">
            ⚠️ Link not found: <span className="font-bold">[[{linkText}]]</span>
          </p>
        </div>
      </motion.div>
    );
  }

  const preview = linkedElement.content.substring(0, 200);
  const color = linkedElement.color || '#eca013';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ type: "spring", duration: 0.3 }}
      className="fixed z-[90] cursor-pointer"
      style={{
        left: position.x,
        top: position.y,
        transform: `perspective(1000px) rotateX(${mousePos.y}deg) rotateY(${mousePos.x}deg)`,
        transformStyle: 'preserve-3d'
      }}
      onClick={onNavigate}
    >
      <div 
        className="bg-[#0a0b10]/95 border-2 rounded-lg p-4 shadow-[0_0_40px] backdrop-blur-md max-w-sm"
        style={{
          borderColor: color,
          boxShadow: `0 0 40px ${color}40, inset 0 0 20px ${color}10`
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2 border-b pb-2" style={{ borderColor: `${color}30` }}>
          <span 
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
            style={{ 
              backgroundColor: `${color}20`, 
              color: color,
              border: `1px solid ${color}50`
            }}
          >
            {linkedElement.type}
          </span>
          <span className="font-mono font-bold text-sm" style={{ color }}>{linkText}</span>
        </div>
        
        {/* Preview Content */}
        <div className="text-[#eca013]/80 font-mono text-xs leading-relaxed">
          {preview}
          {linkedElement.content.length > 200 && <span className="text-[#eca013]/50">...</span>}
        </div>
        
        {/* Footer Hint */}
        <div className="mt-3 pt-2 border-t flex items-center justify-between text-[10px]" style={{ borderColor: `${color}20` }}>
          <span style={{ color: `${color}60` }}>Click to navigate →</span>
          <span className="font-mono" style={{ color: `${color}40` }}>
            ID: {linkedElement.id.substring(0, 8)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
