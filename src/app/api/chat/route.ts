import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4o'),
    messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
    })),
    system: `You are the Neural Interface for CCNote, a cyberpunk collaborative canvas.
    You are a helpful, efficient AI operator.
    You can manipulate the canvas using the provided tools.
    If the user asks to create something, use the createNode tool.
    If they want to link things, use createConnection.
    Always be concise and efficient in your text responses. Use cyber-lingo occasionally (e.g., "Affirmative", "Executing", "Uplink established").`,
    tools: {
      createNode: tool({
        description: 'Create a new note or folder on the canvas',
        parameters: z.object({
          content: z.string().describe('The text content of the note'),
          type: z.enum(['text', 'folder', 'image']).describe('The type of element'),
          x: z.number().optional().describe('X position (default to center if unknown)'),
          y: z.number().optional().describe('Y position'),
          color: z.string().optional().describe('Hex color code'),
        }),
        execute: async () => ({}) // Client-side execution
      }),
      updateNode: tool({
        description: 'Update the content or properties of an existing node',
        parameters: z.object({
            id: z.string().describe('The ID of the node to update. If not provided, ask the user to select one or clarify.'),
            content: z.string().optional(),
            color: z.string().optional(),
        }),
        execute: async () => ({})
      }),
      createConnection: tool({
          description: 'Connect two nodes typically by their context or IDs',
          parameters: z.object({
              fromId: z.string(),
              toId: z.string(),
          }),
          execute: async () => ({})
      })
    },
  });

  return result.toDataStreamResponse();
}
