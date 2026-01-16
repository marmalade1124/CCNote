"use client";

import { useState } from "react";
import { useTheme, CanvasTheme, THEMES } from "@/context/ThemeContext";
import { useSfx } from "@/hooks/useSfx";

export function ThemeSwitcher({ onClose }: { onClose?: () => void }) {
  const { theme, setTheme, themeConfig } = useTheme();
  const { playClick, playHover, playConfirm } = useSfx();
  const [hoveredTheme, setHoveredTheme] = useState<CanvasTheme | null>(null);

  const themeList: CanvasTheme[] = ['cyberpunk', 'matrix', 'outrun', 'ghost', 'minimal'];

  const handleSelect = (newTheme: CanvasTheme) => {
    playConfirm();
    setTheme(newTheme);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-[500px] max-w-[90vw] p-6 rounded-lg border shadow-2xl animate-in zoom-in-95 duration-200"
        style={{
          backgroundColor: themeConfig.colors.background,
          borderColor: themeConfig.colors.cardBorder,
          boxShadow: `0 0 60px ${themeConfig.colors.primary}20`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b" style={{ borderColor: themeConfig.colors.cardBorder }}>
          <div className="flex items-center gap-3">
            <span 
              className="material-symbols-outlined text-2xl"
              style={{ color: themeConfig.colors.primary }}
            >
              palette
            </span>
            <h2 
              className="text-lg font-bold tracking-widest uppercase"
              style={{ color: themeConfig.colors.primary }}
            >
              Canvas_Themes
            </h2>
          </div>
          <button
            onClick={() => { playClick(); onClose?.(); }}
            onMouseEnter={playHover}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <span 
              className="material-symbols-outlined"
              style={{ color: themeConfig.colors.textSecondary }}
            >
              close
            </span>
          </button>
        </div>

        {/* Theme Grid */}
        <div className="grid grid-cols-1 gap-3">
          {themeList.map((themeKey) => {
            const config = THEMES[themeKey];
            const isActive = theme === themeKey;
            const isHovered = hoveredTheme === themeKey;
            
            return (
              <button
                key={themeKey}
                onClick={() => handleSelect(themeKey)}
                onMouseEnter={() => { playHover(); setHoveredTheme(themeKey); }}
                onMouseLeave={() => setHoveredTheme(null)}
                className={`
                  flex items-center gap-4 p-4 rounded-lg border-2 transition-all duration-200
                  ${isActive ? 'scale-[1.02]' : 'hover:scale-[1.01]'}
                `}
                style={{
                  backgroundColor: isActive ? `${config.colors.primary}15` : config.colors.background,
                  borderColor: isActive ? config.colors.primary : isHovered ? `${config.colors.primary}80` : config.colors.cardBorder,
                  boxShadow: isActive ? `0 0 20px ${config.colors.primary}30` : 'none',
                }}
              >
                {/* Color Swatches */}
                <div className="flex gap-1">
                  <div 
                    className="w-6 h-6 rounded-full border-2"
                    style={{ 
                      backgroundColor: config.colors.primary,
                      borderColor: config.colors.background,
                    }}
                  />
                  <div 
                    className="w-6 h-6 rounded-full border-2 -ml-2"
                    style={{ 
                      backgroundColor: config.colors.secondary,
                      borderColor: config.colors.background,
                    }}
                  />
                  <div 
                    className="w-6 h-6 rounded-full border-2 -ml-2"
                    style={{ 
                      backgroundColor: config.colors.accent,
                      borderColor: config.colors.background,
                    }}
                  />
                </div>

                {/* Theme Info */}
                <div className="flex-1 text-left">
                  <div 
                    className="font-bold tracking-wider uppercase text-sm"
                    style={{ color: config.colors.primary }}
                  >
                    {config.name}
                  </div>
                  <div 
                    className="text-xs font-mono flex gap-2 mt-1"
                    style={{ color: config.colors.textSecondary }}
                  >
                    {config.effects.scanlines && <span>SCANLINES</span>}
                    {config.effects.glow && <span>GLOW</span>}
                    {config.effects.matrixRain && <span>RAIN</span>}
                    {config.effects.vignette && <span>VIGNETTE</span>}
                    {!config.effects.scanlines && !config.effects.glow && !config.effects.vignette && <span>CLEAN</span>}
                  </div>
                </div>

                {/* Active Indicator */}
                {isActive && (
                  <span 
                    className="material-symbols-outlined text-lg"
                    style={{ color: config.colors.primary }}
                  >
                    check_circle
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Hint */}
        <div 
          className="mt-6 pt-4 border-t text-center text-xs font-mono"
          style={{ 
            borderColor: themeConfig.colors.cardBorder,
            color: themeConfig.colors.textSecondary,
          }}
        >
          Theme persists across sessions • Affects all visual elements
        </div>
      </div>
      
      {/* Click outside to close */}
      <div className="absolute inset-0 -z-10" onClick={() => { playClick(); onClose?.(); }} />
    </div>
  );
}
