"use client";

import { CanvasProvider } from "@/context/CanvasContext";
import { Sidebar } from "@/components/Sidebar";
import { CanvasEditor } from "@/components/CanvasEditor";

export default function DashboardPage() {
  return (
    <CanvasProvider>
      <div className="bg-[#f6f7f8] dark:bg-[#101c22] font-[family-name:var(--font-inter)] text-[#111618] dark:text-white overflow-hidden">
        <div className="flex h-screen w-full">
          <Sidebar />
          <CanvasEditor />
        </div>
      </div>
    </CanvasProvider>
  );
}
