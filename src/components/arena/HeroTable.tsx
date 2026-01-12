import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PlayingCard } from '../poker/PlayingCard';

/**
 * 🃏 HERO TABLE
 * The Geometry Engine of the Training Monolith.
 *
 * LAW: HERO IS ALWAYS BOTTOM CENTER.
 * The world rotates around the Hero.
 */

interface Seat {
    id: string; // 'BTN', 'SB', 'BB', 'UTG', etc.
    label: string;
    chips: number;
    cards?: [string, string] | null; // 'Ah', 'Kd'
    isActive: boolean;
    isHero: boolean;
    isFolded: boolean;
}

interface HeroTableProps {
    heroSeatIndex: number; // 0-8 (Where hero "actually" is in the hand logic)
    seats: Seat[];
    board?: string[]; // ['Ah', 'Kd', 'Tc', '2s', '5d']
}

export const HeroTable: React.FC<HeroTableProps> = ({ heroSeatIndex, seats, board = [] }) => {

    // 📐 GEOMETRY ENGINE
    // Base positions for a 9-handed table (0 is bottom center)
    // Coordinates are % relative to the table container center
    // x: -50 to 50, y: -50 to 50
    const BASE_POSITIONS = [
        { x: 0, y: 45 },    // Seat 0 (Bottom Center - The Anchor)
        { x: -35, y: 40 },  // Seat 1
        { x: -50, y: 15 },  // Seat 2
        { x: -45, y: -20 }, // Seat 3
        { x: -25, y: -45 }, // Seat 4 (Top Left)
        { x: 25, y: -45 },  // Seat 5 (Top Right)
        { x: 45, y: -20 },  // Seat 6
        { x: 50, y: 15 },   // Seat 7
        { x: 35, y: 40 },   // Seat 8
    ];

    // Compute standard positions rotated so Hero is at Index 0 visually
    const renderedSeats = useMemo(() => {
        // We need to map the logical seats to the visual positions.
        // If Hero is at logical index 3, then logical index 3 should map to visual index 0.
        // Visual[0] = Logical[heroIndex]
        // Visual[1] = Logical[heroIndex + 1]...

        return seats.map((seat, i) => {
            // Calculate relative offset from hero
            // If Hero is 3, Seat 4 is +1 away. Seat 2 is -1 (or +8) away.
            const offset = (i - heroSeatIndex + 9) % 9;
            const position = BASE_POSITIONS[offset];

            return {
                ...seat,
                x: position.x,
                y: position.y,
                scale: offset === 0 ? 1.2 : 0.8, // Hero is larger
                zIndex: offset === 0 ? 50 : 10 - offset // Hero on top
            };
        });
    }, [heroSeatIndex, seats]);

    return (
        <div className="relative w-[1000px] h-[600px] flex items-center justify-center">

            {/* 🌑 THE TABLE SURFACE (Void Style) */}
            <div className="absolute inset-0 bg-[#242526] rounded-[200px] border-[5px] border-[#3E4042] shadow-2xl overflow-hidden">
                {/* Felt Texture */}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #3E4042 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                {/* Center Logo */}
                <div className="absolute inset-0 flex items-center justify-center opacity-5">
                    <span className="text-9xl font-black tracking-tighter">IQ</span>
                </div>
            </div>

            {/* 🪑 SEATS & AVATARS */}
            {renderedSeats.map((seat) => (
                <motion.div
                    key={seat.id}
                    layout // Animate physical position changes
                    initial={false}
                    animate={{
                        left: `${50 + seat.x}%`,
                        top: `${50 + seat.y}%`,
                        scale: seat.scale,
                        zIndex: seat.zIndex
                    }}
                    transition={{ type: "spring", stiffness: 60, damping: 15 }} // Physics-based snapping
                    className="absolute w-24 h-24 flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2"
                >
                    {/* AVATAR RING */}
                    <motion.div
                        className={`
                            relative w-16 h-16 rounded-full border-2 bg-[#18191A] shadow-lg flex items-center justify-center
                            ${seat.isActive ? 'border-[#1877F2] shadow-[0_0_15px_#1877F2]' : 'border-[#3E4042]'}
                            ${seat.isFolded ? 'opacity-40 grayscale' : 'opacity-100'}
                        `}
                    >
                        {/* Seat Label/Badge */}
                        <div className="absolute -top-3 px-2 py-0.5 bg-[#3A3B3C] rounded-full text-[10px] font-bold text-[#E4E6EB] border border-[#3E4042] shadow-sm">
                            {seat.id}
                        </div>

                        {/* Avatar Placeholder */}
                        <div className="text-xs font-mono text-[#B0B3B8]">
                            {seat.isHero ? 'HERO' : 'VILLAIN'}
                        </div>

                        {/* CARDS (If Active) */}
                        {!seat.isFolded && (
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-[-10px]">
                                {/* If we have explicit cards, show them. Otherwise show backs for villains. */}
                                {seat.cards && seat.isHero ? (
                                    <>
                                        <div className="-rotate-6 mr-[-30px] z-10 hover:-translate-y-4 transition-transform duration-200">
                                            <PlayingCard card={seat.cards[0]} width={40} isHero />
                                        </div>
                                        <div className="rotate-6 z-20 hover:-translate-y-4 transition-transform duration-200">
                                            <PlayingCard card={seat.cards[1]} width={40} isHero />
                                        </div>
                                    </>
                                ) : seat.isActive && !seat.isHero ? (
                                    <>
                                        {/* Back of cards for Villain */}
                                        <div className="-rotate-6 mr-[-30px]">
                                            <PlayingCard card="Xx" width={30} isFaceUp={false} />
                                        </div>
                                        <div className="rotate-6">
                                            <PlayingCard card="Xx" width={30} isFaceUp={false} />
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        )}
                    </motion.div>

                    {/* CHIP STACK */}
                    <div className="mt-8 text-xs font-mono font-bold text-[#B0B3B8] bg-[#242526]/80 px-2 py-0.5 rounded-md border border-[#3E4042]">
                        {seat.chips} BB
                    </div>
                </motion.div>
            ))}

            {/* 🧠 THE BOARD (Community Cards) - Center */}
            <div className="absolute flex gap-2 items-center justify-center">
                {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="relative">
                        {board[i] ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5, y: -50 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ delay: i * 0.1, type: "spring" }}
                            >
                                <PlayingCard card={board[i]} width={50} />
                            </motion.div>
                        ) : (
                            // Empty Slot
                            <div className="w-[50px] h-[70px] rounded-lg bg-[#3A3B3C]/20 border-2 border-[#3E4042] border-dashed opacity-30" />
                        )}
                    </div>
                ))}
            </div>

        </div>
    );
};
