"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { motion, AnimatePresence } from "framer-motion";
import { useCanvas } from "@/context/CanvasContext";
import { useSfx } from "@/hooks/useSfx";

export function NeuralInterface() {
  // @ts-ignore - useChat types might be slightly off with version mismatch but runtime is fine
  // @ts-ignore - useChat types might be slightly off with version mismatch but runtime is fine
  const { messages, sendMessage, isLoading, addToolResult, error } = useChat({
    onError: (err) => {
        console.error("AI Chat Error:", err);
    },
    onToolCall: async ({ toolCall }) => {
      // @ts-ignore
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

      // @ts-ignore
      addToolResult({ toolCallId: toolCall.toolCallId, result });
    },
  });

  const { addElement, updateElement, addConnection } = useCanvas();
  const { playClick, playConfirm, speak } = useSfx();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputInternal, setInputInternal] = useState("");
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";
        
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputInternal(transcript);
          // Auto-send after voice
          setTimeout(() => {
              // @ts-ignore
              sendMessage({ role: 'user', content: transcript });
              setInputInternal("");
              playConfirm();
          }, 500);
        };
        
        recognitionRef.current = recognition;
      }
    }
  }, [sendMessage, playConfirm]);

  // TTS and Auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    
    // Speak latest assistant message
    const latest = messages[messages.length - 1];
    if (latest && latest.role === 'assistant') {
        speak((latest as any).content);
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

                    {messages.map((m, i) => (
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
                            {(m as any).content}
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
                            // @ts-ignore
                            sendMessage({ role: 'user', content: inputInternal }); 
                            setInputInternal(""); 
                        }}
                        className="flex gap-2"
                    >
                        <input 
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
         dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} // Lock drag for now or allow free? Let's just fixed pos
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
