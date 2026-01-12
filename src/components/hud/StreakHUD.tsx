import React from 'react';
import { motion } from 'framer-motion';

/**
 * 🔥 STREAK HUD
 * ═══════════════════════════════════════════════════════════════════════════
 * Visual streak counter and XP display for the Training Arena.
 * 
 * Design: 
 * - Flame icon grows with streak
 * - Pulse animation at milestones
 * - Color shifts from blue -> green -> gold -> purple
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface StreakHUDProps {
    streak: number;
    sessionXP: number;
    accuracy: number;
    comboName: string;
}

export const StreakHUD: React.FC<StreakHUDProps> = ({ streak, sessionXP, accuracy, comboName }) => {
    // Color based on streak
    const getStreakColor = () => {
        if (streak >= 10) return 'text-purple-400';
        if (streak >= 7) return 'text-yellow-400';
        if (streak >= 5) return 'text-green-400';
        if (streak >= 3) return 'text-blue-400';
        return 'text-[#B0B3B8]';
    };

    const getGlowColor = () => {
        if (streak >= 10) return 'shadow-[0_0_20px_rgba(168,85,247,0.6)]';
        if (streak >= 7) return 'shadow-[0_0_20px_rgba(250,204,21,0.6)]';
        if (streak >= 5) return 'shadow-[0_0_20px_rgba(34,197,94,0.6)]';
        if (streak >= 3) return 'shadow-[0_0_15px_rgba(59,130,246,0.5)]';
        return '';
    };

    const isOnFire = streak >= 3;

    return (
        <div className="flex items-center gap-6">
            {/* 🔥 STREAK COUNTER */}
            <motion.div
                key={streak}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-[#242526] border border-[#3E4042] ${getGlowColor()}`}
            >
                <motion.span
                    animate={isOnFire ? {
                        scale: [1, 1.2, 1],
                        rotate: [0, -5, 5, 0]
                    } : {}}
                    transition={{
                        duration: 0.5,
                        repeat: isOnFire ? Infinity : 0,
                        repeatDelay: 1
                    }}
                    className="text-2xl"
                >
                    {isOnFire ? '🔥' : '⚡'}
                </motion.span>
                <div className="flex flex-col leading-none">
                    <span className="text-[10px] text-[#B0B3B8] uppercase tracking-wider">Streak</span>
                    <span className={`text-xl font-black ${getStreakColor()}`}>{streak}</span>
                </div>
            </motion.div>

            {/* 📊 ACCURACY */}
            <div className="flex flex-col items-center leading-none px-3 py-2 rounded-xl bg-[#242526] border border-[#3E4042]">
                <span className="text-[10px] text-[#B0B3B8] uppercase tracking-wider">Accuracy</span>
                <span className={`text-lg font-bold ${accuracy >= 85 ? 'text-green-400' : accuracy >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {accuracy}%
                </span>
            </div>

            {/* 🎮 COMBO LEVEL */}
            {comboName !== 'NORMAL' && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${comboName === 'PERFECT' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' :
                            comboName === 'EXCELLENT' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                                comboName === 'GREAT' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                                    'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                        }`}
                >
                    {comboName}
                </motion.div>
            )}

            {/* 💰 SESSION XP */}
            <div className="flex flex-col items-end leading-none px-3 py-2 rounded-xl bg-[#242526] border border-[#3E4042]">
                <span className="text-[10px] text-[#B0B3B8] uppercase tracking-wider">Session XP</span>
                <motion.span
                    key={sessionXP}
                    initial={{ scale: 1.2, color: '#22C55E' }}
                    animate={{ scale: 1, color: '#E4E6EB' }}
                    transition={{ duration: 0.3 }}
                    className="text-lg font-bold"
                >
                    {sessionXP.toLocaleString()}
                </motion.span>
            </div>
        </div>
    );
};
