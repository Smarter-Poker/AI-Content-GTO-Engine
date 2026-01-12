import React from 'react';
import { motion } from 'framer-motion';

/**
 * 🏆 SESSION SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════
 * End-of-session celebration screen.
 * 
 * Shows:
 * - Final XP earned
 * - Accuracy percentage
 * - Max streak achieved
 * - Level progress
 * - Mastery status (85% gate)
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface SessionSummaryProps {
    isOpen: boolean;
    sessionXP: number;
    accuracy: number;
    maxStreak: number;
    correctCount: number;
    totalCount: number;
    gameName: string;
    gameLevel: number;
    masteryAchieved: boolean;
    onClose: () => void;
    onPlayAgain: () => void;
    onBackToHub: () => void;
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({
    isOpen,
    sessionXP,
    accuracy,
    maxStreak,
    correctCount,
    totalCount,
    gameName,
    gameLevel,
    masteryAchieved,
    onClose,
    onPlayAgain,
    onBackToHub
}) => {
    if (!isOpen) return null;

    const getGrade = () => {
        if (accuracy >= 95) return { letter: 'S', color: 'text-purple-400', glow: 'shadow-[0_0_30px_rgba(168,85,247,0.6)]' };
        if (accuracy >= 90) return { letter: 'A+', color: 'text-yellow-400', glow: 'shadow-[0_0_30px_rgba(250,204,21,0.6)]' };
        if (accuracy >= 85) return { letter: 'A', color: 'text-green-400', glow: 'shadow-[0_0_25px_rgba(34,197,94,0.5)]' };
        if (accuracy >= 75) return { letter: 'B', color: 'text-blue-400', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]' };
        if (accuracy >= 60) return { letter: 'C', color: 'text-orange-400', glow: '' };
        return { letter: 'D', color: 'text-red-400', glow: '' };
    };

    const grade = getGrade();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md"
        >
            <motion.div
                initial={{ scale: 0.8, y: 100 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                className="w-[500px] bg-gradient-to-b from-[#242526] to-[#18191A] border border-[#3E4042] rounded-3xl shadow-2xl overflow-hidden"
            >
                {/* HEADER */}
                <div className="p-8 text-center border-b border-[#3E4042]">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="text-6xl mb-4"
                    >
                        {masteryAchieved ? '🏆' : accuracy >= 70 ? '⭐' : '📚'}
                    </motion.div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {masteryAchieved ? 'MASTERY ACHIEVED!' : 'SESSION COMPLETE'}
                    </h2>
                    <p className="text-[#B0B3B8]">{gameName} — Level {gameLevel}</p>
                </div>

                {/* GRADE */}
                <div className="flex justify-center py-6">
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.3, type: 'spring', stiffness: 150 }}
                        className={`w-24 h-24 rounded-full bg-[#18191A] border-4 border-[#3E4042] flex items-center justify-center ${grade.glow}`}
                    >
                        <span className={`text-4xl font-black ${grade.color}`}>{grade.letter}</span>
                    </motion.div>
                </div>

                {/* STATS GRID */}
                <div className="grid grid-cols-3 gap-4 px-8 pb-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-center p-4 bg-[#18191A] rounded-xl border border-[#3E4042]"
                    >
                        <div className="text-[10px] text-[#B0B3B8] uppercase tracking-wider mb-1">Accuracy</div>
                        <div className={`text-2xl font-bold ${accuracy >= 85 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {accuracy}%
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-center p-4 bg-[#18191A] rounded-xl border border-[#3E4042]"
                    >
                        <div className="text-[10px] text-[#B0B3B8] uppercase tracking-wider mb-1">Max Streak</div>
                        <div className="text-2xl font-bold text-orange-400">🔥 {maxStreak}</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="text-center p-4 bg-[#18191A] rounded-xl border border-[#3E4042]"
                    >
                        <div className="text-[10px] text-[#B0B3B8] uppercase tracking-wider mb-1">Correct</div>
                        <div className="text-2xl font-bold text-white">{correctCount}/{totalCount}</div>
                    </motion.div>
                </div>

                {/* XP EARNED */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 }}
                    className="mx-8 mb-6 p-4 bg-gradient-to-r from-[#1877F2]/20 to-[#1877F2]/5 rounded-xl border border-[#1877F2]/30"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs text-[#B0B3B8] uppercase tracking-wider">XP Earned</div>
                            <div className="text-3xl font-black text-[#1877F2]">+{sessionXP.toLocaleString()}</div>
                        </div>
                        <div className="text-5xl">✨</div>
                    </div>
                </motion.div>

                {/* MASTERY PROGRESS */}
                {!masteryAchieved && (
                    <div className="mx-8 mb-6">
                        <div className="flex justify-between text-xs text-[#B0B3B8] mb-2">
                            <span>Mastery Progress</span>
                            <span>{accuracy}% / 85%</span>
                        </div>
                        <div className="h-2 bg-[#18191A] rounded-full overflow-hidden border border-[#3E4042]">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(accuracy / 85 * 100, 100)}%` }}
                                transition={{ delay: 0.8, duration: 1 }}
                                className={`h-full ${accuracy >= 85 ? 'bg-green-500' : 'bg-yellow-500'}`}
                            />
                        </div>
                    </div>
                )}

                {/* ACTION BUTTONS */}
                <div className="p-6 bg-[#18191A] border-t border-[#3E4042] flex gap-3">
                    <button
                        onClick={onBackToHub}
                        className="flex-1 py-3 rounded-xl bg-[#3A3B3C] hover:bg-[#4E4F50] text-white font-bold transition-colors"
                    >
                        Back to Hub
                    </button>
                    <button
                        onClick={onPlayAgain}
                        className="flex-1 py-3 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold transition-colors"
                    >
                        Play Again
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};
