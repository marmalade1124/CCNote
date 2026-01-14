"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { motion, AnimatePresence } from "framer-motion";
import { useCanvas } from "@/context/CanvasContext";
import { useSfx } from "@/hooks/useSfx";

export function NeuralInterface() {
  const { addElement, updateElement, addConnection, activeCanvas } = useCanvas();
  const { playClick, playConfirm, speak } = useSfx();

  const { messages, sendMessage, isLoading, addToolResult, error } = (useChat as any)({
    body: {
      canvasElements: activeCanvas?.elements || []
    },
    onError: (err: any) => {
        console.error("AI Chat Error:", err);
    },
    onToolCall: async ({ toolCall }: any) => {
      const { toolName, input } = toolCall;
      const args: any = input;
      let result = "Done";

      if (toolName === "createNode") {
          const { content, type, x, y, color } = args;
          const centerX = window.scrollX + window.innerWidth / 2;
          const centerY = window.scrollY + window.innerHeight / 2;
          
          await addElement({
              type: type || 'text',
              content: content || 'New Node',
              x: x || centerX + (Math.random() * 100 - 50),
              y: y || centerY + (Math.random() * 100 - 50),
              width: 200,
              height: 100,
              color: color || '#eca013'
          });
          result = "Node created successfully.";
      }

      if (toolName === "updateNode") {
          const { id, content, color } = args;
          if (id) {
              await updateElement(id, {
                  ...(content && { content }),
                  ...(color && { color })
              });
              result = `Node ${id} updated.`;
          } else {
              result = "Error: Node ID required.";
          }
      }
      
      if (toolName === "createConnection") {
          const { fromId, toId } = args;
          await addConnection(fromId, toId);
          result = "Connection established.";
      }

      addToolResult({ toolCallId: toolCall.toolCallId, result });
    },
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputInternal, setInputInternal] = useState("");
  const recognitionRef = useRef<any>(null);
  const spokenMessageIds = useRef<Set<string>>(new Set());

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Keep listening
        recognition.interimResults = false;
        recognition.lang = "en-US";
        
        recognition.onstart = () => {
          console.log("[NeuralInterface] Speech recognition started");
          setIsListening(true);
        };
        recognition.onend = () => {
          console.log("[NeuralInterface] Speech recognition ended");
          setIsListening(false);
        };
        recognition.onerror = (event: any) => {
          console.error("[NeuralInterface] Speech recognition error:", event.error);
          setIsListening(false);
        };
        recognition.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          console.log("[NeuralInterface] Transcript:", transcript);
          if (transcript.trim()) {
            sendMessage({ role: 'user', content: transcript });
            playConfirm();
          }
        };
        
        recognitionRef.current = recognition;
      } else {
        console.warn("[NeuralInterface] Speech recognition not supported");
      }
    }
  }, [sendMessage, playConfirm]);

  // TTS and Auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Helper to extract text content from a message
  const getMessageText = (m: any): string => {
    if (m.content) return m.content;
    if (m.parts) {
      return m.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');
    }
    return '';
  };
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    
    // Speak latest assistant message (only once per message)
    const latest = messages[messages.length - 1];
    if (latest && latest.role === 'assistant' && (latest as any).id) {
        const messageId = (latest as any).id;
        // Check if streaming is done (parts has state: 'done')
        const parts = (latest as any).parts;
        const isStreamingDone = parts?.some((p: any) => p.state === 'done');
        
        if (isStreamingDone && !spokenMessageIds.current.has(messageId)) {
            spokenMessageIds.current.add(messageId);
            const text = getMessageText(latest);
            if (text) speak(text);
        }
    }
  }, [messages, speak]);

  const toggleListening = () => {
      if (!recognitionRef.current) return;
      if (isListening) {
          recognitionRef.current.stop();
      } else {
          playClick();
          recognitionRef.current.start();
      }
  };

  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
            <motion.div 
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                className="fixed bottom-20 right-6 w-80 z-[120] font-mono"
            >
                {/* Chat History Panel */}
                <div className="mb-4 bg-[#0a0b10] border border-[#39ff14]/30 p-2 rounded-lg h-60 overflow-y-auto custom-scrollbar flex flex-col gap-2 shadow-inner">
                    {messages.length === 0 && (
                        <div className="text-[#39ff14]/30 text-[10px] text-center mt-20 font-mono">
                            // NO_DATA_STREAM<br/>
                            // WAITING_FOR_INPUT...
                        </div>
                    )}
                    
                    {/* Error Banner */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 p-2 rounded text-red-500 text-xs font-mono mb-2">
                            ERROR: {error.message}
                        </div>
                    )}

                    {messages.map((m: any, i: number) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, x: m.role === 'user' ? 10 : -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`p-2 rounded max-w-[90%] text-xs relative ${
                                m.role === 'user' 
                                ? 'self-end bg-[#39ff14]/10 text-[#39ff14] border border-[#39ff14]/20' 
                                : 'self-start bg-[#eca013]/10 text-[#eca013] border border-[#eca013]/20'
                            }`}
                        >
                            {/* Render content - handle both direct content and parts array */}
                            {(m as any).content || 
                             (m as any).parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') ||
                             ''}
                            
                            {/* Render Tool Invocations */}
                            {(m as any).toolInvocations?.map((toolInv: any, toolIndex: number) => (
                                <div key={toolIndex} className="mt-1 bg-[#39ff14]/5 border border-[#39ff14]/20 rounded p-1 text-[10px] font-mono">
                                    <div className="flex items-center gap-1 opacity-70">
                                        <span className="material-symbols-outlined text-[10px]">terminal</span>
                                        <span>EXEC: {toolInv.toolName}</span>
                                    </div>
                                    <div className="opacity-50 truncate max-w-[150px]">
                                        {JSON.stringify(toolInv.args)}
                                    </div>
                                    {toolInv.result && (
                                         <div className="mt-1 text-[#39ff14] opacity-80 border-t border-[#39ff14]/10 pt-1">
                                            ➔ {JSON.stringify(toolInv.result)}
                                         </div>
                                    )}
                                </div>
                            ))}

                            <div className="absolute -bottom-3 right-0 text-[8px] opacity-40 font-bold uppercase tracking-wider">
                                {m.role === 'user' ? 'USER_CMD' : 'AI_CORE'}
                            </div>
                        </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Panel */}
                <div className="bg-[#0a0b10]/90 backdrop-blur-md border border-[#39ff14]/50 rounded-lg p-3 shadow-[0_0_20px_rgba(57,255,20,0.1)]">
                    <div className="flex items-center gap-2 mb-2">
                         <div className={`size-3 rounded-full ${isLoading ? 'bg-red-500 animate-pulse' : 'bg-[#39ff14]'}`}></div>
                         <span className="text-[#39ff14] text-xs font-bold tracking-widest uppercase">
                             {isLoading ? "PROCESSING..." : isListening ? "LISTENING..." : "NEURAL_LINK_READY"}
                         </span>
                    </div>

                    <form 
                        onSubmit={(e) => { 
                            e.preventDefault(); 
                            if (!inputInternal.trim()) return;
                            sendMessage({ role: 'user', content: inputInternal }); 
                            setInputInternal(""); 
                        }}
                        className="flex gap-2"
                    >
                        <input 
                            id="chat-input"
                            name="chat-input"
                            value={inputInternal}
                            onChange={e => setInputInternal(e.target.value)}
                            className="flex-1 bg-[#39ff14]/5 border border-[#39ff14]/30 rounded px-2 py-1 text-xs text-[#39ff14] placeholder-[#39ff14]/30 focus:outline-none focus:border-[#39ff14]"
                            placeholder="Type or Speak command..."
                        />
                        <button 
                            type="button" 
                            onClick={toggleListening}
                            className={`p-1.5 rounded border transition-all ${isListening ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' : 'border-[#39ff14]/30 text-[#39ff14] hover:bg-[#39ff14]/10'}`}
                        >
                            <span className="material-symbols-outlined text-sm">mic</span>
                        </button>
                    </form>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Avatar Trigger */}
      <motion.button
         drag
         dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
         onClick={() => setIsOpen(!isOpen)}
         className="fixed bottom-6 right-6 z-[130] group"
         whileHover={{ scale: 1.1 }}
         whileTap={{ scale: 0.95 }}
      >
          <div className="relative size-12 flex items-center justify-center">
              {/* Spinning Rings */}
              <div className="absolute inset-0 border-2 border-[#39ff14] rounded-full opacity-60 animate-[spin_4s_linear_infinite]"></div>
              <div className="absolute inset-1 border border-[#39ff14] rounded-full opacity-40 animate-[spin_3s_linear_infinite_reverse]"></div>
              
              {/* Core */}
              <div className={`size-6 bg-[#39ff14] rounded-full shadow-[0_0_15px_#39ff14] transition-all duration-300 ${isOpen ? 'scale-100' : 'scale-75 opacity-80'}`}>
                  <div className="w-full h-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.8),transparent)]"></div>
              </div>

               {/* Activity Pulse */}
               {isLoading && (
                   <div className="absolute inset-0 bg-[#39ff14]/30 rounded-full animate-ping"></div>
               )}
          </div>
      </motion.button>
    </>
  );
}
