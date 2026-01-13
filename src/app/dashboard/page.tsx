"use client";

import { CanvasProvider } from "@/context/CanvasContext";
import { SystemBar } from "@/components/SystemBar";
import { CanvasEditor } from "@/components/CanvasEditor";

export default function DashboardPage() {
  return (
    <CanvasProvider>
      <div className="bg-[#0a0b10] font-display text-[#eca013] overflow-hidden scanlines-container h-screen relative selection:bg-[#eca013] selection:text-[#0a0b10]">
        
        {/* CRT Overlays for Consistent Theme */}
        <div className="scanlines"></div>
        <div className="crt-overlay-anim"></div>
        <div className="vignette"></div>

        {/* Top-Mounted HUD (SystemBar) */}
        <SystemBar />

        {/* Flickering Terminal Turn-On Container */}
        <div className="pt-14 h-screen w-full animate-turn-on relative z-0">
          <CanvasEditor />
        </div>
        
      </div>
    </CanvasProvider>
  );
}
