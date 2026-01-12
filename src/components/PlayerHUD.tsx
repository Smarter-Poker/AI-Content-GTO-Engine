/**
 * 📊 PLAYER HUD — REAL-TIME XP & CURRENCY DISPLAY
 * ═══════════════════════════════════════════════════════════════════════════
 * Top-bar HUD with spring-physics animated counters.
 * Components: XP, Diamonds, Daily Streak with heartbeat animation.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { usePlayerState } from '../providers/PlayerStateProvider';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface AnimatedCounterProps {
    value: number;
    prefix?: string;
    suffix?: string;
    color?: string;
    size?: 'sm' | 'md' | 'lg';
}

interface HUDItemProps {
    icon: string;
    label: string;
    value: number;
    color: string;
    glowColor: string;
    suffix?: string;
    isAnimating?: boolean;
    pulseOnChange?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎰 ANIMATED COUNTER — Spring Physics Number Display
// ═══════════════════════════════════════════════════════════════════════════════

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
    value,
    prefix = '',
    suffix = '',
    color = '#F8FAFC',
    size = 'md'
}) => {
    const [displayValue, setDisplayValue] = useState(value);
    const [isIncreasing, setIsIncreasing] = useState(false);
    const prevValue = useRef(value);

    // Spring-animated value
    const springValue = useSpring(value, {
        stiffness: 100,
        damping: 20,
        mass: 0.5
    });

    // Subscribe to spring changes
    useEffect(() => {
        const unsubscribe = springValue.on('change', (v) => {
            setDisplayValue(Math.round(v));
        });
        return unsubscribe;
    }, [springValue]);

    // Detect value changes
    useEffect(() => {
        if (value !== prevValue.current) {
            setIsIncreasing(value > prevValue.current);
            springValue.set(value);
            prevValue.current = value;
        }
    }, [value, springValue]);

    const sizeClasses = {
        sm: 'counter-sm',
        md: 'counter-md',
        lg: 'counter-lg'
    };

    return (
        <motion.span
            className={`animated-counter ${sizeClasses[size]}`}
            style={{ color }}
            animate={isIncreasing ? {
                scale: [1, 1.2, 1],
                y: [0, -5, 0]
            } : {}}
            transition={{ duration: 0.3 }}
        >
            {prefix}
            {displayValue.toLocaleString()}
            {suffix}
        </motion.span>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎮 HUD ITEM — Individual Stat Display
// ═══════════════════════════════════════════════════════════════════════════════

const HUDItem: React.FC<HUDItemProps> = ({
    icon,
    label,
    value,
    color,
    glowColor,
    suffix = '',
    isAnimating = false,
    pulseOnChange = false
}) => {
    const [justChanged, setJustChanged] = useState(false);
    const prevValue = useRef(value);

    useEffect(() => {
        if (value !== prevValue.current && pulseOnChange) {
            setJustChanged(true);
            const timer = setTimeout(() => setJustChanged(false), 1000);
            prevValue.current = value;
            return () => clearTimeout(timer);
        }
    }, [value, pulseOnChange]);

    return (
        <motion.div
            className={`hud-item glass-subtle ${justChanged ? 'hud-item--changed' : ''}`}
            style={{
                '--item-color': color,
                '--item-glow': glowColor
            } as React.CSSProperties}
            whileHover={{ scale: 1.02, y: -2 }}
            animate={justChanged ? {
                boxShadow: [
                    `0 0 10px ${glowColor}`,
                    `0 0 30px ${glowColor}`,
                    `0 0 10px ${glowColor}`
                ]
            } : {}}
        >
            <span className="hud-icon">{icon}</span>
            <div className="hud-content">
                <span className="hud-label">{label}</span>
                <AnimatedCounter
                    value={value}
                    suffix={suffix}
                    color={color}
                    size="md"
                />
            </div>
            {isAnimating && (
                <motion.div
                    className="hud-pulse-ring"
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 0, 0.5]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                />
            )}
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 STREAK INDICATOR — Heartbeat Animation
// ═══════════════════════════════════════════════════════════════════════════════

interface StreakIndicatorProps {
    streak: number;
    multiplier: number;
}

const StreakIndicator: React.FC<StreakIndicatorProps> = ({ streak, multiplier }) => {
    const getStreakTier = () => {
        if (streak >= 7) return { tier: 'legendary', icon: '⚡', color: '#FFD700' };
        if (streak >= 5) return { tier: 'blazing', icon: '💥', color: '#FF6B6B' };
        if (streak >= 3) return { tier: 'fire', icon: '🔥', color: '#F97316' };
        if (streak >= 1) return { tier: 'active', icon: '✨', color: '#FACC15' };
        return { tier: 'none', icon: '💫', color: '#6B7280' };
    };

    const { tier, icon, color } = getStreakTier();

    return (
        <motion.div
            className={`streak-indicator glass-subtle streak-${tier}`}
            style={{ '--streak-color': color } as React.CSSProperties}
            whileHover={{ scale: 1.02, y: -2 }}
        >
            <motion.span
                className="streak-icon"
                animate={{
                    scale: streak > 0 ? [1, 1.15, 1, 1.1, 1] : 1
                }}
                transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
            >
                {icon}
            </motion.span>
            <div className="streak-content">
                <span className="streak-label">Daily Streak</span>
                <div className="streak-values">
                    <span className="streak-days" style={{ color }}>
                        {streak} day{streak !== 1 ? 's' : ''}
                    </span>
                    {multiplier > 1 && (
                        <motion.span
                            className="streak-multiplier"
                            animate={{
                                opacity: [1, 0.7, 1]
                            }}
                            transition={{
                                duration: 0.8,
                                repeat: Infinity
                            }}
                        >
                            {multiplier.toFixed(1)}x
                        </motion.span>
                    )}
                </div>
            </div>
            {streak >= 3 && (
                <motion.div
                    className="streak-heartbeat"
                    animate={{
                        scale: [1, 1.3, 1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3, 0.5, 0.3]
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                />
            )}
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 PLAYER HUD — Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export const PlayerHUD: React.FC = () => {
    // Try to access player state, use defaults if provider not available
    let playerState = { xp: 0, diamonds: 0, streak: 0, multiplier: 1.0, level: 1 };

    try {
        const state = usePlayerState();
        if (state) playerState = state;
    } catch {
        // Provider not available, use defaults
    }

    const { xp, diamonds, streak, multiplier, level } = playerState;

    return (
        <div className="player-hud">
            <div className="hud-left">
                {/* Level Badge */}
                <motion.div
                    className="level-badge glass neon-border-poker"
                    whileHover={{ scale: 1.05 }}
                >
                    <span className="level-icon">🏆</span>
                    <span className="level-value">Lvl {level}</span>
                </motion.div>
            </div>

            <div className="hud-center">
                {/* XP Display */}
                <HUDItem
                    icon="⭐"
                    label="Experience"
                    value={xp}
                    color="#00FF88"
                    glowColor="rgba(0, 255, 136, 0.4)"
                    suffix=" XP"
                    pulseOnChange
                />

                {/* Diamond Display */}
                <HUDItem
                    icon="💎"
                    label="Diamonds"
                    value={diamonds}
                    color="#00D4FF"
                    glowColor="rgba(0, 212, 255, 0.4)"
                    pulseOnChange
                />

                {/* Streak Display */}
                <StreakIndicator streak={streak} multiplier={multiplier} />
            </div>

            <div className="hud-right">
                {/* Profile Quick Access */}
                <motion.button
                    className="hud-profile glass-subtle"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <span>👤</span>
                </motion.button>
            </div>

            <style>{playerHUDStyles}</style>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 PLAYER HUD STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const playerHUDStyles = `
.player-hud {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 72px;
    padding: 12px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(10, 10, 15, 0.8);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    z-index: var(--z-floating);
}

.hud-left, .hud-right {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 120px;
}

.hud-right {
    justify-content: flex-end;
}

.hud-center {
    display: flex;
    align-items: center;
    gap: 16px;
}

.level-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 20px;
}

.level-icon {
    font-size: 1.25rem;
}

.level-value {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--color-poker-primary);
}

.hud-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    position: relative;
    overflow: hidden;
}

.hud-item--changed {
    animation: hud-flash 0.5s ease-out;
}

@keyframes hud-flash {
    0% { background: rgba(255, 255, 255, 0.2); }
    100% { background: transparent; }
}

.hud-icon {
    font-size: 1.5rem;
}

.hud-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.hud-label {
    font-size: 0.6875rem;
    color: rgba(248, 250, 252, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.animated-counter {
    font-weight: 700;
    font-family: var(--font-mono);
}

.counter-sm { font-size: 0.875rem; }
.counter-md { font-size: 1.125rem; }
.counter-lg { font-size: 1.5rem; }

.hud-pulse-ring {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 2px solid var(--item-color);
    pointer-events: none;
}

.streak-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    position: relative;
    overflow: hidden;
}

.streak-icon {
    font-size: 1.5rem;
    display: block;
}

.streak-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.streak-label {
    font-size: 0.6875rem;
    color: rgba(248, 250, 252, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.streak-values {
    display: flex;
    align-items: center;
    gap: 8px;
}

.streak-days {
    font-size: 1rem;
    font-weight: 700;
}

.streak-multiplier {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 10px;
    background: rgba(255, 215, 0, 0.2);
    color: #FFD700;
}

.streak-heartbeat {
    position: absolute;
    inset: -10px;
    border-radius: 50%;
    background: radial-gradient(circle, var(--streak-color) 0%, transparent 70%);
    pointer-events: none;
}

.streak-fire { border-color: rgba(249, 115, 22, 0.3); }
.streak-blazing { border-color: rgba(255, 107, 107, 0.3); }
.streak-legendary { border-color: rgba(255, 215, 0, 0.3); }

.hud-profile {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
}

@media (max-width: 768px) {
    .player-hud {
        padding: 8px 16px;
        height: 64px;
    }
    
    .hud-item, .streak-indicator {
        padding: 6px 12px;
    }
    
    .hud-label, .streak-label {
        display: none;
    }
    
    .level-badge {
        padding: 6px 12px;
    }
}
`;

export default PlayerHUD;
