"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { motion, AnimatePresence } from "framer-motion";
import { useCanvas } from "@/context/CanvasContext";
import { useSfx } from "@/hooks/useSfx";
import { useCanvasKnowledge } from "@/hooks/useCanvasKnowledge";
import { useSmartLinks } from "@/hooks/useSmartLinks";
import { EmoRobot } from "./EmoRobot";

export function NeuralInterface() {
  const { addElement, updateElement, addConnection, activeCanvas } = useCanvas();
  const { playClick, playConfirm, speak, playRobotBeep, playGiggle, playHappyBeep, playSadBeep, playExcitedBeep, playCuriousBeep } = useSfx();
  const { askQuestion } = useCanvasKnowledge();
  const [localMessages, setLocalMessages] = useState<{role: string; content: string; source?: string}[]>([]);

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
  // Initialize Smart Links (Local AI)
  useSmartLinks();

  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputInternal, setInputInternal] = useState("");
  const recognitionRef = useRef<any>(null);
  const spokenMessageIds = useRef<Set<string>>(new Set());
  const shouldListenRef = useRef(false); // Track if we WANT to be listening
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [showMicSettings, setShowMicSettings] = useState(false);

  // Enumerate available microphones
  useEffect(() => {
    async function getMicrophones() {
      try {
        // Request permission first to get device labels
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter(d => d.kind === 'audioinput');
        setMicrophones(mics);
        if (mics.length > 0 && !selectedMic) {
          setSelectedMic(mics[0].deviceId);
        }
        console.log('[NeuralInterface] Available microphones:', mics.map(m => m.label));
      } catch (err) {
        console.error('[NeuralInterface] Failed to get microphones:', err);
      }
    }
    getMicrophones();
  }, []);

  // Listen for mic settings toggle from SystemBar
  useEffect(() => {
    const handleToggle = () => setShowMicSettings(prev => !prev);
    window.addEventListener('toggle-mic-settings', handleToggle);
    return () => window.removeEventListener('toggle-mic-settings', handleToggle);
  }, []);

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
          
          if (event.error === 'aborted' || event.error === 'not-allowed') {
            setIsListening(false);
            shouldListenRef.current = false;
          }
          

          if (event.error === 'network') {
               console.error("[NeuralInterface] Network error. If using Brave/Safari, check Privacy shields or blocking.");
               shouldListenRef.current = false; 
               setIsListening(false);
               setInputInternal("⚠️ Browser blocked mic (try allowing or use Chrome)");
               setTimeout(() => setInputInternal(""), 5000);
          }
          // 'no-speech' is common in continuous mode, we just let it restart via onend
        };

        recognition.onresult = (event: any) => {
          const result = event.results[event.results.length - 1];
          const transcript = result[0].transcript;
          
          // Show interim transcript in input field for visual feedback
          setInputInternal(transcript);
          
          if (result.isFinal) {
            console.log("[NeuralInterface] Final transcript:", transcript);
            const lowerTranscript = transcript.toLowerCase().trim();

            // Voice Command Check: "Beepo"
            if (lowerTranscript.startsWith("beepo")) {
                const command = lowerTranscript.replace(/^beepo\s*/, "").trim();
                console.log("[Voice Command]", command);
                
                if (command.includes("zoom in")) {
                    window.dispatchEvent(new CustomEvent('canvas-action', { detail: { type: 'zoomIn' } }));
                    speak("Zooming in.");
                } else if (command.includes("zoom out")) {
                    window.dispatchEvent(new CustomEvent('canvas-action', { detail: { type: 'zoomOut' } }));
                    speak("Zooming out.");
                } else if (command.startsWith("create note") || command.startsWith("create a note")) {
                    const content = command.replace(/create (a )?note/, "").trim();
                    if (content) {
                        window.dispatchEvent(new CustomEvent('canvas-action', { detail: { type: 'createNode', content } }));
                        speak(`Creating note: ${content}`);
                    } else {
                        speak("What should the note say?");
                    }
                } else {
                    speak("Command not recognized.");
                }
                setInputInternal(""); // Clear input
                return; // Don't send to chat
            }

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
  }, [sendMessage, playConfirm, speak]);

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
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                // Fixed position above the robot (robot is at bottom-36 right-6)
                className="fixed bottom-64 right-6 w-80 z-[120] font-mono"
            >
                {/* Chat History Panel */}
                <div className="mb-4 bg-[#0a0b10] border border-[#39ff14]/30 p-2 rounded-lg h-60 overflow-y-auto custom-scrollbar flex flex-col gap-2 shadow-inner">
                    {localMessages.length === 0 && messages.length === 0 && (
                        <div className="text-[#39ff14]/30 text-[10px] text-center mt-20 font-mono">
                            // NO_DATA_STREAM<br/>
                            // WAITING_FOR_INPUT...
                        </div>
                    )}
                    
                    {/* Show local messages first */}
                    {localMessages.map((m, i) => (
                        <motion.div 
                            key={`local-${i}`}
                            initial={{ opacity: 0, x: m.role === 'user' ? 10 : -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`p-2 rounded max-w-[90%] text-xs relative ${
                                m.role === 'user' 
                                    ? 'ml-auto bg-[#39ff14]/10 border border-[#39ff14]/40 text-[#39ff14]'
                                    : 'bg-[#222] border border-[#39ff14]/20 text-[#39ff14]/80'
                            }`}
                        >
                            <div className="whitespace-pre-wrap break-words overflow-hidden">{m.content}</div>
                            <div className="absolute -bottom-3 right-0 text-[8px] opacity-40 font-bold uppercase tracking-wider">
                                {m.role === 'user' ? 'USER_CMD' : m.source || 'AI_CORE'}
                            </div>
                        </motion.div>
                    ))}
                    
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
                            <div className="whitespace-pre-wrap break-words overflow-hidden">
                              {(m as any).content || 
                               (m as any).parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') ||
                               ''}
                            </div>
                            
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
                            
                            const query = inputInternal.trim();
                            setInputInternal("");
                            
                            // Add user message to local display
                            setLocalMessages(prev => [...prev, { role: 'user', content: query }]);
                            
                            // Try local knowledge first
                            const localAnswer = askQuestion(query);
                            if (localAnswer) {
                              // Local answer found - no API call needed!
                              playHappyBeep?.();
                              setLocalMessages(prev => [...prev, { 
                                role: 'assistant', 
                                content: localAnswer.text, 
                                source: '⚡ LOCAL' 
                              }]);
                              speak(localAnswer.text);
                            } else {
                              // No local answer - fall back to AI
                              sendMessage({ role: 'user', content: query });
                            }
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
      {/* Mic Settings Popover */}
      <AnimatePresence>
        {showMicSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-14 right-[320px] z-[140] bg-[#0a0b10]/95 border border-[#eca013]/50 rounded-lg p-3 w-64 shadow-[0_0_20px_rgba(236,160,19,0.2)] backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#eca013] text-xs font-bold tracking-wide">MIC SETTINGS</span>
              <button 
                onClick={() => setShowMicSettings(false)}
                className="text-[#eca013]/60 hover:text-[#eca013] text-xs"
              >
                ✕
              </button>
            </div>
            
            <select
              value={selectedMic}
              onChange={(e) => setSelectedMic(e.target.value)}
              className="w-full bg-[#0a0b10] border border-[#eca013]/30 rounded px-2 py-1.5 text-xs text-[#eca013] focus:outline-none focus:border-[#eca013]"
            >
              {microphones.length === 0 ? (
                <option value="">No microphones found</option>
              ) : (
                microphones.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                  </option>
                ))
              )}
            </select>
            
            <div className="mt-2 text-[8px] text-[#eca013]/40">
              {microphones.length} device(s) available
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* EMO-style Robot Trigger */}
      <EmoRobot
        isListening={isListening}
        isLoading={isLoading}
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        onMotivate={(msg) => speak(msg)}
        onBeep={playRobotBeep}
        onGiggle={playGiggle}
        onHappyBeep={playHappyBeep}
      />
    </>
  );
}
