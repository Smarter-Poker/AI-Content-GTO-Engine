import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 💥 FEEDBACK BURST
 * ═══════════════════════════════════════════════════════════════════════════
 * Visual feedback explosions for correct/incorrect decisions.
 * 
 * Design:
 * - GREEN: Radial burst + floating "+XP" text
 * - RED: Screen shake + vignette pulse
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type FeedbackType = 'CORRECT' | 'INCORRECT' | 'STREAK' | 'COMBO' | null;

interface FeedbackBurstProps {
    type: FeedbackType;
    xpAmount?: number;
    streakCount?: number;
    comboName?: string;
    onComplete?: () => void;
}

export const FeedbackBurst: React.FC<FeedbackBurstProps> = ({
    type,
    xpAmount = 0,
    streakCount = 0,
    comboName,
    onComplete
}) => {
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        if (type) {
            setIsActive(true);
            const timer = setTimeout(() => {
                setIsActive(false);
                onComplete?.();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [type, onComplete]);

    if (!type) return null;

    return (
        <AnimatePresence>
            {isActive && (
                <>
                    {/* CORRECT: Green Radial Burst */}
                    {type === 'CORRECT' && (
                        <>
                            {/* Edge Glow */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 0.8, 0] }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className="fixed inset-0 pointer-events-none z-[100]"
                                style={{
                                    boxShadow: 'inset 0 0 100px 30px rgba(34, 197, 94, 0.4)',
                                }}
                            />

                            {/* XP Float */}
                            <motion.div
                                initial={{ opacity: 0, y: 50, scale: 0.5 }}
                                animate={{ opacity: [0, 1, 1, 0], y: [50, 0, -20, -50], scale: [0.5, 1.2, 1, 0.8] }}
                                transition={{ duration: 1.2, ease: 'easeOut' }}
                                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] pointer-events-none"
                            >
                                <div className="text-center">
                                    <div className="text-5xl font-black text-green-400 drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]">
                                        +{xpAmount} XP
                                    </div>
                                    {streakCount >= 3 && (
                                        <div className="text-xl font-bold text-yellow-400 mt-2 animate-pulse">
                                            🔥 {streakCount} STREAK
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </>
                    )}

                    {/* INCORRECT: Red Vignette + Shake */}
                    {type === 'INCORRECT' && (
                        <>
                            {/* Red Vignette */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 0.6, 0.3, 0] }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="fixed inset-0 pointer-events-none z-[100]"
                                style={{
                                    background: 'radial-gradient(ellipse at center, transparent 40%, rgba(239, 68, 68, 0.4) 100%)',
                                }}
                            />

                            {/* Streak Lost Text */}
                            {streakCount > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 1.5 }}
                                    animate={{ opacity: [0, 1, 0], scale: [1.5, 1, 0.8] }}
                                    transition={{ duration: 1, ease: 'easeOut' }}
                                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] pointer-events-none"
                                >
                                    <div className="text-3xl font-bold text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                                        STREAK LOST
                                    </div>
                                </motion.div>
                            )}
                        </>
                    )}

                    {/* STREAK BONUS: Gold Celebration */}
                    {type === 'STREAK' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.3, 1, 0.8] }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                            className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[102] pointer-events-none"
                        >
                            <div className="text-center">
                                <div className="text-6xl mb-2">🔥</div>
                                <div className="text-4xl font-black text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]">
                                    {streakCount} STREAK!
                                </div>
                                <div className="text-2xl font-bold text-yellow-200 mt-2">
                                    +{xpAmount} BONUS XP
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* COMBO: Level Up Text */}
                    {type === 'COMBO' && comboName && (
                        <motion.div
                            initial={{ opacity: 0, x: -100 }}
                            animate={{ opacity: [0, 1, 1, 0], x: [-100, 0, 0, 100] }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                            className="fixed top-20 left-1/2 -translate-x-1/2 z-[102] pointer-events-none"
                        >
                            <div className={`text-3xl font-black uppercase tracking-widest ${comboName === 'PERFECT' ? 'text-purple-400' :
                                    comboName === 'EXCELLENT' ? 'text-yellow-400' :
                                        comboName === 'GREAT' ? 'text-green-400' :
                                            'text-blue-400'
                                }`}>
                                {comboName}!
                            </div>
                        </motion.div>
                    )}
                </>
            )}
        </AnimatePresence>
    );
};

/**
 * Hook for managing feedback state
 */
export const useFeedback = () => {
    const [feedback, setFeedback] = useState<{
        type: FeedbackType;
        xpAmount: number;
        streakCount: number;
        comboName?: string;
    }>({ type: null, xpAmount: 0, streakCount: 0 });

    const triggerCorrect = (xp: number, streak: number, combo?: string) => {
        setFeedback({ type: 'CORRECT', xpAmount: xp, streakCount: streak, comboName: combo });
    };

    const triggerIncorrect = (lostStreak: number) => {
        setFeedback({ type: 'INCORRECT', xpAmount: 0, streakCount: lostStreak });
    };

    const triggerStreak = (streak: number, bonusXP: number) => {
        setFeedback({ type: 'STREAK', xpAmount: bonusXP, streakCount: streak });
    };

    const triggerCombo = (comboName: string) => {
        setFeedback({ type: 'COMBO', xpAmount: 0, streakCount: 0, comboName });
    };

    const clearFeedback = () => {
        setFeedback({ type: null, xpAmount: 0, streakCount: 0 });
    };

    return {
        feedback,
        triggerCorrect,
        triggerIncorrect,
        triggerStreak,
        triggerCombo,
        clearFeedback
    };
};
