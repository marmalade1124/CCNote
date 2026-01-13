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
  type: "card" | "sticky" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string | null;
  rotation: number;
  created_at: string;
}

// Application types (same as before but for reference)
export interface CanvasElement {
  id: string;
  type: "card" | "sticky" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color?: string;
  rotation?: number;
}

export interface Canvas {
  id: string;
  name: string;
  elements: CanvasElement[];
  createdAt: number;
  updatedAt: number;
}
