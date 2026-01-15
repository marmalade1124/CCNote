"use client";

import { useCallback } from "react";
import { useCanvas } from "@/context/CanvasContext";

interface LocalAnswer {
  text: string;
  source: "local";
  confidence: "high" | "medium" | "low";
}

export function useCanvasKnowledge() {
  const { activeCanvas, canvases } = useCanvas();

  // Get all text content from canvas elements
  const getAllContent = useCallback(() => {
    if (!activeCanvas) return [];
    return activeCanvas.elements.map(el => ({
      id: el.id,
      type: el.type,
      content: el.content || "",
    }));
  }, [activeCanvas]);

  // Search for keyword in all content
  const searchContent = useCallback((keyword: string): string[] => {
    if (!activeCanvas || !keyword.trim()) return [];
    const lowerKeyword = keyword.toLowerCase();
    
    return activeCanvas.elements
      .filter(el => el.content?.toLowerCase().includes(lowerKeyword))
      .map(el => {
        // Extract a snippet around the keyword
        const content = el.content || "";
        const idx = content.toLowerCase().indexOf(lowerKeyword);
        const start = Math.max(0, idx - 30);
        const end = Math.min(content.length, idx + keyword.length + 30);
        const snippet = (start > 0 ? "..." : "") + content.slice(start, end) + (end < content.length ? "..." : "");
        return `[${el.type}] ${snippet}`;
      });
  }, [activeCanvas]);

  // Get node titles (first line of content or type)
  const getNodeTitles = useCallback(() => {
    if (!activeCanvas) return [];
    return activeCanvas.elements.map(el => {
      const firstLine = el.content?.split("\n")[0]?.trim() || "";
      return firstLine.slice(0, 50) || `Untitled ${el.type}`;
    });
  }, [activeCanvas]);

  // Get connections for a node
  const getConnectionsFor = useCallback((searchTerm: string) => {
    if (!activeCanvas) return null;
    
    // Find node matching search term
    const node = activeCanvas.elements.find(el => 
      el.content?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (!node) return null;
    
    const connectedIds = activeCanvas.connections
      .filter(c => c.from === node.id || c.to === node.id)
      .map(c => c.from === node.id ? c.to : c.from);
    
    const connectedNodes = activeCanvas.elements
      .filter(el => connectedIds.includes(el.id))
      .map(el => el.content?.split("\n")[0]?.trim().slice(0, 30) || `Untitled ${el.type}`);
    
    return {
      nodeName: node.content?.split("\n")[0]?.trim().slice(0, 30) || "this node",
      connections: connectedNodes,
    };
  }, [activeCanvas]);

  // Main Q&A function
  const askQuestion = useCallback((question: string): LocalAnswer | null => {
    const q = question.toLowerCase().trim();
    
    // No canvas active
    if (!activeCanvas) {
      return {
        text: "No canvas is active! Open a canvas first and I can tell you about it.",
        source: "local",
        confidence: "high",
      };
    }

    const elements = activeCanvas.elements;
    const connections = activeCanvas.connections;

    // === Question patterns ===

    // Count questions
    // Count questions
    if (q.includes("how many") && (q.includes("node") || q.includes("element") || q.includes("item") || q.includes("note"))) {
      const count = elements.length;
      const byType: Record<string, number> = {};
      elements.forEach(el => {
        byType[el.type] = (byType[el.type] || 0) + 1;
      });
      const breakdown = Object.entries(byType).map(([t, c]) => `${c} ${t}${c > 1 ? "s" : ""}`).join(", ");
      return {
        text: `You have ${count} node${count !== 1 ? "s" : ""} on this canvas${breakdown ? `: ${breakdown}` : ""}`,
        source: "local",
        confidence: "high",
      };
    }

    // Connection count
    if (q.includes("how many") && q.includes("connection")) {
      return {
        text: `There are ${connections.length} connection${connections.length !== 1 ? "s" : ""} on this canvas.`,
        source: "local",
        confidence: "high",
      };
    }

    // List nodes
    if (q.includes("what") && (q.includes("node") || q.includes("have") || q.includes("list"))) {
      const titles = getNodeTitles();
      if (titles.length === 0) {
        return { text: "Your canvas is empty! Add some nodes.", source: "local", confidence: "high" };
      }
      const list = titles.slice(0, 10).map((t, i) => `${i + 1}. ${t}`).join("\n");
      const more = titles.length > 10 ? `\n...and ${titles.length - 10} more` : "";
      return {
        text: `Here are your nodes:\n${list}${more}`,
        source: "local",
        confidence: "high",
      };
    }

    // Find/search keyword
    if (q.startsWith("find ") || q.startsWith("search ") || q.includes("where is")) {
      const keyword = q.replace(/^(find|search)\s+/i, "").replace(/where is\s*/i, "").trim();
      if (keyword.length < 2) {
        return { text: "Tell me what to search for!", source: "local", confidence: "medium" };
      }
      const results = searchContent(keyword);
      if (results.length === 0) {
        return { text: `Couldn't find "${keyword}" on your canvas.`, source: "local", confidence: "high" };
      }
      const preview = results.slice(0, 5).join("\n• ");
      const more = results.length > 5 ? `\n...and ${results.length - 5} more matches` : "";
      return {
        text: `Found "${keyword}" in:\n• ${preview}${more}`,
        source: "local",
        confidence: "high",
      };
    }

    // Connections for node
    if (q.includes("connected to") || q.includes("links to") || q.includes("connections for")) {
      const match = q.match(/(?:connected to|links to|connections for)\s+(.+)/);
      if (match) {
        const term = match[1].replace(/[?]/g, "").trim();
        const result = getConnectionsFor(term);
        if (!result) {
          return { text: `Couldn't find a node matching "${term}".`, source: "local", confidence: "medium" };
        }
        if (result.connections.length === 0) {
          return { text: `"${result.nodeName}" has no connections.`, source: "local", confidence: "high" };
        }
        return {
          text: `"${result.nodeName}" is connected to: ${result.connections.join(", ")}`,
          source: "local",
          confidence: "high",
        };
      }
    }

    // Tell me about / what is
    if (q.startsWith("tell me about") || q.startsWith("what is") || q.startsWith("describe")) {
      const topic = q.replace(/^(tell me about|what is|describe)\s*/i, "").replace(/[?]/g, "").trim();
      const results = searchContent(topic);
      if (results.length === 0) {
        return { text: `I don't see "${topic}" on your canvas.`, source: "local", confidence: "medium" };
      }
      return {
        text: `About "${topic}":\n• ${results[0]}`,
        source: "local",
        confidence: "medium",
      };
    }

    // Summarize
    if (q.includes("summar") || q.includes("overview")) {
      const titles = getNodeTitles();
      const types: Record<string, number> = {};
      elements.forEach(el => { types[el.type] = (types[el.type] || 0) + 1; });
      
      return {
        text: `Canvas: "${activeCanvas.name}"\n` +
              `• ${elements.length} nodes (${Object.entries(types).map(([t,c]) => `${c} ${t}s`).join(", ")})\n` +
              `• ${connections.length} connections\n` +
              `Topics: ${titles.slice(0, 5).join(", ")}${titles.length > 5 ? "..." : ""}`,
        source: "local",
        confidence: "high",
      };
    }

    // Canvas name
    if (q.includes("canvas name") || q.includes("what canvas") || q.includes("which canvas")) {
      return {
        text: `You're on the "${activeCanvas.name}" canvas.`,
        source: "local",
        confidence: "high",
      };
    }

    // Help
    if (q.includes("help") || q.includes("what can you")) {
      return {
        text: "I know about your canvas! Try asking:\n" +
              "• How many nodes do I have?\n" +
              "• What nodes do I have?\n" +
              "• Find [keyword]\n" +
              "• What's connected to [topic]?\n" +
              "• Summarize my canvas",
        source: "local",
        confidence: "high",
      };
    }

    // Unknown - suggest local help
    return null; // Return null to indicate we don't know, can fallback to AI
  }, [activeCanvas, getNodeTitles, searchContent, getConnectionsFor]);

  return {
    askQuestion,
    searchContent,
    getNodeTitles,
    getAllContent,
    getConnectionsFor,
    hasActiveCanvas: !!activeCanvas,
    canvasName: activeCanvas?.name || null,
    nodeCount: activeCanvas?.elements.length || 0,
    connectionCount: activeCanvas?.connections.length || 0,
  };
}
