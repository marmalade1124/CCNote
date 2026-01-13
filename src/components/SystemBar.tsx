"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCanvas } from "@/context/CanvasContext";
import { ProfileModal } from "./ProfileModal";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export function SystemBar() {
  const { canvases, activeCanvasId, setActiveCanvas, createCanvas, deleteCanvas, renameCanvas, isLoading, user } = useCanvas();
  const [isArchivesOpen, setIsArchivesOpen] = useState(false);
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
                onClick={() => setIsArchivesOpen(!isArchivesOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all uppercase text-xs font-bold tracking-widest ${
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
              
              {/* Panel Header */}
              <div className="p-3 border-b border-[#eca013]/20 flex items-center justify-between bg-[#eca013]/5">
                  <span className="text-[#eca013] text-[10px] font-bold tracking-[0.2em] uppercase">File_System</span>
                  <div className="flex gap-1">
                      <div className="size-2 rounded-full bg-red-500/50"></div>
                      <div className="size-2 rounded-full bg-yellow-500/50"></div>
                      <div className="size-2 rounded-full bg-green-500/50"></div>
                  </div>
              </div>

              {/* Create New */}
              <div className="p-3 border-b border-[#eca013]/10">
                {isCreating ? (
                  <div className="space-y-2">
                    <input
                      className="w-full px-3 py-1.5 bg-[#0a0b10] border border-[#eca013]/40 rounded text-[#eca013] text-xs focus:border-[#eca013] outline-none font-mono placeholder-[#eca013]/30"
                      placeholder="ENTER_FILENAME..."
                      value={newCanvasName}
                      onChange={(e) => setNewCanvasName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={handleCreate} className="flex-1 py-1 bg-[#eca013] text-[#0a0b10] text-[10px] font-bold hover:opacity-90 tactile-btn uppercase">Create</button>
                      <button onClick={() => setIsCreating(false)} className="px-3 py-1 bg-[#1a160f] border border-[#eca013]/30 text-[#eca013] text-[10px] font-bold hover:bg-[#eca013]/10 tactile-btn uppercase">X</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="w-full flex items-center justify-center gap-2 bg-[#eca013]/10 text-[#eca013] py-1.5 rounded border border-[#eca013]/20 border-dashed hover:bg-[#eca013]/20 hover:border-[#eca013] text-xs font-bold tracking-widest uppercase transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    New_Record
                  </button>
                )}
              </div>

              {/* List */}
              <div className="overflow-y-auto p-2 custom-scrollbar flex-1 min-h-[200px]">
                {isLoading ? (
                  <div className="py-8 text-center text-[#eca013]/50 font-mono text-[10px] animate-pulse">&gt; READING_DISK...</div>
                ) : sortedCanvases.length === 0 ? (
                  <div className="py-8 text-center text-[#eca013]/30 font-mono text-[10px]">&gt; DRIVE_EMPTY</div>
                ) : (
                  <div className="space-y-1">
                    {sortedCanvases.map((canvas) => (
                      <div
                        key={canvas.id}
                        className={`group flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-all border ${
                          activeCanvasId === canvas.id
                            ? "bg-[#eca013]/10 border-[#eca013] text-[#eca013]"
                            : "bg-transparent border-transparent hover:border-[#eca013]/20 text-[#eca013]/70 hover:text-[#eca013] hover:bg-[#eca013]/5"
                        }`}
                        onClick={() => setActiveCanvas(canvas.id)}
                      >
                         <span className="material-symbols-outlined text-[16px] opacity-70">description</span>
                        
                        {editingId === canvas.id ? (
                          <input
                            className="flex-1 min-w-0 bg-[#0a0b10] border border-[#eca013] rounded text-xs outline-none text-[#eca013] font-mono px-1"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRename(canvas.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            onBlur={() => handleRename(canvas.id)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        ) : (
                          <div className="flex-1 flex flex-col overflow-hidden">
                             <span className="text-xs font-bold truncate uppercase tracking-tight">{canvas.name}</span>
                             <span className="text-[8px] font-mono text-[#eca013]/30 leading-none">SIZE: {Math.floor(Math.random() * 500) + 100}KB</span>
                          </div>
                        )}

                        <div className="hidden group-hover:flex items-center gap-1 opacity-60">
                          <button onClick={(e) => { e.stopPropagation(); startEditing(canvas.id, canvas.name); }} className="hover:text-white"><span className="material-symbols-outlined text-[14px]">edit</span></button>
                          <button onClick={async (e) => { e.stopPropagation(); if(confirm("Delete?")) await deleteCanvas(canvas.id); }} className="hover:text-red-500"><span className="material-symbols-outlined text-[14px]">delete</span></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="p-2 border-t border-[#eca013]/20 bg-[#0a0b10]">
                 <div className="flex items-center justify-between text-[9px] text-[#eca013]/40 font-mono">
                    <span>USED: 48%</span>
                    <span>FREE: 512GB</span>
                 </div>
                 <div className="w-full h-1 bg-[#eca013]/10 mt-1 rounded-full overflow-hidden">
                    <div className="h-full bg-[#eca013] w-[48%]"></div>
                 </div>
                 <Link href="/">
                    <button className="w-full mt-3 flex items-center justify-center gap-2 text-[#eca013]/50 hover:text-red-500 hover:bg-red-500/10 py-1.5 rounded transition-all text-[10px] font-bold uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[14px]">power_settings_new</span>
                        Terminate_Uplink
                    </button>
                 </Link>
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
    </>
  );
}
