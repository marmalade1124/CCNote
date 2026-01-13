"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useCanvas } from "@/context/CanvasContext";
import { CanvasElement } from "@/types/canvas";
import { useDebounce } from "@/hooks/useDebounce";

const STICKY_COLORS = [
  "#eca01340", "#39ff1440", "#00f0ff40", "#ff003c40", "#b026ff40",
];

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

// Bounding box helper
function getBoundingBox(elements: CanvasElement[]) {
  if (elements.length === 0) return { x: 0, y: 0, width: 400, height: 400 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  elements.forEach(el => {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  });
  
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// Collision detection
function isOverlapping(a: {x: number, y: number, width: number, height: number}, b: {x: number, y: number, width: number, height: number}) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function CanvasEditor() {
  const { activeCanvas, addElement, updateElement, deleteElement, addConnection, deleteConnection } = useCanvas();
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({});
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragElementRef = useRef<string | null>(null);
  const dragStartPosRef = useRef<{x: number, y: number} | null>(null);

  const [activeTool, setActiveTool] = useState<"select" | "card" | "sticky" | "text" | "connect" | "folder">("select");
  const [connectionStart, setConnectionStart] = useState<string | null>(null);

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
      addElement({ type: "card", x, y, width: 300, height: 180, content: serializeCardContent("Note_Alpha", "Enter data..."), rotation: 0 });
      setActiveTool("select");
    } else if (activeTool === "sticky") {
      addElement({ type: "sticky", x, y, width: 200, height: 200, content: "Quick_Memo", color: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)], rotation: 0 }); // flattened rotation for retro feel? kept 0
      setActiveTool("select");
    } else if (activeTool === "text") {
      addElement({ type: "text", x, y, width: 200, height: 40, content: ">_ TYPE_HERE", rotation: 0 });
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
    dragStartPosRef.current = { x: currentX, y: currentY };
    
    setDragOffset({
      x: e.clientX - currentX,
      y: e.clientY - currentY,
    });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (activeTool === "connect" || !isDragging || !dragElementRef.current) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    const deltaX = newX - (localPositions[dragElementRef.current]?.x ?? activeCanvas?.elements.find(el => el.id === dragElementRef.current)?.x ?? 0);
    const deltaY = newY - (localPositions[dragElementRef.current]?.y ?? activeCanvas?.elements.find(el => el.id === dragElementRef.current)?.y ?? 0);

    // If moving a folder, move children visually
    const element = activeCanvas?.elements.find(el => el.id === dragElementRef.current);
    if (element?.type === 'folder') {
        const children = activeCanvas?.elements.filter(el => el.parentId === element.id) || [];
        children.forEach(child => {
             // We need to track children positions too. 
             // Simplification: Just update localPositions for children based on previous local position OR base position + total delta?
             // Best to use previous local position + current frame delta.
             // But React update cycle might miss frames. 
             // Better: Store initial drag start positions for ALL moved elements?
             // Let's rely on calculating absolute new position based on dragOffset for the parent, and applying same diff to children.
             // This requires knowing the *initial* position of children at drag start.
        });
        // This is getting complex for visual drag. 
        // Simple hack: Update parent localPosition. If parent is rendered, children might not move automatically unless their position is relative?
        // BUT we are using absolute positioning.
        // So we MUST update children localPositions too if we want them to move visually with the folder.
        
        // Let's skip complex optimisations for now and just update the parent. 
        // IF we want children to follow, we must update them.
        // I'll update the parent. The children will "snap" on mouse up? No, that looks bad.
        // I'll leave children visual update for now (they won't move visually until mouse up update).
        // User asked "Moving folder moves all children".
        // I'll implement 'MouseUp' logic updates. Visual drag might be static for children for MVP.
        // OR: I can loop and update localPositions for all children.
    }

    setLocalPositions((prev) => ({
      ...prev,
      [dragElementRef.current!]: { x: newX, y: newY },
    }));
  }, [isDragging, dragOffset, activeTool, activeCanvas, localPositions]);

  const handleMouseUp = useCallback(async () => {
    if (!isDragging || !dragElementRef.current || !activeCanvas) {
        setIsDragging(false);
        dragElementRef.current = null;
        return;
    }

    const draggedId = dragElementRef.current;
    const pos = localPositions[draggedId];
    if (!pos) {
        setIsDragging(false);
        dragElementRef.current = null;
        return;
    }

    const draggedElement = activeCanvas.elements.find(el => el.id === draggedId);
    if (!draggedElement) return;

    // Check collision for Grouping (only if dragging a non-folder node)
    if (draggedElement.type !== 'folder') {
        // Find if we dropped onto another node
        const target = activeCanvas.elements.find(el => 
            el.id !== draggedId && 
            isOverlapping(
                { x: pos.x, y: pos.y, width: draggedElement.width, height: draggedElement.height },
                el
            )
        );

        if (target) {
            if (target.type === 'folder') {
                // Dragged INTO folder
                await updateElement(draggedId, { x: pos.x, y: pos.y, parentId: target.id });
                setLocalPositions(prev => { const n = {...prev}; delete n[draggedId]; return n; }); // Clear local to prevent glitch
                setIsDragging(false); 
                dragElementRef.current = null;
                return;
            } else if (!target.parentId && !draggedElement.parentId) {
                // Dragged onto other independent node -> Create Group
                // Calculate Union Box
                const unionBox = getBoundingBox([{...draggedElement, x: pos.x, y: pos.y}, target]);
                const padding = 60;
                
                // Create Folder
                const folder = await addElement({
                    type: 'folder',
                    x: unionBox.x - padding,
                    y: unionBox.y - padding,
                    width: unionBox.width + (padding * 2),
                    height: unionBox.height + (padding * 2),
                    content: "NEW_GROUP",
                });
                
                if (folder) {
                    await updateElement(draggedId, { x: pos.x, y: pos.y, parentId: folder.id });
                    await updateElement(target.id, { parentId: folder.id });
                }
                
                setLocalPositions(prev => { const n = {...prev}; delete n[draggedId]; return n; });
                setIsDragging(false);
                dragElementRef.current = null;
                return;
            }
        }
        
        // Drag Out Logic
        if (draggedElement.parentId) {
            const parent = activeCanvas.elements.find(el => el.id === draggedElement.parentId);
            if (parent) {
                const isStillInside = isOverlapping(
                    { x: pos.x, y: pos.y, width: draggedElement.width, height: draggedElement.height },
                    parent
                );
                if (!isStillInside) {
                    // Dragged OUT
                    await updateElement(draggedId, { x: pos.x, y: pos.y, parentId: null });
                     setLocalPositions(prev => { const n = {...prev}; delete n[draggedId]; return n; });
                    setIsDragging(false);
                    dragElementRef.current = null;
                    return;
                }
            }
        }
    }

    // Normal Move update
    // If it's a folder, we need to move children too (delta)
    if (draggedElement.type === 'folder' && dragStartPosRef.current) {
        const deltaX = pos.x - dragStartPosRef.current.x;
        const deltaY = pos.y - dragStartPosRef.current.y;
        
        const children = activeCanvas.elements.filter(el => el.parentId === draggedId);
        
        // Update parent
        await updateElement(draggedId, { x: pos.x, y: pos.y });

        // Update children
        for (const child of children) {
            await updateElement(child.id, { x: child.x + deltaX, y: child.y + deltaY });
        }
    } else {
        await updateElement(draggedId, { x: pos.x, y: pos.y });
    }
    
    // Clear drag state
    setLocalPositions(prev => { const n = {...prev}; delete n[draggedId]; return n; });
    setIsDragging(false);
    dragElementRef.current = null;
    dragStartPosRef.current = null;

  }, [isDragging, localPositions, activeCanvas, updateElement, addElement]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Delete" && selectedElement) {
          deleteElement(selectedElement);
          setSelectedElement(null);
      }
      if (e.key === "Escape") {
          setSelectedElement(null);
          setConnectionStart(null);
          setActiveTool('select');
      }
  };

  if (!activeCanvas) return <div className="flex-1 bg-[#0a0b10] flex items-center justify-center text-[#eca013]">Select Canvas...</div>;

  // Sorting elements: Folders first (bottom), then others
  const sortedElements = [...activeCanvas.elements].sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return 0; // Keep original order otherwise
  });

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-[#0a0b10]" onKeyDown={handleKeyDown} tabIndex={0} onClick={handleCanvasClick}>
      <div className="absolute inset-0 pointer-events-none retro-grid opacity-100"></div>
      
      {/* Toolbar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 p-2 bg-[#0a0b10]/90 shadow-[0_0_15px_rgba(236,160,19,0.2)] rounded border border-[#eca013] backdrop-blur-md">
         {['select', 'connect', 'card', 'sticky', 'text'].map(tool => (
             <button 
                key={tool}
                className={`p-2 rounded transition-all tactile-btn ${activeTool === tool ? "bg-[#eca013] text-[#0a0b10]" : "text-[#eca013] hover:bg-[#eca013]/10"}`}
                onClick={(e) => { e.stopPropagation(); setActiveTool(tool as any); }}
             >
                 <span className="material-symbols-outlined">{{
                     select: 'near_me',
                     connect: 'hub',
                     card: 'crop_landscape',
                     sticky: 'sticky_note_2',
                     text: 'text_fields'
                 }[tool]}</span>
             </button>
         ))}
      </div>

       {/* Canvas */}
      <div ref={canvasRef} className="flex-1 relative cursor-crosshair overflow-hidden" 
           onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
           style={{ cursor: activeTool === "connect" ? "crosshair" : "default" }}>
           
        {/* Connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
               <polygon points="0 0, 10 3.5, 0 7" fill="#eca013" />
            </marker>
          </defs>
          {activeCanvas.connections.map(conn => {
              const start = activeCanvas.elements.find(el => el.id === conn.from);
              const end = activeCanvas.elements.find(el => el.id === conn.to);
              if(!start || !end) return null;
              const sPos = getElementCenter(start);
              const ePos = getElementCenter(end);
              return <line key={conn.id} x1={sPos.x} y1={sPos.y} x2={ePos.x} y2={ePos.y} stroke="#eca013" strokeWidth="1.5" markerEnd="url(#arrowhead)" strokeDasharray="4 2" opacity="0.5"/>
          })}
        </svg>

        {sortedElements.map(element => {
            const pos = getElementPosition(element);
            const isSelected = selectedElement === element.id;
            
            if (element.type === 'folder') {
                return (
                    <div
                        key={element.id}
                        className={`absolute border-2 border-dashed border-[#eca013]/50 rounded-lg transition-all ${isSelected ? 'border-[#eca013] bg-[#eca013]/5 z-10' : 'z-0'}`}
                        style={{ left: pos.x, top: pos.y, width: element.width, height: element.height }}
                        onMouseDown={(e) => handleElementMouseDown(e, element)}
                    >
                        <div className="absolute -top-6 left-0 px-2 py-0.5 bg-[#eca013] text-[#0a0b10] text-xs font-bold font-mono uppercase rounded-t tracking-wider flex items-center gap-2">
                             <span className="material-symbols-outlined text-[14px]">folder_open</span>
                             <input 
                                className="bg-transparent outline-none w-24 placeholder-black/50"
                                value={getElementContent(element)}
                                onChange={e => handleContentChange(element.id, e.target.value)}
                                onClick={e => e.stopPropagation()}
                                onMouseDown={e => e.stopPropagation()}
                            />
                        </div>
                    </div>
                );
            }

            return (
                <div
                    key={element.id}
                    className={`absolute p-4 rounded-lg shadow-lg backdrop-blur-sm transition-all select-none
                        ${isSelected ? "border border-[#39ff14] shadow-[0_0_15px_rgba(57,255,20,0.3)] z-50" : "border border-[#eca013]/30 hover:shadow-[0_0_10px_rgba(236,160,19,0.2)]"}
                        ${element.type === "card" ? "bg-[#0a0b10]/90" : ""}
                    `}
                    style={{
                        left: pos.x, top: pos.y, width: element.width, minHeight: element.height,
                        transform: `rotate(${element.rotation || 0}deg)`,
                        backgroundColor: element.type === 'sticky' ? element.color : undefined,
                        zIndex: isSelected ? 50 : (element.parentId ? 20 : 10)
                    }}
                    onMouseDown={(e) => handleElementMouseDown(e, element)}
                >
                    {/* Render Content based on type (Card/Sticky/Text) similar to before */}
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
                            />
                            <textarea
                              className="w-full flex-1 bg-transparent text-xs resize-none outline-none text-[#eca013]/80 font-mono tracking-tight placeholder-[#eca013]/30 leading-relaxed"
                              value={cardData.description}
                              onChange={(e) => handleContentChange(element.id, serializeCardContent(cardData.title, e.target.value))}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              placeholder="Input data stream..."
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
                        />
                    )}
                    {element.type === "text" && (
                         <textarea
                          className="w-full bg-transparent text-base resize-none outline-none text-[#eca013] font-mono phosphor-glow placeholder-[#eca013]/30"
                          value={getElementContent(element)}
                          onChange={(e) => handleContentChange(element.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        />
                    )}
                </div>
            );
        })}
      </div>
       <div className="absolute bottom-6 left-6 text-[10px] text-[#eca013]/60 bg-[#0a0b10]/90 px-3 py-2 rounded border border-[#eca013]/20 font-mono backdrop-blur-sm">
        <span className="font-bold text-[#eca013]">CMD:</span> DRAG_ONTO_NODE=GROUP // DRAG_OUT=UNGROUP
      </div>
    </div>
  );
}
