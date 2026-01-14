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
  const shouldListenRef = useRef(false); // Track if we WANT to be listening

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Keep listening
        recognition.interimResults = true; // Show interim results to keep connection alive
        recognition.lang = "en-US";
        
        recognition.onstart = () => {
          console.log("[NeuralInterface] Speech recognition started");
          setIsListening(true);
        };
        recognition.onend = () => {
          console.log("[NeuralInterface] Speech recognition ended");
          // Auto-restart if we still want to be listening
          if (shouldListenRef.current) {
            console.log("[NeuralInterface] Restarting speech recognition...");
            try {
              recognition.start();
            } catch (e) {
              console.error("[NeuralInterface] Failed to restart:", e);
              setIsListening(false);
              shouldListenRef.current = false;
            }
          } else {
            setIsListening(false);
          }
        };
        recognition.onerror = (event: any) => {
          console.error("[NeuralInterface] Speech recognition error:", event.error);
          // Don't stop listening on 'no-speech' error, just let it auto-restart
          if (event.error === 'aborted' || event.error === 'not-allowed') {
            setIsListening(false);
            shouldListenRef.current = false;
          }
        };
        recognition.onresult = (event: any) => {
          const result = event.results[event.results.length - 1];
          const transcript = result[0].transcript;
          
          // Show interim transcript in input field for visual feedback
          setInputInternal(transcript);
          
          if (result.isFinal) {
            console.log("[NeuralInterface] Final transcript:", transcript);
            if (transcript.trim()) {
              sendMessage({ role: 'user', content: transcript });
              setInputInternal(""); // Clear after sending
              playConfirm();
            }
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
          shouldListenRef.current = false; // Signal we want to stop
          recognitionRef.current.stop();
      } else {
          playClick();
          shouldListenRef.current = true; // Signal we want to keep listening
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error("[NeuralInterface] Failed to start recognition:", e);
          }
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

      {/* Floating Retro Robot Trigger */}
      <motion.button
         onClick={() => setIsOpen(!isOpen)}
         className="fixed bottom-6 right-6 z-[130] group"
         whileHover={{ scale: 1.05 }}
         whileTap={{ scale: 0.95 }}
         animate={{
           y: isListening ? [0, -2, 0, 2, 0] : isLoading ? 0 : [0, -3, 0], // Listening: vibrate, Loading: still, Idle: gentle bob
           rotate: isListening ? [-1, 1, -1] : 0,
         }}
         transition={{
           y: { duration: isListening ? 0.15 : 2, repeat: Infinity, ease: "easeInOut" },
           rotate: { duration: 0.1, repeat: Infinity },
         }}
      >
          <div className="relative size-16 flex items-center justify-center">
              {/* Robot Head Container */}
              <motion.div 
                className={`relative size-14 bg-gradient-to-b from-[#3a3a3a] to-[#1a1a1a] border-2 rounded-lg shadow-[0_0_25px_rgba(57,255,20,0.4)] transition-colors duration-300 ${
                  isListening ? 'border-red-500 shadow-[0_0_25px_rgba(255,0,0,0.5)]' : 
                  isLoading ? 'border-yellow-500 shadow-[0_0_25px_rgba(255,200,0,0.5)]' : 
                  'border-[#39ff14]/70'
                }`}
              >
                  {/* Robot Eyes */}
                  <div className="absolute top-2.5 left-0 right-0 flex justify-center gap-3">
                      <motion.div 
                        className={`size-2.5 rounded-sm ${isListening ? 'bg-red-500' : isLoading ? 'bg-yellow-500' : 'bg-[#39ff14]'} shadow-[0_0_10px_currentColor]`}
                        animate={{
                          scale: isListening ? [1, 1.3, 1] : isLoading ? [1, 0.8, 1] : 1,
                          opacity: isListening ? [1, 0.5, 1] : 1,
                        }}
                        transition={{ duration: 0.3, repeat: Infinity }}
                      />
                      <motion.div 
                        className={`size-2.5 rounded-sm ${isListening ? 'bg-red-500' : isLoading ? 'bg-yellow-500' : 'bg-[#39ff14]'} shadow-[0_0_10px_currentColor]`}
                        animate={{
                          scale: isListening ? [1, 1.3, 1] : isLoading ? [1, 0.8, 1] : 1,
                          opacity: isListening ? [1, 0.5, 1] : 1,
                        }}
                        transition={{ duration: 0.3, repeat: Infinity, delay: 0.15 }}
                      />
                  </div>
                  
                  {/* Robot Mouth/Speaker Grille - Animated when speaking/loading */}
                  <div className="absolute bottom-2.5 left-2 right-2 flex flex-col gap-[3px]">
                      <motion.div 
                        className={`h-[2px] rounded-full ${isLoading ? 'bg-yellow-500' : isListening ? 'bg-red-500/60' : 'bg-[#39ff14]/50'}`}
                        animate={{ scaleX: isLoading ? [1, 0.6, 1, 0.8, 1] : 1 }}
                        transition={{ duration: 0.2, repeat: Infinity }}
                      />
                      <motion.div 
                        className={`h-[2px] rounded-full ${isLoading ? 'bg-yellow-500/80' : isListening ? 'bg-red-500/40' : 'bg-[#39ff14]/35'}`}
                        animate={{ scaleX: isLoading ? [0.8, 1, 0.5, 1, 0.7] : 1 }}
                        transition={{ duration: 0.25, repeat: Infinity }}
                      />
                      <motion.div 
                        className={`h-[2px] rounded-full ${isLoading ? 'bg-yellow-500/60' : isListening ? 'bg-red-500/30' : 'bg-[#39ff14]/20'}`}
                        animate={{ scaleX: isLoading ? [0.6, 0.9, 1, 0.6, 1] : 1 }}
                        transition={{ duration: 0.18, repeat: Infinity }}
                      />
                  </div>
                  
                  {/* Antenna */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-[2px] h-4 bg-gradient-to-t from-[#39ff14]/60 to-transparent">
                      <motion.div 
                        className={`absolute -top-1.5 left-1/2 -translate-x-1/2 size-2.5 rounded-full ${isListening ? 'bg-red-500' : isLoading ? 'bg-yellow-500' : 'bg-[#39ff14]'} shadow-[0_0_8px_currentColor]`}
                        animate={{
                          scale: isListening ? [1, 1.5, 1] : [1, 1.2, 1],
                          opacity: isListening ? [1, 0.3, 1] : 1,
                        }}
                        transition={{ duration: isListening ? 0.3 : 1.5, repeat: Infinity }}
                      />
                  </div>

                  {/* Side Bolts */}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 size-2 bg-[#39ff14]/30 rounded-full border border-[#39ff14]/50"></div>
                  <div className="absolute top-1/2 -right-1 -translate-y-1/2 size-2 bg-[#39ff14]/30 rounded-full border border-[#39ff14]/50"></div>
              </motion.div>

               {/* Sound Wave Effect when Listening */}
               {isListening && (
                   <>
                     <motion.div 
                       className="absolute inset-0 border-2 border-red-500/50 rounded-lg"
                       animate={{ scale: [1, 1.3, 1.3], opacity: [0.8, 0, 0] }}
                       transition={{ duration: 1, repeat: Infinity }}
                     />
                     <motion.div 
                       className="absolute inset-0 border-2 border-red-500/30 rounded-lg"
                       animate={{ scale: [1, 1.5, 1.5], opacity: [0.6, 0, 0] }}
                       transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                     />
                   </>
               )}
          </div>
          
          {/* Status Label */}
          <div className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-bold tracking-wider whitespace-nowrap ${
            isListening ? 'text-red-500' : isLoading ? 'text-yellow-500' : 'text-[#39ff14]/60'
          }`}>
            {isListening ? '● REC' : isLoading ? '◐ PROC' : '○ IDLE'}
          </div>
      </motion.button>
    </>
  );
}
