/**
 * 🎴 TRAINING COMPONENTS — Reusable UI Elements
 * ═══════════════════════════════════════════════════════════════════════════
 * PlayingCard, StreakPopup, ProgressBar, ActionButton
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { motion, useSpring } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// 🎴 PLAYING CARD
// ═══════════════════════════════════════════════════════════════════════════════

interface PlayingCardProps {
    card: string;
    delay?: number;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({ card, delay = 0 }) => {
    const suit = card.slice(-1);
    const rank = card.slice(0, -1);
    const isRed = suit === 'h' || suit === 'd';
    const symbols: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };

    return (
        <motion.div
            className={`playing-card ${isRed ? 'red' : 'black'}`}
            initial={{ rotateY: 180, opacity: 0, scale: 0.5 }}
            animate={{ rotateY: 0, opacity: 1, scale: 1 }}
            transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
        >
            <span className="rank">{rank}</span>
            <span className="suit">{symbols[suit] || suit}</span>
            <style>{cardStyles}</style>
        </motion.div>
    );
};

const cardStyles = `
.playing-card {
    width: 56px;
    height: 80px;
    background: linear-gradient(145deg, #FFFFFF, #E8E8E8);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.playing-card.red { color: #DC2626; }
.playing-card.black { color: #1F2937; }
.playing-card .rank { font-size: 1.25rem; }
.playing-card .suit { font-size: 1.5rem; }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 STREAK POPUP
// ═══════════════════════════════════════════════════════════════════════════════

interface StreakPopupProps {
    streak: number;
    isVisible: boolean;
}

export const StreakPopup: React.FC<StreakPopupProps> = ({ streak, isVisible }) => {
    if (!isVisible || streak < 5) return null;

    const tier = streak >= 10 ? 'legendary' : streak >= 7 ? 'blazing' : 'fire';
    const icon = streak >= 10 ? '⚡' : streak >= 7 ? '💥' : '🔥';
    const multiplier = streak >= 10 ? '2.0x' : streak >= 7 ? '1.75x' : '1.5x';

    return (
        <motion.div
            className={`streak-popup streak--${tier}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
        >
            <motion.span
                className="streak-icon"
                animate={{ scale: [1, 1.2, 1], rotate: [-5, 5, -5] }}
                transition={{ duration: 0.3, repeat: Infinity }}
            >
                {icon}
            </motion.span>
            <div className="streak-info">
                <span className="streak-count">{streak}</span>
                <span className="streak-label">STREAK!</span>
            </div>
            <span className="streak-mult">{multiplier}</span>
            <style>{streakStyles}</style>
        </motion.div>
    );
};

const streakStyles = `
.streak-popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 24px 48px;
    background: rgba(26, 26, 36, 0.95);
    border-radius: 20px;
    border: 2px solid;
}
.streak--fire { border-color: #F97316; box-shadow: 0 0 60px rgba(249, 115, 22, 0.5); }
.streak--blazing { border-color: #FF6B6B; box-shadow: 0 0 60px rgba(255, 107, 107, 0.5); }
.streak--legendary { border-color: #FFD700; box-shadow: 0 0 60px rgba(255, 215, 0, 0.5); }
.streak-icon { font-size: 3rem; }
.streak-info { display: flex; align-items: baseline; gap: 8px; }
.streak-count { font-size: 2.5rem; font-weight: 900; color: #F8FAFC; }
.streak-label { font-size: 1rem; font-weight: 700; color: rgba(248, 250, 252, 0.7); }
.streak-mult { font-size: 0.875rem; font-weight: 600; color: var(--color-poker-primary); }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 PROGRESS BAR
// ═══════════════════════════════════════════════════════════════════════════════

interface ProgressBarProps {
    current: number;
    total: number;
    correct: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, correct }) => {
    const progress = (current / total) * 100;
    const accuracy = current > 0 ? (correct / current) * 100 : 0;
    const progressSpring = useSpring(progress, { stiffness: 100, damping: 20 });

    return (
        <div className="progress-bar-container">
            <div className="progress-header">
                <span>{current} / {total}</span>
                <span className={accuracy >= 85 ? 'passing' : ''}>{accuracy.toFixed(0)}%</span>
            </div>
            <div className="progress-track">
                <motion.div className="progress-fill" style={{ width: `${progressSpring.get()}%` }} />
            </div>
            <style>{progressStyles}</style>
        </div>
    );
};

const progressStyles = `
.progress-bar-container { display: flex; flex-direction: column; gap: 8px; }
.progress-header { display: flex; justify-content: space-between; font-size: 0.875rem; color: rgba(248, 250, 252, 0.6); }
.progress-header .passing { color: var(--color-poker-primary); font-weight: 600; }
.progress-track { height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, var(--color-poker-primary), var(--color-diamond)); border-radius: 4px; }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 ACTION BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

interface ActionButtonProps {
    action: string;
    onClick: () => void;
    disabled?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ action, onClick, disabled }) => {
    const labels: Record<string, string> = {
        fold: '🚫 Fold', check: '✋ Check', call: '📞 Call',
        raise: '📈 Raise', bet: '💰 Bet', allin: '🚀 All-In'
    };
    const isDanger = action.toLowerCase() === 'fold';
    const isPrimary = action.toLowerCase() === 'allin';

    return (
        <motion.button
            className={`action-btn ${isDanger ? 'danger' : isPrimary ? 'primary' : 'secondary'} glass`}
            onClick={onClick}
            disabled={disabled}
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
        >
            {labels[action.toLowerCase()] || action}
            <style>{actionStyles}</style>
        </motion.button>
    );
};

const actionStyles = `
.action-btn {
    padding: 14px 28px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    min-width: 120px;
}
.action-btn.primary { background: var(--color-poker-surface); color: var(--color-poker-primary); border-color: var(--color-poker-primary); }
.action-btn.secondary { background: rgba(255, 255, 255, 0.05); color: #F8FAFC; }
.action-btn.danger { background: rgba(255, 68, 68, 0.1); color: var(--color-xp-primary); border-color: rgba(255, 68, 68, 0.3); }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
`;
