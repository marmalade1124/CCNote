"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useCanvas } from "@/context/CanvasContext";
import { CanvasElement } from "@/types/canvas";
import { useDebounce } from "@/hooks/useDebounce";

// Retro-compatible sticky colors (tinted rather than solid pastel)
const STICKY_COLORS = [
  "#eca01340", // Amber tint
  "#39ff1440", // Green tint
  "#00f0ff40", // Cyan tint
  "#ff003c40", // Red tint
  "#b026ff40", // Purple tint
];

// Card content helpers (stores title|description format)
interface CardContent {
  title: string;
  description: string;
}

function parseCardContent(content: string): CardContent {
  const parts = content.split("||");
  return {
    title: parts[0] || "Untitled",
    description: parts[1] || "",
  };
}

function serializeCardContent(title: string, description: string): string {
  return `${title}||${description}`;
}

export function CanvasEditor() {
  const { activeCanvas, addElement, updateElement, deleteElement, addConnection, deleteConnection } = useCanvas();
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({});
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragElementRef = useRef<string | null>(null);

  const [activeTool, setActiveTool] = useState<"select" | "card" | "sticky" | "text" | "connect">("select");
  const [connectionStart, setConnectionStart] = useState<string | null>(null);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target !== canvasRef.current) return;

    if (activeTool === "connect") {
      setConnectionStart(null);
      return;
    }

    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === "card") {
      addElement({
        type: "card",
        x,
        y,
        width: 300,
        height: 180,
        content: serializeCardContent("Note_Alpha", "Enter data here..."),
        rotation: 0,
      });
      setActiveTool("select");
    } else if (activeTool === "sticky") {
      addElement({
        type: "sticky",
        x,
        y,
        width: 200,
        height: 200,
        content: "Quick_Memo",
        color: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
        rotation: Math.random() * 6 - 3,
      });
      setActiveTool("select");
    } else if (activeTool === "text") {
      addElement({
        type: "text",
        x,
        y,
        width: 200,
        height: 40,
        content: ">_ TYPE_HERE",
        rotation: 0,
      });
      setActiveTool("select");
    } else {
      setSelectedElement(null);
    }
  };

  const handleElementMouseDown = (e: React.MouseEvent, element: CanvasElement) => {
    e.stopPropagation();

    if (activeTool === "connect") {
      if (connectionStart === null) {
        setConnectionStart(element.id);
      } else if (connectionStart !== element.id) {
        addConnection(connectionStart, element.id);
        setConnectionStart(null);
      }
      return;
    }

    setSelectedElement(element.id);
    setIsDragging(true);
    dragElementRef.current = element.id;
    
    const currentX = localPositions[element.id]?.x ?? element.x;
    const currentY = localPositions[element.id]?.y ?? element.y;
    
    setDragOffset({
      x: e.clientX - currentX,
      y: e.clientY - currentY,
    });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (activeTool === "connect") return; 

    if (!isDragging || !dragElementRef.current) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    setLocalPositions((prev) => ({
      ...prev,
      [dragElementRef.current!]: { x: newX, y: newY },
    }));
  }, [isDragging, dragOffset, activeTool]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragElementRef.current) {
      const pos = localPositions[dragElementRef.current];
      if (pos) {
        updateElement(dragElementRef.current, { x: pos.x, y: pos.y });
      }
    }
    setIsDragging(false);
    dragElementRef.current = null;
  }, [isDragging, localPositions, updateElement]);

  const [localContent, setLocalContent] = useState<Record<string, string>>({});

  const debouncedUpdateContent = useDebounce((elementId: string, content: string) => {
    updateElement(elementId, { content });
  }, 500);

  const handleContentChange = (elementId: string, content: string) => {
    setLocalContent((prev) => ({ ...prev, [elementId]: content }));
    debouncedUpdateContent(elementId, content);
  };

  const getElementContent = (element: CanvasElement) => {
    return localContent[element.id] ?? element.content;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Delete" && selectedElement) {
      deleteElement(selectedElement);
      setSelectedElement(null);
    }
    if (e.key === "Escape") {
      if (activeTool === "connect") {
        setConnectionStart(null);
        setActiveTool("select");
      } else {
        setSelectedElement(null);
      }
    }
  };

  const getElementPosition = (element: CanvasElement) => {
    const local = localPositions[element.id];
    if (local && isDragging && dragElementRef.current === element.id) {
      return local;
    }
    return { x: element.x, y: element.y };
  };

  const getElementCenter = (element: CanvasElement) => {
    const pos = getElementPosition(element);
    return {
      x: pos.x + element.width / 2,
      y: pos.y + (element.type === "text" ? 20 : element.height / 2), 
    };
  };

  if (!activeCanvas) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0b10] bg-[radial-gradient(#1a160f_1px,transparent_1px)] bg-[size:32px_32px]">
        <div className="text-center p-8 border border-[#eca013]/20 bg-[#0a0b10]/90 rounded-lg shadow-[0_0_20px_rgba(236,160,19,0.1)]">
          <div className="size-20 mx-auto mb-6 bg-[#eca013]/10 rounded-full flex items-center justify-center border border-[#eca013]/30">
            <span className="material-symbols-outlined text-4xl text-[#eca013] phosphor-glow">terminal</span>
          </div>
          <h2 className="text-xl font-bold text-[#eca013] mb-2 font-display uppercase tracking-widest phosphor-glow">Select Node Map</h2>
          <p className="text-sm text-[#eca013]/60 max-w-xs font-mono">
            &gt; WAITING_FOR_INPUT...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col relative overflow-hidden bg-[#0a0b10]"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Retro Grid Background */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#1a160f_1px,transparent_1px)] bg-[size:32px_32px] opacity-100"></div>

      {/* Floating Toolbar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 p-2 bg-[#0a0b10]/90 shadow-[0_0_15px_rgba(236,160,19,0.2)] rounded border border-[#eca013] backdrop-blur-md">
        <button
          className={`p-2 rounded transition-all tactile-btn ${
            activeTool === "select" ? "bg-[#eca013] text-[#0a0b10] shadow-[0_0_10px_#eca013]" : "text-[#eca013] hover:bg-[#eca013]/10"
          }`}
          onClick={() => setActiveTool("select")}
          title="SELECT_TOOL"
        >
          <span className="material-symbols-outlined">near_me</span>
        </button>
        <button
          className={`p-2 rounded transition-all tactile-btn ${
            activeTool === "connect" ? "bg-[#eca013] text-[#0a0b10] shadow-[0_0_10px_#eca013]" : "text-[#eca013] hover:bg-[#eca013]/10"
          }`}
          onClick={() => setActiveTool("connect")}
          title="LINK_NODES"
        >
          <span className="material-symbols-outlined">hub</span>
        </button>
        <div className="w-px h-6 bg-[#eca013]/30 mx-1"></div>
        <button
          className={`p-2 rounded transition-all tactile-btn ${
            activeTool === "card" ? "bg-[#eca013] text-[#0a0b10] shadow-[0_0_10px_#eca013]" : "text-[#eca013] hover:bg-[#eca013]/10"
          }`}
          onClick={() => setActiveTool("card")}
          title="ADD_NODE"
        >
          <span className="material-symbols-outlined">crop_landscape</span>
        </button>
        <button
          className={`p-2 rounded transition-all tactile-btn ${
            activeTool === "sticky" ? "bg-[#eca013] text-[#0a0b10] shadow-[0_0_10px_#eca013]" : "text-[#eca013] hover:bg-[#eca013]/10"
          }`}
          onClick={() => setActiveTool("sticky")}
          title="ADD_MEMO"
        >
          <span className="material-symbols-outlined">sticky_note_2</span>
        </button>
        <button
          className={`p-2 rounded transition-all tactile-btn ${
            activeTool === "text" ? "bg-[#eca013] text-[#0a0b10] shadow-[0_0_10px_#eca013]" : "text-[#eca013] hover:bg-[#eca013]/10"
          }`}
          onClick={() => setActiveTool("text")}
          title="ADD_DATA"
        >
          <span className="material-symbols-outlined">text_fields</span>
        </button>
      </div>

      {/* Canvas Info Breadcrumbs */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-2 text-[10px] font-bold tracking-widest bg-[#0a0b10]/80 px-3 py-1.5 rounded border border-[#eca013]/20 backdrop-blur-sm">
        <span className="text-[#eca013]/50">ROOT</span>
        <span className="text-[#eca013]/30">/</span>
        <span className="text-[#eca013]/50">CANVAS</span>
        <span className="text-[#eca013]/30">/</span>
        <span className="text-[#eca013] phosphor-glow uppercase">{activeCanvas.name}</span>
      </div>

      {/* Canvas Area */}
      <div
        ref={canvasRef}
        className="flex-1 relative cursor-crosshair overflow-hidden"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: activeTool === "connect" ? "crosshair" : "default" }}
      >
        {/* Connections Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#eca013" />
            </marker>
          </defs>
          {activeCanvas.connections?.map((conn) => {
            const fromEl = activeCanvas.elements.find(el => el.id === conn.from);
            const toEl = activeCanvas.elements.find(el => el.id === conn.to);
            if (!fromEl || !toEl) return null;

            const start = getElementCenter(fromEl);
            const end = getElementCenter(toEl);

            return (
              <g key={conn.id}>
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="#eca013"
                  strokeWidth="1.5"
                  markerEnd="url(#arrowhead)"
                  opacity="0.5"
                  strokeDasharray="4 2"
                />
              </g>
            );
          })}
        </svg>

        {activeCanvas.elements.map((element) => {
          const pos = getElementPosition(element);
          const isConnectingStart = connectionStart === element.id;

          return (
            <div
              key={element.id}
              className={`absolute p-4 rounded-lg shadow-lg backdrop-blur-sm transition-all ${
                activeTool === "connect" ? "cursor-pointer hover:ring-1 hover:ring-[#eca013]" : "cursor-move"
              } select-none ${
                selectedElement === element.id || isConnectingStart
                  ? "border border-[#39ff14] shadow-[0_0_15px_rgba(57,255,20,0.3)] z-50"
                  : "border border-[#eca013]/30 hover:border-[#eca013] hover:shadow-[0_0_10px_rgba(236,160,19,0.2)]"
              } ${element.type === "card" ? "bg-[#0a0b10]/80" : ""} ${element.type === "text" ? "bg-transparent border-none" : ""}`}
              style={{
                left: pos.x,
                top: pos.y,
                width: element.width,
                minHeight: element.type === "text" ? "auto" : element.height,
                transform: `rotate(${element.rotation || 0}deg)`,
                backgroundColor: element.type === "sticky" ? element.color : undefined,
                zIndex: isConnectingStart ? 20 : 10,
              }}
              onMouseDown={(e) => handleElementMouseDown(e, element)}
            >
              {/* Element Header (ID) */}
              {element.type !== 'text' && (
                <div className="flex justify-between items-start mb-2 opacity-50">
                  <span className="text-[9px] text-[#eca013] font-mono">ID: {element.id.slice(0, 4).toUpperCase()}</span>
                  <span className="material-symbols-outlined text-[12px] text-[#eca013]">drag_handle</span>
                </div>
              )}

              {element.type === "card" && (() => {
                const cardData = parseCardContent(getElementContent(element));
                return (
                  <div className="flex flex-col gap-2 h-full">
                    <input
                      className="w-full bg-transparent font-bold text-base outline-none text-[#eca013] border-b border-[#eca013]/20 pb-1 tracking-wide uppercase font-display placeholder-[#eca013]/30"
                      value={cardData.title}
                      onChange={(e) => handleContentChange(element.id, serializeCardContent(e.target.value, cardData.description))}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      placeholder="HEADER_TEXT"
                      disabled={activeTool === "connect"}
                    />
                    <textarea
                      className="w-full flex-1 bg-transparent text-xs resize-none outline-none text-[#eca013]/80 font-mono tracking-tight placeholder-[#eca013]/30 leading-relaxed"
                      value={cardData.description}
                      onChange={(e) => handleContentChange(element.id, serializeCardContent(cardData.title, e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      placeholder="Input data stream..."
                      disabled={activeTool === "connect"}
                    />
                  </div>
                );
              })()}
              {element.type === "sticky" && (
                <textarea
                  className="w-full h-full bg-transparent text-sm font-medium resize-none outline-none text-[#eca013] font-mono placeholder-[#eca013]/40"
                  value={getElementContent(element)}
                  onChange={(e) => handleContentChange(element.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={activeTool === "connect"}
                  placeholder="MEMO..."
                />
              )}
              {element.type === "text" && (
                <textarea
                  className="w-full bg-transparent text-base resize-none outline-none text-[#eca013] font-mono phosphor-glow placeholder-[#eca013]/30"
                  value={getElementContent(element)}
                  onChange={(e) => handleContentChange(element.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  rows={1}
                  disabled={activeTool === "connect"}
                  placeholder=">_ DATA"
                />
              )}

              {selectedElement === element.id && activeTool !== "connect" && (
                <button
                  className="absolute -top-3 -right-3 size-6 bg-[#1a160f] border border-red-500 text-red-500 rounded flex items-center justify-center hover:bg-red-500 hover:text-[#0a0b10] shadow-[0_0_10px_rgba(239,68,68,0.4)] transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteElement(element.id);
                    setSelectedElement(null);
                  }}
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
          );
        })}

        {activeCanvas.elements.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center p-6 border border-[#eca013]/10 bg-[#eca013]/5 rounded">
                <span className="material-symbols-outlined text-4xl text-[#eca013]/40 mb-2">touch_app</span>
                <p className="text-[#eca013]/60 font-mono text-xs tracking-widest">&gt; CANVAS_EMPTY</p>
                <p className="text-[#eca013]/40 text-[10px] uppercase mt-1">Initialize elements via toolbar</p>
              </div>
            </div>
        )}
      </div>

      <div className="absolute bottom-6 left-6 text-[10px] text-[#eca013]/60 bg-[#0a0b10]/90 px-3 py-2 rounded border border-[#eca013]/20 font-mono backdrop-blur-sm">
        <span className="font-bold text-[#eca013]">CMD:</span> CLICK=ADD // DRAG=MOVE // DEL=PURGE
        {activeTool === "connect" && <span className="text-[#39ff14] font-bold ml-2 animate-pulse"> &gt;&gt; SELECT_TARGET_NODE</span>}
      </div>
    </div>
  );
}
