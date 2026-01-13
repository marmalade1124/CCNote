"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
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
  } catch (e) {}
  return { title: "Untitled Group", collapsed: false };
}

function serializeFolderContent(title: string, collapsed: boolean): string {
  return JSON.stringify({ title, collapsed });
}

interface ImageContent {
    url: string;
    title: string;
    description: string;
}

function parseImageContent(content: string): ImageContent {
    try {
        const parsed = JSON.parse(content);
        if (typeof parsed === 'object' && parsed !== null) {
            return {
                url: parsed.url || "",
                title: parsed.title || "Image",
                description: parsed.description || ""
            };
        }
    } catch(e) {}
    return { url: "", title: "Image", description: "" };
}

function serializeImageContent(url: string, title: string, description: string): string {
    return JSON.stringify({ url, title, description });
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
  const { activeCanvas, addElement, updateElement, updateElements, deleteElement, addConnection, deleteConnection, activeTool, setActiveTool } = useCanvas();
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 }); // Pan State
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragElementRef = useRef<string | null>(null);
  const dragStartPosRef = useRef<{x: number, y: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panStartRef = useRef<{x: number, y: number} | null>(null); // Ref for pan start

  const [connectionStart, setConnectionStart] = useState<string | null>(null);

  const [localContent, setLocalContent] = useState<Record<string, string>>({});

  const debouncedUpdateContent = useDebounce((elementId: string, content: string) => {
    updateElement(elementId, { content });
  }, 500);

  // Reset view on canvas change (optional, but good UX)
  useEffect(() => {
    setViewOffset({ x: 0, y: 0 });
  }, [activeCanvas?.id]);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) { 
          alert("Image is too large (Max 2MB for prototype).");
          return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
          const result = event.target?.result as string;
          if (result && activeCanvas) {
              const rect = canvasRef.current!.getBoundingClientRect();
              // Calculate center of current viewport
              // Viewport Center X = (Width / 2) - viewOffset.x
              const centerX = (rect.width / 2) - viewOffset.x - 150; // -150 for half element width
              const centerY = (rect.height / 2) - viewOffset.y - 175;
              
              await addElement({
                  type: 'image',
                  x: centerX,
                  y: centerY,
                  width: 300,
                  height: 350,
                  content: serializeImageContent(result, "Uploaded Image", "Description..."),
                  rotation: 0
              });
              
              if (fileInputRef.current) fileInputRef.current.value = "";
          }
      };
      reader.readAsDataURL(file);
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
          for (const child of sorted) {
              if (child.x !== folder.x || child.y !== folder.y) {
                    batchUpdates.push({ id: child.id, changes: { x: folder.x, y: folder.y } });
              }
          }
           if (folder.width !== 220 || folder.height !== 50) {
               batchUpdates.push({ id: folder.id, changes: { width: 220, height: 50 } });
          }
      } else {
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
          await updateElement(element.id, { height: 50, width: 220, content: newContent });
          const children = activeCanvas?.elements.filter(el => el.parentId === element.id) || [];
          await reorganizeLayout(updatedFolder, children, true);
      } else {
           await updateElement(element.id, { content: newContent });
           const children = activeCanvas?.elements.filter(el => el.parentId === element.id) || [];
           await reorganizeLayout(updatedFolder, children, false);
      }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.element-container')) return;
    
    // If panning, do not create
    if (activeTool === 'pan') {
        setIsDragging(false); // safety
        return;
    }

    if (activeTool === "connect") {
      setConnectionStart(null);
      return;
    }
    
    // Calculate click pos in Canvas Space (offset inverse)
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left - viewOffset.x;
    const y = e.clientY - rect.top - viewOffset.y;

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

    // Pan Tool on element -> Treat as pan unless text? 
    // Usually pan tool grabs canvas regardless of element, OR elements are selectable but not draggable?
    // Let's say Pan tool ignores element interactions except letting specific clicks through?
    // For now, if Pan tool, we stop prop and start pan.
    if (activeTool === 'pan') {
         // Pass through to canvas handler logic? 
         // But canvas handler is on background.
         // We trigger pan start here?
         setIsDragging(true);
         panStartRef.current = { x: e.clientX - viewOffset.x, y: e.clientY - viewOffset.y }; 
         return;
    }

    if ((e.target as HTMLElement).closest('.collapse-btn')) return;
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

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

  const handleMouseDownRaw = (e: React.MouseEvent) => {
      // Background Mouse Down for Pan
      if (activeTool === 'pan' || (activeTool === 'select' && e.button === 1)) { // Middle click too
          setIsDragging(true);
          // Store "Mouse - Offset" to preserve delta
          panStartRef.current = { x: e.clientX - viewOffset.x, y: e.clientY - viewOffset.y };
      }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'pan' && isDragging && panStartRef.current) {
        // New Offset = Mouse - Start
        setViewOffset({
            x: e.clientX - panStartRef.current.x,
            y: e.clientY - panStartRef.current.y
        });
        return;
    }

    if (activeTool === "connect" || !isDragging || !dragElementRef.current) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    setLocalPositions((prev) => ({
      ...prev,
      [dragElementRef.current!]: { x: newX, y: newY },
    }));

    if (activeCanvas) {
        const draggedEl = activeCanvas.elements.find(el => el.id === dragElementRef.current);
        if (draggedEl) {
             const currentRect = { x: newX, y: newY, width: draggedEl.width, height: draggedEl.height };
             const target = activeCanvas.elements.find(el => 
                el.id !== draggedEl.id && 
                isOverlapping(currentRect, el) &&
                (draggedEl.type !== 'folder' || el.parentId !== draggedEl.id)
            );
            setDragTargetId(target ? target.id : null);
        }
    }
  }, [isDragging, dragOffset, activeTool, activeCanvas, viewOffset]);

  const handleMouseUp = useCallback(async () => {
    setDragTargetId(null);
    
    if (activeTool === 'pan' && isDragging) {
        setIsDragging(false);
        panStartRef.current = null;
        return;
    }

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
                const otherChildren = activeCanvas.elements.filter(el => el.parentId === target.id && el.id !== draggedId);
                const updatedDragged = { ...draggedElement, x: pos.x, y: pos.y, parentId: target.id };
                await reorganizeLayout(target, [...otherChildren, updatedDragged]);

                setLocalPositions(prev => { const n = {...prev}; delete n[draggedId]; return n; });
                setIsDragging(false); 
                dragElementRef.current = null;
                return;
            } 
            else if (!target.parentId && !draggedElement.parentId) {
                const PADDING = 24; const HEADER = 40; const COL_WIDTH = 320;
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

  }, [isDragging, localPositions, activeCanvas, updateElement, addElement, updateElements, deleteElement, localContent, activeTool]);

  const getElementPosition = (element: CanvasElement) => {
    const local = localPositions[element.id];
    if (local && isDragging && dragElementRef.current === element.id) {
      // Only element coords, ViewOffset handled by transform
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
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.key === "Delete" && selectedElement) {
          deleteElement(selectedElement);
          setSelectedElement(null);
      }
      if (e.key === "Escape") {
          setSelectedElement(null);
          setConnectionStart(null);
          setActiveTool('select');
      }
      // Spacebar for panning? Maybe later.
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
      if (activeTool === 'pan') return isDragging ? 'grabbing' : 'grab';
      switch(activeTool) {
          case 'connect': return 'crosshair';
          case 'card':
          case 'sticky':
          case 'text':
          case 'image': return 'copy';
          default: return 'default';
      }
  };

  if (!activeCanvas) return (
    <div className="flex-1 bg-[#0a0b10] flex flex-col items-center justify-center text-[#eca013] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/200\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
        <div className="flex flex-col items-center z-10 animate-pulse">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">satellite_alt</span>
            <h2 className="text-2xl font-bold tracking-[0.2em] mb-2">SYSTEM STANDBY</h2>
            <p className="text-xs font-mono opacity-50 tracking-widest">ESTABLISH_UPLINK_TO_PROCEED</p>
        </div>
        <div className="scanlines"></div>
    </div>
  );

  const sortedElements = [...activeCanvas.elements].sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return 0; 
  });

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-[#0a0b10] select-none" onKeyDown={handleKeyDown} tabIndex={0} 
         onMouseDown={handleMouseDownRaw} /* Capture Pan Start anywhere */
    >
      <div className="absolute inset-0 pointer-events-none retro-grid opacity-100 mix-blend-screen"
         style={{ backgroundPosition: `${viewOffset.x}px ${viewOffset.y}px` }} /* Move grid with Pan */
      ></div>
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#0a0b10_120%)] opacity-80"></div>
      
      {/* Toolbar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 p-2 bg-[#0a0b10]/90 shadow-[0_0_15px_rgba(236,160,19,0.2)] rounded border border-[#eca013] backdrop-blur-md">
         <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
          {['select', 'pan', 'connect', 'card', 'sticky', 'text', 'image'].map(tool => (
             <button 
                key={tool}
                title={tool.toUpperCase()}
                className={`p-2 rounded transition-all tactile-btn ${activeTool === tool ? "bg-[#eca013] text-[#0a0b10]" : "text-[#eca013] hover:bg-[#eca013]/10"}`}
                onClick={(e) => { 
                    e.stopPropagation(); 
                    if (tool === 'image') {
                        fileInputRef.current?.click();
                    } else {
                        setActiveTool(tool as any); 
                    }
                }}
             >
                 <span className="material-symbols-outlined">{{
                     select: 'near_me',
                     pan: 'hand_gesture',
                     connect: 'hub',
                     card: 'crop_landscape',
                     sticky: 'sticky_note_2',
                     text: 'text_fields',
                     image: 'image'
                 }[tool as string]}</span>
             </button>
         ))}
      </div>

       {/* Canvas Viewport */}
      <div ref={canvasRef} className="flex-1 relative overflow-hidden w-full h-full" 
           onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={() => { handleMouseUp(); setDragTargetId(null); setIsDragging(false); }}
           onClick={handleCanvasClick}
           style={{ cursor: getCursor() }}>
           
           {/* Transformed Content */}
           <div style={{ transform: `translate(${viewOffset.x}px, ${viewOffset.y}px)`, willChange: 'transform', width: '100%', height: '100%', pointerEvents: activeTool === 'pan' ? 'none' : 'auto' }} className={activeTool === 'pan' ? '' : 'pointer-events-auto'}>
               
                {/* Connections */}
                <svg className="absolute top-0 left-0 overflow-visible w-full h-full pointer-events-none z-0">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#eca013" />
                    </marker>
                </defs>
                {activeCanvas.connections.map(conn => {
                    const start = activeCanvas.elements.find(el => el.id === conn.from);
                    const end = activeCanvas.elements.find(el => el.id === conn.to);
                    if(!start || !end) return null;
                    if (start.parentId && collapsedFolders.has(start.parentId)) return null;
                    if (end.parentId && collapsedFolders.has(end.parentId)) return null;
                    
                    const sPos = getElementCenter(start);
                    const ePos = getElementCenter(end);
                    return <line key={conn.id} x1={sPos.x} y1={sPos.y} x2={ePos.x} y2={ePos.y} stroke="#eca013" strokeWidth="1.5" markerEnd="url(#arrowhead)" strokeDasharray="4 2" opacity="0.5"/>
                })}
                </svg>

                {sortedElements.map(element => {
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
                                style={{ left: pos.x, top: pos.y, width: element.width, height: element.height, pointerEvents: 'auto' }}
                                onMouseDown={(e) => handleElementMouseDown(e, element)}
                            >
                                {isDragTarget && (
                                    <div className="absolute -inset-4 border-2 border-[#39ff14] border-dashed rounded-xl z-50 pointer-events-none flex items-center justify-center bg-[#39ff14]/10 backdrop-blur-[1px] animate-pulse">
                                        <span className="bg-[#0a0b10] text-[#39ff14] px-3 py-1 rounded border border-[#39ff14] font-bold text-xs tracking-wider shadow-[0_0_15px_rgba(57,255,20,0.5)]">
                                            📂 ADD TO GROUP
                                        </span>
                                    </div>
                                )}
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
                                        onChange={e => handleFolderContentChange(element.id, e.target.value, folderData.collapsed)}
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
                                ${(element.type === "card" || element.type === "image") ? "bg-[#0a0b10]/90" : ""}
                                ${activeTool === 'connect' ? '!cursor-crosshair' : ''}
                            `}
                            style={{
                                left: pos.x, top: pos.y, width: element.width, minHeight: element.height,
                                transform: `rotate(${element.rotation || 0}deg)`,
                                backgroundColor: element.type === 'sticky' ? element.color : undefined,
                                zIndex: isSelected ? 50 : (element.parentId ? 20 : 10),
                                pointerEvents: 'auto'
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
                                ${(element.type === 'card' || element.type === 'image') ? 'bg-[#eca013]/10 border-b border-[#eca013]/20' : 'bg-black/10'}
                                ${activeTool === 'connect' ? '!cursor-crosshair' : ''}
                            `}>
                                <div className="flex gap-1">
                                    <div className="w-1 h-3 bg-[#eca013]/40 rounded-full"></div>
                                    <div className="w-1 h-3 bg-[#eca013]/40 rounded-full"></div>
                                    <div className="w-1 h-3 bg-[#eca013]/40 rounded-full"></div>
                                </div>
                            </div>

                            <div className="p-4 flex-1 flex flex-col overflow-hidden">
                                {element.type === "image" && (() => {
                                    const imgData = parseImageContent(getElementContent(element));
                                    return (
                                        <div className="flex flex-col gap-2 h-full">
                                            <div className="flex-1 w-full min-h-0 relative rounded overflow-hidden border border-[#eca013]/20 bg-black/50">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={imgData.url} alt="Node" className="w-full h-full object-contain" draggable={false} />
                                            </div>
                                            <input
                                                className="w-full bg-transparent font-bold text-sm outline-none text-[#eca013] border-b border-[#eca013]/20 pb-1 tracking-wide uppercase font-display placeholder-[#eca013]/30"
                                                value={imgData.title}
                                                onChange={(e) => handleContentChange(element.id, serializeImageContent(imgData.url, e.target.value, imgData.description))}
                                                onClick={(e) => e.stopPropagation()}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                placeholder="IMAGE_TITLE"
                                            />
                                            <input
                                                className="w-full bg-transparent text-xs outline-none text-[#eca013]/80 font-mono tracking-tight placeholder-[#eca013]/30"
                                                value={imgData.description}
                                                onChange={(e) => handleContentChange(element.id, serializeImageContent(imgData.url, imgData.title, e.target.value))}
                                                onClick={(e) => e.stopPropagation()}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                placeholder="Caption..."
                                            />
                                        </div>
                                    );
                                })()}

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
      </div>
      <div className="absolute bottom-6 left-6 text-[10px] text-[#eca013]/60 bg-[#0a0b10]/90 px-3 py-2 rounded border border-[#eca013]/20 font-mono backdrop-blur-sm pointer-events-none z-40">
        <span className="font-bold text-[#eca013]">CMD:</span> GRAB_TAB=MOVE // DRAG_ONTO_NODE=GROUP // DRAG_OUT=UNGROUP
      </div>
    </div>
  );
}
