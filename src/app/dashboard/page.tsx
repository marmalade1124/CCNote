"use client";

import { CanvasProvider } from "@/context/CanvasContext";
import { Sidebar } from "@/components/Sidebar";
import { CanvasEditor } from "@/components/CanvasEditor";

export default function DashboardPage() {
  return (
    <CanvasProvider>
      <div className="bg-[#0a0b10] font-display text-[#eca013] overflow-hidden scanlines-container h-screen relative selection:bg-[#eca013] selection:text-[#0a0b10]">
        
        {/* CRT Overlays for Consistent Theme */}
        <div className="scanlines"></div>
        <div className="crt-overlay-anim"></div>
        <div className="vignette"></div>

        {/* Flickering Terminal Turn-On Container */}
        <div className="flex h-screen w-full animate-turn-on">
          <Sidebar />
          <CanvasEditor />
        </div>
        
      </div>
    </CanvasProvider>
  );
}
