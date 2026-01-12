/**
 * 💎 ARCADE PAGE — DIAMOND SKILL GAMES
 * ═══════════════════════════════════════════════════════════════════════════
 * Stake diamonds on GTO performance. Skill-based economy.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerState } from '../../providers/PlayerStateProvider';

interface ArcadeGame {
    id: string;
    title: string;
    icon: string;
    description: string;
    minStake: number;
    maxStake: number;
    multiplier: string;
    difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
    isActive: boolean;
}

const GAMES: ArcadeGame[] = [
    { id: 'speed-gto', title: 'Speed GTO', icon: '⚡', description: '10 questions, 10 seconds each. Pure speed.', minStake: 10, maxStake: 100, multiplier: '2x', difficulty: 'medium', isActive: true },
    { id: 'perfect-10', title: 'Perfect 10', icon: '🎯', description: 'Get all 10 right or lose it all.', minStake: 25, maxStake: 500, multiplier: '5x', difficulty: 'hard', isActive: true },
    { id: 'streak-survivor', title: 'Streak Survivor', icon: '🔥', description: 'How long can you keep the streak alive?', minStake: 5, maxStake: 50, multiplier: 'Progressive', difficulty: 'easy', isActive: true },
    { id: 'boss-battle', title: 'Boss Battle', icon: '⚔️', description: 'Face the hardest scenarios. 90% required.', minStake: 100, maxStake: 1000, multiplier: '10x', difficulty: 'extreme', isActive: true },
    { id: 'daily-challenge', title: 'Daily Challenge', icon: '📅', description: 'One shot per day. Massive rewards.', minStake: 50, maxStake: 50, multiplier: '20x', difficulty: 'hard', isActive: true },
    { id: 'pvp-duel', title: 'PvP Duel', icon: '👥', description: 'Challenge another player head-to-head.', minStake: 20, maxStake: 200, multiplier: 'Winner takes all', difficulty: 'medium', isActive: false },
];

export const ArcadePage: React.FC = () => {
    const playerState = usePlayerState();
    const [selectedGame, setSelectedGame] = useState<ArcadeGame | null>(null);
    const [stakeAmount, setStakeAmount] = useState(0);
    const [showStakeModal, setShowStakeModal] = useState(false);

    const handleSelectGame = (game: ArcadeGame) => {
        if (!game.isActive) {
            (window as any).__arenaToast?.('🚧 Coming Soon!');
            return;
        }
        setSelectedGame(game);
        setStakeAmount(game.minStake);
        setShowStakeModal(true);
    };

    const handleStartGame = () => {
        if (!selectedGame || stakeAmount < selectedGame.minStake) return;
        if (playerState.diamonds < stakeAmount) {
            (window as any).__arenaToast?.('💎 Not enough diamonds!');
            return;
        }
        playerState.spendDiamonds(stakeAmount);
        setShowStakeModal(false);
        // In production, this would start the game session
        setTimeout(() => {
            // Simulate win/loss (70% win rate for demo)
            const won = Math.random() > 0.3;
            if (won) {
                const winnings = stakeAmount * 2;
                playerState.addDiamonds(winnings);
                (window as any).__arenaToast?.(`🎉 You won ${winnings} 💎!`);
            } else {
                (window as any).__arenaToast?.(`😔 Better luck next time!`);
            }
        }, 2000);
    };

    return (
        <div className="arcade-page">
            <header className="arcade-header">
                <h1 className="text-gradient">💎 Diamond Arcade</h1>
                <p>Stake diamonds. Test your skills. Win big.</p>
                <div className="balance-display glass">
                    <span className="balance-icon">💎</span>
                    <span className="balance-amount">{playerState.diamonds}</span>
                </div>
            </header>

            <div className="games-grid">
                {GAMES.map((game, i) => (
                    <motion.div
                        key={game.id}
                        className={`game-card glass ${!game.isActive ? 'inactive' : ''}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={game.isActive ? { scale: 1.02, y: -4 } : {}}
                        onClick={() => handleSelectGame(game)}
                    >
                        <div className="game-icon">{game.icon}</div>
                        <div className="game-info">
                            <h3>{game.title}</h3>
                            <p>{game.description}</p>
                            <div className="game-meta">
                                <span className={`difficulty ${game.difficulty}`}>{game.difficulty}</span>
                                <span className="stake">💎 {game.minStake}-{game.maxStake}</span>
                                <span className="multiplier">{game.multiplier}</span>
                            </div>
                        </div>
                        {!game.isActive && <span className="coming-soon">COMING SOON</span>}
                    </motion.div>
                ))}
            </div>

            {/* Stake Modal */}
            <AnimatePresence>
                {showStakeModal && selectedGame && (
                    <motion.div
                        className="stake-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowStakeModal(false)}
                    >
                        <motion.div
                            className="stake-modal glass-heavy"
                            initial={{ scale: 0.9, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 50 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <span className="modal-icon">{selectedGame.icon}</span>
                                <h2>{selectedGame.title}</h2>
                            </div>

                            <div className="stake-section">
                                <label>Stake Amount</label>
                                <div className="stake-input">
                                    <button onClick={() => setStakeAmount(Math.max(selectedGame.minStake, stakeAmount - 10))}>-</button>
                                    <span className="amount">💎 {stakeAmount}</span>
                                    <button onClick={() => setStakeAmount(Math.min(selectedGame.maxStake, stakeAmount + 10))}>+</button>
                                </div>
                                <div className="stake-presets">
                                    <button onClick={() => setStakeAmount(selectedGame.minStake)}>Min</button>
                                    <button onClick={() => setStakeAmount(Math.floor((selectedGame.minStake + selectedGame.maxStake) / 2))}>Half</button>
                                    <button onClick={() => setStakeAmount(selectedGame.maxStake)}>Max</button>
                                </div>
                            </div>

                            <div className="potential-win">
                                <span>Potential Win:</span>
                                <span className="win-amount">💎 {stakeAmount * 2}</span>
                            </div>

                            <div className="modal-actions">
                                <motion.button
                                    className="play-btn neon-border-poker"
                                    onClick={handleStartGame}
                                    disabled={playerState.diamonds < stakeAmount}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    🎮 Play Now
                                </motion.button>
                                <button className="cancel-btn" onClick={() => setShowStakeModal(false)}>
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{arcadeStyles}</style>
        </div>
    );
};

const arcadeStyles = `
.arcade-page { max-width: 1200px; margin: 0 auto; padding: 24px; }
.arcade-header { text-align: center; margin-bottom: 40px; }
.arcade-header h1 { font-size: 2.5rem; margin-bottom: 8px; }
.arcade-header p { color: rgba(248, 250, 252, 0.6); margin-bottom: 16px; }
.balance-display { display: inline-flex; align-items: center; gap: 12px; padding: 12px 24px; border-radius: 50px; }
.balance-icon { font-size: 1.5rem; }
.balance-amount { font-size: 1.5rem; font-weight: 700; color: var(--color-diamond); }

.games-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }
.game-card { display: flex; align-items: flex-start; gap: 20px; padding: 24px; border-radius: 20px; cursor: pointer; position: relative; }
.game-card.inactive { opacity: 0.5; cursor: not-allowed; }
.game-icon { font-size: 3rem; }
.game-info { flex: 1; }
.game-info h3 { font-size: 1.25rem; color: #F8FAFC; margin-bottom: 6px; }
.game-info p { font-size: 0.875rem; color: rgba(248,250,252,0.6); margin-bottom: 12px; }
.game-meta { display: flex; gap: 12px; flex-wrap: wrap; }
.difficulty { font-size: 0.7rem; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; font-weight: 600; }
.difficulty.easy { background: rgba(74, 222, 128, 0.2); color: #4ADE80; }
.difficulty.medium { background: rgba(250, 204, 21, 0.2); color: #FACC15; }
.difficulty.hard { background: rgba(249, 115, 22, 0.2); color: #F97316; }
.difficulty.extreme { background: rgba(239, 68, 68, 0.2); color: #EF4444; }
.stake { font-size: 0.75rem; color: var(--color-diamond); }
.multiplier { font-size: 0.75rem; color: var(--color-poker-primary); font-weight: 600; }
.coming-soon { position: absolute; top: 12px; right: 12px; font-size: 0.65rem; padding: 4px 8px; background: rgba(255,255,255,0.1); border-radius: 6px; color: rgba(248,250,252,0.5); }

.stake-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: var(--z-modal); padding: 24px; }
.stake-modal { width: 100%; max-width: 400px; padding: 32px; border-radius: 24px; }
.modal-header { text-align: center; margin-bottom: 24px; }
.modal-icon { font-size: 3rem; display: block; margin-bottom: 8px; }
.modal-header h2 { font-size: 1.5rem; color: #F8FAFC; }

.stake-section { margin-bottom: 24px; }
.stake-section label { display: block; font-size: 0.875rem; color: rgba(248,250,252,0.6); margin-bottom: 12px; text-align: center; }
.stake-input { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 16px; }
.stake-input button { width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #F8FAFC; font-size: 1.25rem; cursor: pointer; }
.stake-input .amount { font-size: 1.75rem; font-weight: 700; color: var(--color-diamond); min-width: 120px; text-align: center; }
.stake-presets { display: flex; justify-content: center; gap: 12px; }
.stake-presets button { padding: 8px 16px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; background: transparent; color: rgba(248,250,252,0.7); cursor: pointer; }

.potential-win { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(0, 255, 136, 0.1); border-radius: 12px; margin-bottom: 24px; }
.potential-win span:first-child { color: rgba(248,250,252,0.7); }
.win-amount { font-size: 1.5rem; font-weight: 700; color: var(--color-poker-primary); }

.modal-actions { display: flex; flex-direction: column; gap: 12px; }
.play-btn { width: 100%; padding: 16px; border: none; border-radius: 14px; background: transparent; font-size: 1.1rem; font-weight: 700; color: var(--color-poker-primary); cursor: pointer; }
.play-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.cancel-btn { padding: 12px; background: transparent; border: none; color: rgba(248,250,252,0.5); cursor: pointer; }
`;

export default ArcadePage;
