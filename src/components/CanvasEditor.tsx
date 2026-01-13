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
  const { activeCanvas, addElement, updateElement, updateElements, deleteElement, addConnection, deleteConnection } = useCanvas();
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
    if ((e.target as HTMLElement).closest('.element-container')) return;
    
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
      addElement({ type: "sticky", x, y, width: 200, height: 200, content: "Quick_Memo", color: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)], rotation: 0 }); 
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

    // CONNECT TOOL
    if (activeTool === "connect") {
      if (connectionStart === null) {
        setConnectionStart(element.id);
      } else if (connectionStart !== element.id) {
        addConnection(connectionStart, element.id);
        setConnectionStart(null);
      }
      return;
    }

    // DRAG HANDLE CHECK (Only allow dragging from specific areas)
    if (!(e.target as HTMLElement).closest('.drag-handle')) {
        // Allow selecting even if not dragging
        setSelectedElement(element.id);
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

    setLocalPositions((prev) => ({
      ...prev,
      [dragElementRef.current!]: { x: newX, y: newY },
    }));
  }, [isDragging, dragOffset, activeTool]);

  // Auto-layout helper
  const reorganizeFolder = async (folderId: string, currentChildren: CanvasElement[]) => {
      const folder = activeCanvas?.elements.find(e => e.id === folderId);
      if (!folder) return;

      const PADDING = 24;
      const HEADER = 40;
      const COL_WIDTH = 320; 
      const ROW_HEIGHT = 220; 

      const sorted = [...currentChildren].sort((a,b) => (a.y - b.y) || (a.x - b.x));
      
      const batchUpdates: { id: string; changes: Partial<CanvasElement> }[] = [];
      
      for (let i = 0; i < sorted.length; i++) {
          const child = sorted[i];
          const col = i % 2;
          const row = Math.floor(i / 2);
          
          const newX = folder.x + PADDING + (col * COL_WIDTH);
          const newY = folder.y + HEADER + PADDING + (row * ROW_HEIGHT);
          
          if (child.x !== newX || child.y !== newY) {
              batchUpdates.push({ id: child.id, changes: { x: newX, y: newY } });
          }
      }

      // Resize Folder
      const cols = Math.min(sorted.length, 2);
      const rows = Math.ceil(sorted.length / 2);
      
      const newWidth = Math.max(350, (PADDING * 2) + (cols * COL_WIDTH) - 20); 
      const newHeight = Math.max(150, HEADER + PADDING + (rows * ROW_HEIGHT));
      
      if (folder.width !== newWidth || folder.height !== newHeight) {
           batchUpdates.push({ id: folderId, changes: { width: newWidth, height: newHeight } });
      }
      
      if (batchUpdates.length > 0) {
          await updateElements(batchUpdates);
      }
  };

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
    if (!draggedElement) {
        setIsDragging(false);
        dragElementRef.current = null;
        return;
    }

    // Check collision for Grouping (only if dragging a non-folder node)
    if (draggedElement.type !== 'folder') {
        const target = activeCanvas.elements.find(el => 
            el.id !== draggedId && 
            isOverlapping(
                { x: pos.x, y: pos.y, width: draggedElement.width, height: draggedElement.height },
                el
            )
        );

        if (target) {
            // Dragged INTO folder
            if (target.type === 'folder') {
                // Must explicitly update parentId
                await updateElement(draggedId, { x: pos.x, y: pos.y, parentId: target.id });
                
                const children = activeCanvas.elements.filter(el => el.parentId === target.id && el.id !== draggedId);
                // Pass updated dragged element to layout
                await reorganizeFolder(target.id, [...children, { ...draggedElement, x: pos.x, y: pos.y, parentId: target.id }]);

                setLocalPositions(prev => { const n = {...prev}; delete n[draggedId]; return n; });
                setIsDragging(false); 
                dragElementRef.current = null;
                return;
            } 
            // Dragged onto other node -> Create Group
            else if (!target.parentId && !draggedElement.parentId) {
                const PADDING = 24;
                const HEADER = 40;
                const COL_WIDTH = 320;
                
                // Pre-calc size for 2 items
                const initialW = (PADDING * 2) + (2 * COL_WIDTH) - 20; 
                const initialH = HEADER + PADDING + 220; // 1 row

                const folder = await addElement({
                    type: 'folder',
                    x: pos.x - PADDING,
                    y: pos.y - HEADER - PADDING,
                    width: initialW, 
                    height: initialH,
                    content: "NEW_GROUP",
                });
                
                if (folder) {
                    await updateElements([
                        { id: draggedId, changes: { parentId: folder.id } },
                        { id: target.id, changes: { parentId: folder.id } }
                    ]);
                    
                    await reorganizeFolder(folder.id, [
                        { ...draggedElement, parentId: folder.id },
                        { ...target, parentId: folder.id }
                    ]);
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
                    // Ungroup dragged element
                    await updateElement(draggedId, { x: pos.x, y: pos.y, parentId: null });
                    
                    // Check remaining siblings
                    const remaining = activeCanvas.elements.filter(el => el.parentId === parent.id && el.id !== draggedId);
                    
                    if (remaining.length <= 1) {
                        // Explode folder
                        await deleteElement(parent.id); // deleteElement logic releases children automatically in Context, or we can explicit
                        // Note: deleteElement in Context unparents children first.
                        // So the remaining child will become parentId: null.
                        // But its position might be weird (inside the deleted folder area).
                        // That's fine for now.
                    } else {
                        await reorganizeFolder(parent.id, remaining);
                    }

                    setLocalPositions(prev => { const n = {...prev}; delete n[draggedId]; return n; });
                    setIsDragging(false);
                    dragElementRef.current = null;
                    return;
                }
            }
        }
    }

    // Normal Move update
    if (draggedElement.type === 'folder' && dragStartPosRef.current) {
        const deltaX = pos.x - dragStartPosRef.current.x;
        const deltaY = pos.y - dragStartPosRef.current.y;
        
        const children = activeCanvas.elements.filter(el => el.parentId === draggedId);
        
        const updates = [
            { id: draggedId, changes: { x: pos.x, y: pos.y } },
            ...children.map(c => ({ id: c.id, changes: { x: c.x + deltaX, y: c.y + deltaY } }))
        ];
        
        await updateElements(updates);

    } else {
        // Child move within folder
        if (draggedElement.parentId) {
             const siblings = activeCanvas.elements.filter(el => el.parentId === draggedElement.parentId);
             // We update the dragged pos locally first?
             // Actually, we should just update it and let layout snap it back if needed
             // OR snap it immediately.
             const updatedSiblings = siblings.map(s => s.id === draggedId ? { ...s, x: pos.x, y: pos.y } : s);
             await reorganizeFolder(draggedElement.parentId, updatedSiblings);
        } else {
             await updateElement(draggedId, { x: pos.x, y: pos.y });
        }
    }
    
    setLocalPositions(prev => { const n = {...prev}; delete n[draggedId]; return n; });
    setIsDragging(false);
    dragElementRef.current = null;
    dragStartPosRef.current = null;

  }, [isDragging, localPositions, activeCanvas, updateElement, addElement, updateElements, deleteElement]);

  // Helpers
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

  const sortedElements = [...activeCanvas.elements].sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return 0; 
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
                        className={`absolute border-2 border-dashed border-[#eca013]/50 rounded-lg transition-all element-container ${isSelected ? 'border-[#eca013] bg-[#eca013]/5 z-10' : 'z-0'}`}
                        style={{ left: pos.x, top: pos.y, width: element.width, height: element.height }}
                        onMouseDown={(e) => handleElementMouseDown(e, element)}
                    >
                        <div className="absolute -top-6 left-0 px-2 py-0.5 bg-[#eca013] text-[#0a0b10] text-xs font-bold font-mono uppercase rounded-t tracking-wider flex items-center gap-2 drag-handle cursor-grab active:cursor-grabbing">
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
                    className={`absolute rounded-lg shadow-lg backdrop-blur-sm transition-all select-none element-container flex flex-col
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
                    {/* Visual Tab / Drag Handle */}
                    <div className={`h-6 w-full flex items-center px-2 cursor-grab active:cursor-grabbing drag-handle rounded-t-lg
                        ${element.type === 'card' ? 'bg-[#eca013]/10 border-b border-[#eca013]/20' : 'bg-black/10'}`}>
                        <div className="flex gap-1">
                            <div className="w-1 h-3 bg-[#eca013]/40 rounded-full"></div>
                            <div className="w-1 h-3 bg-[#eca013]/40 rounded-full"></div>
                            <div className="w-1 h-3 bg-[#eca013]/40 rounded-full"></div>
                        </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col">
                        {/* Content */}
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
                </div>
            );
        })}
      </div>
       <div className="absolute bottom-6 left-6 text-[10px] text-[#eca013]/60 bg-[#0a0b10]/90 px-3 py-2 rounded border border-[#eca013]/20 font-mono backdrop-blur-sm pointer-events-none">
        <span className="font-bold text-[#eca013]">CMD:</span> GRAB_TAB=MOVE // DRAG_ONTO_NODE=GROUP // DRAG_OUT=UNGROUP
      </div>
    </div>
  );
}
