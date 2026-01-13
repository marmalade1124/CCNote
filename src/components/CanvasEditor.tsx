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

interface FolderContent {
  title: string;
  collapsed: boolean;
}

function parseFolderContent(content: string): FolderContent {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null) {
      return { 
        title: parsed.title || "Untitled Group", 
        collapsed: !!parsed.collapsed 
      };
    }
    return { title: "Untitled Group", collapsed: false };
  } catch (e) {
    return { title: content, collapsed: false };
  }
}

function serializeFolderContent(title: string, collapsed: boolean): string {
  return JSON.stringify({ title, collapsed });
}

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
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  
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

  const handleFolderContentChange = (elementId: string, newTitle: string, currentCollapsed: boolean) => {
      const content = serializeFolderContent(newTitle, currentCollapsed);
      handleContentChange(elementId, content);
  };

  const getElementContent = (element: CanvasElement) => {
    return localContent[element.id] ?? element.content;
  };

  const reorganizeLayout = async (folder: CanvasElement, currentChildren: CanvasElement[], collapsedOverride?: boolean) => {
      if (!folder) return;

      const contentStr = localContent[folder.id] ?? folder.content;
      const parsed = parseFolderContent(contentStr);
      const collapsed = collapsedOverride !== undefined ? collapsedOverride : parsed.collapsed;

      const PADDING = 24;
      const HEADER = 40;
      const COL_WIDTH = 320; 
      const ROW_HEIGHT = 220; 

      const sorted = [...currentChildren].sort((a,b) => (a.y - b.y) || (a.x - b.x));
      
      const batchUpdates: { id: string; changes: Partial<CanvasElement> }[] = [];
      
      if (collapsed) {
          // Collapsed: Stack invisible children at folder location
          for (const child of sorted) {
              if (child.x !== folder.x || child.y !== folder.y) {
                    batchUpdates.push({ id: child.id, changes: { x: folder.x, y: folder.y } });
              }
          }
           if (folder.width !== 220 || folder.height !== 50) {
               batchUpdates.push({ id: folder.id, changes: { width: 220, height: 50 } });
          }
      } else {
          // Expanded: Grid Layout relative to Folder
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

          const cols = Math.min(sorted.length, 2);
          const rows = Math.ceil(sorted.length / 2);
          
          const newWidth = Math.max(350, (PADDING * 2) + (cols * COL_WIDTH) - 20); 
          const newHeight = Math.max(150, HEADER + PADDING + (rows * ROW_HEIGHT));
          
          if (folder.width !== newWidth || folder.height !== newHeight) {
               batchUpdates.push({ id: folder.id, changes: { width: newWidth, height: newHeight } });
          }
      }
      
      if (batchUpdates.length > 0) {
          await updateElements(batchUpdates);
      }
  };

  const toggleFolderCollapse = async (element: CanvasElement) => {
      const currentContent = getElementContent(element);
      const data = parseFolderContent(currentContent);
      const newCollapsed = !data.collapsed;
      
      const newContent = serializeFolderContent(data.title, newCollapsed);
      
      handleContentChange(element.id, newContent); 
      
      const updatedFolder = { ...element, content: newContent };
      
      if (newCollapsed) {
          // Collapse
          await updateElement(element.id, { height: 50, width: 220, content: newContent });
          // Force layout with new collapsed state
          const children = activeCanvas?.elements.filter(el => el.parentId === element.id) || [];
          await reorganizeLayout(updatedFolder, children, true);
      } else {
           // Expand
           await updateElement(element.id, { content: newContent }); 
           const children = activeCanvas?.elements.filter(el => el.parentId === element.id) || [];
           await reorganizeLayout(updatedFolder, children, false);
      }
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

    if (activeTool === "connect") {
      if (connectionStart === null) {
        setConnectionStart(element.id);
      } else if (connectionStart !== element.id) {
        addConnection(connectionStart, element.id);
        setConnectionStart(null);
      }
      return;
    }

    // Allow clicking collapse button without dragging
    if ((e.target as HTMLElement).closest('.collapse-btn')) return;

    if (!(e.target as HTMLElement).closest('.drag-handle')) {
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

    // HIT TEST for Drop Zones
    if (activeCanvas) {
        const draggedEl = activeCanvas.elements.find(el => el.id === dragElementRef.current);
        if (draggedEl) {
             const currentRect = { x: newX, y: newY, width: draggedEl.width, height: draggedEl.height };
             
             // Simple hitbox interaction: Find any element we overlap that isn't us
             const target = activeCanvas.elements.find(el => 
                el.id !== draggedEl.id && 
                isOverlapping(currentRect, el) &&
                // Don't target own children in a weird recursive way (not possible with current logic but safe)
                (draggedEl.type !== 'folder' || el.parentId !== draggedEl.id)
            );
            
            setDragTargetId(target ? target.id : null);
        }
    }
  }, [isDragging, dragOffset, activeTool, activeCanvas]);

  const handleMouseUp = useCallback(async () => {
    setDragTargetId(null); // Clear highlight

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

    if (draggedElement.type !== 'folder') {
        const target = activeCanvas.elements.find(el => 
            el.id !== draggedId && 
            isOverlapping(
                { x: pos.x, y: pos.y, width: draggedElement.width, height: draggedElement.height },
                el
            )
        );

        if (target) {
            if (target.type === 'folder') {
                await updateElement(draggedId, { x: pos.x, y: pos.y, parentId: target.id });
                
                // Use FRESH children list
                const otherChildren = activeCanvas.elements.filter(el => el.parentId === target.id && el.id !== draggedId);
                const updatedDragged = { ...draggedElement, x: pos.x, y: pos.y, parentId: target.id };
                
                await reorganizeLayout(target, [...otherChildren, updatedDragged]);

                setLocalPositions(prev => { const n = {...prev}; delete n[draggedId]; return n; });
                setIsDragging(false); 
                dragElementRef.current = null;
                return;
            } 
            else if (!target.parentId && !draggedElement.parentId) {
                const PADDING = 24;
                const HEADER = 40;
                const COL_WIDTH = 320;
                const initialW = (PADDING * 2) + (2 * COL_WIDTH) - 20; 
                const initialH = HEADER + PADDING + 220; 

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
                    
                    await reorganizeLayout(folder, [
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
        
        if (draggedElement.parentId) {
            const parent = activeCanvas.elements.find(el => el.id === draggedElement.parentId);
            if (parent) {
                const isStillInside = isOverlapping(
                    { x: pos.x, y: pos.y, width: draggedElement.width, height: draggedElement.height },
                    parent
                );
                
                if (!isStillInside) {
                    await updateElement(draggedId, { x: pos.x, y: pos.y, parentId: null });
                    const remaining = activeCanvas.elements.filter(el => el.parentId === parent.id && el.id !== draggedId);
                    
                    if (remaining.length <= 1) {
                         await deleteElement(parent.id);
                    } else {
                        await reorganizeLayout(parent, remaining);
                    }

                    setLocalPositions(prev => { const n = {...prev}; delete n[draggedId]; return n; });
                    setIsDragging(false);
                    dragElementRef.current = null;
                    return;
                }
            }
        }
    }

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
        if (draggedElement.parentId) {
             const parent = activeCanvas.elements.find(el => el.id === draggedElement.parentId);
             const siblings = activeCanvas.elements.filter(el => el.parentId === draggedElement.parentId);
             const updatedSiblings = siblings.map(s => s.id === draggedId ? { ...s, x: pos.x, y: pos.y } : s);
             if (parent) await reorganizeLayout(parent, updatedSiblings);
        } else {
             await updateElement(draggedId, { x: pos.x, y: pos.y });
        }
    }
    
    setLocalPositions(prev => { const n = {...prev}; delete n[draggedId]; return n; });
    setIsDragging(false);
    dragElementRef.current = null;
    dragStartPosRef.current = null;

  }, [isDragging, localPositions, activeCanvas, updateElement, addElement, updateElements, deleteElement, localContent]); // Added localContent dep

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

  const collapsedFolders = useMemo(() => {
     const set = new Set<string>();
     if (activeCanvas) {
         activeCanvas.elements.forEach(el => {
             if (el.type === 'folder') {
                 const content = localContent[el.id] ?? el.content;
                 const data = parseFolderContent(content);
                 if (data.collapsed) set.add(el.id);
             }
         });
     }
     return set;
  }, [activeCanvas, localContent]);

  const getCursor = () => {
      switch(activeTool) {
          case 'connect': return 'crosshair';
          case 'card':
          case 'sticky':
          case 'text': return 'copy';
          default: return 'default';
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
      <div className="absolute inset-0 pointer-events-none retro-grid opacity-100 mix-blend-screen"></div>
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#0a0b10_120%)] opacity-80"></div>
      
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
      <div ref={canvasRef} className="flex-1 relative overflow-hidden" 
           onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
           style={{ cursor: getCursor() }}>
           
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
              // Hide connection if either end is in a collapsed folder
              if(!start || !end) return null;
              if (start.parentId && collapsedFolders.has(start.parentId)) return null;
              if (end.parentId && collapsedFolders.has(end.parentId)) return null;
              
              const sPos = getElementCenter(start);
              const ePos = getElementCenter(end);
              return <line key={conn.id} x1={sPos.x} y1={sPos.y} x2={ePos.x} y2={ePos.y} stroke="#eca013" strokeWidth="1.5" markerEnd="url(#arrowhead)" strokeDasharray="4 2" opacity="0.5"/>
          })}
        </svg>

        {sortedElements.map(element => {
            // Hide if parent is collapsed
            if (element.parentId && collapsedFolders.has(element.parentId)) return null;

            const pos = getElementPosition(element);
            const isSelected = selectedElement === element.id;
            const isDragTarget = dragTargetId === element.id;
            
            if (element.type === 'folder') {
                const folderData = parseFolderContent(getElementContent(element));
                return (
                    <div
                        key={element.id}
                        className={`absolute border-2 border-dashed border-[#eca013]/30 rounded-lg transition-all element-container ${isSelected ? 'border-[#eca013] bg-[#eca013]/5 z-10' : 'z-0'} ${activeTool === 'connect' ? '!cursor-crosshair' : ''}`}
                        style={{ left: pos.x, top: pos.y, width: element.width, height: element.height }}
                        onMouseDown={(e) => handleElementMouseDown(e, element)}
                    >
                         {isDragTarget && (
                            <div className="absolute -inset-4 border-2 border-[#39ff14] border-dashed rounded-xl z-50 pointer-events-none flex items-center justify-center bg-[#39ff14]/10 backdrop-blur-[1px] animate-pulse">
                                <span className="bg-[#0a0b10] text-[#39ff14] px-3 py-1 rounded border border-[#39ff14] font-bold text-xs tracking-wider shadow-[0_0_15px_rgba(57,255,20,0.5)]">
                                    📂 ADD TO GROUP
                                </span>
                            </div>
                         )}

                         {/* Visual Tab */}
                        <div className={`absolute -top-7 left-[-2px] h-7 px-3 bg-[#eca013]/10 border-t border-x border-[#eca013]/30 text-[#eca013] text-xs font-bold font-mono uppercase rounded-t-lg tracking-wider flex items-center gap-2 drag-handle cursor-grab active:cursor-grabbing backdrop-blur-md ${isSelected ? 'bg-[#eca013]/20 border-[#eca013]' : ''} ${activeTool === 'connect' ? '!cursor-crosshair' : ''}`}>
                             <div className="flex gap-1 mr-2 opacity-50">
                                <div className="w-1 h-3 bg-[#eca013] rounded-full"></div>
                                <div className="w-1 h-3 bg-[#eca013] rounded-full"></div>
                            </div>
                             <button className="hover:bg-[#eca013]/20 rounded p-0.5 collapse-btn flex items-center justify-center transition-colors -ml-1" onClick={() => toggleFolderCollapse(element)}>
                                <span className="material-symbols-outlined text-[18px]">
                                    {folderData.collapsed ? 'expand_more' : 'expand_less'}
                                </span>
                             </button>
                             <span className="material-symbols-outlined text-[16px] opacity-70">folder_open</span>
                             <input 
                                className="bg-transparent outline-none w-32 placeholder-[#eca013]/40 text-[#eca013] font-bold"
                                value={folderData.title}
                                onChange={e => {
                                    handleFolderContentChange(element.id, e.target.value, folderData.collapsed);
                                }}
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
                        ${activeTool === 'connect' ? '!cursor-crosshair' : ''}
                    `}
                    style={{
                        left: pos.x, top: pos.y, width: element.width, minHeight: element.height,
                        transform: `rotate(${element.rotation || 0}deg)`,
                        backgroundColor: element.type === 'sticky' ? element.color : undefined,
                        zIndex: isSelected ? 50 : (element.parentId ? 20 : 10)
                    }}
                    onMouseDown={(e) => handleElementMouseDown(e, element)}
                >
                     {isDragTarget && (
                        <div className="absolute -inset-4 border-2 border-[#39ff14] border-dashed rounded-xl z-50 pointer-events-none flex items-center justify-center bg-[#39ff14]/10 backdrop-blur-[1px] animate-pulse">
                            <span className="bg-[#0a0b10] text-[#39ff14] px-3 py-1 rounded border border-[#39ff14] font-bold text-xs tracking-wider shadow-[0_0_15px_rgba(57,255,20,0.5)]">
                                ✨ CREATE GROUP
                            </span>
                        </div>
                     )}

                    <div className={`h-6 w-full flex items-center px-2 cursor-grab active:cursor-grabbing drag-handle rounded-t-lg
                        ${element.type === 'card' ? 'bg-[#eca013]/10 border-b border-[#eca013]/20' : 'bg-black/10'}
                        ${activeTool === 'connect' ? '!cursor-crosshair' : ''}
                    `}>
                        <div className="flex gap-1">
                            <div className="w-1 h-3 bg-[#eca013]/40 rounded-full"></div>
                            <div className="w-1 h-3 bg-[#eca013]/40 rounded-full"></div>
                            <div className="w-1 h-3 bg-[#eca013]/40 rounded-full"></div>
                        </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col">
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
