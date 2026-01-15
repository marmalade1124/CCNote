"use client";

import { createContext, useContext, ReactNode, useCallback, useEffect, useState } from "react";
import { Canvas, CanvasElement, Connection, DbCanvas, DbElement, DbConnection, CanvasTool } from "@/types/canvas";
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
  addElement: (element: Omit<CanvasElement, "id">) => Promise<CanvasElement | null>;
  updateElement: (elementId: string, updates: Partial<CanvasElement>) => Promise<void>;
  updateElements: (batchUpdates: { id: string; changes: Partial<CanvasElement> }[]) => Promise<void>;
  deleteElement: (elementId: string) => Promise<void>;
  refreshCanvases: () => Promise<void>;
  addConnection: (fromId: string, toId: string) => Promise<void>;
  deleteConnection: (connectionId: string) => Promise<void>;
  user: any | null;
  updateUser: (updates: { full_name?: string }) => Promise<void>;
  activeTool: CanvasTool;
  setActiveTool: (tool: CanvasTool) => void;
  filterTag: string | null;
  setFilterTag: (tag: string | null) => void;
}

const CanvasContext = createContext<CanvasContextType | null>(null);

// ... (existing dbToCanvas) ...

// ... (existing CanvasProvider start) ...
// ... (existing helper functions) ...



// Transform database canvas + elements + connections to app format
function dbToCanvas(dbCanvas: DbCanvas, elements: DbElement[], connections: DbConnection[]): Canvas {
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
      parentId: el.parent_id || null, // Map parent_id
    })),
    connections: connections.map((conn) => ({
      id: conn.id,
      from: conn.from_element_id,
      to: conn.to_element_id,
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

  const [user, setUser] = useState<any | null>(null);
  const [activeTool, setActiveTool] = useState<CanvasTool>("select");
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // Fetch all canvases from Supabase
  const refreshCanvases = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    setIsLoading(true);
    try {
      // Fetch Canvases
      const { data: dbCanvases, error: canvasError } = await supabase
        .from("canvases")
        .select("*")
        .order("updated_at", { ascending: false });

      if (canvasError) throw canvasError;

      // Fetch Elements
      const { data: dbElements, error: elementsError } = await supabase
        .from("elements")
        .select("*");

      if (elementsError) throw elementsError;

      // Fetch Connections
      const { data: dbConnections, error: connectionsError } = await supabase
        .from("connections")
        .select("*");

      if (connectionsError) throw connectionsError;

      // Group Elements by Canvas
      const elementsByCanvas: Record<string, DbElement[]> = {};
      (dbElements || []).forEach((el: DbElement) => {
        if (!elementsByCanvas[el.canvas_id]) {
          elementsByCanvas[el.canvas_id] = [];
        }
        elementsByCanvas[el.canvas_id].push(el);
      });

      // Group Connections by Canvas
      const connectionsByCanvas: Record<string, DbConnection[]> = {};
      (dbConnections || []).forEach((conn: DbConnection) => {
        if (!connectionsByCanvas[conn.canvas_id]) {
          connectionsByCanvas[conn.canvas_id] = [];
        }
        connectionsByCanvas[conn.canvas_id].push(conn);
      });

      // Assemble Canvases
      const appCanvases = (dbCanvases || []).map((c: DbCanvas) =>
        dbToCanvas(c, elementsByCanvas[c.id] || [], connectionsByCanvas[c.id] || [])
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

        const newCanvas = dbToCanvas(data, [], []);
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
    async (element: Omit<CanvasElement, "id">): Promise<CanvasElement | null> => {
      if (!supabase || !activeCanvasId) return null;

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
            parent_id: element.parentId || null,
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
          parentId: data.parent_id || null,
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
        
        return newElement;
      } catch (error) {
        console.error("Error adding element:", error);
        return null;
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((updates as any).parentId !== undefined) dbUpdates.parent_id = updates.parentId || null;

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

  const updateElements = useCallback(
    async (batchUpdates: { id: string; changes: Partial<CanvasElement> }[]) => {
      const client = supabase;
      if (!client || !activeCanvasId || batchUpdates.length === 0) return;

      try {
         // 1. Optimistically update local state ONCE
         setCanvases((prev) =>
          prev.map((c) =>
            c.id === activeCanvasId
              ? {
                  ...c,
                  elements: c.elements.map((el) => {
                      const update = batchUpdates.find(u => u.id === el.id);
                      return update ? { ...el, ...update.changes } : el;
                  }),
                  updatedAt: Date.now(),
                }
              : c
          )
        );

        // 2. Perform DB updates in parallel
        const promises = batchUpdates.map(async ({ id, changes }) => {
            const dbUpdates: Partial<DbElement> = {};
            if (changes.x !== undefined) dbUpdates.x = changes.x;
            if (changes.y !== undefined) dbUpdates.y = changes.y;
            if (changes.width !== undefined) dbUpdates.width = changes.width;
            if (changes.height !== undefined) dbUpdates.height = changes.height;
            if (changes.content !== undefined) dbUpdates.content = changes.content;
            if (changes.color !== undefined) dbUpdates.color = changes.color || null;
            if (changes.rotation !== undefined) dbUpdates.rotation = changes.rotation;
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((changes as any).parentId !== undefined) dbUpdates.parent_id = changes.parentId || null;
            
            return client.from("elements").update(dbUpdates).eq("id", id);
        });

        await Promise.all(promises);

      } catch (error) {
         console.error("Error batch updating elements:", error);
      }
    },
    [activeCanvasId]
  );

  const deleteElement = useCallback(
    async (elementId: string) => {
      if (!supabase || !activeCanvasId) return;

      const elementToDelete = activeCanvas?.elements.find((el) => el.id === elementId);
      
      try {
        // If deleting a folder, first unparent all children
        if (elementToDelete?.type === "folder") {
            // Find children locally to update UI immediately? 
            // Or just run DB update and refresh?
            // Let's run DB update to set parent_id = null for children
            const { error: unparentError } = await supabase
                .from("elements")
                .update({ parent_id: null })
                .eq("parent_id", elementId);

            if (unparentError) throw unparentError;
            
            // Update local state for children
             setCanvases((prev) =>
              prev.map((c) =>
                c.id === activeCanvasId
                  ? {
                      ...c,
                      elements: c.elements.map((el) => el.parentId === elementId ? { ...el, parentId: null } : el),
                    }
                  : c
              )
            );
        }

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
                  // Filter out connections associated with this element
                  connections: c.connections.filter(
                    (conn) => conn.from !== elementId && conn.to !== elementId
                  ),
                  updatedAt: Date.now(),
                }
              : c
          )
        );
      } catch (error) {
        console.error("Error deleting element:", error);
      }
    },
    [activeCanvasId, activeCanvas]
  );

  // New: Add Connection
  const addConnection = useCallback(
    async (fromId: string, toId: string) => {
      if (!supabase || !activeCanvasId) return;

      // Check for duplicates
      if (activeCanvas?.connections.some(c => (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId))) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from("connections")
          .insert({
            canvas_id: activeCanvasId,
            from_element_id: fromId,
            to_element_id: toId,
          })
          .select()
          .single();

        if (error) throw error;

        const newConnection: Connection = {
          id: data.id,
          from: data.from_element_id,
          to: data.to_element_id,
        };

        setCanvases((prev) =>
          prev.map((c) =>
            c.id === activeCanvasId
              ? {
                  ...c,
                  connections: [...c.connections, newConnection],
                  updatedAt: Date.now(),
                }
              : c
          )
        );
      } catch (error) {
        console.error("Error adding connection:", error);
      }
    },
    [activeCanvasId, activeCanvas]
  );

  // New: Delete Connection
  const deleteConnection = useCallback(
    async (connectionId: string) => {
      if (!supabase || !activeCanvasId) return;

      try {
        const { error } = await supabase
          .from("connections")
          .delete()
          .eq("id", connectionId);

        if (error) throw error;

        setCanvases((prev) =>
          prev.map((c) =>
            c.id === activeCanvasId
              ? {
                  ...c,
                  connections: c.connections.filter((conn) => conn.id !== connectionId),
                  updatedAt: Date.now(),
                }
              : c
          )
        );
      } catch (error) {
        console.error("Error deleting connection:", error);
      }
    },
    [activeCanvasId]
  );

  const updateUser = useCallback(async (updates: { full_name?: string }) => {
     if (!supabase) return;
     const { data, error } = await supabase.auth.updateUser({ data: updates });
     if (!error && data.user) {
         setUser(data.user);
     }
  }, []);

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
        updateElements, // Exported
        deleteElement,
        refreshCanvases,
        addConnection,
        deleteConnection,
        user,
        updateUser,
        activeTool,
        setActiveTool,
        filterTag,
        setFilterTag,
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
