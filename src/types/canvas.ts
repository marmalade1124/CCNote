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

export interface DbConnection {
  id: string;
  canvas_id: string;
  from_element_id: string;
  to_element_id: string;
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

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export interface Canvas {
  id: string;
  name: string;
  elements: CanvasElement[];
  connections: Connection[];
  createdAt: number;
  updatedAt: number;
}
