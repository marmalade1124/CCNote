"use client";

import { useState } from "react";
import Link from "next/link";
import { useCanvas } from "@/context/CanvasContext";

export function Sidebar() {
  const { canvases, activeCanvasId, setActiveCanvas, createCanvas, deleteCanvas, renameCanvas, isLoading } = useCanvas();
  const [isCreating, setIsCreating] = useState(false);
  const [newCanvasName, setNewCanvasName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

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
    <aside className="w-72 flex flex-col border-r border-[#eca013]/20 bg-[#0a0b10] z-20 shrink-0">
      {/* Header */}
      <div className="p-6 flex items-center gap-4 border-b border-[#eca013]/20">
        <div className="size-8 text-[#eca013] flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl phosphor-glow">terminal</span>
        </div>
        <div>
           <h2 className="text-[#eca013] text-sm font-bold leading-tight tracking-[0.1em] phosphor-glow uppercase">SYSTEM: ARCHIVE</h2>
           <p className="text-[#eca013]/40 text-[10px] font-mono tracking-widest">V.1.0.4-STABLE</p>
        </div>
      </div>

      {/* Create New Canvas */}
      <div className="p-4 border-b border-[#eca013]/20">
        {isCreating ? (
          <div className="space-y-3 p-3 bg-[#eca013]/5 border border-[#eca013]/20 rounded">
            <input
              className="w-full px-3 py-2 bg-[#0a0b10] border border-[#eca013]/40 rounded text-[#eca013] text-sm focus:border-[#eca013] focus:ring-1 focus:ring-[#eca013] outline-none font-mono placeholder-[#eca013]/30"
              placeholder="ENTER_NAME..."
              value={newCanvasName}
              onChange={(e) => setNewCanvasName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="flex-1 py-1 bg-[#eca013] text-[#0a0b10] text-xs font-bold tracking-wider hover:opacity-90 tactile-btn flex items-center justify-center gap-1 uppercase"
              >
                <span className="material-symbols-outlined text-sm">check</span>
                Init
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewCanvasName("");
                }}
                className="px-3 py-1 bg-[#1a160f] border border-[#eca013]/30 text-[#eca013] text-xs font-bold hover:bg-[#eca013]/10 tactile-btn uppercase"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#eca013] text-[#0a0b10] py-2 rounded text-xs font-bold tracking-[0.1em] uppercase hover:opacity-90 tactile-btn"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New_File
          </button>
        )}
      </div>

      {/* Canvas List */}
      <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="pb-3 flex items-center gap-4">
          <div className="h-[1px] flex-1 bg-[#eca013]/20"></div>
          <span className="text-[10px] tracking-[0.2em] font-bold text-[#eca013]/40 uppercase">
            Records ({canvases.length})
          </span>
          <div className="h-[1px] flex-1 bg-[#eca013]/20"></div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-[#eca013]/50 font-mono text-xs animate-pulse">
            &gt; LOADING_DATA...
          </div>
        ) : sortedCanvases.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-[#eca013]/50 font-mono">&gt; NO_RECORDS_FOUND</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedCanvases.map((canvas) => (
              <div
                key={canvas.id}
                className={`group flex items-center gap-3 px-3 py-3 rounded border transition-all cursor-pointer ${
                  activeCanvasId === canvas.id
                    ? "bg-[#eca013]/10 border-[#eca013] text-[#eca013] shadow-[0_0_10px_rgba(236,160,19,0.1)]"
                    : "bg-[#0a0b10] border-transparent hover:border-[#eca013]/30 text-[#eca013]/60 hover:text-[#eca013]"
                }`}
                onClick={() => setActiveCanvas(canvas.id)}
              >
                <div className={`size-1.5 rounded-full ${activeCanvasId === canvas.id ? "bg-[#39ff14] shadow-[0_0_5px_#39ff14]" : "bg-[#eca013]/30"}`}></div>
                
                {editingId === canvas.id ? (
                  <input
                    className="flex-1 px-2 py-0.5 min-w-0 bg-[#0a0b10] border border-[#eca013] rounded text-xs outline-none text-[#eca013] font-mono"
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
                    <span className="text-sm font-bold tracking-wide truncate uppercase">{canvas.name}</span>
                    <span className="text-[9px] font-mono text-[#eca013]/40">ID: {canvas.id.slice(0, 6)}...</span>
                  </div>
                )}

                <div className="hidden group-hover:flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(canvas.id, canvas.name);
                    }}
                    className="p-1 hover:text-[#eca013] hover:bg-[#eca013]/10 rounded"
                    title="Rename"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm("Delete this record?")) {
                        await deleteCanvas(canvas.id);
                      }
                    }}
                    className="p-1 hover:text-red-500 hover:bg-red-500/10 rounded"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-[#eca013]/20 bg-[#0a0b10]">
        <Link href="/">
          <button className="w-full flex items-center justify-center gap-2 bg-[#1a160f] border border-[#eca013]/20 text-[#eca013]/60 hover:text-[#eca013] py-2 rounded text-xs font-bold tracking-widest hover:border-[#eca013]/50 transition-all uppercase tactile-btn">
            <span className="material-symbols-outlined text-sm">power_settings_new</span>
            Terminate_Session
          </button>
        </Link>
      </div>
    </aside>
  );
}
