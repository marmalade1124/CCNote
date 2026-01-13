import { useCallback, useEffect, useRef } from 'react';

export const useSfx = () => {
    const audioCtx = useRef<AudioContext | null>(null);

    useEffect(() => {
        // Initialize Audio Context on user interaction usually, but here on mount (lazy init later)
        if (typeof window !== 'undefined') {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            audioCtx.current = new Ctx();
        }
        return () => {
            if (audioCtx.current) activeOscillators.current.forEach(o => o.stop());
        };
    }, []);

    const activeOscillators = useRef<OscillatorNode[]>([]);

    const playTone = useCallback((freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
        if (!audioCtx.current) return;
        const ctx = audioCtx.current;
        
        // Resume context if suspended (browser auto-play policy)
        if (ctx.state === 'suspended') ctx.resume();

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
        
        // Cleanup ref? 
        // We generally fire and forget for UI sounds.
    }, []);

    const playClick = useCallback(() => {
        // High pitched blip
        playTone(800, 'square', 0.05, 0.05);
    }, [playTone]);

    const playHover = useCallback(() => {
        // Very subtle tick
        playTone(200, 'sine', 0.02, 0.02);
    }, [playTone]);

    const playConfirm = useCallback(() => {
        // Ascending chime
        if (!audioCtx.current) return;
        const ctx = audioCtx.current;
        if (ctx.state === 'suspended') ctx.resume();
        
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
    }, []);

    const playError = useCallback(() => {
        playTone(150, 'sawtooth', 0.2, 0.05);
    }, [playTone]);

    const playConnect = useCallback(() => {
        // Sci-fi "Link" sound
         if (!audioCtx.current) return;
        const ctx = audioCtx.current;
        if (ctx.state === 'suspended') ctx.resume();

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
    }, []);

    return { playClick, playHover, playConfirm, playError, playConnect };
};
