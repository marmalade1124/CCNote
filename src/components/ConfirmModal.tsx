"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
}

export function ConfirmModal({
  isOpen,
  title = "CONFIRM_ACTION",
  message,
  onConfirm,
  onCancel,
  confirmText = "CONFIRM",
  cancelText = "CANCEL",
  variant = 'default'
}: ConfirmModalProps) {
  const colors = {
    danger: { border: '#ff5555', glow: 'rgba(255,85,85,0.3)', text: '#ff5555' },
    warning: { border: '#eca013', glow: 'rgba(236,160,19,0.3)', text: '#eca013' },
    default: { border: '#39ff14', glow: 'rgba(57,255,20,0.3)', text: '#39ff14' }
  };
  
  const c = colors[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            onClick={onCancel}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-80"
          >
            <div 
              className="bg-[#0a0b10] border-2 rounded-lg p-4 font-mono"
              style={{ 
                borderColor: c.border,
                boxShadow: `0 0 30px ${c.glow}, inset 0 0 20px rgba(0,0,0,0.5)`
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: `${c.border}40` }}>
                <span className="material-symbols-outlined text-lg" style={{ color: c.text }}>
                  {variant === 'danger' ? 'warning' : variant === 'warning' ? 'help' : 'info'}
                </span>
                <span className="text-xs font-bold tracking-widest uppercase" style={{ color: c.text }}>
                  {title}
                </span>
              </div>
              
              {/* Message */}
              <p className="text-sm text-[#eca013]/80 mb-4 leading-relaxed">
                {message}
              </p>
              
              {/* Buttons */}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={onCancel}
                  className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider border border-[#eca013]/30 text-[#eca013]/60 rounded hover:bg-[#eca013]/10 hover:border-[#eca013]/50 hover:text-[#eca013] transition-all"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all"
                  style={{ 
                    backgroundColor: `${c.border}20`,
                    borderWidth: '1px',
                    borderColor: c.border,
                    color: c.text
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${c.border}40`;
                    e.currentTarget.style.boxShadow = `0 0 10px ${c.glow}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = `${c.border}20`;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
