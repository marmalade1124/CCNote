"use client";

import { memo, useMemo } from "react";
import { CanvasElement, CanvasTool } from "@/types/canvas";
import { useTheme } from "@/context/ThemeContext";
import { useSfx } from "@/hooks/useSfx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";

// --- Duplicate parse functions from CanvasEditor (or export/import them) ---
// For now, I will inline them to keep this file self-contained, or we should refactor them to a utils file.
// Let's assume we can export them from CanvasEditor or move them to a utility file later.
// For now, I'll redefine simple versions or ask to move them.
// Actually, it's better to move them to a utility file first. 
// But to save steps, I will redefine strictly what's needed or pass parsed content as props?
// No, passing parsed content means parent re-parses.
// I will copy the parser logic here for now.

interface CardContent { title: string; description: string; }
function parseCardContent(content: string): CardContent {
  const parts = content.split("||");
  return { title: parts[0], description: parts[1] || "" };
}

interface ChecklistItem { id: string; text: string; done: boolean; }
interface ChecklistContent { title: string; items: ChecklistItem[]; }
function parseChecklistContent(content: string): ChecklistContent {
    try {
        const parsed = JSON.parse(content);
        if (typeof parsed === 'object' && parsed !== null) {
            return {
                title: parsed.title || "Checklist",
                items: Array.isArray(parsed.items) ? parsed.items : []
            };
        }
    } catch(e) {}
    return { title: "Checklist", items: [] };
}

interface FolderContent { title: string; collapsed: boolean; }
function parseFolderContent(content: string): FolderContent {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null) {
        return { title: parsed.title, collapsed: !!parsed.collapsed };
    }
  } catch (e) {}
  return { title: "Untitled Group", collapsed: false };
}

interface ImageContent { url: string; title: string; description: string; }
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

interface CanvasElementComponentProps {
    element: CanvasElement;
    isSelected: boolean;
    isDragTarget: boolean;
    activeTool: CanvasTool;
    filterTag: string | null;
    localContent: string | null; // Content overriding local state
    zoom: number; // needed for some pixel perfect things? maybe not
    colors: any; // Theme colors
    
    // Actions
    onMouseDown: (e: React.MouseEvent, element: CanvasElement) => void;
    onResizeStart: (e: React.MouseEvent, id: string, w: number, h: number) => void;
    onContentChange: (id: string, content: string) => void;
    onFolderCollapse: (element: CanvasElement) => void;
}

const CanvasElementComponent = memo(({
    element,
    isSelected,
    isDragTarget,
    activeTool,
    filterTag,
    localContent,
    colors,
    onMouseDown,
    onResizeStart,
    onContentChange,
    onFolderCollapse
}: CanvasElementComponentProps) => {
    
    const content = localContent ?? element.content;

    // ... (All rendering logic from CanvasEditor) ...
    // This is a placeholder. I will need to use replace_file to fill this with the actual code from CanvasEditor
    // because it's too large to write blindly.
    
    // --- Helper for content updates (memoized in parent, but safe here) ---
    const handleLocalContentChange = (newContent: string) => {
        onContentChange(element.id, newContent);
    };

    // --- Derived State ---
    const isFolder = element.type === 'folder';
    
    // --- Render Folder ---
    if (isFolder) {
        const folderData = parseFolderContent(content);
        return (
            <div
                className={`absolute border-2 border-dashed border-[#eca013]/30 rounded-lg element-container ${isSelected ? 'border-[#eca013] bg-[#eca013]/5 z-10' : 'z-0'} ${activeTool === 'connect' ? '!cursor-crosshair' : ''}`}
                style={{ 
                    left: element.x, 
                    top: element.y, 
                    width: element.width, 
                    height: element.height, 
                    pointerEvents: 'auto',
                    // No transition-all here (performance)
                }}
                onMouseDown={(e) => onMouseDown(e, element)}
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
                    <button className="hover:bg-[#eca013]/20 rounded p-0.5 collapse-btn flex items-center justify-center transition-colors -ml-1" onClick={(e) => { e.stopPropagation(); onFolderCollapse(element); }}>
                        <span className="material-symbols-outlined text-[18px]">
                            {folderData.collapsed ? 'expand_more' : 'expand_less'}
                        </span>
                    </button>
                    <span className="material-symbols-outlined text-[16px] opacity-70">folder_open</span>
                    <input 
                        className="bg-transparent outline-none w-32 placeholder-[#eca013]/40 text-[#eca013] font-bold"
                        value={folderData.title}
                        onChange={e => {
                             // Re-serialize for folder update
                             const newContent = JSON.stringify({ title: e.target.value, collapsed: folderData.collapsed });
                             onContentChange(element.id, newContent);
                        }}
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                    />
                </div>
            </div>
        );
    }

    // --- Render Other Elements (Card, Text, Sticky, Image, Checklist) ---
    return (
        <div
            className={`absolute rounded-lg shadow-lg backdrop-blur-sm select-none element-container flex flex-col
                ${activeTool === 'connect' ? '!cursor-crosshair' : ''}
            `}
            style={{
                left: element.x, top: element.y, width: element.width, height: element.height,
                transform: `rotate(${element.rotation || 0}deg)`,
                backgroundColor: element.type === 'sticky' ? element.color : (element.type === "card" || element.type === "image" || element.type === "checklist") ? colors.cardBg : undefined,
                border: isSelected ? `1px solid ${colors.accent}` : `1px solid ${colors.cardBorder}`,
                boxShadow: isSelected ? `0 0 15px ${colors.accent}40` : undefined,
                zIndex: isSelected ? 50 : (element.parentId ? 20 : 10),
                pointerEvents: 'auto',
                opacity: filterTag && !content.includes(filterTag) ? 0.1 : 1,
                filter: filterTag && !content.includes(filterTag) ? 'grayscale(100%) blur(1px)' : 'none',
                transition: 'opacity 0.2s, filter 0.2s, background-color 0.2s, box-shadow 0.2s, border-color 0.2s'
            }}
            onMouseDown={(e) => onMouseDown(e, element)}
        >
            {isDragTarget && (
                <div className="absolute -inset-4 border-2 border-[#39ff14] border-dashed rounded-xl z-50 pointer-events-none flex items-center justify-center bg-[#39ff14]/10 backdrop-blur-[1px] animate-pulse">
                    <span className="bg-[#0a0b10] text-[#39ff14] px-3 py-1 rounded border border-[#39ff14] font-bold text-xs tracking-wider shadow-[0_0_15px_rgba(57,255,20,0.5)]">
                        ✨ CREATE GROUP
                    </span>
                </div>
            )}

            <div 
                className={`h-6 w-full flex items-center px-2 cursor-grab active:cursor-grabbing drag-handle rounded-t-lg
                    ${activeTool === 'connect' ? '!cursor-crosshair' : ''}
                `}
                style={{
                    backgroundColor: (element.type === 'card' || element.type === 'image' || element.type === 'checklist') ? `${colors.primary}15` : 'rgba(0,0,0,0.1)',
                    borderBottom: (element.type === 'card' || element.type === 'image' || element.type === 'checklist') ? `1px solid ${colors.primary}30` : undefined,
                }}
            >
                <div className="flex gap-1">
                    <div className="w-1 h-3 rounded-full" style={{ backgroundColor: `${colors.primary}60` }}></div>
                    <div className="w-1 h-3 rounded-full" style={{ backgroundColor: `${colors.primary}60` }}></div>
                    <div className="w-1 h-3 rounded-full" style={{ backgroundColor: `${colors.primary}60` }}></div>
                </div>
            </div>

            <div className="p-4 flex-1 flex flex-col overflow-hidden">
                {element.type === "image" && (() => {
                    const imgData = parseImageContent(content);
                    return (
                        <div className="flex flex-col gap-2 h-full">
                            <div className="flex-1 w-full min-h-0 relative rounded overflow-hidden border border-[#eca013]/20 bg-black/50">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imgData.url} alt="Node" className="w-full h-full object-contain" draggable={false} />
                            </div>
                            <input
                                className="w-full bg-transparent font-bold text-sm outline-none text-[#eca013] border-b border-[#eca013]/20 pb-1 tracking-wide uppercase font-display placeholder-[#eca013]/30"
                                value={imgData.title}
                                onChange={(e) => {
                                    const newContent = JSON.stringify({ ...imgData, title: e.target.value });
                                    onContentChange(element.id, newContent);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                placeholder="IMAGE TITLE"
                            />
                        </div>
                    );
                })()}

                {element.type === "card" && (() => {
                    const { title, description } = parseCardContent(content);
                    return (
                        <div className="flex flex-col h-full">
                            <input
                                className="bg-transparent font-bold text-lg outline-none border-b pb-2 mb-2 tracking-wide uppercase font-display placeholder-opacity-50"
                                style={{ color: colors.primary, borderColor: `${colors.primary}30` }}
                                value={title}
                                onChange={(e) => onContentChange(element.id, `${e.target.value}||${description}`)}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                placeholder="TITLE"
                            />
                            <textarea
                                className="flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed font-mono custom-scrollbar"
                                style={{ color: `${colors.primary}cc` }}
                                value={description}
                                onChange={(e) => onContentChange(element.id, `${title}||${e.target.value}`)}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onWheel={(e) => { if (!e.ctrlKey) e.stopPropagation(); }}
                                placeholder="Enter details..."
                            />
                        </div>
                    );
                })()}

                {element.type === "sticky" && (
                    <textarea
                        className="w-full h-full bg-transparent text-xl resize-none outline-none font-handwriting leading-snug custom-scrollbar placeholder-black/30 text-black/80"
                        value={content}
                        onChange={(e) => onContentChange(element.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onWheel={(e) => { if (!e.ctrlKey) e.stopPropagation(); }}
                        placeholder="Write something..." 
                    />
                )}

                {element.type === "text" && (
                    isSelected ? (
                        <textarea
                            className="w-full h-full bg-transparent text-base resize-none outline-none text-[#eca013] font-mono phosphor-glow placeholder-[#eca013]/30"
                            value={content}
                            onChange={(e) => onContentChange(element.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onWheel={(e) => { if (!e.ctrlKey) e.stopPropagation(); }}
                        />
                    ) : (
                        <div className="w-full h-full text-base text-[#eca013] font-mono phosphor-glow overflow-hidden markdown-preview">
                                <ReactMarkdown 
                                remarkPlugins={[remarkGfm, [remarkWikiLink, { hrefTemplate: (permalink: string) => `#${permalink}` }]]}
                                components={{
                                    p: ({node, ...props}) => <p className="mb-2" {...props} />,
                                    a: ({node, ...props}) => <a className="underline hover:text-white transition-colors cursor-pointer" {...props} />
                                }}
                            >
                                {content}
                            </ReactMarkdown>
                        </div>
                    )
                )}

                {/* === CHECKLIST CARD === */}
                {element.type === "checklist" && (() => {
                    const checklistData = parseChecklistContent(content);
                    const doneCount = checklistData.items.filter(i => i.done).length;
                    const totalCount = checklistData.items.length;
                    const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

                    const toggleItem = (itemId: string) => {
                        const newItems = checklistData.items.map(item =>
                            item.id === itemId ? { ...item, done: !item.done } : item
                        );
                        const newContent = JSON.stringify({ title: checklistData.title, items: newItems });
                        onContentChange(element.id, newContent);
                    };

                    const addItem = () => {
                        const newItem: ChecklistItem = {
                            id: crypto.randomUUID(),
                            text: "",
                            done: false
                        };
                        const newContent = JSON.stringify({ title: checklistData.title, items: [...checklistData.items, newItem] });
                        onContentChange(element.id, newContent);
                    };

                    const updateItemText = (itemId: string, text: string) => {
                        const newItems = checklistData.items.map(item =>
                            item.id === itemId ? { ...item, text } : item
                        );
                        const newContent = JSON.stringify({ title: checklistData.title, items: newItems });
                        onContentChange(element.id, newContent);
                    };

                    const removeItem = (itemId: string) => {
                        const newItems = checklistData.items.filter(item => item.id !== itemId);
                        const newContent = JSON.stringify({ title: checklistData.title, items: newItems });
                        onContentChange(element.id, newContent);
                    };

                    return (
                        <div className="flex flex-col gap-2 h-full">
                            {/* Title */}
                            <input
                                className="w-full bg-transparent font-bold text-sm outline-none border-b pb-1 tracking-wide uppercase font-display placeholder-opacity-30"
                                style={{ color: colors.primary, borderColor: `${colors.primary}30` }}
                                value={checklistData.title}
                                onChange={(e) => {
                                    const newContent = JSON.stringify({ title: e.target.value, items: checklistData.items });
                                    onContentChange(element.id, newContent);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                placeholder="CHECKLIST_TITLE"
                            />

                            {/* Progress Bar */}
                            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${colors.primary}20` }}>
                                <div 
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%`, backgroundColor: colors.accent }}
                                />
                            </div>
                            <div className="text-[10px] font-mono" style={{ color: colors.textSecondary }}>
                                {doneCount}/{totalCount} complete
                            </div>

                            {/* Items */}
                            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                                {checklistData.items.map((item) => (
                                    <div 
                                        key={item.id} 
                                        className="flex items-center gap-2 group p-1 rounded transition-colors"
                                        style={{ backgroundColor: item.done ? `${colors.accent}10` : 'transparent' }}
                                    >
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleItem(item.id); }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all"
                                            style={{
                                                borderColor: item.done ? colors.accent : `${colors.primary}50`,
                                                backgroundColor: item.done ? colors.accent : 'transparent',
                                            }}
                                        >
                                            {item.done && <span className="text-[10px]" style={{ color: colors.background }}>✓</span>}
                                        </button>
                                        <input
                                            className={`flex-1 bg-transparent text-xs outline-none font-mono ${item.done ? 'line-through opacity-50' : ''}`}
                                            style={{ color: colors.primary }}
                                            value={item.text}
                                            onChange={(e) => updateItemText(item.id, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            placeholder="New task..."
                                        />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            className="opacity-0 group-hover:opacity-100 text-red-500 text-xs transition-opacity"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add Item Button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); addItem(); }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="w-full text-xs py-1 rounded border border-dashed transition-colors flex items-center justify-center gap-1"
                                style={{ 
                                    color: colors.textSecondary, 
                                    borderColor: `${colors.primary}30`,
                                }}
                            >
                                <span>+</span> Add Item
                            </button>
                        </div>
                    );
                })()}
            </div>
            
            {/* Resize Handle (Global for Resizable Types) */}
            {(element.type === 'card' || element.type === 'image' || element.type === 'checklist') && (
                <div 
                    className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-1 z-50 opacity-50 hover:opacity-100 transition-opacity"
                    onMouseDown={(e) => onResizeStart(e, element.id, element.width, element.height)}
                >
                    <div className="w-2 h-2 border-r-2 border-b-2 border-[#eca013] drop-shadow-[0_0_2px_rgba(236,160,19,0.8)]"></div>
                </div>
            )}
        </div>
    );
});

CanvasElementComponent.displayName = 'CanvasElementComponent';

export default CanvasElementComponent;
