import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus, busEmit } from '../../core/EventBus';

/**
 * ⏱️ PRESSURE TIMER
 * ═══════════════════════════════════════════════════════════════════════════
 * The "Video Game" pressure element. Creates urgency and excitement.
 * 
 * Features:
 * - Countdown with visual acceleration
 * - Color transitions (Green -> Yellow -> Red)
 * - Screen pulse at critical moments
 * - Auto-fold on expiration (optional)
 * - Bonus XP for fast decisions
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface PressureTimerProps {
    duration: number; // in seconds
    isActive: boolean;
    onExpire?: () => void;
    onFastDecision?: (timeRemaining: number) => void;
    showBonus?: boolean;
}

export const PressureTimer: React.FC<PressureTimerProps> = ({
    duration,
    isActive,
    onExpire,
    onFastDecision,
    showBonus = true
}) => {
    const [timeLeft, setTimeLeft] = useState(duration);
    const [bonusMultiplier, setBonusMultiplier] = useState<number | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const hasWarnedRef = useRef(false);
    const hasCriticalRef = useRef(false);

    const percentRemaining = (timeLeft / duration) * 100;

    // Get color based on time remaining
    const getColor = () => {
        if (percentRemaining > 60) return { bg: '#22C55E', text: 'text-green-400', glow: 'shadow-[0_0_20px_rgba(34,197,94,0.5)]' };
        if (percentRemaining > 30) return { bg: '#EAB308', text: 'text-yellow-400', glow: 'shadow-[0_0_25px_rgba(234,179,8,0.6)]' };
        return { bg: '#EF4444', text: 'text-red-400', glow: 'shadow-[0_0_30px_rgba(239,68,68,0.7)]' };
    };

    const color = getColor();

    // Calculate bonus multiplier for fast decisions
    const calculateBonus = useCallback((remaining: number) => {
        const percentUsed = ((duration - remaining) / duration) * 100;
        if (percentUsed <= 20) return 2.0;  // Super fast
        if (percentUsed <= 40) return 1.5;  // Fast
        if (percentUsed <= 60) return 1.25; // Normal
        return 1.0; // Slow
    }, [duration]);

    // Reset timer when activated
    useEffect(() => {
        if (isActive) {
            setTimeLeft(duration);
            hasWarnedRef.current = false;
            hasCriticalRef.current = false;
        }
    }, [isActive, duration]);

    // Countdown logic
    useEffect(() => {
        if (!isActive) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        intervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                const newTime = prev - 0.1;

                // Warning at 30%
                if (newTime <= duration * 0.3 && !hasWarnedRef.current) {
                    hasWarnedRef.current = true;
                    busEmit.timerWarning();
                }

                // Critical at 15%
                if (newTime <= duration * 0.15 && !hasCriticalRef.current) {
                    hasCriticalRef.current = true;
                    busEmit.timerCritical();
                    busEmit.screenShake('light');
                }

                // Expired
                if (newTime <= 0) {
                    busEmit.timerExpired();
                    onExpire?.();
                    return 0;
                }

                return newTime;
            });
        }, 100);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive, duration, onExpire]);

    // Show bonus when decision is made
    const handleDecisionMade = useCallback(() => {
        if (!isActive) return;

        const bonus = calculateBonus(timeLeft);
        if (bonus > 1 && showBonus) {
            setBonusMultiplier(bonus);
            setTimeout(() => setBonusMultiplier(null), 1500);
        }
        onFastDecision?.(timeLeft);
    }, [isActive, timeLeft, calculateBonus, showBonus, onFastDecision]);

    // Listen for decision events
    useEffect(() => {
        const unsub = eventBus.on('DECISION_CORRECT', handleDecisionMade);
        return unsub;
    }, [handleDecisionMade]);

    if (!isActive) return null;

    return (
        <div className="relative">
            {/* TIMER RING */}
            <motion.div
                animate={percentRemaining <= 30 ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.5, repeat: percentRemaining <= 30 ? Infinity : 0 }}
                className={`relative w-20 h-20 rounded-full bg-[#18191A] border-4 flex items-center justify-center ${color.glow}`}
                style={{ borderColor: color.bg }}
            >
                {/* Progress Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        stroke="#3E4042"
                        strokeWidth="4"
                    />
                    <motion.circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        stroke={color.bg}
                        strokeWidth="4"
                        strokeLinecap="round"
                        initial={{ pathLength: 1 }}
                        animate={{ pathLength: percentRemaining / 100 }}
                        transition={{ duration: 0.1 }}
                        style={{
                            strokeDasharray: '226.2',
                            strokeDashoffset: 0
                        }}
                    />
                </svg>

                {/* Time Display */}
                <div className={`text-center z-10 ${color.text}`}>
                    <div className="text-2xl font-black font-mono">
                        {Math.ceil(timeLeft)}
                    </div>
                    <div className="text-[8px] uppercase tracking-wider opacity-70">SEC</div>
                </div>

                {/* Critical Pulse */}
                {percentRemaining <= 15 && (
                    <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                        className="absolute inset-0 rounded-full border-4 border-red-500"
                    />
                )}
            </motion.div>

            {/* BONUS MULTIPLIER POPUP */}
            <AnimatePresence>
                {bonusMultiplier !== null && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.5 }}
                        animate={{ opacity: 1, y: -30, scale: 1 }}
                        exit={{ opacity: 0, y: -50, scale: 0.5 }}
                        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
                    >
                        <div className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full text-white text-sm font-black shadow-lg">
                            ⚡ {bonusMultiplier}x FAST!
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/**
 * 🎯 Mini Timer for HUD
 */
export const MiniPressureTimer: React.FC<{ timeLeft: number; duration: number }> = ({ timeLeft, duration }) => {
    const percent = (timeLeft / duration) * 100;
    const isLow = percent <= 30;

    return (
        <motion.div
            animate={isLow ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.3, repeat: isLow ? Infinity : 0 }}
            className={`
                flex items-center gap-2 px-3 py-1 rounded-full border
                ${isLow ? 'bg-red-500/20 border-red-500/50' : 'bg-[#242526] border-[#3E4042]'}
            `}
        >
            <div className={`w-2 h-2 rounded-full ${isLow ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
            <span className={`text-sm font-mono font-bold ${isLow ? 'text-red-400' : 'text-white'}`}>
                {Math.ceil(timeLeft)}s
            </span>
        </motion.div>
    );
};
