"use client";

import { createContext, useContext, ReactNode, useCallback, useEffect, useState } from "react";
import { Canvas, CanvasElement, DbCanvas, DbElement } from "@/types/canvas";
import { supabase } from "@/lib/supabase";

interface CanvasContextType {
  canvases: Canvas[];
  activeCanvasId: string | null;
  activeCanvas: Canvas | null;
  isLoading: boolean;
  isConnected: boolean;
  createCanvas: (name: string) => Promise<Canvas | null>;
  deleteCanvas: (id: string) => Promise<void>;
  renameCanvas: (id: string, name: string) => Promise<void>;
  setActiveCanvas: (id: string | null) => void;
  addElement: (element: Omit<CanvasElement, "id">) => Promise<void>;
  updateElement: (elementId: string, updates: Partial<CanvasElement>) => Promise<void>;
  deleteElement: (elementId: string) => Promise<void>;
  refreshCanvases: () => Promise<void>;
}

const CanvasContext = createContext<CanvasContextType | null>(null);

// Transform database canvas + elements to app format
function dbToCanvas(dbCanvas: DbCanvas, elements: DbElement[]): Canvas {
  return {
    id: dbCanvas.id,
    name: dbCanvas.name,
    elements: elements.map((el) => ({
      id: el.id,
      type: el.type,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      content: el.content,
      color: el.color || undefined,
      rotation: el.rotation,
    })),
    createdAt: new Date(dbCanvas.created_at).getTime(),
    updatedAt: new Date(dbCanvas.updated_at).getTime(),
  };
}

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const isConnected = supabase !== null;
  const activeCanvas = canvases.find((c) => c.id === activeCanvasId) || null;

  // Fetch all canvases from Supabase
  const refreshCanvases = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const { data: dbCanvases, error: canvasError } = await supabase
        .from("canvases")
        .select("*")
        .order("updated_at", { ascending: false });

      if (canvasError) throw canvasError;

      const { data: dbElements, error: elementsError } = await supabase
        .from("elements")
        .select("*");

      if (elementsError) throw elementsError;

      const elementsByCanvas: Record<string, DbElement[]> = {};
      (dbElements || []).forEach((el: DbElement) => {
        if (!elementsByCanvas[el.canvas_id]) {
          elementsByCanvas[el.canvas_id] = [];
        }
        elementsByCanvas[el.canvas_id].push(el);
      });

      const appCanvases = (dbCanvases || []).map((c: DbCanvas) =>
        dbToCanvas(c, elementsByCanvas[c.id] || [])
      );

      setCanvases(appCanvases);
    } catch (error) {
      console.error("Error fetching canvases:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCanvases();
  }, [refreshCanvases]);

  const createCanvas = useCallback(
    async (name: string): Promise<Canvas | null> => {
      if (!supabase) return null;
      
      try {
        const { data, error } = await supabase
          .from("canvases")
          .insert({ name })
          .select()
          .single();

        if (error) throw error;

        const newCanvas = dbToCanvas(data, []);
        setCanvases((prev) => [newCanvas, ...prev]);
        setActiveCanvasId(newCanvas.id);
        return newCanvas;
      } catch (error) {
        console.error("Error creating canvas:", error);
        return null;
      }
    },
    []
  );

  const deleteCanvas = useCallback(
    async (id: string) => {
      if (!supabase) return;
      
      try {
        const { error } = await supabase.from("canvases").delete().eq("id", id);
        if (error) throw error;

        setCanvases((prev) => prev.filter((c) => c.id !== id));
        if (activeCanvasId === id) {
          setActiveCanvasId(null);
        }
      } catch (error) {
        console.error("Error deleting canvas:", error);
      }
    },
    [activeCanvasId]
  );

  const renameCanvas = useCallback(async (id: string, name: string) => {
    if (!supabase) return;
    
    try {
      const { error } = await supabase
        .from("canvases")
        .update({ name, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      setCanvases((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, name, updatedAt: Date.now() } : c
        )
      );
    } catch (error) {
      console.error("Error renaming canvas:", error);
    }
  }, []);

  const setActiveCanvas = useCallback((id: string | null) => {
    setActiveCanvasId(id);
  }, []);

  const addElement = useCallback(
    async (element: Omit<CanvasElement, "id">) => {
      if (!supabase || !activeCanvasId) return;

      try {
        const { data, error } = await supabase
          .from("elements")
          .insert({
            canvas_id: activeCanvasId,
            type: element.type,
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            content: element.content,
            color: element.color || null,
            rotation: element.rotation || 0,
          })
          .select()
          .single();

        if (error) throw error;

        const newElement: CanvasElement = {
          id: data.id,
          type: data.type,
          x: data.x,
          y: data.y,
          width: data.width,
          height: data.height,
          content: data.content,
          color: data.color || undefined,
          rotation: data.rotation,
        };

        await supabase
          .from("canvases")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", activeCanvasId);

        setCanvases((prev) =>
          prev.map((c) =>
            c.id === activeCanvasId
              ? { ...c, elements: [...c.elements, newElement], updatedAt: Date.now() }
              : c
          )
        );
      } catch (error) {
        console.error("Error adding element:", error);
      }
    },
    [activeCanvasId]
  );

  const updateElement = useCallback(
    async (elementId: string, updates: Partial<CanvasElement>) => {
      if (!supabase || !activeCanvasId) return;

      try {
        const dbUpdates: Partial<DbElement> = {};
        if (updates.x !== undefined) dbUpdates.x = updates.x;
        if (updates.y !== undefined) dbUpdates.y = updates.y;
        if (updates.width !== undefined) dbUpdates.width = updates.width;
        if (updates.height !== undefined) dbUpdates.height = updates.height;
        if (updates.content !== undefined) dbUpdates.content = updates.content;
        if (updates.color !== undefined) dbUpdates.color = updates.color || null;
        if (updates.rotation !== undefined) dbUpdates.rotation = updates.rotation;

        const { error } = await supabase
          .from("elements")
          .update(dbUpdates)
          .eq("id", elementId);

        if (error) throw error;

        setCanvases((prev) =>
          prev.map((c) =>
            c.id === activeCanvasId
              ? {
                  ...c,
                  elements: c.elements.map((el) =>
                    el.id === elementId ? { ...el, ...updates } : el
                  ),
                  updatedAt: Date.now(),
                }
              : c
          )
        );
      } catch (error) {
        console.error("Error updating element:", JSON.stringify(error, null, 2));
      }
    },
    [activeCanvasId]
  );

  const deleteElement = useCallback(
    async (elementId: string) => {
      if (!supabase || !activeCanvasId) return;

      try {
        const { error } = await supabase.from("elements").delete().eq("id", elementId);
        if (error) throw error;

        await supabase
          .from("canvases")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", activeCanvasId);

        setCanvases((prev) =>
          prev.map((c) =>
            c.id === activeCanvasId
              ? {
                  ...c,
                  elements: c.elements.filter((el) => el.id !== elementId),
                  updatedAt: Date.now(),
                }
              : c
          )
        );
      } catch (error) {
        console.error("Error deleting element:", error);
      }
    },
    [activeCanvasId]
  );

  return (
    <CanvasContext.Provider
      value={{
        canvases,
        activeCanvasId,
        activeCanvas,
        isLoading,
        isConnected,
        createCanvas,
        deleteCanvas,
        renameCanvas,
        setActiveCanvas,
        addElement,
        updateElement,
        deleteElement,
        refreshCanvases,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvas() {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvas must be used within a CanvasProvider");
  }
  return context;
}
