"use client";

import { useState, useEffect, useRef } from "react";
import { useSfx } from "@/hooks/useSfx";

/* --- WORDS DICTIONARY --- */
const EASY_WORDS = ["cmd", "run", "log", "git", "npm", "box", "net", "fix", "bug", "app", "web", "dev", "api", "css", "src", "bin", "exe", "jar", "zip", "tar"];
const MEDIUM_WORDS = ["react", "node", "build", "deploy", "server", "client", "pixel", "vector", "socket", "script", "update", "config", "module", "kernel", "system", "buffer", "memory"];
const HARD_WORDS = ["function", "interface", "variable", "component", "database", "terminal", "protocol", "algorithm", "encryption", "middleware", "framework", "asynchronous", "deployment", "repository"];

interface Enemy {
    id: string;
    text: string;
    remaining: string;
    x: number;
    y: number;
    speed: number;
    angle: number; // Angle to center
}

interface Projectile {
    id: string;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    color: string;
    createdAt: number;
}

interface Particle {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
}

export function TypingDefenseGame({ onClose }: { onClose: () => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<"MENU" | "PLAYING" | "GAMEOVER">("MENU");
    const [score, setScore] = useState(0);
    const [wave, setWave] = useState(1);
    const [health, setHealth] = useState(100);
    
    // Game State Refs (for Loop)
    const enemiesRef = useRef<Enemy[]>([]);
    const projectilesRef = useRef<Projectile[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const targetEnemyIdRef = useRef<string | null>(null);
    const frameRef = useRef<number>(0);
    const lastSpawnRef = useRef<number>(0);
    const scoreRef = useRef(0);
    
    const { playClick, playConfirm, playError, playPowerDown } = useSfx(); // Reuse playPowerDown for shots/explosions if needed? Or we need new SFX hooks. 
    // We'll use simple clicks for now.

    const spawnEnemy = (width: number, height: number, difficultyMultiplier: number) => {
        const side = Math.floor(Math.random() * 4); // 0: Top, 1: Right, 2: Bottom, 3: Left
        let x = 0, y = 0;
        const PADDING = 50;
        
        if (side === 0) { x = Math.random() * width; y = -PADDING; }
        else if (side === 1) { x = width + PADDING; y = Math.random() * height; }
        else if (side === 2) { x = Math.random() * width; y = height + PADDING; }
        else { x = -PADDING; y = Math.random() * height; }

        let wordList = EASY_WORDS;
        if (wave > 2) wordList = [...wordList, ...MEDIUM_WORDS];
        if (wave > 4) wordList = [...wordList, ...HARD_WORDS];
        
        const text = wordList[Math.floor(Math.random() * wordList.length)];
        
        // Calculate angle to center
        const centerX = width / 2;
        const centerY = height / 2;
        const angle = Math.atan2(centerY - y, centerX - x);

        enemiesRef.current.push({
            id: Math.random().toString(36).substr(2, 9),
            text: text,
            remaining: text,
            x,
            y,
            speed: (0.5 + (wave * 0.1)) * difficultyMultiplier,
            angle
        });
    };

    const spawnParticles = (x: number, y: number, color: string, count: number) => {
        for(let i=0; i<count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            particlesRef.current.push({
                id: Math.random().toString(),
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color
            });
        }
    };

    // Game Loop
    useEffect(() => {
        if (gameState !== "PLAYING") return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Resize Helper
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const loop = (time: number) => {
            if (!canvas) return;
            const width = canvas.width;
            const height = canvas.height;
            const centerX = width / 2;
            const centerY = height / 2;

            // Clear
            ctx.fillStyle = "#0a0b10";
            ctx.fillRect(0, 0, width, height);
            
            // Grid Background
            ctx.strokeStyle = "rgba(236, 160, 19, 0.1)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            for(let x=0; x<width; x+=50) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
            for(let y=0; y<height; y+=50) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
            ctx.stroke();

            // Spawning Logic
            if (time - lastSpawnRef.current > Math.max(800, 2000 - (wave * 100))) {
                spawnEnemy(width, height, 1);
                lastSpawnRef.current = time;
            }

            // Update & Draw Particles
            particlesRef.current = particlesRef.current.filter(p => p.life > 0);
            particlesRef.current.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.02;
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, 2, 2);
                ctx.globalAlpha = 1.0;
            });

            // Update & Draw Projectiles
            projectilesRef.current = projectilesRef.current.filter(p => {
                const dx = p.targetX - p.x;
                const dy = p.targetY - p.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                return dist > 10 && (Date.now() - p.createdAt < 1000); // Remove if close or old
            });
            
            projectilesRef.current.forEach(p => {
                const dx = p.targetX - p.x;
                const dy = p.targetY - p.y;
                const angle = Math.atan2(dy, dx);
                const speed = 15;
                p.x += Math.cos(angle) * speed;
                p.y += Math.sin(angle) * speed;
                
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - Math.cos(angle)*10, p.y - Math.sin(angle)*10);
                ctx.stroke();
            });

            // Update & Draw Enemies
            const enemiesToRemove: string[] = [];
            
            // Sort enemies by Y for simpler rendering overlap, but logic matters more
            enemiesRef.current.forEach(enemy => {
                // Move
                enemy.x += Math.cos(enemy.angle) * enemy.speed;
                enemy.y += Math.sin(enemy.angle) * enemy.speed;
                
                // Collision with turret
                const distToCenter = Math.sqrt((centerX - enemy.x)**2 + (centerY - enemy.y)**2);
                if (distToCenter < 50) {
                    setHealth(h => {
                         const next = h - 10;
                         if (next <= 0) setGameState("GAMEOVER");
                         return next;
                    });
                    enemiesToRemove.push(enemy.id);
                    spawnParticles(centerX, centerY, "#ff0000", 20); // Red Hit
                    playError();
                }

                // Draw Text
                ctx.font = "bold 14px monospace";
                // Background box for text clarity
                const textWidth = ctx.measureText(enemy.text).width;
                ctx.fillStyle = "rgba(10, 11, 16, 0.8)";
                ctx.fillRect(enemy.x - textWidth/2 - 4, enemy.y - 20, textWidth + 8, 24);
                
                // Highlight typed part
                const typed = enemy.text.slice(0, enemy.text.length - enemy.remaining.length);
                const remaining = enemy.remaining;
                
                const startX = enemy.x - textWidth / 2;
                
                // Typed (Green)
                if (enemy.id === targetEnemyIdRef.current) {
                    ctx.fillStyle = "#39ff14";
                } else {
                    ctx.fillStyle = "#eca013"; // Default Gold
                }
                
                if (typed) {
                    ctx.fillStyle = "#39ff14"; // Green for completed
                    ctx.fillText(typed, startX, enemy.y);
                    const typedWidth = ctx.measureText(typed).width;
                     // Remaining (Gold or Target Color)
                    ctx.fillStyle = enemy.id === targetEnemyIdRef.current ? "#fff" : "#eca013";
                    ctx.fillText(remaining, startX + typedWidth, enemy.y);
                } else {
                    ctx.fillStyle = enemy.id === targetEnemyIdRef.current ? "#fff" : "#eca013";
                    ctx.fillText(enemy.text, startX, enemy.y);
                }
                
                // Draw lead line if targeted
                if (enemy.id === targetEnemyIdRef.current) {
                    ctx.strokeStyle = "rgba(57, 255, 20, 0.3)";
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY);
                    ctx.lineTo(enemy.x, enemy.y);
                    ctx.stroke();
                }
            });
            
            // Remove colliding
            if (enemiesToRemove.length > 0) {
                 enemiesRef.current = enemiesRef.current.filter(e => !enemiesToRemove.includes(e.id));
                 // Reset target if cleaned
                 if (enemiesToRemove.includes(targetEnemyIdRef.current || "")) {
                     targetEnemyIdRef.current = null;
                 }
            }

            // Draw Turret (Center)
            ctx.fillStyle = "#0a0b10";
            ctx.strokeStyle = "#eca013";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Turret Barrel (Point to target or mouse?) Point to target is cooler
            let turretAngle = -Math.PI / 2; // Up
            if (targetEnemyIdRef.current) {
                const target = enemiesRef.current.find(e => e.id === targetEnemyIdRef.current);
                if (target) {
                    turretAngle = Math.atan2(target.y - centerY, target.x - centerX);
                }
            }
            
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(turretAngle);
            ctx.fillStyle = "#eca013";
            ctx.fillRect(0, -4, 30, 8); // Barrel
            ctx.restore();

            frameRef.current = requestAnimationFrame(loop);
        };

        frameRef.current = requestAnimationFrame(loop);

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(frameRef.current);
        };
    }, [gameState, wave, playError]);

    // Input Handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameState !== "PLAYING") return;
            const char = e.key.toLowerCase();
            
            // If already targeting, check match
            if (targetEnemyIdRef.current) {
                const target = enemiesRef.current.find(en => en.id === targetEnemyIdRef.current);
                if (target) {
                    if (target.remaining.startsWith(char)) {
                        // HIT
                        target.remaining = target.remaining.slice(1);
                        playClick(); // Laser sound placeholder
                        
                        // Spawn Projectile
                        projectilesRef.current.push({
                            id: Math.random().toString(),
                            x: window.innerWidth/2,
                            y: window.innerHeight/2,
                            targetX: target.x,
                            targetY: target.y,
                            color: "#39ff14",
                            createdAt: Date.now()
                        });

                        if (target.remaining.length === 0) {
                            // Destroyed
                            spawnParticles(target.x, target.y, "#eca013", 10);
                            enemiesRef.current = enemiesRef.current.filter(en => en.id !== target.id);
                            targetEnemyIdRef.current = null;
                            setScore(s => s + 10);
                            scoreRef.current += 10;
                            
                            // Wave Progression
                            if (scoreRef.current > wave * 100) {
                                setWave(w => w + 1);
                            }
                            playConfirm();
                        }
                    } else {
                        // Miss / Wrong Key
                        // Maybe play error sound?
                    }
                } else {
                    // Target lost (destroyed by collision?)
                    targetEnemyIdRef.current = null;
                }
            } else {
                // Find new target
                // Find enemies starting with char
                // Prioritize closest?
                const width = window.innerWidth; 
                const height = window.innerHeight;
                const centerX = width/2; 
                const centerY = height/2;
                
                const candidates = enemiesRef.current.filter(e => e.remaining.startsWith(char));
                if (candidates.length > 0) {
                    // Sort by distance
                    candidates.sort((a,b) => {
                         const distA = (a.x - centerX)**2 + (a.y - centerY)**2;
                         const distB = (b.x - centerX)**2 + (b.y - centerY)**2;
                         return distA - distB;
                    });
                    
                    const newTarget = candidates[0];
                    targetEnemyIdRef.current = newTarget.id;
                    
                    // Hit logic details
                    newTarget.remaining = newTarget.remaining.slice(1);
                    playClick();
                    
                     // Spawn Projectile
                        projectilesRef.current.push({
                            id: Math.random().toString(),
                            x: centerX,
                            y: centerY,
                            targetX: newTarget.x,
                            targetY: newTarget.y,
                            color: "#39ff14",
                            createdAt: Date.now()
                        });

                    if (newTarget.remaining.length === 0) {
                        spawnParticles(newTarget.x, newTarget.y, "#eca013", 10);
                        enemiesRef.current = enemiesRef.current.filter(en => en.id !== newTarget.id);
                        targetEnemyIdRef.current = null;
                        setScore(s => s + 10);
                        scoreRef.current += 10;
                        if (scoreRef.current > wave * 100) setWave(w => w + 1);
                        playConfirm();
                    }
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [gameState, playClick, playConfirm, wave]);

    const startGame = () => {
        setGameState("PLAYING");
        setScore(0);
        setHealth(100);
        setWave(1);
        enemiesRef.current = [];
        targetEnemyIdRef.current = null;
        projectilesRef.current = [];
        scoreRef.current = 0;
        playConfirm();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#0a0b10] text-[#eca013] font-mono flex flex-col">
            {/* Header / HUD */}
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none z-10">
                <div>
                     <div className="text-2xl font-bold tracking-widest">DEFENSE_MATRIX</div>
                     <div className="text-xs text-[#eca013]/50">WAVE: {wave} // SCORE: {score}</div>
                </div>
                <div className="text-right">
                    <div className="text-xl font-bold text-red-500">INTEGRITY: {health}%</div>
                    <div className="w-32 h-2 bg-red-900/30 mt-1 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 transition-all" style={{ width: `${health}%` }}></div>
                    </div>
                </div>
            </div>
            
            <button 
                onClick={onClose} 
                className="absolute top-4 right-1/2 translate-x-1/2 z-20 px-4 py-1 border border-[#eca013]/30 text-[#eca013]/50 hover:text-[#eca013] hover:border-[#eca013] rounded text-xs uppercase"
            >
                [ABORT_MISSION]
            </button>

            {gameState !== "PLAYING" && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0a0b10]/80 backdrop-blur-sm z-20">
                    <div className="text-center p-8 border border-[#eca013] bg-[#0a0b10] shadow-[0_0_50px_rgba(236,160,19,0.2)] rounded-lg max-w-md">
                        <h1 className="text-4xl font-bold mb-2 text-[#eca013] animate-pulse">
                            {gameState === "GAMEOVER" ? "SYSTEM_FAILURE" : "TYPING_DEFENSE"}
                        </h1>
                        <p className="text-sm text-[#eca013]/70 mb-8 max-w-xs mx-auto">
                            {gameState === "GAMEOVER" 
                                ? `FINAL_SCORE: ${score} // SECTOR_OVERRUN` 
                                : "Intercept incoming data packets by typing their content. Protect the core."
                            }
                        </p>
                        <button 
                            onClick={startGame}
                            className="px-8 py-3 bg-[#eca013] text-[#0a0b10] font-bold text-lg rounded hover:shadow-[0_0_20px_rgba(236,160,19,0.6)] transition-all uppercase tracking-widest"
                        >
                            {gameState === "GAMEOVER" ? "REBOOT_SYSTEM" : "INITIATE_LINK"}
                        </button>
                    </div>
                </div>
            )}

            <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair" />
        </div>
    );
}
