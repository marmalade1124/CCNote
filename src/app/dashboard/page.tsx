"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import { CanvasProvider } from "@/context/CanvasContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { ToastProvider } from "@/components/Toast";
import { SystemBar } from "@/components/SystemBar";
import { CanvasEditor } from "@/components/CanvasEditor";
import { CommandPalette } from "@/components/CommandPalette";
import { NeuralInterface } from "@/components/NeuralInterface";
import { QuickCapture } from "@/components/QuickCapture";
import { MatrixRain } from "@/components/MatrixRain";

function DashboardContent() {
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const router = useRouter();
  const { themeConfig, colors } = useTheme();

  // Quick Capture: ALT+N (removed '/' due to conflicts)
  useHotkeys('alt+n', (e) => {
    e.preventDefault();
    setShowQuickCapture(true);
  }, { enableOnFormTags: true });
  
  // Listen for Quick Capture button click from toolbar
  useEffect(() => {
    const handleOpenQuickCapture = () => setShowQuickCapture(true);
    window.addEventListener('open-quick-capture', handleOpenQuickCapture);
    return () => window.removeEventListener('open-quick-capture', handleOpenQuickCapture);
  }, []);

  const handleShutdown = () => {
    setIsShuttingDown(true);
    setTimeout(() => {
      router.push("/");
    }, 800); // Match animation duration + buffer
  };

  // Get grid class based on theme
  const getGridClass = () => {
    switch (themeConfig.effects.gridStyle) {
      case 'amber': return 'retro-grid-amber';
      case 'green': return 'retro-grid-green';
      case 'pink': return 'retro-grid-pink';
      case 'teal': return 'retro-grid-teal';
      default: return '';
    }
  };

  // Get background class based on theme
  const getBgClass = () => {
    if (themeConfig.name === 'Outrun') return 'outrun-gradient-bg';
    if (themeConfig.name === 'Ghost Shell') return 'ghost-neural-bg';
    return '';
  };

  return (
    <div 
      className={`font-display overflow-hidden scanlines-container h-screen relative transition-all duration-500 ${isShuttingDown ? 'animate-turn-off' : ''} ${getGridClass()} ${getBgClass()}`}
      style={{ 
        backgroundColor: colors.background,
        color: colors.textPrimary,
      }}
    >
      {/* Matrix Rain Effect (only for Matrix theme) */}
      {themeConfig.effects.matrixRain && (
        <MatrixRain color={colors.primary} opacity={0.12} />
      )}
      
      {/* CRT Overlays - conditionally rendered based on theme */}
      {themeConfig.effects.scanlines && <div className="scanlines"></div>}
      <div className="crt-overlay-anim"></div>
      {themeConfig.effects.vignette && <div className="vignette"></div>}

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
  );
}

export default function DashboardPage() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <CanvasProvider>
          <DashboardContent />
        </CanvasProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
