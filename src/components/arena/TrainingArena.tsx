import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NeuralField } from '../neural/NeuralField';
import { HeroTable } from './HeroTable';
import { TactileBetSlider } from './TactileBetSlider';
import { GTOGrid } from './GTOGrid';
import { motion } from 'framer-motion';
import { gameLibrary, GameDefinition } from '../../core/GameLibrary';
import { pokerEngine, GameState } from '../../core/PokerEngine';

/**
 * 🏟️ TRAINING ARENA
 * The Main Monolith Container.
 *
 * Design Philosophy:
 * - "Facebook Dark" Aesthetic (#18191A bg, #242526 surfaces, #1877F2 accents)
 * - Hero-Centric Layout (Action anchored bottom)
 * - Kinetic Feedback (Everything moves)
 */

export const TrainingArena: React.FC = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const navigate = useNavigate();

    // 🎭 Local State for UI Polish
    const [activeTab, setActiveTab] = useState<'DRILL' | 'ANALYSIS' | 'LEADERBOARD'>('DRILL');
    const [score, setScore] = useState(0);
    const [activeGame, setActiveGame] = useState<GameDefinition | null>(null);
    const [gameState, setGameState] = useState<GameState>(pokerEngine.getState());
    const [showGrid, setShowGrid] = useState(false);

    // Bet Slider State
    const [betAmount, setBetAmount] = useState(2.5);

    // Load Game from URL
    useEffect(() => {
        if (gameId) {
            const game = gameLibrary.getGameById(gameId);
            if (game) {
                setActiveGame(game);
                // Start a fresh hand when entering
                // If the engine state is fresh/empty, start a hand
                if (gameState.street === 'PREFLOP' && gameState.pot === 0) {
                    pokerEngine.startHand(['Ah', 'Kd']);
                }
            } else {
                console.error(`Game ID ${gameId} not found`);
                navigate('/app/training'); // Go back to hub
            }
        }
    }, [gameId, navigate]);

    // Subscribe to Engine
    useEffect(() => {
        const unsubscribe = pokerEngine.subscribe((state) => {
            setGameState({ ...state }); // Spread to force re-render
        });
        return () => unsubscribe();
    }, []);

    // Update default bet amount when state changes (e.g. street change)
    useEffect(() => {
        // Simple heuristic: reset slider when it becomes our turn
        if (gameState.activeSeatIndex === gameState.heroSeatIndex) {
            setBetAmount(Math.max(gameState.minBet, parseFloat((gameState.pot * 0.5).toFixed(1))));
        }
    }, [gameState.street, gameState.activeSeatIndex, gameState.minBet, gameState.pot, gameState.heroSeatIndex]);

    const hero = gameState.seats[gameState.heroSeatIndex];
    const isHeroTurn = gameState.activeSeatIndex === gameState.heroSeatIndex;

    const handleAction = (type: 'FOLD' | 'CHECK' | 'CALL' | 'BET', amount?: number) => {
        if (!isHeroTurn) return;
        pokerEngine.act(type, amount);
    };

    return (
        <div className="relative w-full h-screen overflow-hidden text-[#E4E6EB] font-sans selection:bg-[#1877F2] selection:text-white">

            {/* 1. THE LIVING BACKGROUND */}
            <NeuralField />

            {/* 2. THE TOP HUD (Stats & Progress) */}
            <header className="absolute top-0 left-0 right-0 h-16 bg-[#242526]/80 backdrop-blur-md border-b border-[#3E4042] flex items-center justify-between px-6 z-50 shadow-sm">

                {/* LOGO AREA */}
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/app/training')} className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1877F2] to-[#00C6FF] flex items-center justify-center font-bold text-white shadow-[0_0_15px_#1877F2] hover:scale-110 transition-transform">
                        IQ
                    </button>
                    <div className="flex flex-col leading-none">
                        <span className="font-bold tracking-tight text-lg">POKER<span className="text-[#1877F2]">IQ</span></span>
                        {activeGame && (
                            <span className="text-[10px] text-[#B0B3B8] font-mono tracking-wider uppercase">
                                {activeGame.id} // {activeGame.name}
                            </span>
                        )}
                    </div>
                </div>

                {/* MODES TAB (Facebook Style Pills) */}
                <div className="flex bg-[#18191A] rounded-full p-1 border border-[#3E4042]">
                    {['DRILL', 'ANALYSIS', 'LEADERBOARD'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${activeTab === tab
                                    ? 'bg-[#3A3B3C] text-[#1877F2] shadow-sm'
                                    : 'text-[#B0B3B8] hover:bg-[#3A3B3C]/50'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* STATS CLUSTER */}
                <div className="flex items-center gap-6 text-sm font-medium">
                    {/* Pot Display */}
                    <div className="flex flex-col items-end leading-none">
                        <span className="text-[10px] text-[#B0B3B8] uppercase tracking-wider">Pot</span>
                        <span className="text-[#1877F2] font-bold text-lg">{gameState.pot.toFixed(1)} BB</span>
                    </div>

                    <div className="w-[1px] h-8 bg-[#3E4042]" />

                    <div className="flex flex-col items-end leading-none">
                        <span className="text-[10px] text-[#B0B3B8] uppercase tracking-wider">Session XP</span>
                        <span className="text-white font-bold">{score.toLocaleString()} XP</span>
                    </div>
                </div>
            </header>

            {/* 3. THE ARENA CORE (Playable Space) */}
            <main className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none transform scale-90 lg:scale-100 transition-transform">
                {/* 
                    HERO TABLE: Derived directly from GameState
                */}
                <HeroTable
                    heroSeatIndex={gameState.heroSeatIndex}
                    seats={gameState.seats}
                    board={gameState.board}
                />
            </main>

            {/* 4. THE HERO HUD (Anchored Bottom) */}
            <footer className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#18191A] via-[#18191A]/90 to-transparent z-50 flex items-end justify-center pb-8 pointer-events-auto">

                {/* ACTION PLATE */}
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={`flex items-center gap-4 p-2 bg-[#242526] border border-[#3E4042] rounded-2xl shadow-xl backdrop-blur-xl transition-all duration-300 ${isHeroTurn ? 'scale-100 opacity-100' : 'scale-95 opacity-50 grayscale'}`}
                >
                    {/* FOLD */}
                    <button
                        onClick={() => handleAction('FOLD')}
                        disabled={!isHeroTurn}
                        className="w-32 h-12 rounded-xl bg-[#242526] border border-[#3E4042] hover:bg-[#3A3B3C] text-[#B0B3B8] font-bold transition-colors flex items-center justify-center gap-2 group disabled:opacity-50"
                    >
                        <div className="w-2 h-2 rounded-full bg-[#B0B3B8] group-hover:bg-red-500 transition-colors" />
                        FOLD
                    </button>

                    {/* CALL / CHECK */}
                    <button
                        onClick={() => handleAction('CALL')} // Simplification for now
                        disabled={!isHeroTurn}
                        className="w-32 h-12 rounded-xl bg-[#242526] border border-[#3E4042] hover:bg-[#3A3B3C] text-white font-bold transition-colors flex items-center justify-center gap-2 group disabled:opacity-50"
                    >
                        <div className="w-2 h-2 rounded-full bg-white group-hover:bg-[#1877F2] transition-colors" />
                        CALL {hero?.currentBet < gameState.minBet ? (gameState.minBet - hero.currentBet) : ''}
                    </button>

                    {/* BET SLIDER (The Tactile Core) */}
                    <div className="w-80">
                        <TactileBetSlider
                            min={gameState.minBet}
                            max={hero ? hero.chips : 100} // Max is Hero stack
                            pot={gameState.pot}
                            value={betAmount}
                            onChange={setBetAmount}
                        />
                    </div>

                    {/* RAISE BUTTON (Primary Action) */}
                    <button
                        onClick={() => handleAction('BET', betAmount)}
                        disabled={!isHeroTurn}
                        className="min-w-[140px] h-14 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold shadow-[0_4px_0_#0F58B5] active:shadow-none active:translate-y-[4px] transition-all disabled:opacity-50 disabled:shadow-none flex flex-col items-center justify-center leading-none gap-1"
                    >
                        <span className="text-lg">RAISE</span>
                        <span className="text-[10px] opacity-80 font-mono">{betAmount.toFixed(1)} BB</span>
                    </button>

                </motion.div>
            </footer>

            {/* 5. GTO GRID OVERLAY (Floating Right) */}
            <aside className="absolute top-24 right-6 flex flex-col items-end gap-2 z-40">
                {/* Toggle Button */}
                <div
                    onClick={() => setShowGrid(!showGrid)}
                    className={`w-12 h-12 bg-[#242526] rounded-xl border flex items-center justify-center shadow-lg cursor-pointer transition-all hover:scale-105 ${showGrid ? 'border-[#1877F2]' : 'border-[#3E4042] hover:border-[#1877F2]'}`}
                >
                    <div className="w-6 h-6 grid grid-cols-2 gap-0.5 opacity-80">
                        <div className="bg-[#1877F2]" />
                        <div className="bg-[#E4E6EB]" />
                        <div className="bg-[#E4E6EB]" />
                        <div className="bg-[#1877F2]" />
                    </div>
                </div>

                {/* The Grid Component */}
                <motion.div
                    initial={{ opacity: 0, x: 20, pointerEvents: 'none' }}
                    animate={{
                        opacity: showGrid ? 1 : 0,
                        x: showGrid ? 0 : 20,
                        pointerEvents: showGrid ? 'auto' : 'none'
                    }}
                    transition={{ duration: 0.2 }}
                >
                    <GTOGrid />
                </motion.div>
            </aside>
        </div>
    );
};
