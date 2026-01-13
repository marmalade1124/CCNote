"use client";

import { useState, useRef, useEffect } from "react";
import { useCanvas } from "@/context/CanvasContext";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  avatarUrl: string;
  onAvatarChange: (url: string) => void;
  displayName: string;
  onNameChange: (name: string) => void;
}

export function ProfileModal({ isOpen, onClose, avatarUrl, onAvatarChange, displayName, onNameChange }: ProfileModalProps) {
  const { user } = useCanvas();
  const [localName, setLocalName] = useState(displayName);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setLocalName(displayName);
  }, [displayName]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);



  if (!isOpen) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) { // 500KB Limit
      alert("Image too large. Please use an image under 500KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      onAvatarChange(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      onNameChange(localName);
      // await updateUser({ full_name: displayName }); // Disabled for Local Mode
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to update profile.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[400px] bg-[#0a0b10] border border-[#eca013] shadow-[0_0_30px_rgba(236,160,19,0.1)] rounded-lg p-6 flex flex-col gap-6 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eca013]/20 pb-4">
          <h2 className="text-[#eca013] font-bold tracking-widest uppercase text-sm">
            <span className="material-symbols-outlined align-bottom mr-2">badge</span>
            ID_Card_Settings
          </h2>
          <button onClick={onClose} className="text-[#eca013]/50 hover:text-[#eca013] transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div 
            className="size-24 rounded-full border-2 border-[#eca013]/30 bg-[#eca013]/5 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-[#eca013]"
            onClick={() => fileInputRef.current?.click()}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-4xl text-[#eca013]/30">person</span>
            )}
            
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-[#eca013]">upload</span>
            </div>
          </div>
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*" 
            hidden 
            onChange={handleAvatarChange} 
          />
          <span className="text-[10px] text-[#eca013]/40 font-mono tracking-wider">CLICK_TO_UPLOAD_IMG</span>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-[#eca013]/60 tracking-wider">Display_Name</label>
            <input 
              className="w-full bg-[#eca013]/5 border border-[#eca013]/20 rounded px-3 py-2 text-[#eca013] outline-none focus:border-[#eca013] font-mono"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="ENTER_NAME"
            />
          </div>

           <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-[#eca013]/60 tracking-wider">Unique_Identifier</label>
             <div className="w-full bg-black/20 border border-[#eca013]/10 rounded px-3 py-2 text-[#eca013]/40 font-mono text-xs truncate">
              {user?.id || "GUEST_SESSION"}
             </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button 
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 bg-[#eca013] text-[#0a0b10] font-bold py-2 rounded tracking-widest uppercase hover:opacity-90 tactile-btn disabled:opacity-50"
          >
            {isLoading ? "SAVING..." : "CONFIRM_UPDATE"}
          </button>
        </div>

      </div>
    </div>
  );
}
