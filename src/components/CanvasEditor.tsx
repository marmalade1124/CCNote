"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useCanvas } from "@/context/CanvasContext";
import { CanvasElement } from "@/types/canvas";
import { useDebounce } from "@/hooks/useDebounce";

const STICKY_COLORS = ["#fff9c4", "#b3e5fc", "#c8e6c9", "#ffccbc", "#e1bee7"];

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
        content: serializeCardContent("Card Title", "Add description here..."),
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
        content: "New Note",
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
        content: "New Text",
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
        // Optional: keep tool active for chaining? Or reset? Let's keep active for now.
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

  // Optimistic local updates during drag (no DB calls)
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (activeTool === "connect") return; // No dragging in connect mode

    if (!isDragging || !dragElementRef.current) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    setLocalPositions((prev) => ({
      ...prev,
      [dragElementRef.current!]: { x: newX, y: newY },
    }));
  }, [isDragging, dragOffset, activeTool]);

  // Save to DB only on mouse up
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

  // Local content state for smooth typing
  const [localContent, setLocalContent] = useState<Record<string, string>>({});

  // Debounced save to DB
  const debouncedUpdateContent = useDebounce((elementId: string, content: string) => {
    updateElement(elementId, { content });
  }, 500);

  const handleContentChange = (elementId: string, content: string) => {
    setLocalContent((prev) => ({ ...prev, [elementId]: content }));
    debouncedUpdateContent(elementId, content);
  };

  // Get content (prefer local during editing)
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

  // Get element position (prefer local during drag)
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
      y: pos.y + (element.type === "text" ? 20 : element.height / 2), // Approx for text
    };
  };

  if (!activeCanvas) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f6f7f8] dark:bg-[#101c22]">
        <div className="text-center">
          <div className="size-20 mx-auto mb-6 bg-[#13a4ec]/10 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-[#13a4ec]">note_add</span>
          </div>
          <h2 className="text-xl font-bold text-[#111618] dark:text-white mb-2">Select a canvas</h2>
          <p className="text-sm text-[#617c89] max-w-xs">
            Choose a canvas from the sidebar or create a new one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col relative overflow-hidden bg-[#f6f7f8] dark:bg-[#101c22]"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Toolbar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 p-1.5 bg-white dark:bg-[#1c2a32] shadow-xl rounded-xl border border-[#f0f3f4] dark:border-[#2d3748]">
        <button
          className={`p-2 rounded-lg transition-colors ${
            activeTool === "select" ? "bg-[#13a4ec]/10 text-[#13a4ec]" : "hover:bg-[#f6f7f8] dark:hover:bg-[#101c22]"
          }`}
          onClick={() => setActiveTool("select")}
          title="Select"
        >
          <span className="material-symbols-outlined">near_me</span>
        </button>
        <button
          className={`p-2 rounded-lg transition-colors ${
            activeTool === "connect" ? "bg-[#13a4ec]/10 text-[#13a4ec]" : "hover:bg-[#f6f7f8] dark:hover:bg-[#101c22]"
          }`}
          onClick={() => setActiveTool("connect")}
          title="Connect"
        >
          <span className="material-symbols-outlined">timeline</span>
        </button>
        <div className="w-px h-6 bg-[#f0f3f4] dark:bg-[#2d3748] mx-1"></div>
        <button
          className={`p-2 rounded-lg transition-colors ${
            activeTool === "card" ? "bg-[#13a4ec]/10 text-[#13a4ec]" : "hover:bg-[#f6f7f8] dark:hover:bg-[#101c22]"
          }`}
          onClick={() => setActiveTool("card")}
          title="Add Card"
        >
          <span className="material-symbols-outlined">crop_landscape</span>
        </button>
        <button
          className={`p-2 rounded-lg transition-colors ${
            activeTool === "sticky" ? "bg-[#13a4ec]/10 text-[#13a4ec]" : "hover:bg-[#f6f7f8] dark:hover:bg-[#101c22]"
          }`}
          onClick={() => setActiveTool("sticky")}
          title="Add Sticky Note"
        >
          <span className="material-symbols-outlined">sticky_note_2</span>
        </button>
        <button
          className={`p-2 rounded-lg transition-colors ${
            activeTool === "text" ? "bg-[#13a4ec]/10 text-[#13a4ec]" : "hover:bg-[#f6f7f8] dark:hover:bg-[#101c22]"
          }`}
          onClick={() => setActiveTool("text")}
          title="Add Text"
        >
          <span className="material-symbols-outlined">text_fields</span>
        </button>
      </div>

      {/* Canvas Name */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-3 bg-white/90 dark:bg-[#1c2a32]/90 px-3 py-2 rounded-lg shadow-sm">
        <div className="size-8 bg-gradient-to-br from-[#13a4ec] to-[#0d7ab8] rounded-full flex items-center justify-center text-white font-bold text-xs">
          {activeCanvas.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-sm font-bold text-[#111618] dark:text-white">{activeCanvas.name}</h1>
          <p className="text-[10px] text-[#617c89]">
            {activeCanvas.elements.length} element{activeCanvas.elements.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={canvasRef}
        className="flex-1 dot-grid relative cursor-crosshair overflow-hidden"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: activeTool === "connect" ? "crosshair" : "default" }}
      >
        {/* Connections SVG Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
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
                  stroke="#9ca3af"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                  opacity="0.6"
                />
                {/* Invisible wider line for easier clicking/deleting? Could add later */}
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
              className={`absolute p-4 rounded-xl shadow-lg border transition-all ${
                // Different cursor if using connect tool
                activeTool === "connect" ? "cursor-pointer hover:ring-2 hover:ring-[#13a4ec]" : "cursor-move"
              } select-none ${
                selectedElement === element.id || isConnectingStart
                  ? "ring-2 ring-[#13a4ec] shadow-xl"
                  : "border-[#f0f3f4] dark:border-[#2d3748] hover:shadow-xl"
              } ${element.type === "card" ? "bg-white dark:bg-[#1c2a32]" : ""} ${element.type === "text" ? "bg-transparent" : ""}`}
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
              {element.type === "card" && (() => {
                const cardData = parseCardContent(getElementContent(element));
                return (
                  <div className="flex flex-col gap-2 h-full">
                    <input
                      className="w-full bg-transparent font-bold text-lg outline-none text-[#111618] dark:text-white border-b border-[#f0f3f4] dark:border-[#2d3748] pb-2"
                      value={cardData.title}
                      onChange={(e) => handleContentChange(element.id, serializeCardContent(e.target.value, cardData.description))}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      placeholder="Card Title"
                      disabled={activeTool === "connect"}
                    />
                    <textarea
                      className="w-full flex-1 bg-transparent text-sm resize-none outline-none text-[#617c89] dark:text-[#a0aec0]"
                      value={cardData.description}
                      onChange={(e) => handleContentChange(element.id, serializeCardContent(cardData.title, e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      placeholder="Add description..."
                      disabled={activeTool === "connect"}
                    />
                  </div>
                );
              })()}
              {element.type === "sticky" && (
                <textarea
                  className="w-full h-full bg-transparent text-sm font-medium resize-none outline-none text-gray-800"
                  value={getElementContent(element)}
                  onChange={(e) => handleContentChange(element.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={activeTool === "connect"}
                />
              )}
              {element.type === "text" && (
                <textarea
                  className="w-full bg-transparent text-base resize-none outline-none text-[#111618] dark:text-white"
                  value={getElementContent(element)}
                  onChange={(e) => handleContentChange(element.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  rows={1}
                  disabled={activeTool === "connect"}
                />
              )}

              {selectedElement === element.id && activeTool !== "connect" && (
                <button
                  className="absolute -top-3 -right-3 size-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg"
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
            <div className="text-center opacity-50">
              <span className="material-symbols-outlined text-6xl text-[#617c89] mb-4">touch_app</span>
              <p className="text-[#617c89]">Click anywhere to add elements</p>
              <p className="text-[#617c89] text-sm mt-1">Select a tool from the toolbar above</p>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 left-6 text-xs text-[#617c89] bg-white/80 dark:bg-[#1c2a32]/80 px-3 py-2 rounded-lg">
        <span className="font-semibold">Tips:</span> Click to add • Drag to move • Delete key to remove
        {activeTool === "connect" && <span className="text-[#13a4ec] font-bold ml-2"> • Click two elements to connect!</span>}
      </div>
    </div>
  );
}
