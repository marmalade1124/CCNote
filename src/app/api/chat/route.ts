import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, canvasElements } = await req.json();

  console.log("Received messages:", messages.length, "Canvas elements:", canvasElements?.length || 0);

  // SECURITY: Limit payload size to prevent DoS/cost overruns
  const MAX_ELEMENTS = 100;
  let truncatedElements = canvasElements || [];
  let wasTruncated = false;
  
  if (truncatedElements.length > MAX_ELEMENTS) {
    console.warn(`[API] Truncating ${truncatedElements.length} elements to ${MAX_ELEMENTS}`);
    truncatedElements = truncatedElements.slice(0, MAX_ELEMENTS);
    wasTruncated = true;
  }

  // Build a summary of existing nodes for the AI
  const nodesSummary = truncatedElements.length 
    ? `\n\nCurrent Canvas Nodes (${truncatedElements.length} total${wasTruncated ? ` - showing first ${MAX_ELEMENTS} of ${canvasElements.length}` : ''}):\n${truncatedElements.map((el: any) => 
        `- [ID: ${el.id}] "${el.content?.substring(0, 100) || '(empty)'}" (type: ${el.type}, color: ${el.color || 'default'})`
      ).join('\n')}`
    : '\n\nThe canvas is currently empty.';

  const coreMessages = messages.map((m: any) => {
    if (m.role === 'user') {
      return { role: 'user', content: m.content || '' };
    }
    // Handle Assistant messages with potential tool calls
    if (m.role === 'assistant') {
      const toolCalls = m.toolInvocations?.filter((ti: any) => ti.state !== 'result').map((ti: any) => ({
        toolCallId: ti.toolCallId,
        toolName: ti.toolName,
        args: ti.args,
      }));
      
      // If there are tool results (client side executed), we might need to handle them.
      // But typically useChat sends the history. 
      // Vercel AI SDK v6 expects 'tool' messages for results.
      // If the client message includes results in 'toolInvocations', we need to separate them?
      // For now, let's map simple assistant text.
      return { 
        role: 'assistant', 
        content: m.content || '',
        ...(toolCalls?.length ? { toolCalls } : {})
      };
    }
    // Handle Tool messages (if client sends them explicitly as 'tool' role)
    if (m.role === 'tool') {
        return {
            role: 'tool',
            content: m.content
        };
    }
    
    return { role: m.role, content: m.content };
  });

  // Handle implicit tool results from toolInvocations in assistant messages (unrolling)
  const finalMessages = [];
  for (const m of messages) {
      if (m.role === 'user') {
          finalMessages.push({ role: 'user', content: m.content || '' });
      } else if (m.role === 'assistant') {
          const toolCalls = m.toolInvocations?.map((ti: any) => ({
             toolCallId: ti.toolCallId,
             toolName: ti.toolName,
             args: ti.args,
          })) || [];

          finalMessages.push({
              role: 'assistant',
              content: m.content || '',
              ...(toolCalls.length ? { toolCalls } : {})
          });

          // Check for results
          const toolResults = m.toolInvocations?.filter((ti: any) => ti.state === 'result').map((ti: any) => ({
              type: 'tool-result',
              toolCallId: ti.toolCallId,
              toolName: ti.toolName,
              result: ti.result,
          }));

          if (toolResults?.length) {
              finalMessages.push({
                  role: 'tool',
                  content: toolResults
              });
          }
      } else if (m.role === 'tool') {
          finalMessages.push(m);
      } else {
        // system or other
        finalMessages.push(m);
      }
  }

  try {
    const result = await streamText({
      model: google('gemini-2.5-flash'),
      messages: finalMessages as any, // Cast to avoid strict type checks on our manual object
      system: `You are the Neural Interface for CCNote, a cyberpunk collaborative canvas.
You are a helpful, efficient AI operator.
You can manipulate the canvas using the provided tools.
If the user asks to create something, use the createNode tool.
If they want to link things, use createConnection.
When the user asks about existing nodes or their content, refer to the Current Canvas Nodes list below.
Always be concise and efficient in your text responses. Use cyber-lingo occasionally (e.g., "Affirmative", "Executing", "Uplink established").${nodesSummary}`,
      tools: {
        createNode: tool({
          description: 'Create a new note or folder on the canvas',
          inputSchema: z.object({
            content: z.string().describe('The text content of the note'),
            type: z.enum(['text', 'folder', 'image']).describe('The type of element'),
            x: z.number().optional().describe('X position (default to center if unknown)'),
            y: z.number().optional().describe('Y position'),
            color: z.string().optional().describe('Hex color code'),
          }),
          outputSchema: z.object({}),
        }),
        updateNode: tool({
          description: 'Update the content or properties of an existing node',
          inputSchema: z.object({
              id: z.string().describe('The ID of the node to update. If not provided, ask the user to select one or clarify.'),
              content: z.string().optional(),
              color: z.string().optional(),
          }),
          outputSchema: z.object({}),
        }),
        createConnection: tool({
            description: 'Connect two nodes typically by their context or IDs',
            inputSchema: z.object({
                fromId: z.string(),
                toId: z.string(),
            }),
            outputSchema: z.object({}),
        })
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("API /api/chat Error:", error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error }), { status: 500 });
  }
}
