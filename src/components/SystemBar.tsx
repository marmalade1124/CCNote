"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCanvas } from "@/context/CanvasContext";
import { useTheme } from "@/context/ThemeContext";
import { ProfileModal } from "./ProfileModal";
import { PomodoroTimer } from "./PomodoroTimer";
import { TypingDefenseGame } from "./TypingDefenseGame";
import { GraphView } from "./GraphView";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSfx } from "@/hooks/useSfx";

export function SystemBar({ onShutdown }: { onShutdown: () => void }) {
  const { canvases, activeCanvasId, setActiveCanvas, createCanvas, deleteCanvas, renameCanvas, isLoading, user } = useCanvas();
  const { colors } = useTheme();
  const { playClick, playHover, playPowerDown, speak } = useSfx();
  const [isArchivesOpen, setIsArchivesOpen] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
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
      <header 
        className="fixed top-0 left-0 w-full h-14 backdrop-blur-md z-40 flex items-center justify-between px-6 select-none"
        style={{ 
          backgroundColor: `${colors.background}cc`,
          borderBottom: `1px solid ${colors.primary}30`,
        }}
      >
        
        {/* Left: System Status */}
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-3" style={{ color: colors.primary }}>
                <span className="material-symbols-outlined text-2xl phosphor-glow animate-pulse">terminal</span>
                <span className="font-bold tracking-[0.15em] uppercase text-sm phosphor-glow">CC_NOTE // V.1.0.4</span>
            </div>
            
            {/* Divider */}
            <div className="h-6 w-[1px]" style={{ backgroundColor: `${colors.primary}30` }}></div>

            {/* Archives Toggle */}
            <button 
                onClick={() => { playClick(); setIsArchivesOpen(!isArchivesOpen); }}
                onMouseEnter={playHover}
                className="archives-trigger flex items-center gap-2 px-3 py-1.5 rounded border transition-all uppercase text-xs font-bold tracking-widest"
                style={{
                    color: isArchivesOpen ? colors.primary : colors.textSecondary,
                    backgroundColor: isArchivesOpen ? `${colors.primary}15` : 'transparent',
                    borderColor: isArchivesOpen ? colors.primary : 'transparent',
                    boxShadow: isArchivesOpen ? `0 0 15px ${colors.primary}20` : 'none',
                }}
            >
                <span className="material-symbols-outlined text-sm">folder_open</span>
                Archives
                <span 
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono ml-1"
                    style={{ backgroundColor: `${colors.primary}30`, color: colors.primary }}
                >
                    {canvases.length}
                </span>
            </button>
        </div>

        {/* Right: Clock & User */}
        <div className="flex items-center gap-4">
             {/* Graph View Toggle */}
             <button
                onClick={() => { playClick(); setIsGraphOpen(true); }}
                onMouseEnter={playHover}
                className="flex items-center gap-2 px-2 py-1 rounded border border-transparent transition-all uppercase text-xs font-bold tracking-widest"
                style={{ color: colors.textSecondary }}
                title="View Data Constellation"
             >
                <span className="material-symbols-outlined text-[18px]">hub</span>
             </button>

             {/* Mic Settings Toggle */}
             <button
                onClick={() => { 
                  playClick(); 
                  window.dispatchEvent(new CustomEvent('toggle-mic-settings'));
                }}
                onMouseEnter={playHover}
                className="flex items-center gap-2 px-2 py-1 rounded border border-transparent transition-all uppercase text-xs font-bold tracking-widest"
                style={{ color: colors.textSecondary }}
                title="Microphone Settings"
             >
                <span className="material-symbols-outlined text-[18px]">settings_voice</span>
             </button>

             {/* Theme Switcher Toggle */}
             <button
                onClick={() => { playClick(); setIsThemeOpen(true); }}
                onMouseEnter={playHover}
                className="flex items-center gap-2 px-2 py-1 rounded border border-transparent transition-all uppercase text-xs font-bold tracking-widest"
                style={{ color: colors.textSecondary }}
                title="Canvas Themes"
             >
                <span className="material-symbols-outlined text-[18px]">palette</span>
             </button>

             {/* Game Toggle */}
             <button
                onClick={() => { playClick(); setIsGameOpen(true); }}
                onMouseEnter={playHover}
                className="flex items-center gap-2 px-2 py-1 rounded border border-transparent transition-all uppercase text-xs font-bold tracking-widest"
                style={{ color: colors.textSecondary }}
                title="Launch Simulations"
             >
                <span className="material-symbols-outlined text-[18px]">sports_esports</span>
             </button>

             {/* Timer Toggle */}
             <button
                onClick={() => { playClick(); setIsTimerOpen(!isTimerOpen); }}
                onMouseEnter={playHover}
                className="flex items-center gap-2 px-2 py-1 rounded border transition-all uppercase text-xs font-bold tracking-widest"
                style={{
                    color: isTimerOpen ? colors.primary : colors.textSecondary,
                    borderColor: isTimerOpen ? colors.primary : 'transparent',
                    backgroundColor: isTimerOpen ? `${colors.primary}15` : 'transparent',
                }}
                title="Toggle Chrono Sync"
             >
                <span className="material-symbols-outlined text-[18px]">timer</span>
             </button>

             <div className="font-mono text-xs tracking-widest" style={{ color: colors.textSecondary }}>
                {currentTime} <span style={{ color: colors.accent }}>●</span>
             </div>

             <div className="h-6 w-[1px]" style={{ backgroundColor: `${colors.primary}30` }}></div>

             <button 
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-3 pl-2 pr-1 py-1 rounded transition-colors group"
             >
                 <div className="text-right hidden sm:block">
                     <div className="text-[10px] font-bold tracking-wider uppercase" style={{ color: colors.primary }}>{displayName}</div>
                     <div className="text-[9px]" style={{ color: colors.textSecondary }}>ID: {user?.id?.slice(0,4) || "GUEST"}</div>
                 </div>
                 <div 
                    className="size-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 transition-colors"
                    style={{ 
                        backgroundColor: `${colors.primary}15`,
                        border: `1px solid ${colors.primary}50`,
                    }}
                 >
                     {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                     ) : (
                        <span className="material-symbols-outlined text-sm" style={{ color: colors.primary }}>person</span>
                     )}
                 </div>
             </button>
        </div>
      </header>



      {/* Archives Overlay Panel */}
      {isArchivesOpen && (
          <div 
            className="fixed top-16 left-6 w-80 rounded-lg z-40 backdrop-blur-xl flex flex-col max-h-[calc(100vh-100px)] animate-in slide-in-from-top-2 duration-200"
            style={{
                backgroundColor: `${colors.background}f5`,
                border: `1px solid ${colors.primary}60`,
                boxShadow: `0 4px 30px rgba(0,0,0,0.5), 0 0 15px ${colors.primary}20`,
            }}
          >
              <div 
                className="p-4 flex items-center justify-between"
                style={{ borderBottom: `1px solid ${colors.primary}30` }}
              >
                  <h2 className="font-bold tracking-widest text-xs uppercase" style={{ color: colors.primary }}>Data_Archives</h2>
                  <div className="flex gap-2">
                       <button 
                          onClick={() => { playClick(); setIsCreating(true); }}
                          style={{ color: colors.primary }}
                          className="transition-colors"
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
                              className="w-full rounded px-2 py-1 text-xs outline-none"
                              style={{
                                  backgroundColor: `${colors.primary}10`,
                                  border: `1px solid ${colors.primary}80`,
                                  color: colors.primary,
                              }}
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
                          className="group flex items-center justify-between p-2 rounded cursor-pointer border transition-all"
                          style={{
                              backgroundColor: activeCanvasId === canvas.id ? `${colors.primary}15` : 'transparent',
                              borderColor: activeCanvasId === canvas.id ? `${colors.primary}60` : 'transparent',
                              boxShadow: activeCanvasId === canvas.id ? `0 0 10px ${colors.primary}20` : 'none',
                          }}
                          onClick={() => {
                              playClick();
                              setActiveCanvas(canvas.id);
                          }}
                      >
                          {editingId === canvas.id ? (
                              <input
                                  autoFocus
                                  type="text"
                                  className="w-full bg-transparent text-xs outline-none"
                                  style={{ borderBottom: `1px solid ${colors.primary}`, color: colors.primary }}
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
                                  <span 
                                    className="text-xs font-bold tracking-wider"
                                    style={{ color: activeCanvasId === canvas.id ? colors.primary : colors.textSecondary }}
                                  >
                                      {canvas.name}
                                  </span>
                                  <span className="text-[9px] font-mono" style={{ color: colors.textSecondary }}>
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
                                  className="p-1 transition-colors"
                                  style={{ color: colors.textSecondary }}
                              >
                                  <span className="material-symbols-outlined text-[14px]">edit</span>
                              </button>
                              <button
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      playClick();
                                      if(confirm("Confirm deletion of this archive?")) deleteCanvas(canvas.id);
                                  }}
                                  className="p-1 hover:text-red-500 transition-colors"
                                  style={{ color: colors.textSecondary }}
                              >
                                  <span className="material-symbols-outlined text-[14px]">delete</span>
                              </button>
                          </div>
                      </div>
                  ))}
              </div>

              <div 
                className="p-3 backdrop-blur-sm"
                style={{ 
                    borderTop: `1px solid ${colors.primary}30`,
                    backgroundColor: `${colors.background}80`,
                }}
              >
                 <button 
                    onClick={() => {
                        playClick();
                        playPowerDown();
                        speak("Terminating Uplink");
                        onShutdown();
                    }}
                    className="w-full mt-3 flex items-center justify-center gap-2 hover:text-red-500 hover:bg-red-500/10 py-1.5 rounded transition-all text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: colors.textSecondary }}
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
      {isThemeOpen && <ThemeSwitcher onClose={() => setIsThemeOpen(false)} />}
    </>
  );
}
