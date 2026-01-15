"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import { CanvasProvider } from "@/context/CanvasContext";
import { ToastProvider } from "@/components/Toast";
import { SystemBar } from "@/components/SystemBar";
import { CanvasEditor } from "@/components/CanvasEditor";
import { CommandPalette } from "@/components/CommandPalette";
import { NeuralInterface } from "@/components/NeuralInterface";
import { QuickCapture } from "@/components/QuickCapture";

export default function DashboardPage() {
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const router = useRouter();

  // Global hotkey for Quick Capture
  useHotkeys('mod+n', (e) => {
    e.preventDefault();
    setShowQuickCapture(true);
  }, { enableOnFormTags: true });

  const handleShutdown = () => {
    setIsShuttingDown(true);
    setTimeout(() => {
      router.push("/");
    }, 800); // Match animation duration + buffer
  };

  return (
    <ToastProvider>
      <CanvasProvider>
        <div className={`bg-[#0a0b10] font-display text-[#eca013] overflow-hidden scanlines-container h-screen relative selection:bg-[#eca013] selection:text-[#0a0b10] transition-all duration-500 ${isShuttingDown ? 'animate-turn-off' : ''}`}>
          
          {/* CRT Overlays for Consistent Theme */}
          <div className="scanlines"></div>
          <div className="crt-overlay-anim"></div>
          <div className="vignette"></div>

          {/* Top-Mounted HUD (SystemBar) */}
          <SystemBar onShutdown={handleShutdown} />
          <CommandPalette onLogout={handleShutdown} />

          {/* Flickering Terminal Turn-On Container */}
          <div className="pt-14 h-screen w-full animate-turn-on relative z-0 flex flex-col">
            <CanvasEditor />
          </div>
          
          {/* AI Assistant Overlay */}
          <NeuralInterface />
          
          {/* Quick Capture Modal */}
          <QuickCapture 
            isOpen={showQuickCapture}
            onClose={() => setShowQuickCapture(false)}
            onSubmit={(content) => {
              // Will be handled by CanvasEditor context
              window.dispatchEvent(new CustomEvent('quick-capture', { 
                detail: { content } 
              }));
            }}
          />
          
        </div>
      </CanvasProvider>
    </ToastProvider>
  );
}
