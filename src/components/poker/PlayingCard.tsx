import React from 'react';
import { motion } from 'framer-motion';

/**
 * 🃏 KINETIC PLAYING CARD
 * 
 * Features:
 * - 3D Flip Physics
 * - Vector Suits
 * - "Shatter" on Fold (Todo)
 * - Premium Video Game Feel
 */

interface PlayingCardProps {
    card: string; // "Ah", "Kd", "10s", "2c"
    isFaceUp?: boolean;
    isHero?: boolean;
    width?: number; // width in pixels (aspect ratio 1.4)
}

const SUITS: Record<string, { color: string, icon: JSX.Element }> = {
    'h': { color: '#ef4444', icon: <HeartIcon /> },
    'd': { color: '#3b82f6', icon: <DiamondIcon /> }, // Blue Diamonds for 4-color deck (optional) or Red
    'c': { color: '#10b981', icon: <ClubIcon /> },    // Green Clubs
    's': { color: '#1f2937', icon: <SpadeIcon /> }    // Black Spades
};

// Standard Red/Black for now, 4-color later if requested
const STANDARD_SUITS: Record<string, { color: string, icon: JSX.Element }> = {
    'h': { color: '#DC2626', icon: <HeartIcon /> },
    'd': { color: '#2563EB', icon: <DiamondIcon /> }, // Blue diamonds! (4-color deck is standard for training)
    'c': { color: '#16A34A', icon: <ClubIcon /> },    // Green clubs
    's': { color: '#1F2937', icon: <SpadeIcon /> }    // Black spades
};


export const PlayingCard: React.FC<PlayingCardProps> = ({ card, isFaceUp = true, isHero = false, width = 60 }) => {
    const rank = card.slice(0, -1);
    const suitChar = card.slice(-1).toLowerCase();
    const suit = STANDARD_SUITS[suitChar] || STANDARD_SUITS['s'];
    const height = width * 1.4;

    return (
        <div
            className="perspective-1000 relative select-none"
            style={{ width, height }}
        >
            <motion.div
                className="w-full h-full relative preserve-3d transition-transform duration-500"
                initial={false}
                animate={{ rotateY: isFaceUp ? 0 : 180 }}
            >
                {/* 🌝 FRONT FACE */}
                <div
                    className="absolute inset-0 backface-hidden rounded-lg bg-white shadow-xl flex flex-col items-center justify-between p-[10%] border border-gray-200"
                    style={{
                        boxShadow: isHero ? '0 0 15px rgba(255,255,255,0.4)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    {/* Top Left Rank */}
                    <div className="absolute top-1 left-1.5 flex flex-col items-center leading-none">
                        <span className="font-bold font-mono tracking-tighter text-[90%]" style={{ color: suit.color }}>{rank}</span>
                        <div className="w-2.5 h-2.5 scale-75">{suit.icon}</div>
                    </div>

                    {/* Center Suit (Big) */}
                    <div className="w-full h-full flex items-center justify-center opacity-100 scale-150" style={{ color: suit.color }}>
                        {suit.icon}
                    </div>

                    {/* Bottom Right Rank (Rotated) */}
                    <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180">
                        <span className="font-bold font-mono tracking-tighter text-[90%]" style={{ color: suit.color }}>{rank}</span>
                        <div className="w-2.5 h-2.5 scale-75">{suit.icon}</div>
                    </div>
                </div>

                {/* 🌚 BACK FACE */}
                <div
                    className="absolute inset-0 backface-hidden rounded-lg bg-[#1877F2] rotate-y-180 shadow-md border-2 border-white/20 overflow-hidden"
                    style={{ transform: 'rotateY(180deg)' }}
                >
                    {/* Pattern */}
                    <div className="absolute inset-0 opacity-20"
                        style={{
                            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                            backgroundSize: '8px 8px'
                        }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-white/50 flex items-center justify-center">
                            <div className="w-4 h-4 bg-white/50 rounded-full" />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// 🎨 SVG ICONS

function HeartIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
    );
}

function DiamondIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M19 12L12 22 5 12 12 2z" /> {/* Simplified Diamond */}
            <path d="M6 11l6-9 6 9-6 9-6-9z" /> {/* Correct Diamond */}
        </svg>
    );
}

function ClubIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M19.07 13c1.115-1.63 1.93-3.085 1.93-4.5 0-2.485-2.015-4.5-4.5-4.5-1.583 0-2.98.88-3.834 2.18C11.96 5.253 11.232 4 9.5 4 7.015 4 5 6.015 5 8.5c0 1.415.815 2.87 1.93 4.5C5.815 14.63 5 16.48 5 18.5 5 20.985 7.015 23 9.5 23c1.996 0 3.69-1.303 4.316-3.097.626 1.794 2.32 3.097 4.316 3.097 2.485 0 4.5-2.015 4.5-4.5 0-2.02-.815-3.87-1.564-5.5z" />
            <circle cx="9" cy="9" r="4" /> <circle cx="15" cy="9" r="4" /> <circle cx="12" cy="16" r="4" /> <rect x="11" y="16" width="2" height="6" />{/* That path was weird, using standard */}
            <path d="M12,2.5c-3,0-4.5,2.5-4.5,4.5c0,2,1.5,3.5,3,4c-2.5,0.5-4.5,2-4.5,4.5c0,2.5,2,4.5,4.5,4.5c0.5,0,0.5,0,0.5,2h2c0-2,0-2,0.5-2c2.5,0,4.5-2,4.5-4.5c0-2.5-2-4-4.5-4.5c1.5-0.5,3-2,3-4C16.5,5,15,2.5,12,2.5z" />
        </svg>
    );
}

function SpadeIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M12,2C9,2,2,9,2,13c0,3,2,5,5,5c2.5,0,4-2,5-4c1,2,2.5,4,5,4c3,0,5-2,5-5C22,9,15,2,12,2z M13,22h-2c0-2-1-3-1-3h4C14,19,13,20,13,22z" />
        </svg>
    );
}
