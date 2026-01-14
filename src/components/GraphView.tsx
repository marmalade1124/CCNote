"use client";

import { useEffect, useRef, useState } from "react";
import { useCanvas } from "@/context/CanvasContext";
import { useSfx } from "@/hooks/useSfx";

interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  canvasId: string;
}

interface Edge {
  source: string;
  target: string;
  strength: number;
}

export function GraphView({ onClose }: { onClose: () => void }) {
  const { canvases, setActiveCanvas } = useCanvas();
  const { playHover, playClick, playConfirm } = useSfx();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const requestRef = useRef<number>(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Initialize Simulation
  useEffect(() => {
    if (!canvasRef.current) return;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Create Nodes from Canvases
    const newNodes: Node[] = canvases.map((c) => ({
      id: c.id,
      name: c.name,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
      radius: Math.max(5, Math.min(15, (c.elements?.length || 0) * 0.5 + 5)), // Size based on element count
      canvasId: c.id,
    }));

    // Create Edges (Simple proximity or sequential for now as we don't have explicit links)
    // Let's connect them sequentially for a "chain" or creating a Minimum Spanning Tree visual
    // For now, let's just make random connections for the constellation effect
    const newEdges: Edge[] = [];
    if (newNodes.length > 1) {
        for (let i = 0; i < newNodes.length; i++) {
            // Connect to 2 nearest neighbors
            const others = newNodes.filter(n => n.id !== newNodes[i].id)
                .map(n => ({
                    node: n,
                    dist: Math.hypot(n.x - newNodes[i].x, n.y - newNodes[i].y)
                }))
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 2);
            
            others.forEach(other => {
                // Avoid duplicates
                const exists = newEdges.find(e => 
                    (e.source === newNodes[i].id && e.target === other.node.id) ||
                    (e.source === other.node.id && e.target === newNodes[i].id)
                );
                if (!exists) {
                    newEdges.push({ source: newNodes[i].id, target: other.node.id, strength: 0.05 });
                }
            });
        }
    }

    nodesRef.current = newNodes;
    edgesRef.current = newEdges;

  }, [canvases]);

  // Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      const width = canvas.width;
      const height = canvas.height;
      const k = 0.05; // Repulsion constant
      const c = 0.01; // Spring constant
      const centerForce = 0.0005;

      ctx.clearRect(0, 0, width, height);

      // Draw Grid Background
      ctx.strokeStyle = "rgba(236, 160, 19, 0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 100) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
      for (let y = 0; y < height; y += 100) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
      ctx.stroke();

      // Update Forces
      nodesRef.current.forEach((node, i) => {
        let fx = 0;
        let fy = 0;

        // Repulsion (Coulomb)
        nodesRef.current.forEach((other, j) => {
          if (i === j) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distSq = dx * dx + dy * dy;
          if (distSq === 0) return;
          const dist = Math.sqrt(distSq);
          const force = (k * 1000) / dist;
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        });

        // Attraction to Center (Gravity)
        const dx = width / 2 - node.x;
        const dy = height / 2 - node.y;
        fx += dx * centerForce;
        fy += dy * centerForce;

        // Spring Forces (Edges)
        edgesRef.current.forEach((edge) => {
            let other: Node | undefined;
            if (edge.source === node.id) other = nodesRef.current.find(n => n.id === edge.target);
            if (edge.target === node.id) other = nodesRef.current.find(n => n.id === edge.source);
            
            if (other) {
                const ex = other.x - node.x;
                const ey = other.y - node.y;
                const dist = Math.sqrt(ex*ex + ey*ey);
                const force = (dist - 150) * c; // Rest length 150
                fx += (ex / dist) * force;
                fy += (ey / dist) * force;
            }
        });

        node.vx = (node.vx + fx) * 0.9; // Damping
        node.vy = (node.vy + fy) * 0.9;
        node.x += node.vx;
        node.y += node.vy;

        // Bounds
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      });

      // Draw Edges
      ctx.strokeStyle = "rgba(236, 160, 19, 0.2)";
      ctx.lineWidth = 1;
      edgesRef.current.forEach(edge => {
          const s = nodesRef.current.find(n => n.id === edge.source);
          const t = nodesRef.current.find(n => n.id === edge.target);
          if (s && t) {
              ctx.beginPath();
              ctx.moveTo(s.x, s.y);
              ctx.lineTo(t.x, t.y);
              ctx.stroke();
          }
      });

      // Draw Nodes
      nodesRef.current.forEach(node => {
          const isHovered = hoveredNode === node.id;
          
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.fillStyle = isHovered ? "#39ff14" : "#eca013"; // Green on hover, Gold default
          ctx.fill();
          
          if (isHovered) {
              ctx.strokeStyle = "#39ff14";
              ctx.lineWidth = 2;
              ctx.stroke();
              
              // Name Label
              ctx.font = "bold 12px monospace";
              const textWidth = ctx.measureText(node.name).width;
              ctx.fillStyle = "rgba(10, 11, 16, 0.9)";
              ctx.fillRect(node.x + 15, node.y - 12, textWidth + 10, 24);
              ctx.fillStyle = "#39ff14";
              ctx.fillText(node.name, node.x + 20, node.y + 4);
          } else {
               // Faint Label
              ctx.fillStyle = "rgba(236, 160, 19, 0.5)";
              ctx.font = "10px monospace";
              ctx.fillText(node.name, node.x + 15, node.y + 3);
          }
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
        cancelAnimationFrame(requestRef.current);
        window.removeEventListener("resize", resize);
    };
  }, [hoveredNode]);

  // Mouse Interaction
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let found = false;
      nodesRef.current.forEach(node => {
          const dist = Math.hypot(node.x - x, node.y - y);
          if (dist < node.radius + 5) {
              if (hoveredNode !== node.id) {
                  setHoveredNode(node.id);
                  playHover();
              }
              found = true;
          }
      });

      if (!found && hoveredNode) {
          setHoveredNode(null);
      }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (hoveredNode) {
          playConfirm();
          const target = canvases.find(c => c.id === hoveredNode);
          if (target) {
              setActiveCanvas(target.id);
              onClose();
          }
      }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-[#0a0b10] text-[#eca013] font-mono animate-in fade-in duration-300">
        {/* Header */}
        <div className="absolute top-4 left-6 z-10 pointer-events-none">
            <h1 className="text-2xl font-bold tracking-widest text-[#eca013] animate-pulse">DATA_CONSTELLATION</h1>
            <p className="text-xs text-[#eca013]/50">NEURAL MAP // {canvases.length} NODES DETECTED</p>
        </div>

        <button 
                onClick={() => { playClick(); onClose(); }}
                className="absolute top-4 right-6 z-20 flex items-center gap-2 px-4 py-2 border border-[#eca013]/30 text-[#eca013]/70 hover:text-[#eca013] hover:border-[#eca013] hover:bg-[#eca013]/10 rounded transition-all uppercase text-xs font-bold tracking-widest"
        >
                <span className="material-symbols-outlined text-sm">close</span>
                Close Map
        </button>

        <canvas 
            ref={canvasRef}
            className="block w-full h-full cursor-grab active:cursor-grabbing"
            onMouseMove={handleMouseMove}
            onClick={handleClick}
        />
    </div>
  );
}
