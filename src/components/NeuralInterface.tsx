"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { motion, AnimatePresence } from "framer-motion";
import { useCanvas } from "@/context/CanvasContext";
import { useSfx } from "@/hooks/useSfx";

export function NeuralInterface() {
  // @ts-ignore - useChat types might be slightly off with version mismatch but runtime is fine
  // @ts-ignore - useChat types might be slightly off with version mismatch but runtime is fine
  const { messages, sendMessage, isLoading, addToolResult } = useChat({
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
                {/* Chat Bubble */}
                {latestMessage && latestMessage.role === 'assistant' && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 bg-[#0a0b10] border border-[#eca013]/50 p-3 rounded-lg shadow-[0_0_15px_rgba(236,160,19,0.2)] text-[#eca013] text-xs relative max-h-40 overflow-y-auto custom-scrollbar"
                    >
                        {(latestMessage as any).content}
                        <div className="absolute bottom-0 right-2 text-[8px] opacity-50">AI_CORE_V.2</div>
                    </motion.div>
                )}

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
