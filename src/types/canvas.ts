// Database types for Supabase

export interface DbCanvas {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface DbElement {
  id: string;
  canvas_id: string;
  type: CanvasElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string | null;
  rotation: number;
  parent_id?: string | null; // For folder grouping
  created_at: string;
}

export interface DbConnection {
  id: string;
  canvas_id: string;
  from_element_id: string;
  to_element_id: string;
  created_at: string;
}

// Application types
export type CanvasElementType = 'card' | 'sticky' | 'text' | 'folder' | 'image' | 'checklist';
export type ElementType = CanvasElementType;

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color?: string; // For sticky notes
  rotation?: number;
  parentId?: string | null; // For folder grouping
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export type CanvasTool = "select" | "card" | "sticky" | "text" | "connect" | "folder" | "image" | "checklist" | "pan";

export interface Canvas {
  id: string;
  name: string;
  elements: CanvasElement[];
  connections: Connection[];
  createdAt: number;
  updatedAt: number;
}
