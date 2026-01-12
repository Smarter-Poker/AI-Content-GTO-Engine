import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus } from '../../core/EventBus';

/**
 * 🎬 SCREEN EFFECTS MANAGER
 * ═══════════════════════════════════════════════════════════════════════════
 * Handles all full-screen visual effects for that AAA game feel.
 * 
 * Effects:
 * - Screen Shake (light, medium, heavy)
 * - Color Flash (green correct, red incorrect)
 * - Particle Bursts
 * - Edge Glow Pulses
 * - Celebration Explosions
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface ScreenEffectsProps {
    children: React.ReactNode;
}

export const ScreenEffectsProvider: React.FC<ScreenEffectsProps> = ({ children }) => {
    const [shake, setShake] = useState<'light' | 'medium' | 'heavy' | null>(null);
    const [flash, setFlash] = useState<{ color: string; duration: number } | null>(null);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [edgeGlow, setEdgeGlow] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Subscribe to bus events
    useEffect(() => {
        const unsubs = [
            eventBus.on('SCREEN_SHAKE', (e) => triggerShake(e.payload.intensity)),
            eventBus.on('SCREEN_FLASH', (e) => triggerFlash(e.payload.color, e.payload.duration)),
            eventBus.on('DECISION_CORRECT', () => {
                triggerFlash('#22C55E', 300);
                triggerEdgeGlow('#22C55E');
                spawnParticles('success');
            }),
            eventBus.on('DECISION_INCORRECT', () => {
                triggerFlash('#EF4444', 400);
                triggerShake('medium');
                triggerEdgeGlow('#EF4444');
            }),
            eventBus.on('STREAK_MILESTONE', () => {
                triggerFlash('#EAB308', 500);
                spawnParticles('gold');
            }),
            eventBus.on('CELEBRATION_TRIGGER', (e) => {
                triggerCelebration(e.payload.type);
            }),
            eventBus.on('TIMER_CRITICAL', () => {
                triggerEdgeGlow('#EF4444');
            })
        ];

        return () => unsubs.forEach(u => u());
    }, []);

    const triggerShake = (intensity: 'light' | 'medium' | 'heavy') => {
        setShake(intensity);
        setTimeout(() => setShake(null), 500);
    };

    const triggerFlash = (color: string, duration: number) => {
        setFlash({ color, duration });
        setTimeout(() => setFlash(null), duration);
    };

    const triggerEdgeGlow = (color: string) => {
        setEdgeGlow(color);
        setTimeout(() => setEdgeGlow(null), 800);
    };

    const spawnParticles = (type: 'success' | 'gold' | 'diamonds') => {
        const newParticles: Particle[] = [];
        const count = type === 'gold' ? 30 : 15;

        for (let i = 0; i < count; i++) {
            newParticles.push({
                id: `${Date.now()}_${i}`,
                x: 50 + (Math.random() - 0.5) * 30,
                y: 50 + (Math.random() - 0.5) * 20,
                emoji: type === 'gold' ? '⭐' : type === 'diamonds' ? '💎' : '✨',
                size: 12 + Math.random() * 20,
                duration: 1000 + Math.random() * 500
            });
        }

        setParticles(prev => [...prev, ...newParticles]);
        setTimeout(() => {
            setParticles(prev => prev.filter(p => !newParticles.includes(p)));
        }, 2000);
    };

    const triggerCelebration = (type: string) => {
        if (type === 'streak') {
            spawnParticles('gold');
            triggerFlash('#EAB308', 400);
            triggerShake('light');
        } else if (type === 'diamonds') {
            spawnParticles('diamonds');
            triggerFlash('#A855F7', 400);
        } else if (type === 'mastery') {
            spawnParticles('gold');
            spawnParticles('success');
            triggerFlash('#22C55E', 600);
            triggerShake('medium');
        }
    };

    const getShakeAnimation = () => {
        if (!shake) return {};
        const intensity = shake === 'heavy' ? 15 : shake === 'medium' ? 8 : 3;
        return {
            x: [0, -intensity, intensity, -intensity, intensity, 0],
            transition: { duration: 0.4 }
        };
    };

    return (
        <motion.div
            ref={containerRef}
            animate={getShakeAnimation()}
            className="relative w-full h-full overflow-hidden"
        >
            {children}

            {/* SCREEN FLASH */}
            <AnimatePresence>
                {flash && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: flash.duration / 1000 / 2 }}
                        className="fixed inset-0 pointer-events-none z-[500]"
                        style={{ backgroundColor: flash.color }}
                    />
                )}
            </AnimatePresence>

            {/* EDGE GLOW */}
            <AnimatePresence>
                {edgeGlow && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 pointer-events-none z-[499]"
                        style={{
                            boxShadow: `inset 0 0 100px 20px ${edgeGlow}50`
                        }}
                    />
                )}
            </AnimatePresence>

            {/* PARTICLES */}
            <AnimatePresence>
                {particles.map(particle => (
                    <motion.div
                        key={particle.id}
                        initial={{
                            left: `${particle.x}%`,
                            top: `${particle.y}%`,
                            scale: 0,
                            opacity: 1
                        }}
                        animate={{
                            top: `${particle.y - 30}%`,
                            scale: 1,
                            opacity: 0,
                            rotate: Math.random() * 360
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: particle.duration / 1000, ease: 'easeOut' }}
                        className="fixed pointer-events-none z-[501]"
                        style={{ fontSize: particle.size }}
                    >
                        {particle.emoji}
                    </motion.div>
                ))}
            </AnimatePresence>
        </motion.div>
    );
};

interface Particle {
    id: string;
    x: number;
    y: number;
    emoji: string;
    size: number;
    duration: number;
}

/**
 * 🎊 COMBO MULTIPLIER DISPLAY
 */
interface ComboDisplayProps {
    combo: number;
    multiplier: number;
    comboName: string;
}

export const ComboDisplay: React.FC<ComboDisplayProps> = ({ combo, multiplier, comboName }) => {
    if (combo < 3) return null;

    const getColor = () => {
        if (comboName === 'PERFECT') return 'from-purple-500 to-pink-500';
        if (comboName === 'EXCELLENT') return 'from-yellow-400 to-orange-500';
        if (comboName === 'GREAT') return 'from-green-400 to-emerald-500';
        return 'from-blue-400 to-cyan-500';
    };

    return (
        <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            className={`
                fixed top-24 right-8 z-[100]
                px-6 py-3 rounded-2xl
                bg-gradient-to-r ${getColor()}
                shadow-2xl
            `}
        >
            <div className="text-center">
                <motion.div
                    key={combo}
                    initial={{ scale: 1.5 }}
                    animate={{ scale: 1 }}
                    className="text-4xl font-black text-white drop-shadow-lg"
                >
                    {combo}x
                </motion.div>
                <div className="text-xs font-bold text-white/80 uppercase tracking-widest">
                    {comboName}
                </div>
                <div className="text-sm font-bold text-white mt-1">
                    +{Math.round((multiplier - 1) * 100)}% XP
                </div>
            </div>
        </motion.div>
    );
};

/**
 * 💥 DECISION RESULT SPLASH
 */
interface DecisionSplashProps {
    result: 'correct' | 'incorrect' | null;
    xp?: number;
}

export const DecisionSplash: React.FC<DecisionSplashProps> = ({ result, xp }) => {
    if (!result) return null;

    const isCorrect = result === 'correct';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-[600]"
        >
            <div className="text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                    className={`text-8xl mb-4 ${isCorrect ? 'drop-shadow-[0_0_30px_rgba(34,197,94,0.8)]' : 'drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]'}`}
                >
                    {isCorrect ? '✓' : '✗'}
                </motion.div>
                {isCorrect && xp && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl font-black text-green-400"
                    >
                        +{xp} XP
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};
