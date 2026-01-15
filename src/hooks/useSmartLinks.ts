"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { pipeline } from '@xenova/transformers';
import { useDebounce } from './useDebounce';
import { useCanvas } from '@/context/CanvasContext';

// Singleton for the pipeline
let embeddingPipeline: any = null;

export interface SmartLinkSuggestion {
  sourceId: string;
  targetId: string;
  sourceText: string;
  targetText: string;
  similarity: number;
}

export function useSmartLinks() {
  const { activeCanvas } = useCanvas();
  const [isReady, setIsReady] = useState(false);
  const [suggestions, setSuggestions] = useState<SmartLinkSuggestion[]>([]);
  const [embeddings, setEmbeddings] = useState<Record<string, number[]>>({});
  const processingQueue = useRef<string[]>([]);

  // Initialize pipeline
  useEffect(() => {
    async function init() {
      if (!embeddingPipeline) {
        try {
          console.log('Loading Transformers.js pipeline...');
          embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
          console.log('Transformers.js pipeline loaded.');
          setIsReady(true);
        } catch (err) {
          console.error('Failed to load Transformers pipeline:', err);
        }
      } else {
        setIsReady(true);
      }
    }
    init();
  }, []);

  // Cosine similarity
  const cosineSimilarity = (a: number[], b: number[]) => {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  };

  // Generate embeddings for new/changed content
  const updateEmbeddings = useCallback(async () => {
    if (!activeCanvas || !embeddingPipeline || !isReady) return;

    for (const el of activeCanvas.elements) {
      // faster check: if content changed or no embedding
      // ideally we track versions. For now, simplistic approach:
      // We only compute if we don't have it, or naively recompute periodically (expensive).
      // Let's just compute missing ones for now to save resources.
      if (el.type === 'text' && el.content && !embeddings[el.id]) {
        try {
          const output = await embeddingPipeline(el.content, { pooling: 'mean', normalize: true });
          const embedding = Array.from(output.data) as number[];
          setEmbeddings(prev => ({ ...prev, [el.id]: embedding }));
          console.log(`Generated embedding for ${el.id}`);
        } catch (e) {
          console.error('Embedding error', e);
        }
      }
    }
  }, [activeCanvas, isReady, embeddings]);

  // Use debounce to avoid freezing UI
  const debouncedUpdate = useDebounce(updateEmbeddings, 2000);

  useEffect(() => {
    if (isReady && activeCanvas) {
      debouncedUpdate();
    }
  }, [activeCanvas, isReady, debouncedUpdate]);

  // Find suggestions for a specific node
  const findSuggestions = useCallback((nodeId: string): SmartLinkSuggestion[] => {
    const sourceEmb = embeddings[nodeId];
    if (!sourceEmb || !activeCanvas) return [];

    const results: SmartLinkSuggestion[] = [];

    activeCanvas.elements.forEach(target => {
      if (target.id === nodeId) return;
      if (!embeddings[target.id]) return;

      const sim = cosineSimilarity(sourceEmb, embeddings[target.id]);
      if (sim > 0.4) { // Threshold
        results.push({
          sourceId: nodeId,
          targetId: target.id,
          sourceText: activeCanvas.elements.find(e => e.id === nodeId)?.content?.slice(0, 20) || 'Source',
          targetText: target.content?.slice(0, 20) || 'Target',
          similarity: sim
        });
      }
    });

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
  }, [embeddings, activeCanvas]);

  return {
    isReady,
    findSuggestions,
    generatedCount: Object.keys(embeddings).length
  };
}
