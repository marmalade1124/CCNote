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
    <aside className="w-64 flex flex-col border-r border-[#f0f3f4] dark:border-[#2d3748] bg-white dark:bg-[#101c22] z-20 shrink-0">
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-[#f0f3f4] dark:border-[#2d3748]">
        <div className="size-8 bg-[#13a4ec] rounded-lg flex items-center justify-center text-white">
          <span className="material-symbols-outlined text-lg">polyline</span>
        </div>
        <h2 className="text-lg font-bold tracking-tight">Canvas Notes</h2>
      </div>

      {/* Create New Canvas */}
      <div className="p-4 border-b border-[#f0f3f4] dark:border-[#2d3748]">
        {isCreating ? (
          <div className="space-y-2">
            <input
              className="w-full px-3 py-2 bg-[#f0f3f4] dark:bg-[#1c2a32] border-none rounded-lg text-sm focus:ring-2 focus:ring-[#13a4ec] outline-none"
              placeholder="Canvas name..."
              value={newCanvasName}
              onChange={(e) => setNewCanvasName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="flex-1 py-2 bg-[#13a4ec] text-white rounded-lg text-sm font-medium hover:opacity-90 flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">check</span>
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewCanvasName("");
                }}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm hover:opacity-90"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#13a4ec] text-white py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Canvas
          </button>
        )}
      </div>

      {/* Canvas List */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="pb-2 px-2">
          <p className="text-[10px] font-bold text-[#617c89] uppercase tracking-wider">
            My Canvases ({canvases.length})
          </p>
        </div>

        {isLoading ? (
          <div className="px-3 py-8 text-center">
            <div className="animate-spin size-6 border-2 border-[#13a4ec] border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-[#617c89]">Loading...</p>
          </div>
        ) : sortedCanvases.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-sm text-[#617c89]">No canvases yet</p>
            <p className="text-xs text-[#617c89]/70 mt-1">Create one to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {sortedCanvases.map((canvas) => (
              <div
                key={canvas.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  activeCanvasId === canvas.id
                    ? "bg-[#13a4ec]/10 text-[#13a4ec]"
                    : "hover:bg-[#f0f3f4] dark:hover:bg-[#1c2a32]"
                }`}
                onClick={() => setActiveCanvas(canvas.id)}
              >
                <span className="material-symbols-outlined text-[20px]">description</span>

                {editingId === canvas.id ? (
                  <input
                    className="flex-1 px-2 py-0.5 min-w-0 bg-white dark:bg-[#101c22] border border-[#13a4ec] rounded text-sm outline-none text-[#111618] dark:text-white"
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
                  <span className="flex-1 text-sm font-medium truncate">{canvas.name}</span>
                )}

                <div className="hidden group-hover:flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(canvas.id, canvas.name);
                    }}
                    className="p-1 hover:bg-white dark:hover:bg-[#2d3748] rounded"
                    title="Rename"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm("Delete this canvas?")) {
                        await deleteCanvas(canvas.id);
                      }
                    }}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-[#f0f3f4] dark:border-[#2d3748]">
        <Link href="/">
          <button className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-500 py-2 rounded-lg text-sm font-bold hover:bg-red-500/20 transition-colors">
            <span className="material-symbols-outlined text-sm">logout</span>
            Sign Out
          </button>
        </Link>
      </div>
    </aside>
  );
}
