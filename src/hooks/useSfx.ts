import { useCallback, useEffect, useRef } from 'react';

export const useSfx = () => {
    const audioCtx = useRef<AudioContext | null>(null);

    // Lazy Init to handle Autoplay Policy
    const initAudio = useCallback(() => {
        if (typeof window !== 'undefined' && !audioCtx.current) {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            audioCtx.current = new Ctx();
        }
        if (audioCtx.current?.state === 'suspended') {
            audioCtx.current.resume();
        }
    }, []);

    const activeOscillators = useRef<OscillatorNode[]>([]);

    const playTone = useCallback((freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
        initAudio();
        if (!audioCtx.current) return;
        const ctx = audioCtx.current;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
    }, [initAudio]);

    const playClick = useCallback(() => {
        playTone(800, 'square', 0.05, 0.05);
    }, [playTone]);

    const playHover = useCallback(() => {
        playTone(200, 'sine', 0.02, 0.02);
    }, [playTone]);

    const playConfirm = useCallback(() => {
        initAudio();
        if (!audioCtx.current) return;
        const ctx = audioCtx.current;
        
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.3);
    }, [initAudio]);

    const playConnect = useCallback(() => {
        initAudio();
        if (!audioCtx.current) return;
        const ctx = audioCtx.current;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.2);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.linearRampToValueAtTime(2000, now + 0.2);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(now + 0.4);
    }, [initAudio]);

    const playTyping = useCallback(() => {
         // Mechanical Switch Sound (Thocc-ish)
         initAudio();
         if (!audioCtx.current) return;
         const ctx = audioCtx.current;
         const now = ctx.currentTime;

         // 1. High Click (Switch Leaf)
         const osc = ctx.createOscillator();
         const gain = ctx.createGain();
         osc.type = 'triangle'; // Softer than square
         osc.frequency.setValueAtTime(2000, now);
         osc.frequency.exponentialRampToValueAtTime(1000, now + 0.05);
         gain.gain.setValueAtTime(0.05, now);
         gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
         osc.connect(gain);
         gain.connect(ctx.destination);
         osc.start();
         osc.stop(now + 0.05);

         // 2. Low Thump (Bottom Out)
         const osc2 = ctx.createOscillator();
         const gain2 = ctx.createGain();
         osc2.type = 'sine';
         osc2.frequency.setValueAtTime(200, now);
         osc2.frequency.exponentialRampToValueAtTime(50, now + 0.1);
         gain2.gain.setValueAtTime(0.15, now); // Louder low end
         gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
         osc2.connect(gain2);
         gain2.connect(ctx.destination);
         osc2.start();
         osc2.stop(now + 0.1);
    }, [initAudio]);

    const playError = useCallback(() => {
        playTone(150, 'sawtooth', 0.2, 0.05);
    }, [playTone]);

    const playBoot = useCallback(() => {
        initAudio();
        if (!audioCtx.current) return;
        const ctx = audioCtx.current;
        const now = ctx.currentTime;

        // Power Up Sweep (Matches 2.5s Loading)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 2.5); // Slower rise

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(100, now);
        filter.frequency.linearRampToValueAtTime(8000, now + 2.5);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 2.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(now + 2.6);
    }, [initAudio]);

    const playPowerDown = useCallback(() => {
        initAudio();
        if (!audioCtx.current) return;
        const ctx = audioCtx.current;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 1.5);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(5000, now);
        filter.frequency.linearRampToValueAtTime(100, now + 1.5);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 1.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(now + 1.6);
    }, [initAudio]);

    // Robotic beep speak - R2D2 style chirps based on text length
    const speak = useCallback((text: string) => {
        initAudio();
        if (!audioCtx.current) return;
        const ctx = audioCtx.current;
        
        // Generate beeps based on word count
        const words = text.split(' ').length;
        const beepCount = Math.min(words, 15); // Max 15 beeps
        
        for (let i = 0; i < beepCount; i++) {
            const delay = i * 0.12; // 120ms between beeps
            const now = ctx.currentTime + delay;
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            // Randomize frequency for variety (300-1200 Hz)
            const baseFreq = 400 + Math.random() * 800;
            osc.type = Math.random() > 0.5 ? 'square' : 'sawtooth';
            osc.frequency.setValueAtTime(baseFreq, now);
            
            // Frequency slide for expressiveness
            const slide = (Math.random() - 0.5) * 400;
            osc.frequency.linearRampToValueAtTime(baseFreq + slide, now + 0.08);
            
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(now);
            osc.stop(now + 0.1);
        }
    }, [initAudio]);

    const playMerge = useCallback(() => {
        initAudio();
        if (!audioCtx.current) return;
        const ctx = audioCtx.current;
        const now = ctx.currentTime;

        // "Combine" Sound - Converging sine waves
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(200, now);
        osc1.frequency.linearRampToValueAtTime(440, now + 0.3);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(600, now);
        osc2.frequency.linearRampToValueAtTime(440, now + 0.3);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(now + 0.4);
        osc2.stop(now + 0.4);
    }, [initAudio]);

    const playTrash = useCallback(() => {
        initAudio();
        if (!audioCtx.current) return;
        const ctx = audioCtx.current;
        const now = ctx.currentTime;

        // "De-rez" Sound - White noise burst downsampled
        const bufferSize = ctx.sampleRate * 0.2; // 0.2 seconds
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.2);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
    }, [initAudio]);

    const playUngroup = useCallback(() => {
        initAudio();
        if (!audioCtx.current) return;
        const ctx = audioCtx.current;
        const now = ctx.currentTime;

        // "Separate" Sound - Diverging sine waves (Reverse Merge)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc1.frequency.linearRampToValueAtTime(200, now + 0.3);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(440, now);
        osc2.frequency.linearRampToValueAtTime(600, now + 0.3);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(now + 0.4);
        osc2.stop(now + 0.4);
    }, [initAudio]);

    return { playClick, playHover, playConfirm, playConnect, playTyping, playError, playBoot, playPowerDown, speak, playMerge, playUngroup, playTrash };
};
