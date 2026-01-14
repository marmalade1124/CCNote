"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useCanvas } from "@/context/CanvasContext";
import { CanvasElement } from "@/types/canvas";
import { useDebounce } from "@/hooks/useDebounce";
import { useSfx } from "@/hooks/useSfx";
import { Radar } from "./Radar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import { supabase } from "@/lib/supabase";

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
    title: parts[0], // Allow empty string
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
            title: parsed.title, // Allow empty 
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
  const { playClick, playHover, playConfirm, playConnect, playTyping, playBoot, speak, playMerge, playUngroup, playTrash } = useSfx();
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  useEffect(() => {
     // Boot Logic
     const timer = setTimeout(() => {
        // playBoot(); // Moved to Login for smoother sequence
        speak("System Online");
     }, 800); // Slight delay for fade in
     return () => clearTimeout(timer);
  }, [speak]);

  // Replaced dragOffset with explicit start refs for scaling support
  // const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 }); 
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 }); // Pan State (T)
  const [zoom, setZoom] = useState(1); // Zoom State (S)
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({});
  
  // Refs for Event Listener Access
  const zoomRef = useRef(zoom);
  const viewOffsetRef = useRef(viewOffset);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { viewOffsetRef.current = viewOffset; }, [viewOffset]);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  
  const [canvasEl, setCanvasEl] = useState<HTMLDivElement | null>(null);
  const dragElementRef = useRef<string | null>(null);
  const dragStartPosRef = useRef<{x: number, y: number} | null>(null); // Element Original World Pos
  const dragStartMouseRef = useRef<{x: number, y: number} | null>(null); // Mouse Original Screen Pos
  const panStartRef = useRef<{x: number, y: number} | null>(null); // Ref for pan start (Mouse - Offset)
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!canvasEl) return;
    const updateSize = () => {
        const rect = canvasEl.getBoundingClientRect();
        if (rect) setViewportSize({ width: rect.width, height: rect.height });
    };
    
    // Initial size
    updateSize();

    const resizeObserver = new ResizeObserver(() => {
       updateSize();
    });
    
    resizeObserver.observe(canvasEl);
    return () => resizeObserver.disconnect();
  }, [canvasEl]);

  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  
  const activeCommandSetter = useRef<((s: string) => void) | null>(null);

  // Resize State
  const [resizeTarget, setResizeTarget] = useState<{ id: string, startX: number, startY: number, startWidth: number, startHeight: number } | null>(null);

  const handleResizeStart = (e: React.MouseEvent, id: string, width: number, height: number) => {
      e.stopPropagation();
      setResizeTarget({ 
          id, 
          startX: e.clientX, 
          startY: e.clientY, 
          startWidth: width, 
          startHeight: height 
      });
  };



  // Slash Command State
  const [commandMenu, setCommandMenu] = useState<{
      visible: boolean;
      x: number;
      y: number;
      elementId: string;
      fieldType: 'plain' | 'card_desc' | 'image_caption' | 'image_title' | 'card_title';
      query: string;
      index: number;
      menuType: 'slash' | 'wiki'; // New field for differentiating menus
  } | null>(null);

  const [viewMode, setViewMode] = useState<'editor' | 'graph'>('editor');
  
  const [localContent, setLocalContent] = useState<Record<string, string>>({});

  const debouncedUpdateContent = useDebounce((elementId: string, content: string) => {
    updateElement(elementId, { content });
    
    if (!activeCanvas) return;

    // Helper to find target by name (Reusable)
    const findTarget = (name: string) => {
        return activeCanvas.elements.find(el => {
             if (el.type === 'card' && el.content.startsWith(name + '||')) return true;
             if ((el.type === 'text' || el.type === 'sticky') && (el.content.startsWith(name) || el.content === name)) return true;
             if (el.type === 'folder') { try { const p = JSON.parse(el.content); return p.title === name; } catch(e){ return false; } }
             if (el.type === 'image') { try { const p = JSON.parse(el.content); return p.title === name; } catch(e){ return false; } }
             return false;
        });
    };

    // 1. Detect Removed Links (Diff against Old Content)
    const oldElement = activeCanvas.elements.find(el => el.id === elementId);
    if (oldElement) {
        const oldLinks = new Set(Array.from(oldElement.content.matchAll(/\[\[(.*?)\]\]/g)).map(m => m[1]));
        const newLinks = new Set(Array.from(content.matchAll(/\[\[(.*?)\]\]/g)).map(m => m[1]));
        
        const removedNames = [...oldLinks].filter(x => !newLinks.has(x));
        
        removedNames.forEach(name => {
            const target = findTarget(name);
            if (target) {
                // Delete connection if it exists
                const conn = activeCanvas.connections.find(c => c.from === elementId && c.to === target.id);
                if (conn) deleteConnection(conn.id);
            }
        });
    }

    // 2. Add New Links
    const matches = Array.from(content.matchAll(/\[\[(.*?)\]\]/g));
    if (matches.length > 0) {
         matches.forEach(match => {
             const targetName = match[1];
             const target = findTarget(targetName);
             
             if (target && target.id !== elementId) {
                 // Check if connection already exists to prevent spamming SFX
                 const exists = activeCanvas.connections.some(c => c.from === elementId && c.to === target.id);
                 if (!exists) {
                     addConnection(elementId, target.id);
                     playConnect(); // SFX for Wiki Link
                 }
             }
         });
    }
  }, 500);

  // Reset view on canvas change (optional, but good UX)
  useEffect(() => {
    setViewOffset({ x: 0, y: 0 });
    setZoom(1);
    setLocalPositions({});
  }, [activeCanvas?.id]);

  /* Removed problematic useEffect that caused race conditions */

  const handleContentChange = (elementId: string, content: string) => {
    setLocalContent((prev) => ({ ...prev, [elementId]: content }));
    
    // Slash Command Logic: Update Query or Close
    if (commandMenu && commandMenu.visible && commandMenu.elementId === elementId) {
           let currentText = "";
           // Parse content to get relevant text field
           if (commandMenu.fieldType === 'plain') currentText = content;
           else if (commandMenu.fieldType === 'card_desc') currentText = parseCardContent(content).description;
           else if (commandMenu.fieldType === 'image_caption') currentText = parseImageContent(content).description;
           else if (commandMenu.fieldType === 'image_title') currentText = parseImageContent(content).title;
           else if (commandMenu.fieldType === 'card_title') currentText = parseCardContent(content).title;

           // Detect Slash Command
           const lastSlashIndex = currentText.lastIndexOf('/');
           // Detect Wiki Link
           const lastWikiIndex = currentText.lastIndexOf('[[');
           
           // Determine which one is closer to end (active)
           if (lastWikiIndex > lastSlashIndex && lastWikiIndex !== -1) {
                // Wiki Mode
                const rawC = currentText.slice(lastWikiIndex + 2);
                const query = rawC.split('\n')[0]; // Stop at newline
                setCommandMenu(prev => prev ? { ...prev, menuType: 'wiki', query } : null);
           } else if (lastSlashIndex !== -1) {
                // Slash Mode 
                const rawC = currentText.slice(lastSlashIndex + 1);
                const query = rawC.split('\n')[0]; // Stop at newline
                setCommandMenu(prev => prev ? { ...prev, menuType: 'slash', query } : null);
           } else {
               setCommandMenu(null); 
           }
    } else {
        // Also check if we SHOULD open it (e.g. typing '[[' fresh)
        // ... Logic for fresh opening needs to be in key handler or here? 
        // Let's rely on KeyHandler for OPENING, but this listener for UPDATING/CLOSING.
        // Actually, for Wiki Link, it effectively acts like a slash command.
        
        // Let's duplicate the check here for "Auto-Open" on type? 
        // No, keep it clean. 'handleInputKeyDown' triggers OPEN.
    }

    debouncedUpdateContent(elementId, content);
  };

  const handleFolderContentChange = (elementId: string, newTitle: string, currentCollapsed: boolean) => {
      const content = serializeFolderContent(newTitle, currentCollapsed);
      handleContentChange(elementId, content);
  };

  const toggleCardCheckbox = (elementId: string, lineIndex: number) => {
      // Use localContent if available to ensure we toggle what is currently visible
      const currentContent = localContent[elementId] ?? activeCanvas?.elements.find(e => e.id === elementId)?.content;
      
      if (!currentContent) return;
      
      const cardData = parseCardContent(currentContent);
      const lines = cardData.description.split('\n');
      
      // lineIndex is 0-based index from node.position.start.line - 1
      console.log('toggleCardCheckbox attempting index:', lineIndex, 'Total lines:', lines.length);
      if (lines[lineIndex] !== undefined) {
          const line = lines[lineIndex];
          console.log('Current line content:', line);
          
          let newLine = line;
          if (line.includes('[ ]')) {
              newLine = line.replace('[ ]', '[x]');
          } else if (line.includes('[x]')) {
              newLine = line.replace('[x]', '[ ]');
          }
          
          if (newLine !== line) {
              console.log('Updating line to:', newLine);
              lines[lineIndex] = newLine;
              const newDesc = lines.join('\n');
              handleContentChange(elementId, serializeCardContent(cardData.title, newDesc));
          } else {
              console.warn('Line did not contain expected checkbox brackets');
          }
      } else {
          console.warn('Line index out of bounds');
      }
  };

  const toggleCardCheckboxByIndex = (elementId: string, checkboxIndex: number) => {
      // Use localContent if available
      const currentContent = localContent[elementId] ?? activeCanvas?.elements.find(e => e.id === elementId)?.content;
      if (!currentContent) return;
      
      const cardData = parseCardContent(currentContent);
      const lines = cardData.description.split('\n');
      
      // Find all lines that look like a checkbox
      // Matches: start of line (or whitespace), then dash/star/plus, then space, then [ ] or [x] or [X]
      let matchCount = -1;
      let targetLineIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Check for checkbox pattern
          if (/^\s*[-*+]\s+\[[ xX]\]/.test(line)) {
              matchCount++;
              if (matchCount === checkboxIndex) {
                  targetLineIndex = i;
                  break;
              }
          }
      }
      
      if (targetLineIndex !== -1) {
          const line = lines[targetLineIndex];
          let newLine = line;
          
          if (line.includes('[ ]')) {
              newLine = line.replace('[ ]', '[x]');
          } else if (line.includes('[x]')) {
              newLine = line.replace('[x]', '[ ]');
          } else if (line.includes('[X]')) {
             newLine = line.replace('[X]', '[ ]');
          }
          
          if (newLine !== line) {
              lines[targetLineIndex] = newLine;
              const newDesc = lines.join('\n');
              handleContentChange(elementId, serializeCardContent(cardData.title, newDesc));
          }
      }
  };
  const handleInputKeyDown = (
      e: React.KeyboardEvent, 
      elementId: string, 
      currentContent: string, 
      setContent: (s: string) => void,
      fieldType: 'plain' | 'card_desc' | 'image_caption' | 'image_title' | 'card_title' = 'plain'
  ) => {
       playTyping(); // Play sound on every key press in inputs

       // Command Menu Navigation
       if (commandMenu && commandMenu.visible && commandMenu.elementId === elementId) {
           activeCommandSetter.current = setContent; // Update setter reference
           if (e.key === 'ArrowDown') {
               e.preventDefault();
               setCommandMenu(prev => prev ? { ...prev, index: Math.min(prev.index + 1, 4) } : null);
               return;
           }
           if (e.key === 'ArrowUp') {
               e.preventDefault();
               setCommandMenu(prev => prev ? { ...prev, index: Math.max(prev.index - 1, 0) } : null);
               return;
           }
           if (e.key === 'Enter') {
               e.preventDefault();
               executeCommand(commandMenu.index);
               return;
           }
           if (e.key === 'Escape') {
               setCommandMenu(null);
               return;
           }
       }

       // Trigger '/'
       if (e.key === '/') {
           const target = e.currentTarget as HTMLTextAreaElement | HTMLInputElement;
           
           // Calculate position based on cursor (approximate)
           const rect = target.getBoundingClientRect();
           const cursorIndex = target.selectionStart || 0;
           const textBefore = target.value.substring(0, cursorIndex);
           const lines = textBefore.split('\n');
           const lineCount = lines.length;
           
           // Estimate Y offset: Line Height ~20px + Padding
           // We can also use a hidden span for exact coords, but lines count is a good heuristic
           const lineHeight = 21; // roughly matched to textarea line-height
           const topOffset = 16; // padding-top
           const relativeY = topOffset + (lineCount * lineHeight);
           
           // Ensure it stays within bounds
           const menuY = Math.min(rect.top + relativeY + 10, rect.bottom + 10);

           activeCommandSetter.current = setContent;
           setCommandMenu({
               visible: true,
               x: rect.left + 20, // Keep Left aligned for now as X is hard to measure without mirror
               y: menuY,
               elementId,
               fieldType,
               query: '',
               index: 0,
               menuType: 'slash'
           });
       }

       // Trigger '[['
       if (e.key === '[') {
            const target = e.currentTarget as HTMLTextAreaElement | HTMLInputElement;
            if (currentContent.endsWith('[')) { 
                const rect = target.getBoundingClientRect();
                
                // Similar positioning for Wiki
                const cursorIndex = target.selectionStart || 0;
                const textBefore = target.value.substring(0, cursorIndex);
                const lineCount = textBefore.split('\n').length;
                const lineHeight = 21;
                const topOffset = 16;
                const relativeY = topOffset + (lineCount * lineHeight);
                const menuY = Math.min(rect.top + relativeY + 10, rect.bottom + 10);
                
                activeCommandSetter.current = setContent;
                setCommandMenu({
                    visible: true,
                    x: rect.left + 20,
                    y: menuY,
                    elementId,
                    fieldType,
                    query: '',
                    index: 0,
                    menuType: 'wiki'
                });
            }
       }
  };

  const executeCommand = (index: number) => {
      if (!commandMenu || !activeCommandSetter.current) return;
      const commands = getFilteredCommands(commandMenu.query);
      const cmd = commands[index];
      
      // Get Current Content
      // We must retrieve it freshly because 'currentContent' arg to handleInputKeyDown is stale in this closure context?
      // No, we need it. 
      // We can look it up activeCanvas/localContent using elementId and fieldType.
      const el = activeCanvas?.elements.find(e => e.id === commandMenu.elementId);
      if (!el) return;
      
      let rawContent = localContent[el.id] ?? el.content; 
      // This rawContent is the FULL content (e.g. JSON for card).
      // We need the TEXT part.
      let currentText = "";
      
      try {
          if (commandMenu.fieldType === 'plain') currentText = rawContent;
          else if (commandMenu.fieldType === 'card_desc') currentText = parseCardContent(rawContent).description;
          else if (commandMenu.fieldType === 'image_caption') currentText = parseImageContent(rawContent).description;
          else if (commandMenu.fieldType === 'image_title') currentText = parseImageContent(rawContent).title;
          else if (commandMenu.fieldType === 'card_title') currentText = parseCardContent(rawContent).title;
      } catch (e) { return; }

      if (cmd) {
         const q = commandMenu.query;
         // Determine search string based on type
         const matchStr = commandMenu.menuType === 'wiki' ? '[[' + q : '/' + q;
         const idx = currentText.lastIndexOf(matchStr);
         if (idx !== -1) {
             const newText = currentText.slice(0, idx) + cmd.insert + currentText.slice(idx + matchStr.length);
             activeCommandSetter.current(newText);
         }
         setCommandMenu(null);
      }
  };

  const getFilteredCommands = (query: string) => {
      if (commandMenu?.menuType === 'wiki') {
          // Wiki Link Suggestions
          const nodes = activeCanvas?.elements.map(el => {
              // Parse title based on type
              let label = "Unknown";
              if (el.type === 'card') label = parseCardContent(el.content).title;
              else if (el.type === 'image') label = parseImageContent(el.content).title;
              else if (el.type === 'folder') label = parseFolderContent(el.content).title;
              else if (el.type === 'text' || el.type === 'sticky') label = el.content.slice(0, 20); // First 20 chars
              
              if (!label || label === "Untitled" || label === "Untitled Group") return null;

              return {
                  label,
                  insert: `[[${label}]]`,
                  desc: el.type.toUpperCase(),
                  id: el.id
              };
          }).filter(n => n && n.label.toLowerCase().includes(query.toLowerCase())).slice(0, 5) as any[] || [];
          
          return nodes;
      }

      // Default Slash Commands
      const all = [
          { label: 'Checklist', insert: '- [ ] ', desc: 'To-do list' },
          { label: 'Heading 1', insert: '# ', desc: 'Large Header' },
          { label: 'Heading 2', insert: '## ', desc: 'Medium Header' },
          { label: 'Code Block', insert: '```\n\n```', desc: 'Code Snippet' },
          { label: 'Date', insert: new Date().toLocaleDateString(), desc: 'Today' },
      ];
      return all.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));
  };

  // Tag System State
  const [activeTag, setActiveTag] = useState<string | null>(null);
  
  // Extract Tags
  const availableTags = useMemo(() => {
      const tags = new Set<string>();
      activeCanvas?.elements.forEach(el => {
          const matches = el.content.match(/#[a-zA-Z0-9_\-]+/g);
          if (matches) matches.forEach(t => tags.add(t));
      });
      return Array.from(tags).sort();
  }, [activeCanvas?.elements]);

  // Markdown Components (Reusable)
  const markdownComponents = useMemo(() => ({
      h1: ({node, ...props}: any) => <h1 className="text-sm font-bold border-b border-[#eca013]/20 pb-1 mb-2 mt-1" {...props} />,
      h2: ({node, ...props}: any) => <h2 className="text-xs font-bold mb-1 mt-2" {...props} />,
      ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2" {...props} />,
      ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2" {...props} />,
      li: ({node, ...props}: any) => <li className="mb-0.5" {...props} />,
      code: ({node, ...props}: any) => <code className="bg-[#eca013]/10 px-1 rounded text-[#eca013]" {...props} />,
      blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-[#eca013]/50 pl-2 italic my-2 opacity-80" {...props} />,
      a: ({node, href, children, ...props}: any) => {
          if (href?.startsWith('#')) {
              return (
                  <a 
                      href={href} 
                      className="text-[#39ff14] hover:underline cursor-pointer font-bold decoration-dotted underline-offset-2"
                      onClick={(e) => {
                          e.preventDefault();
                          const targetName = href.substring(1); 
                          const target = activeCanvas?.elements.find(el => {
                               if (el.type === 'card' && el.content.startsWith(targetName + '||')) return true;
                               if ((el.type === 'text' || el.type === 'sticky') && (el.content.startsWith(targetName) || el.content === targetName)) return true;
                               if (el.type === 'folder') { try { return JSON.parse(el.content).title === targetName; } catch(e){} }
                               if (el.type === 'image') { try { return JSON.parse(el.content).title === targetName; } catch(e){} }
                               return false;
                          });
                          if (target) {
                               window.dispatchEvent(new CustomEvent('canvas:pan-to', { detail: { x: target.x + target.width/2, y: target.y + target.height/2, zoom: 1 } }));
                          } else {
                              alert(`Node "${targetName}" not found.`);
                          }
                      }}
                      {...props}
                  >
                      {children}
                  </a>
              );
          }
          return <a href={href} className="text-[#eca013] underline opacity-80 hover:opacity-100" target="_blank" {...props}>{children}</a>;
      },
      img: ({node, src, alt, ...props}: any) => {
          // Check for Wiki Link Transclusion (src will be the permalink if using default behavior, or we need to check format)
          // remark-wiki-link treats ![[Foo]] as image with src="Foo" (or hrefTemplate result?)
          // Actually, it usually respects hrefTemplate for images too? Let's check.
          // If src starts with # (from our template), it's a transclusion.
          
          let targetName = src;
          let isTransclusion = false;

          // If it matches our wiki link template output (startswith #)
          if (src?.startsWith('#')) {
              targetName = src.substring(1);
              isTransclusion = true;
          } else if (!src?.startsWith('http') && !src?.startsWith('data:')) {
               // Assuming relative path is transclusion in our context
               isTransclusion = true;
          }

          if (isTransclusion) {
               const target = activeCanvas?.elements.find(el => {
                   if (el.type === 'card' && el.content.startsWith(targetName + '||')) return true;
                   if ((el.type === 'text' || el.type === 'sticky') && (el.content.startsWith(targetName) || el.content === targetName)) return true;
                   if (el.type === 'folder') { try { return JSON.parse(el.content).title === targetName; } catch(e){} }
                    return false;
               });

               if (target) {
                   // Extract clean content for preview
                   let previewText = target.content;
                   if (target.type === 'card') previewText = target.content.split('||')[1];
                   if (target.type === 'folder') previewText = "📁 Group Content";
                   
                   return (
                       <div className="my-2 border-l-2 border-[#39ff14]/50 bg-[#39ff14]/5 pl-3 py-2 rounded-r text-xs font-mono">
                           <div 
                               className="font-bold text-[#39ff14] mb-1 cursor-pointer hover:underline flex items-center gap-1"
                               onClick={(e) => {
                                   e.stopPropagation(); // prevent edit mode
                                   window.dispatchEvent(new CustomEvent('canvas:pan-to', { detail: { x: target.x + target.width/2, y: target.y + target.height/2, zoom: 1 } }));
                               }}
                           >
                               <span className="material-symbols-outlined text-[10px]">link</span>
                               {targetName}
                           </div>
                           <div className="text-[#eca013]/70 italic line-clamp-3">
                               {previewText.substring(0, 150)}...
                           </div>
                       </div>
                   );
               }
               return <div className="text-red-500/50 text-[10px] border border-red-500/20 rounded px-1 inline-block">![{targetName}] (Missing)</div>;
          }

          return <img src={src} alt={alt} className="max-w-full rounded border border-[#eca013]/20" {...props} />;
      }
  }), [activeCanvas?.elements]);

  // Search Navigation Listener
  useEffect(() => {
     // ... (existing listener)
     const handlePanTo = (e: Event) => {
          const detail = (e as CustomEvent).detail;
          if (canvasEl) {
               const rect = canvasEl.getBoundingClientRect();
               const targetZoom = detail.zoom || 1;
               setZoom(targetZoom);
               
               const newOffset = {
                   x: (rect.width / 2) - (detail.x * targetZoom),
                   y: (rect.height / 2) - (detail.y * targetZoom)
               };
               setViewOffset(newOffset);
          }
      };
      window.addEventListener('canvas:pan-to', handlePanTo);
      return () => window.removeEventListener('canvas:pan-to', handlePanTo);
  }, []);

  const getElementContent = (element: CanvasElement) => {
    return localContent[element.id] ?? element.content;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Optional: limit to 50MB just as a sanity check, though Supabase handles large files
      if (file.size > 50 * 1024 * 1024) { 
          alert("Image is too large (Max 50MB).");
          return;
      }

      if (!activeCanvas?.id || !supabase) {
          alert("Storage not configured or Canvas not active.");
          return;
      }

      try {
          setIsUploading(true); // START UPLOAD INDICATOR
          setUploadProgress(0);
          
          // Simulated progress interval
          const progressInterval = setInterval(() => {
             setUploadProgress(prev => {
                 if (prev >= 95) return prev; // Hold at 95%
                 // Decaying increment: smaller steps as we get closer to 95
                 const remaining = 95 - prev;
                 return prev + (remaining * 0.1); 
             });
          }, 200);

          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${activeCanvas.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
              .from('images')
              .upload(filePath, file);

          clearInterval(progressInterval); // Stop simulation

          if (uploadError) {
              console.error('Upload error:', uploadError);
              alert('Failed to upload image: ' + uploadError.message);
              return;
          }
          
          setUploadProgress(100); // Complete

          const { data: { publicUrl } } = supabase.storage
              .from('images')
              .getPublicUrl(filePath);

          if (publicUrl && activeCanvas) {
              const rect = canvasEl!.getBoundingClientRect();
              const screenCenterX = rect.width / 2;
              const screenCenterY = rect.height / 2;
              
              const worldX = (screenCenterX - viewOffset.x) / zoom;
              const worldY = (screenCenterY - viewOffset.y) / zoom;
              
              const img = new Image();
              img.src = publicUrl;
              img.onload = async () => {
                   // Scale down giant images to reasonable initial node size while keeping aspect ratio
                   const MAX_INITIAL_WIDTH = 500;
                   let width = img.width;
                   let height = img.height;
                   
                   if (width > MAX_INITIAL_WIDTH) {
                       const ratio = MAX_INITIAL_WIDTH / width;
                       width = MAX_INITIAL_WIDTH;
                       height = height * ratio;
                   }

                   await addElement({
                      type: 'image',
                      x: worldX - (width / 2),
                      y: worldY - (height / 2),
                      width: width,
                      height: height,
                      content: serializeImageContent(publicUrl, "Uploaded Image", "Description..."),
                      rotation: 0
                  });
              };
              
              if (fileInputRef.current) fileInputRef.current.value = "";
          }

      } catch (err) {
          console.error('Unexpected error uploading:', err);
          alert("An error occurred during upload.");
      } finally {
        // Short delay to let the user see 100%
        setTimeout(() => {
            setIsUploading(false); // STOP UPLOAD INDICATOR
            setUploadProgress(0);
        }, 500);
      }
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
    
    if (activeTool === 'pan') {
        setIsDragging(false); 
        return;
    }

    if (activeTool === "connect") {
      setConnectionStart(null);
      return;
    }
    
    // Zoom/Pan Aware Coordinate Calculation
    const rect = canvasEl!.getBoundingClientRect();
    const x = (e.clientX - rect.left - viewOffset.x) / zoom;
    const y = (e.clientY - rect.top - viewOffset.y) / zoom;

    if (activeTool === "card") {
      playConfirm();
      addElement({ type: "card", x, y, width: 300, height: 180, content: serializeCardContent("Note_Alpha", "Enter data..."), rotation: 0 });
      setActiveTool("select");
    } else if (activeTool === "sticky") {
      playConfirm();
      addElement({ type: "sticky", x, y, width: 200, height: 200, content: "Quick_Memo", color: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)], rotation: 0 }); 
      setActiveTool("select");
    } else if (activeTool === "text") {
      playConfirm();
      addElement({ type: "text", x, y, width: 200, height: 40, content: ">_ TYPE_HERE", rotation: 0 });
      setActiveTool("select");
    } else {
      setSelectedElement(null);
    }
  };

  const handleElementMouseDown = (e: React.MouseEvent, element: CanvasElement) => {
    // Allow Middle Click (Button 1) to bubble to container for Pan
    if (e.button === 1) return;
    e.stopPropagation();

    if (activeTool === "connect") {
      if (connectionStart === null) {
        playClick();
        setConnectionStart(element.id);
      } else if (connectionStart !== element.id) {
        addConnection(connectionStart, element.id);
        playConnect();
        setConnectionStart(null);
      }
      return;
    }

    if (activeTool === 'pan') {
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
    dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseDownRaw = (e: React.MouseEvent) => {
      // Pan Logic: Active Tool OR Middle Click (Button 1)
      if (activeTool === 'pan' || e.button === 1) { 
          e.preventDefault();
          setIsDragging(true);
          // Store 'Screen - Offset' as the anchor
          panStartRef.current = { x: e.clientX - viewOffset.x, y: e.clientY - viewOffset.y };
      }
  };

  useEffect(() => {
      const handleWheelNative = (e: WheelEvent) => {
          if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              const zoomSensitivity = -0.001; 
              const delta = e.deltaY * zoomSensitivity;
              
              const currentZoom = zoomRef.current;
              const currentOffset = viewOffsetRef.current;

              const rect = canvasEl!.getBoundingClientRect();
              const mouseX = e.clientX - rect.left;
              const mouseY = e.clientY - rect.top;

              const worldX = (mouseX - currentOffset.x) / currentZoom;
              const worldY = (mouseY - currentOffset.y) / currentZoom;
              
              const newZoom = Math.min(Math.max(currentZoom + delta, 0.1), 5); 
              
              const newOffset = {
                  x: mouseX - (worldX * newZoom),
                  y: mouseY - (worldY * newZoom)
              };
              
              setZoom(newZoom);
              setViewOffset(newOffset);
          } else {
              // PAN Logic
              // Check if target is interactive (Textarea/Input)
              // If so, allow default scroll (don't pan canvas)
              const target = e.target as HTMLElement;
              const isInteractive = target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable;
              if (isInteractive) return;

              setViewOffset(prev => ({
                  x: prev.x - e.deltaX,
                  y: prev.y - e.deltaY
              }));
          }
      };

      const canvasElLocal = canvasEl;
      if (canvasElLocal) {
          canvasElLocal.addEventListener('wheel', handleWheelNative, { passive: false });
      }

      return () => {
          if (canvasElLocal) {
              canvasElLocal.removeEventListener('wheel', handleWheelNative);
          }
      };
  }, [canvasEl]); // Depend on canvasEl

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // 0. Handle Resizing
    if (resizeTarget) {
        const deltaX = (e.clientX - resizeTarget.startX) / zoom;
        const deltaY = (e.clientY - resizeTarget.startY) / zoom;
        
        updateElement(resizeTarget.id, {
            width: Math.max(200, resizeTarget.startWidth + deltaX),
            height: Math.max(100, resizeTarget.startHeight + deltaY)
        });
        return;
    }

    // Check if handling Pan (either via Tool or Middle Click)
    if (isDragging && panStartRef.current) {
        setViewOffset({
            x: e.clientX - panStartRef.current.x,
            y: e.clientY - panStartRef.current.y
        });
        return;
    }

    if (activeTool === "connect" || !isDragging || !dragElementRef.current || !dragStartPosRef.current || !dragStartMouseRef.current) return;

    // Delta Screen
    const dxScreen = e.clientX - dragStartMouseRef.current.x;
    const dyScreen = e.clientY - dragStartMouseRef.current.y;
    
    // Delta World = Delta Screen / Zoom
    const dxWorld = dxScreen / zoom;
    const dyWorld = dyScreen / zoom;

    const newX = dragStartPosRef.current.x + dxWorld;
    const newY = dragStartPosRef.current.y + dyWorld;

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
  }, [isDragging, activeTool, activeCanvas, viewOffset, zoom, resizeTarget]);

  const handleMouseUp = useCallback(async () => {
    if (resizeTarget) {
        setResizeTarget(null);
        return;
    }

    setDragTargetId(null);
    
    // Check if finishing Pan
    if (isDragging && panStartRef.current) {
        setIsDragging(false);
        panStartRef.current = null;
        return;
    }

    if (!isDragging || !dragElementRef.current || !activeCanvas) {
        setIsDragging(false);
        dragElementRef.current = null;
        dragStartPosRef.current = null;
        dragStartMouseRef.current = null;
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
                    playMerge(); // SFX for Merge
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
                    playUngroup(); // SFX for Ungroup
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
          playTrash();
          deleteElement(selectedElement);
          setSelectedElement(null);
      }
      if (e.key === "Escape") {
          setSelectedElement(null);
          setConnectionStart(null);
          setActiveTool('select');
      }
      if (e.code === "Space") {
          // Could enable pan temporarily?
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
      if (activeTool === 'pan' || (isDragging && panStartRef.current)) return isDragging ? 'grabbing' : 'grab';
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
            <p className="text-xs font-mono opacity-50 tracking-widest mb-6">ESTABLISH_UPLINK_TO_ENABLE_TOOLS</p>
            <button 
                onClick={() => { playClick(); document.querySelector<HTMLButtonElement>('.archives-trigger')?.click(); }}
                className="px-6 py-2 border border-[#eca013] text-[#eca013] hover:bg-[#eca013] hover:text-[#0a0b10] transition-colors rounded font-bold tracking-widest text-sm flex items-center gap-2"
            >
                <span className="material-symbols-outlined">folder_open</span>
                ACCESS_ARCHIVES
            </button>
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
         style={{ backgroundPosition: `${viewOffset.x}px ${viewOffset.y}px`, backgroundSize: `${50 * zoom}px ${50 * zoom}px` }} /* Grid scales with zoom */
      ></div>
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#0a0b10_120%)] opacity-80"></div>
      
      {/* Toolbar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-4 p-2 bg-[#0a0b10]/95 shadow-[0_0_20px_rgba(236,160,19,0.3)] border-y-2 border-[#eca013] backdrop-blur-md clip-tech">
         
         {/* Canvas Name Badge */}
         <div className="pl-3 pr-2 border-r border-[#eca013]/30 flex items-center gap-2 opacity-80 cursor-default">
            <span className="material-symbols-outlined text-sm">folder_open</span>
            <span className="text-xs font-bold uppercase tracking-wider max-w-[100px] truncate">{activeCanvas.name}</span>
            <span className="text-[9px] font-mono opacity-50 ml-1">{Math.round(zoom * 100)}%</span>
         </div>

         <div className="flex items-center gap-1">
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
            {['select', 'pan', 'connect', 'card', 'sticky', 'image'].map(tool => (
                <button 
                    key={tool}
                    title={tool.toUpperCase()}
                    className={`p-2 rounded-sm skew-x-[-10deg] transition-all tactile-btn relative group border border-transparent ${activeTool === tool ? "bg-[#eca013] text-[#0a0b10] border-[#eca013] shadow-[0_0_10px_#eca013]" : "text-[#eca013] hover:bg-[#eca013]/10 hover:border-[#eca013]/50"}`}
                    onMouseEnter={playHover}
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        playClick();
                        if (tool === 'image') {
                            fileInputRef.current?.click();
                        } else {
                            if (activeTool === 'pan' && tool !== 'pan') setIsDragging(false); // Fix stuck pan
                            setActiveTool(tool as any); 
                        }
                    }}
                >
                    <span className="material-symbols-outlined text-[20px]">{{
                        select: 'near_me',
                        pan: 'hand_gesture',
                        connect: 'hub',
                        card: 'crop_landscape',
                        sticky: 'sticky_note_2',
                        image: 'image'
                    }[tool as string]}</span>
                    
                    {/* Tooltip */}
                    <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-[9px] bg-[#eca013] text-[#0a0b10] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold pointer-events-none whitespace-nowrap">
                        {tool.toUpperCase()}
                    </span>
                </button>
            ))}

            <div className="w-px h-6 bg-[#eca013]/30 mx-1"></div>

            <button 
                title={viewMode === 'editor' ? "SWITCH TO GRAPH" : "SWITCH TO EDITOR"}
                className={`p-2 rounded-sm skew-x-[-10deg] transition-all tactile-btn relative group border border-transparent ${viewMode === 'graph' ? "bg-[#39ff14] text-[#0a0b10] border-[#39ff14] shadow-[0_0_10px_#39ff14]" : "text-[#39ff14] hover:bg-[#39ff14]/10 hover:border-[#39ff14]/50"}`}
                onMouseEnter={playHover}
                onClick={(e) => { 
                    e.stopPropagation(); 
                    playConfirm();
                    setViewMode(prev => prev === 'editor' ? 'graph' : 'editor'); 
                }}
            >
                <span className="material-symbols-outlined text-[20px]">{viewMode === 'editor' ? 'grain' : 'grid_view'}</span>
                <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-[9px] bg-[#39ff14] text-[#0a0b10] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold pointer-events-none whitespace-nowrap">
                        {viewMode === 'editor' ? 'LOGIC_GRAPH' : 'VISUAL_EDITOR'}
                </span>
            </button>
         </div>
      </div>

      {commandMenu && commandMenu.visible && (
          <div className="fixed z-[9999] bg-[#0a0b10] border border-[#eca013] shadow-[0_0_20px_rgba(236,160,19,0.3)] rounded-lg p-2 flex flex-col gap-1 w-64 animate-in fade-in zoom-in-95 duration-100"
               style={{ left: commandMenu.x, top: commandMenu.y }}>
               <div className="text-[10px] uppercase text-[#eca013]/50 font-bold px-2 pb-1 border-b border-[#eca013]/20 mb-1">
                   Hashtag Commands
               </div>
               {getFilteredCommands(commandMenu.query).map((cmd, i) => (
                   <button 
                       key={cmd.label}
                       className={`flex items-center gap-3 px-2 py-1.5 rounded text-left transition-colors cursor-pointer
                           ${i === commandMenu.index ? 'bg-[#eca013] text-[#0a0b10]' : 'text-[#eca013] hover:bg-[#eca013]/10'}
                       `}
                       onMouseDown={(e) => { e.preventDefault(); /* Prevent focus loss */ }}
                       onClick={(e) => { 
                           e.stopPropagation();
                           playConfirm();
                           executeCommand(i);
                       }}
                   >
                       <div className={`w-4 h-4 flex items-center justify-center rounded border ${i === commandMenu.index ? 'border-[#0a0b10]' : 'border-[#eca013]/50'}`}>
                           <span className="text-[10px] font-mono">{cmd.label[0]}</span>
                       </div>
                       <div className="flex flex-col">
                           <span className="text-xs font-bold">{cmd.label}</span>
                           <span className={`text-[10px] ${i === commandMenu.index ? 'text-[#0a0b10]/70' : 'text-[#eca013]/50'}`}>{cmd.desc}</span>
                       </div>
                   </button>
               ))}
          </div>
      )}

       {/* Canvas Viewport */}
      <div ref={setCanvasEl} className="flex-1 relative overflow-hidden w-full h-full" 
           onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={() => { handleMouseUp(); setDragTargetId(null); setIsDragging(false); }}
           onClick={handleCanvasClick}
           style={{ cursor: getCursor() }}>
           
           {/* Transformed Content */}
           <div style={{ transform: `translate(${viewOffset.x}px, ${viewOffset.y}px) scale(${zoom})`, transformOrigin: '0 0', willChange: 'transform', width: '100%', height: '100%', pointerEvents: (activeTool === 'pan' || (isDragging && panStartRef.current)) ? 'none' : 'auto' }} className={(activeTool === 'pan' || (isDragging && panStartRef.current)) ? '' : 'pointer-events-auto'}>
               
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

                    // --- LOGIC GRAPH MODE rendering ---
                    if (viewMode === 'graph') {
                        return (
                            <div
                                key={element.id}
                                className={`absolute rounded-full transition-all flex items-center justify-center cursor-pointer shadow-[0_0_10px_rgba(236,160,19,0.3)] group
                                    ${isSelected ? 'bg-[#39ff14] shadow-[0_0_15px_#39ff14] z-50 scale-150' : 'bg-[#eca013] hover:scale-125 z-10'}
                                `}
                                style={{
                                    left: pos.x + element.width / 2 - 8, // Center dot
                                    top: pos.y + element.height / 2 - 8,
                                    width: 16, height: 16
                                }}
                                onMouseDown={(e) => handleElementMouseDown(e, element)}
                            >
                                {/* Tooltip on hover */}
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0a0b10] text-[#eca013] text-[10px] px-2 py-1 rounded border border-[#eca013]/30 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap shadow-xl z-50 transition-opacity">
                                    {element.type === 'card' ? parseCardContent(element.content).title || 'CARD' : element.type.toUpperCase()}
                                </div>
                            </div>
                        );
                    }

                    // --- EDITOR MODE rendering ---
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
                                left: pos.x, top: pos.y, width: element.width, height: element.height,
                                transform: `rotate(${element.rotation || 0}deg)`,
                                backgroundColor: element.type === 'sticky' ? element.color : undefined,
                                zIndex: isSelected ? 50 : (element.parentId ? 20 : 10),
                                pointerEvents: 'auto',
                                opacity: activeTag && !element.content.includes(activeTag) ? 0.1 : 1,
                                filter: activeTag && !element.content.includes(activeTag) ? 'grayscale(100%) blur(1px)' : 'none',
                                transition: 'all 0.2s ease-out, opacity 0.3s ease-in-out, filter 0.3s'
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
                                        onWheel={(e) => { if (!e.ctrlKey) e.stopPropagation(); }}
                                        placeholder="HEADER_TEXT"
                                        />
                                        {isSelected ? (
                                            <textarea
                                                className="w-full flex-1 bg-transparent text-xs resize-none outline-none text-[#eca013]/80 font-mono tracking-tight placeholder-[#eca013]/30 leading-relaxed"
                                                value={cardData.description}
                                                onChange={(e) => handleContentChange(element.id, serializeCardContent(cardData.title, e.target.value))}
                                                onClick={(e) => e.stopPropagation()}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onWheel={(e) => { if (!e.ctrlKey) e.stopPropagation(); }}
                                                onKeyDown={(e) => handleInputKeyDown(e, element.id, cardData.description, (s) => handleContentChange(element.id, serializeCardContent(cardData.title, s)), 'card_desc')}
                                                placeholder="Input data stream..."
                                            />
                                        ) : (
                                            <div className="w-full flex-1 text-xs text-[#eca013]/80 font-mono leading-relaxed overflow-hidden markdown-preview">
                                                <ReactMarkdown 
                                                    remarkPlugins={[remarkGfm, [remarkWikiLink, { hrefTemplate: (permalink: string) => `#${permalink}` }]]}
                                                    components={{
                                                        ...markdownComponents,
                                                        input: ({node, checked, ...props}: any) => {
                                                            if (props.type === "checkbox") {
                                                                return (
                                                                    <input 
                                                                        {...props} 
                                                                        type="checkbox" 
                                                                        checked={checked} 
                                                                        onChange={() => {}} 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            // Robust Fallback: Find our index in the DOM
                                                                            const container = (e.currentTarget as HTMLElement).closest('.markdown-preview');
                                                                            if (container) {
                                                                                const inputs = Array.from(container.querySelectorAll('input[type="checkbox"]'));
                                                                                const myIndex = inputs.indexOf(e.currentTarget);
                                                                                if (myIndex !== -1) {
                                                                                    toggleCardCheckboxByIndex(element.id, myIndex);
                                                                                    return;
                                                                                }
                                                                            }
                                                                        }}
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                        className="accent-[#39ff14] w-3 h-3 mr-2 cursor-pointer z-50 relative pointer-events-auto"
                                                                        disabled={false} // Force enable OVERRIDE
                                                                        readOnly={false}
                                                                    />
                                                                );
                                                            }
                                                            return <input {...props} />;
                                                        }
                                                    }}
                                                >
                                                    {cardData.description || "_No Data_"}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                    );
                                })()}
                                {element.type === "sticky" && (
                                    isSelected ? (
                                        <textarea
                                            className="w-full h-full bg-transparent text-sm font-medium resize-none outline-none text-[#eca013] font-mono placeholder-[#eca013]/40"
                                            value={getElementContent(element)}
                                            onChange={(e) => handleContentChange(element.id, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onWheel={(e) => { if (!e.ctrlKey) e.stopPropagation(); }}
                                            onKeyDown={(e) => handleInputKeyDown(e, element.id, getElementContent(element), (s) => handleContentChange(element.id, s))}
                                        />
                                    ) : (
                                        <div className="w-full h-full text-sm font-medium text-[#eca013] font-mono overflow-hidden markdown-preview">
                                            <ReactMarkdown 
                                                remarkPlugins={[remarkGfm, [remarkWikiLink, { hrefTemplate: (permalink: string) => `#${permalink}` }]]}
                                                components={markdownComponents}
                                            >
                                                {getElementContent(element)}
                                            </ReactMarkdown>
                                        </div>
                                    )
                                )}
                                {element.type === "text" && (
                                    isSelected ? (
                                        <textarea
                                            className="w-full h-full bg-transparent text-base resize-none outline-none text-[#eca013] font-mono phosphor-glow placeholder-[#eca013]/30"
                                            value={getElementContent(element)}
                                            onChange={(e) => handleContentChange(element.id, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onWheel={(e) => { if (!e.ctrlKey) e.stopPropagation(); }}
                                            onKeyDown={(e) => handleInputKeyDown(e, element.id, getElementContent(element), (s) => handleContentChange(element.id, s))}
                                        />
                                    ) : (
                                        <div className="w-full h-full text-base text-[#eca013] font-mono phosphor-glow overflow-hidden markdown-preview">
                                             <ReactMarkdown 
                                                remarkPlugins={[remarkGfm, [remarkWikiLink, { hrefTemplate: (permalink: string) => `#${permalink}` }]]}
                                                components={markdownComponents}
                                             >
                                                {getElementContent(element)}
                                             </ReactMarkdown>
                                        </div>
                                    )

                                )}
                            </div>
                            
                            {/* Resize Handle (Global for Resizable Types) */}
                            {(element.type === 'card' || element.type === 'image') && (
                                <div 
                                    className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-1 z-50 opacity-50 hover:opacity-100 transition-opacity"
                                    onMouseDown={(e) => handleResizeStart(e, element.id, element.width, element.height)}
                                >
                                    <div className="w-2 h-2 border-r-2 border-b-2 border-[#eca013] drop-shadow-[0_0_2px_rgba(236,160,19,0.8)]"></div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
      </div>
      <div className="absolute bottom-6 left-6 text-[10px] text-[#eca013]/60 bg-[#0a0b10]/90 px-3 py-2 rounded border border-[#eca013]/20 font-mono backdrop-blur-sm pointer-events-none z-40">
        <span className="font-bold text-[#eca013]">CMD:</span> SCRL=PAN // CTRL+SCRL=ZOOM // MID_CLICK=PAN
      </div>

      {/* Tag Lens HUD */}
      {availableTags.length > 0 && (
          <div className="absolute top-24 left-6 z-40 flex flex-col gap-2 animate-in slide-in-from-left duration-300">
              <div className="text-[10px] font-bold text-[#eca013]/50 uppercase tracking-widest pl-1">DATA_LENS</div>
              <div className="flex flex-col items-start gap-1">
                  {availableTags.map(tag => (
                      <button
                          key={tag}
                          onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                          className={`
                              px-2 py-1 rounded text-xs font-mono transition-all border
                              ${activeTag === tag 
                                  ? "bg-[#eca013] text-[#0a0b10] border-[#eca013] shadow-[0_0_10px_rgba(236,160,19,0.5)] translate-x-1" 
                                  : "bg-[#0a0b10]/80 text-[#eca013]/70 border-[#eca013]/20 hover:border-[#eca013]/50 hover:text-[#eca013]"
                              }
                          `}
                      >
                          {tag}
                      </button>
                  ))}
                  {activeTag && (
                      <button 
                          onClick={() => setActiveTag(null)}
                          className="mt-2 text-[10px] text-[#eca013]/50 hover:text-[#eca013] uppercase tracking-wider pl-1"
                      >
                          [RESET_LENS]
                      </button>
                  )}
              </div>
          </div>
      )}

      {/* Upload Progress Overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-[60] flex items-end justify-end p-8 pointer-events-none">
            <div className="bg-[#0a0b10]/95 border border-[#39ff14] p-4 min-w-[300px] shadow-[0_0_20px_rgba(57,255,20,0.2)] animate-in slide-in-from-bottom duration-300">
                <div className="flex items-center justify-between gap-2 mb-2 border-b border-[#39ff14]/30 pb-2">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#39ff14] animate-spin">sync</span>
                        <span className="text-[#39ff14] font-bold text-sm tracking-widest uppercase">
                            UPLINK_BUSY
                        </span>
                    </div>
                    <span className="text-[#39ff14] font-mono font-bold">{Math.round(uploadProgress)}%</span>
                </div>
                <div className="font-mono text-xs text-[#39ff14]/80 space-y-1">
                    <p className="typing-line-1">&gt; SENDING_PACKETS...</p>
                    <p className="typing-line-2 animate-pulse">&gt; {Math.round(uploadProgress * 1024 / 100)}KB_TRANSFERRED</p>
                </div>
                {/* Progress Bar Container */}
                <div className="mt-3 h-2 w-full bg-[#39ff14]/20 overflow-hidden relative border border-[#39ff14]/30">
                     {/* Filled Bar */}
                    <div 
                        className="h-full bg-[#39ff14] transition-all duration-200 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                    ></div>
                </div>
            </div>
        </div>
      )}

      {/* Radar Minimap */}
      <div className="absolute bottom-6 right-6 z-50">
         <Radar 
            elements={activeCanvas.elements} 
            viewOffset={viewOffset} 
            zoom={zoom} 
            viewportSize={viewportSize} 
            onMove={setViewOffset} 
         />
      </div>
    </div>
  );
}
