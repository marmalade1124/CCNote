"use client";

import { CanvasProvider } from "@/context/CanvasContext";
import { Sidebar } from "@/components/Sidebar";
import { CanvasEditor } from "@/components/CanvasEditor";

export default function DashboardPage() {
  return (
    <CanvasProvider>
      <div className="bg-[#0a0b10] font-display text-[#eca013] overflow-hidden scanlines-container">
        <div className="flex h-screen w-full">
          <Sidebar />
          <CanvasEditor />
        </div>
      </div>
    </CanvasProvider>
  );
}
