"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCanvas } from "@/context/CanvasContext";
import { ProfileModal } from "./ProfileModal";
import { PomodoroTimer } from "./PomodoroTimer";
import { TypingDefenseGame } from "./TypingDefenseGame";
import { GraphView } from "./GraphView";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSfx } from "@/hooks/useSfx";

export function SystemBar({ onShutdown }: { onShutdown: () => void }) {
  const { canvases, activeCanvasId, setActiveCanvas, createCanvas, deleteCanvas, renameCanvas, isLoading, user } = useCanvas();
  const { playClick, playHover, playPowerDown, speak } = useSfx();
  const [isArchivesOpen, setIsArchivesOpen] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCanvasName, setNewCanvasName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useLocalStorage<string>(`avatar_${user?.id || 'guest'}`, "");
  const [displayName, setDisplayName] = useLocalStorage<string>(`name_${user?.id || 'guest'}`, "OPERATOR");
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCreate = async () => {
    if (newCanvasName.trim()) {
      await createCanvas(newCanvasName.trim());
      setNewCanvasName("");
      setIsCreating(false);
    }
  };

  const handleRename = async (id: string) => {
    if (editName.trim()) {
      await renameCanvas(id, editName.trim());
      setEditingId(null);
      setEditName("");
    }
  };

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const sortedCanvases = [...canvases].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <>
      <header className="fixed top-0 left-0 w-full h-14 bg-[#0a0b10]/80 backdrop-blur-md border-b border-[#eca013]/20 z-40 flex items-center justify-between px-6 select-none">
        
        {/* Left: System Status */}
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 text-[#eca013]">
                <span className="material-symbols-outlined text-2xl phosphor-glow animate-pulse">terminal</span>
                <span className="font-bold tracking-[0.15em] uppercase text-sm phosphor-glow">CC_NOTE // V.1.0.4</span>
            </div>
            
            {/* Divider */}
            <div className="h-6 w-[1px] bg-[#eca013]/20"></div>

            {/* Archives Toggle */}
            <button 
                onClick={() => { playClick(); setIsArchivesOpen(!isArchivesOpen); }}
                onMouseEnter={playHover}
                className={`archives-trigger flex items-center gap-2 px-3 py-1.5 rounded border transition-all uppercase text-xs font-bold tracking-widest ${
                    isArchivesOpen 
                    ? "bg-[#eca013]/10 border-[#eca013] text-[#eca013] shadow-[0_0_15px_rgba(236,160,19,0.1)]" 
                    : "border-transparent text-[#eca013]/60 hover:text-[#eca013] hover:bg-[#eca013]/5"
                }`}
            >
                <span className="material-symbols-outlined text-sm">folder_open</span>
                Archives
                <span className="bg-[#eca013]/20 text-[#eca013] px-1.5 py-0.5 rounded text-[9px] font-mono ml-1">{canvases.length}</span>
            </button>
        </div>

        {/* Right: Clock & User */}
        <div className="flex items-center gap-4">
             {/* Graph View Toggle */}
             <button
                onClick={() => { playClick(); setIsGraphOpen(true); }}
                onMouseEnter={playHover}
                className="flex items-center gap-2 px-2 py-1 rounded border border-transparent text-[#eca013]/40 hover:text-[#eca013] hover:bg-[#eca013]/5 transition-all uppercase text-xs font-bold tracking-widest"
                title="View Data Constellation"
             >
                <span className="material-symbols-outlined text-[18px]">hub</span>
             </button>

             {/* Game Toggle */}
             <button
                onClick={() => { playClick(); setIsGameOpen(true); }}
                onMouseEnter={playHover}
                className="flex items-center gap-2 px-2 py-1 rounded border border-transparent text-[#eca013]/40 hover:text-[#eca013] hover:bg-[#eca013]/5 transition-all uppercase text-xs font-bold tracking-widest"
                title="Launch Simulations"
             >
                <span className="material-symbols-outlined text-[18px]">sports_esports</span>
             </button>

             {/* Timer Toggle */}
             <button
                onClick={() => { playClick(); setIsTimerOpen(!isTimerOpen); }}
                onMouseEnter={playHover}
                className={`flex items-center gap-2 px-2 py-1 rounded border transition-all uppercase text-xs font-bold tracking-widest ${
                    isTimerOpen
                    ? "text-[#eca013] border-[#eca013] bg-[#eca013]/10"
                    : "text-[#eca013]/40 border-transparent hover:text-[#eca013] hover:bg-[#eca013]/5"
                }`}
                title="Toggle Chrono Sync"
             >
                <span className="material-symbols-outlined text-[18px]">timer</span>
             </button>

             <div className="text-[#eca013]/40 font-mono text-xs tracking-widest">
                {currentTime} <span className="text-[#39ff14]">●</span>
             </div>

             <div className="h-6 w-[1px] bg-[#eca013]/20"></div>

             <button 
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-3 pl-2 pr-1 py-1 rounded hover:bg-[#eca013]/5 transition-colors group"
             >
                 <div className="text-right hidden sm:block">
                     <div className="text-[#eca013] text-[10px] font-bold tracking-wider uppercase">{displayName}</div>
                     <div className="text-[#eca013]/40 text-[9px]">ID: {user?.id?.slice(0,4) || "GUEST"}</div>
                 </div>
                 <div className="size-8 rounded-full bg-[#eca013]/10 border border-[#eca013]/30 overflow-hidden flex items-center justify-center shrink-0 group-hover:border-[#eca013] transition-colors">
                     {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                     ) : (
                        <span className="material-symbols-outlined text-[#eca013] text-sm">person</span>
                     )}
                 </div>
             </button>
        </div>
      </header>


      {/* Archives Overlay Panel */}
      {isArchivesOpen && (
          <div className="fixed top-16 left-6 w-80 bg-[#0a0b10]/95 border border-[#eca013]/40 rounded-lg shadow-[0_4px_30px_rgba(0,0,0,0.5),0_0_15px_rgba(236,160,19,0.1)] z-40 backdrop-blur-xl flex flex-col max-h-[calc(100vh-100px)] animate-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-[#eca013]/20 flex items-center justify-between">
                  <h2 className="text-[#eca013] font-bold tracking-widest text-xs uppercase">Data_Archives</h2>
                  <div className="flex gap-2">
                       <button 
                          onClick={() => { playClick(); setIsCreating(true); }}
                          className="text-[#eca013] hover:text-[#39ff14] transition-colors"
                          title="New Databank"
                       >
                           <span className="material-symbols-outlined text-lg">add_circle</span>
                       </button>
                  </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {isCreating && (
                      <div className="p-2 animate-in fade-in slide-in-from-top-2">
                          <input
                              autoFocus
                              type="text"
                              placeholder="ARCHIVE_NAME..."
                              className="w-full bg-[#eca013]/5 border border-[#eca013]/50 rounded px-2 py-1 text-xs text-[#eca013] placeholder-[#eca013]/30 outline-none"
                              value={newCanvasName}
                              onChange={(e) => setNewCanvasName(e.target.value)}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCreate();
                                  if (e.key === 'Escape') setIsCreating(false);
                              }}
                              onBlur={() => setIsCreating(false)}
                          />
                      </div>
                  )}

                  {sortedCanvases.map(canvas => (
                      <div 
                          key={canvas.id}
                          className={`group flex items-center justify-between p-2 rounded cursor-pointer border transition-all ${
                              activeCanvasId === canvas.id 
                              ? "bg-[#eca013]/10 border-[#eca013]/40 shadow-[0_0_10px_rgba(236,160,19,0.1)]" 
                              : "border-transparent hover:bg-[#eca013]/5 hover:border-[#eca013]/20"
                          }`}
                          onClick={() => {
                              playClick();
                              setActiveCanvas(canvas.id);
                              // Optional: close archives on selection?
                              // setIsArchivesOpen(false); 
                          }}
                      >
                          {editingId === canvas.id ? (
                              <input
                                  autoFocus
                                  type="text"
                                  className="w-full bg-transparent border-b border-[#eca013] text-xs text-[#eca013] outline-none"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleRename(canvas.id);
                                      if (e.key === 'Escape') setEditingId(null);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  onBlur={() => handleRename(canvas.id)}
                              />
                          ) : (
                              <div className="flex flex-col">
                                  <span className={`text-xs font-bold tracking-wider ${activeCanvasId === canvas.id ? "text-[#eca013]" : "text-[#eca013]/70"}`}>
                                      {canvas.name}
                                  </span>
                                  <span className="text-[9px] text-[#eca013]/40 font-mono">
                                      {new Date(canvas.updatedAt).toLocaleDateString()}
                                  </span>
                              </div>
                          )}

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      playClick();
                                      startEditing(canvas.id, canvas.name);
                                  }}
                                  className="p-1 hover:text-[#39ff14] text-[#eca013]/50 transition-colors"
                              >
                                  <span className="material-symbols-outlined text-[14px]">edit</span>
                              </button>
                              <button
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      playClick();
                                      if(confirm("Confirm deletion of this archive?")) deleteCanvas(canvas.id);
                                  }}
                                  className="p-1 hover:text-red-500 text-[#eca013]/50 transition-colors"
                              >
                                  <span className="material-symbols-outlined text-[14px]">delete</span>
                              </button>
                          </div>
                      </div>
                  ))}
              </div>

              <div className="p-3 border-t border-[#eca013]/20 bg-[#0a0b10]/50 backdrop-blur-sm">
                 <button 
                    onClick={() => {
                        playClick();
                        playPowerDown();
                        speak("Terminating Uplink");
                        onShutdown();
                    }}
                    className="w-full mt-3 flex items-center justify-center gap-2 text-[#eca013]/50 hover:text-red-500 hover:bg-red-500/10 py-1.5 rounded transition-all text-[10px] font-bold uppercase tracking-wider"
                 >
                        <span className="material-symbols-outlined text-[14px]">power_settings_new</span>
                        Terminate_Uplink
                 </button>
              </div>
          </div>
      )}

      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        avatarUrl={avatarUrl}
        onAvatarChange={setAvatarUrl}
        displayName={displayName}
        onNameChange={setDisplayName}
      />
      
      {isTimerOpen && (
          <PomodoroTimer 
              onClose={() => setIsTimerOpen(false)} 
              onComplete={() => setIsGameOpen(false)}
              lowVisibility={isGameOpen} 
          />
      )}
      {isGameOpen && <TypingDefenseGame onClose={() => setIsGameOpen(false)} />}
      {isGraphOpen && <GraphView onClose={() => setIsGraphOpen(false)} />}
    </>
  );
}
