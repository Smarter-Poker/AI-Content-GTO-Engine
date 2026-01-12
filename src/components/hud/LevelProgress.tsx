import React from 'react';
import { motion } from 'framer-motion';

/**
 * 📊 LEVEL PROGRESS INDICATOR
 * ═══════════════════════════════════════════════════════════════════════════
 * Visual progress bar for game cards showing level completion.
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface LevelProgressProps {
    currentLevel: number;
    totalLevels: number;
    masteryAchieved?: boolean;
    compact?: boolean;
}

export const LevelProgress: React.FC<LevelProgressProps> = ({
    currentLevel,
    totalLevels,
    masteryAchieved = false,
    compact = false
}) => {
    const progress = (currentLevel / totalLevels) * 100;
    const isComplete = currentLevel >= totalLevels;

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[#3E4042] rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={`h-full rounded-full ${isComplete
                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                                : masteryAchieved
                                    ? 'bg-gradient-to-r from-green-400 to-green-600'
                                    : 'bg-gradient-to-r from-[#1877F2] to-[#00C6FF]'
                            }`}
                    />
                </div>
                <span className="text-[10px] font-mono text-[#B0B3B8]">
                    {currentLevel}/{totalLevels}
                </span>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Level Dots */}
            <div className="flex gap-1">
                {Array.from({ length: totalLevels }).map((_, i) => {
                    const levelNum = i + 1;
                    const isCompleted = levelNum < currentLevel;
                    const isCurrent = levelNum === currentLevel;
                    const isLocked = levelNum > currentLevel;

                    return (
                        <motion.div
                            key={i}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className={`
                                w-2 h-2 rounded-full transition-all
                                ${isCompleted
                                    ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]'
                                    : isCurrent
                                        ? 'bg-[#1877F2] animate-pulse shadow-[0_0_8px_rgba(24,119,242,0.6)]'
                                        : 'bg-[#3E4042]'
                                }
                            `}
                            title={`Level ${levelNum}`}
                        />
                    );
                })}
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-[#18191A] rounded-full overflow-hidden border border-[#3E4042]">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full relative ${isComplete
                            ? 'bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500'
                            : 'bg-gradient-to-r from-[#1877F2] to-[#00C6FF]'
                        }`}
                >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </motion.div>
            </div>

            {/* Label */}
            <div className="flex justify-between items-center text-xs">
                <span className="text-[#B0B3B8]">
                    Level {currentLevel} of {totalLevels}
                </span>
                {isComplete && (
                    <span className="text-yellow-400 font-bold flex items-center gap-1">
                        🏆 MASTERED
                    </span>
                )}
                {!isComplete && masteryAchieved && (
                    <span className="text-green-400 font-bold flex items-center gap-1">
                        ✓ On Track
                    </span>
                )}
            </div>
        </div>
    );
};

/**
 * 🎯 MASTERY BADGE
 * Shows current mastery tier
 */
interface MasteryBadgeProps {
    tier: string;
    level: number;
}

export const MasteryBadge: React.FC<MasteryBadgeProps> = ({ tier, level }) => {
    const tierConfig: Record<string, { emoji: string; color: string; glow: string }> = {
        'BEGINNER': { emoji: '🌱', color: 'text-green-400', glow: '' },
        'STANDARD': { emoji: '⚡', color: 'text-blue-400', glow: '' },
        'INTERMEDIATE': { emoji: '🔥', color: 'text-orange-400', glow: 'shadow-[0_0_10px_rgba(251,146,60,0.5)]' },
        'ADVANCED': { emoji: '💎', color: 'text-purple-400', glow: 'shadow-[0_0_12px_rgba(168,85,247,0.5)]' },
        'ELITE': { emoji: '👑', color: 'text-yellow-400', glow: 'shadow-[0_0_15px_rgba(250,204,21,0.5)]' },
        'BOSS': { emoji: '🏆', color: 'text-red-400', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]' }
    };

    const config = tierConfig[tier] || tierConfig['BEGINNER'];

    return (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`
                inline-flex items-center gap-1.5 px-3 py-1 
                bg-[#242526] border border-[#3E4042] rounded-full
                ${config.glow}
            `}
        >
            <span className="text-lg">{config.emoji}</span>
            <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>
                {tier}
            </span>
            <span className="text-[10px] text-[#B0B3B8] font-mono">
                Lv.{level}
            </span>
        </motion.div>
    );
};
