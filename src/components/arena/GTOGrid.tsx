import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 🧠 GTO GRID VISUALIZER
 * 
 * The "Brain" of the operation.
 * Renders a 13x13 matrix of poker hands (169 combinations).
 * 
 * Top Right Triangle: Suited Hands (AKs)
 * Diagonal: Pairs (AA)
 * Bottom Left Triangle: Offsuit Hands (AKo)
 */

type ActionFreq = {
    check: number; // 0-1
    betSmall: number;
    betBig: number;
    raise: number;
    fold: number;
};

// Mock Strategy Data generator
const getStrategy = (row: number, col: number): ActionFreq => {
    // Just some deterministic chaos to look cool for now
    const seed = (row * 13 + col) * 123;
    const isPair = row === col;
    const isSuited = col > row;

    if (isPair) return { check: 0.2, betSmall: 0, betBig: 0.5, raise: 0.3, fold: 0 }; // Aggro pairs
    if (isSuited) return { check: 0.4, betSmall: 0.3, betBig: 0.2, raise: 0.1, fold: 0 }; // Mix suited
    return { check: 0.1, betSmall: 0, betBig: 0, raise: 0, fold: 0.9 }; // Fold trash
};

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

export const GTOGrid: React.FC = () => {
    const [hoveredCell, setHoveredCell] = useState<{ name: string, strat: ActionFreq } | null>(null);

    return (
        <div className="w-[400px] h-[400px] bg-[#18191A] border border-[#3E4042] rounded-xl overflow-hidden shadow-2xl flex flex-col">

            {/* 🏷️ HEADER */}
            <div className="h-10 bg-[#242526] border-b border-[#3E4042] flex items-center justify-between px-4">
                <span className="text-xs font-bold text-[#E4E6EB] tracking-wider">STRATEGY MATRIX</span>
                <div className="flex gap-2 text-[10px] font-mono text-[#B0B3B8]">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" />RAISE</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#1877F2]" />BET</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" />CHECK</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#3E4042]" />FOLD</span>
                </div>
            </div>

            {/* 🕸️ THE GRID */}
            <div className="flex-1 p-1 relative">
                <div className="grid grid-cols-13 grid-rows-13 w-full h-full gap-[1px] bg-[#18191A]">
                    {RANKS.map((rowRank, r) => (
                        RANKS.map((colRank, c) => {
                            const isSuited = c > r;
                            const isPair = r === c;
                            const hand = isPair ? `${rowRank}${colRank}` : isSuited ? `${rowRank}${colRank}s` : `${colRank}${rowRank}o`;
                            const strat = getStrategy(r, c);

                            // Visual color mix
                            // This is a simplified "dominant color" approach for the MVP
                            let bgColor = '#3E4042'; // Fold
                            let opacity = 0.8;

                            if (strat.raise > 0.5) bgColor = '#EF4444'; // Red
                            else if (strat.betBig > 0) bgColor = '#3B82F6'; // Blue
                            else if (strat.betSmall > 0) bgColor = '#60A5FA'; // Light Blue
                            else if (strat.check > 0.5) bgColor = '#22C55E'; // Green

                            return (
                                <div
                                    key={`${r}-${c}`}
                                    onMouseEnter={() => setHoveredCell({ name: hand, strat })}
                                    onMouseLeave={() => setHoveredCell(null)}
                                    className="relative cursor-crosshair group hover:z-10"
                                    style={{ backgroundColor: bgColor }}
                                >
                                    {/* Simple cell text only visible if large enough or checking specific one -- avoiding clutter */}
                                    {/* Using tooltip mainly */}
                                    {isPair && <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white opacity-80">{hand}</span>}
                                </div>
                            );
                        })
                    ))}
                </div>

                {/* 🕵️ TOOLTIP OVERLAY */}
                <AnimatePresence>
                    {hoveredCell && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute bottom-4 right-4 z-50 bg-[#242526]/95 backdrop-blur border border-[#3E4042] p-3 rounded-lg shadow-xl w-48 pointer-events-none"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-lg font-bold text-white">{hoveredCell.name}</span>
                                <span className="text-[10px] text-[#B0B3B8] uppercase">EV: 2.4BB</span>
                            </div>

                            {/* Frequency Bars */}
                            <div className="space-y-1">
                                <FreqBar label="RAISE" val={hoveredCell.strat.raise} color="bg-red-500" />
                                <FreqBar label="BET" val={hoveredCell.strat.betBig + hoveredCell.strat.betSmall} color="bg-[#1877F2]" />
                                <FreqBar label="CHECK" val={hoveredCell.strat.check} color="bg-green-500" />
                                <FreqBar label="FOLD" val={hoveredCell.strat.fold} color="bg-[#3E4042]" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

        </div>
    );
};

const FreqBar: React.FC<{ label: string, val: number, color: string }> = ({ label, val, color }) => (
    <div className="flex items-center gap-2 text-[10px]">
        <span className="w-10 text-[#B0B3B8] font-bold">{label}</span>
        <div className="flex-1 h-1.5 bg-[#18191A] rounded-full overflow-hidden">
            <div className={`h-full ${color}`} style={{ width: `${val * 100}%` }} />
        </div>
        <span className="w-8 text-right text-white tabular-nums">{(val * 100).toFixed(0)}%</span>
    </div>
);
