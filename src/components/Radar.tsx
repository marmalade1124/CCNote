"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { CanvasElement } from "@/types/canvas";

interface RadarProps {
    elements: CanvasElement[]; // Use only position/size data
    viewOffset: { x: number; y: number };
    zoom: number;
    viewportSize: { width: number; height: number };
    onMove: (newOffset: { x: number; y: number }) => void;
}

export function Radar({ elements, viewOffset, zoom, viewportSize, onMove }: RadarProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Calculate World Bounds covering all elements AND the current viewport
    const bounds = useMemo(() => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        // Include Elements
        if (elements.length > 0) {
            elements.forEach(el => {
                minX = Math.min(minX, el.x);
                minY = Math.min(minY, el.y);
                maxX = Math.max(maxX, el.x + el.width);
                maxY = Math.max(maxY, el.y + el.height);
            });
        } else {
            // Default center if empty
            minX = -500; minY = -500; maxX = 500; maxY = 500;
        }

        // Include Viewport (World Coords)
        // Screen = World * Zoom + Offset => World = (Screen - Offset) / Zoom
        // TopLeft (0,0) => (-Offset) / Zoom
        const vpW = viewportSize.width || 1920;
        const vpH = viewportSize.height || 1080;

        const vpX1 = -viewOffset.x / zoom;
        const vpY1 = -viewOffset.y / zoom;
        const vpX2 = (vpW - viewOffset.x) / zoom;
        const vpY2 = (vpH - viewOffset.y) / zoom;

        minX = Math.min(minX, vpX1);
        minY = Math.min(minY, vpY1);
        maxX = Math.max(maxX, vpX2);
        maxY = Math.max(maxY, vpY2);

        // Add Padding
        const padding = 1000;
        return {
            x: minX - padding,
            y: minY - padding,
            width: (maxX - minX) + (padding * 2),
            height: (maxY - minY) + (padding * 2)
        };
    }, [elements, viewOffset, zoom, viewportSize]);

    // Map World to Radar (0..1)
    // Radar W/H is fixed via CSS (e.g. 200px)
    // Actually we need the pixel size of radar to handle clicks.
    // Let's assume passed via styling or detected.
    const [radarSize, setRadarSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current) return;
        const updateSize = () => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) setRadarSize({ width: rect.width, height: rect.height });
        };
        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const worldToRadar = (wx: number, wy: number) => {
        if (bounds.width === 0 || bounds.height === 0 || radarSize.width === 0) return { x: 0, y: 0 };
        
        const scaleX = radarSize.width / bounds.width;
        const scaleY = radarSize.height / bounds.height;
        const scale = Math.min(scaleX, scaleY);
        
        const offsetX = (radarSize.width - (bounds.width * scale)) / 2;
        const offsetY = (radarSize.height - (bounds.height * scale)) / 2;

        const rx = offsetX + (wx - bounds.x) * scale;
        const ry = offsetY + (wy - bounds.y) * scale;
        return { x: rx, y: ry };
    };

    const radarToWorld = (rx: number, ry: number) => {
        if (bounds.width === 0 || bounds.height === 0 || radarSize.width === 0) return { x: bounds.x, y: bounds.y };

        const scaleX = radarSize.width / bounds.width;
        const scaleY = radarSize.height / bounds.height;
        const scale = Math.min(scaleX, scaleY);
        
        const offsetX = (radarSize.width - (bounds.width * scale)) / 2;
        const offsetY = (radarSize.height - (bounds.height * scale)) / 2;

        const wx = ((rx - offsetX) / scale) + bounds.x;
        const wy = ((ry - offsetY) / scale) + bounds.y;
        return { x: wx, y: wy };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        handleMouseMove(e); // Jump to pos
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if ((!isDragging && e.type === 'mousemove') || !radarSize.width) return;
        
        const rect = containerRef.current!.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Determine Center in World Logic
        const targetWorld = radarToWorld(clickX, clickY);

        // We want targetWorld to be the CENTER of the viewport
        // Viewport Center World = targetWorld
        // TopLeft World = targetWorld - (VP_Size_World / 2)
        const safeW = viewportSize.width || 1920;
        const safeH = viewportSize.height || 1080;

        const vpHalfW = (safeW / zoom) / 2;
        const vpHalfH = (safeH / zoom) / 2;
        
        const newWorldLeft = targetWorld.x - vpHalfW;
        const newWorldTop = targetWorld.y - vpHalfH;

        // Convert World TopLeft back to ViewOffset
        // World = -Offset / Zoom => Offset = -World * Zoom
        const newOffset = {
            x: -newWorldLeft * zoom,
            y: -newWorldTop * zoom
        };

        onMove(newOffset);
    };

    const handleMouseUp = () => setIsDragging(false);

    // Render Calculations
    const safeW = viewportSize.width || 1920;
    const safeH = viewportSize.height || 1080;

    const vpWorldRect = {
        x: -viewOffset.x / zoom,
        y: -viewOffset.y / zoom,
        w: safeW / zoom,
        h: safeH / zoom
    };

    const vpRadarPos = worldToRadar(vpWorldRect.x, vpWorldRect.y);
    const vpRadarSize = {
        w: (vpWorldRect.w / bounds.width) * radarSize.width,
        h: (vpWorldRect.h / bounds.height) * radarSize.height
    };

    return (
        <div 
            ref={containerRef}
            className="w-48 h-32 bg-[#0a0b10]/90 border border-[#eca013]/40 rounded overflow-hidden relative shadow-[0_0_15px_rgba(236,160,19,0.1)] backdrop-blur-md cursor-crosshair select-none group"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
             {/* Scanline FX */}
             <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(transparent_50%,rgba(236,160,19,0.1)_50%)] bg-[length:100%_4px]"></div>
             
             {/* Elements */}
             {elements.map(el => {
                 if (el.parentId) return null; // Don't show grouped items to avoid clutter? Or show all?
                 // Let's show all for now, maybe dots.
                 const pos = worldToRadar(el.x, el.y);
                 const size = {
                     w: (el.width / bounds.width) * radarSize.width,
                     h: (el.height / bounds.height) * radarSize.height
                 };
                 return (
                     <div 
                        key={el.id}
                        style={{ left: pos.x, top: pos.y, width: Math.max(2, size.w), height: Math.max(2, size.h) }}
                        className={`absolute ${el.type === 'folder' ? 'bg-[#eca013]/20 border border-[#eca013]/40' : 'bg-[#eca013] shadow-[0_0_2px_#eca013]'}`}
                     ></div>
                 );
             })}

             {/* Viewport Rect */}
             <div 
                className="absolute border-2 border-[#39ff14] shadow-[0_0_10px_rgba(57,255,20,0.5)] z-10 box-border bg-[#39ff14]/10 transition-transform duration-75"
                style={{ 
                    left: vpRadarPos.x, top: vpRadarPos.y, 
                    width: Math.max(4, vpRadarSize.w), height: Math.max(4, vpRadarSize.h) 
                }}
             >
                 {/* Crosshair Center */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-[#39ff14] rounded-full"></div>
             </div>

             {/* Radar Sweep Animation */}
             <div className="absolute inset-0 pointer-events-none bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,rgba(236,160,19,0.1)_360deg)] animate-[spin_4s_linear_infinite] opacity-30 rounded-full scale-[2]" style={{ transformOrigin: 'center' }}></div>
             
             <div className="absolute top-1 right-2 text-[8px] font-mono text-[#eca013]/50">RADAR_ACTV</div>
        </div>
    );
}
