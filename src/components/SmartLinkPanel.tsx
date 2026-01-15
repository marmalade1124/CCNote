"use client";

import { useSmartLinks, SmartLinkSuggestion } from "@/hooks/useSmartLinks";
import { useCanvas } from "@/context/CanvasContext";
import { useSfx } from "@/hooks/useSfx";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function SmartLinkPanel({ nodeId }: { nodeId: string | null }) {
  const { findSuggestions, isReady } = useSmartLinks();
  const { addConnection, activeCanvas } = useCanvas();
  const { playConnect, playHover } = useSfx();
  const [suggestions, setSuggestions] = useState<SmartLinkSuggestion[]>([]);

  useEffect(() => {
    if (nodeId && isReady) {
      const results = findSuggestions(nodeId);
      setSuggestions(results);
    } else {
        setSuggestions([]);
    }
  }, [nodeId, isReady, findSuggestions, activeCanvas]);

  if (!nodeId || suggestions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="fixed top-24 right-6 w-64 bg-[#0a0b10]/95 border border-[#eca013]/30 rounded-lg p-3 z-[100] shadow-[0_0_20px_rgba(236,160,19,0.15)] backdrop-blur-md"
      >
        <div className="flex items-center gap-2 mb-2 border-b border-[#eca013]/20 pb-1">
          <span className="material-symbols-outlined text-[#eca013] animate-pulse">psychology</span>
          <span className="text-xs font-bold text-[#eca013] tracking-widest uppercase">Smart Links</span>
        </div>
        
        <div className="flex flex-col gap-2">
          {suggestions.map((s) => (
            <button
              key={s.targetId}
              onMouseEnter={playHover}
              onClick={() => {
                addConnection(s.sourceId, s.targetId);
                playConnect();
                // Remove this suggestion locally to behave nicely
                setSuggestions(prev => prev.filter(p => p.targetId !== s.targetId));
              }}
              className="flex items-center gap-2 p-2 rounded bg-[#eca013]/5 hover:bg-[#eca013]/10 border border-[#eca013]/10 hover:border-[#eca013]/50 transition-all text-left group"
            >
              <span className="material-symbols-outlined text-[#eca013]/50 group-hover:text-[#eca013] text-sm transform rotate-45">link</span>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-[#eca013]/70 group-hover:text-[#eca013] truncate">{s.targetText}</span>
                <span className="text-[9px] text-[#eca013]/40 font-mono">{(s.similarity * 100).toFixed(0)}% MATCH</span>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
