"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useCanvas } from "@/context/CanvasContext";
import { CanvasTool } from "@/types/canvas";

interface Command {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  action: () => void;
  category: "tool" | "system" | "action";
}

interface CommandPaletteProps {
  onLogout: () => void;
}

export function CommandPalette({ onLogout }: CommandPaletteProps) {
  const { setActiveTool, createCanvas, refreshCanvases } = useCanvas();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Command Definitions
  const commands: Command[] = useMemo(() => [
    { id: "tool-select", label: "Select Tool", icon: "near_me", category: "tool", action: () => setActiveTool("select"), shortcut: "V" },
    { id: "tool-text", label: "Text Node", icon: "text_fields", category: "tool", action: () => setActiveTool("text"), shortcut: "T" },
    { id: "tool-connect", label: "Connect Nodes", icon: "hub", category: "tool", action: () => setActiveTool("connect"), shortcut: "L" },
    { id: "tool-image", label: "Upload Image", icon: "image", category: "tool", action: () => setActiveTool("image"), shortcut: "I" },
    { id: "sys-refresh", label: "Refresh Data", icon: "sync", category: "system", action: () => refreshCanvases() },
    { id: "sys-logout", label: "Terminate Session", icon: "power_settings_new", category: "system", action: () => onLogout() },
  ], [setActiveTool, refreshCanvases, onLogout]);

  const { canvases, activeCanvasId, setActiveCanvas } = useCanvas();

  // Content Search Logic
  const allCommands = useMemo(() => {
      let combined = [...commands];

      if (query.trim().length > 1) { // Only search if typed > 1 char
        canvases.forEach(canvas => {
            canvas.elements.forEach(el => {
                let text = "";
                let typeLabel = "NODE";
                
                // Extract Text
                if (el.type === 'text' || el.type === 'sticky') text = el.content;
                else if (el.type === 'card') {
                    const parts = el.content.split("||");
                    text = `${parts[0]} ${parts[1]}`;
                    typeLabel = "CARD";
                }
                else if (el.type === 'folder') {
                     // Parse folder
                     try { const p = JSON.parse(el.content); text = p.title; } catch(e) { text = "Group"; }
                     typeLabel = "GROUP";
                }

                if (text.toLowerCase().includes(query.toLowerCase())) {
                     combined.push({
                         id: `search-${el.id}`,
                         label: `${text.substring(0, 30)}${text.length>30?'...':''} (${typeLabel})`,
                         icon: el.type === 'card' ? 'crop_landscape' : el.type === 'sticky' ? 'sticky_note_2' : 'description',
                         category: 'action',
                         action: () => {
                             if (canvas.id !== activeCanvasId) {
                                 setActiveCanvas(canvas.id);
                                 setTimeout(() => window.dispatchEvent(new CustomEvent('canvas:pan-to', { detail: { x: el.x + el.width/2, y: el.y + el.height/2, zoom: 1 } })), 500); // Increased delay
                             } else {
                                window.dispatchEvent(new CustomEvent('canvas:pan-to', { detail: { x: el.x + el.width/2, y: el.y + el.height/2, zoom: 1 } }));
                             }
                         }
                     });
                }
            });
        });
      }
      return combined;
  }, [commands, query, canvases, activeCanvasId, setActiveCanvas]);

  // Filter Logic (Search matches are already filtered in allCommands, but we might filter Tool commands too)
  // Actually, allCommands already includes Search Results based on Query.
  // But Tool Commands are NOT filtered by query inside allCommands logic yet (only appended).
  // So we need to filter "Fixed Commands" vs "Dynamic Commands".
  // Simplified: Let allCommands handle filtering?
  // Current logic: combined = [...commands]. If query, append Search Results.
  // BUT we still need to filter 'commands' based on query (e.g. typing "Card" should show "Create Card").
  
  const filteredCommands = useMemo(() => {
    if (!query) return commands; // Show default tools if no query
    
    // Filter Fixed Commands
    const fixedMatches = commands.filter(cmd => cmd.label.toLowerCase().includes(query.toLowerCase()));
    
    // Search Results (which are already in allCommands? No, logic above appended them conditionally)
    // Wait, my previous logic REBUILDS allCommands based on query.
    // So allCommands contains: [All Fixed Commands] + [Search Matches].
    // I need to filter the Fixed Commands portion?
    
    // Let's refine the allCommands logic in previous step.
    // Previous step: combined = [...commands]. If query > 1, push matches.
    // So 'combined' has: [Tool A, Tool B...] + [Match 1, Match 2...].
    // If I return 'combined', I show Tools (unfiltered) + Matches.
    // This is noisy.
    
    // Correct logic:
    // If query exists, 'filtered' = (Commands filtered by query) + (Search Results).
    
    return allCommands.filter(cmd => 
        cmd.category === 'action' ? true : // Search results (category action) are already matched
        cmd.label.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, commands, allCommands]);

  // Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setQuery("");
        setSelectedIndex(0);
      }
      if (isOpen) {
        if (e.key === "Escape") {
          setIsOpen(false);
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            setIsOpen(false);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  // Auto-focus input
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div 
            className="w-full max-w-lg bg-[#0a0b10] border border-[#eca013] rounded-lg shadow-[0_0_30px_rgba(236,160,19,0.3)] overflow-hidden flex flex-col font-mono text-[#eca013] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header / Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#eca013]/30 bg-[#eca013]/5">
                 <span className="material-symbols-outlined text-[#eca013] text-xl animate-pulse">terminal</span>
                 <input 
                    ref={inputRef}
                    className="flex-1 bg-transparent outline-none text-[#eca013] placeholder-[#eca013]/30 font-bold uppercase tracking-wider text-sm"
                    placeholder="TYPE_COMMAND..."
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                 />
                 <div className="flex gap-2">
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] border border-[#eca013]/30 rounded bg-[#eca013]/5 text-[#eca013]/70">ESC</kbd>
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] border border-[#eca013]/30 rounded bg-[#eca013]/5 text-[#eca013]/70">↵</kbd>
                 </div>
            </div>

            {/* List */}
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2">
                {filteredCommands.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[#eca013]/40 text-xs">
                        &gt; NO_MATCHING_ROUTINES_FOUND
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {filteredCommands.map((cmd, index) => (
                            <button
                                key={cmd.id}
                                className={`flex items-center gap-3 px-3 py-2.5 w-full text-left rounded transition-colors group
                                    ${selectedIndex === index ? "bg-[#eca013] text-[#0a0b10]" : "hover:bg-[#eca013]/10 text-[#eca013]/80"}
                                `}
                                onClick={() => { cmd.action(); setIsOpen(false); }}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <span className={`material-symbols-outlined text-[18px] ${selectedIndex === index ? "text-[#0a0b10]" : "text-[#eca013]/60 group-hover:text-[#eca013]"}`}>{cmd.icon}</span>
                                <span className="flex-1 text-xs font-bold uppercase tracking-wider">{cmd.label}</span>
                                {cmd.shortcut && (
                                    <span className={`text-[10px] font-mono opacity-50 px-1.5 border rounded ${selectedIndex === index ? "border-[#0a0b10]/30" : "border-[#eca013]/20"}`}>
                                        {cmd.shortcut}
                                    </span>
                                )}
                                {selectedIndex === index && (
                                    <span className="text-[10px] font-bold animate-pulse">&lt; EXE</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-3 py-1.5 bg-[#eca013]/10 border-t border-[#eca013]/20 flex justify-between items-center text-[9px] text-[#eca013]/50 uppercase tracking-widest">
                <span>System: Online</span>
                <span>CMD_PALETTE_V1.0</span>
            </div>
        </div>
    </div>
  );
}
