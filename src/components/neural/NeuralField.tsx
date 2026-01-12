import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

/**
 * 🧠 NEURAL FIELD
 * The "Living" Background for the PokerIQ Training Monolith.
 *
 * Features:
 * - Dynamic "Brain Lines" connecting solver nodes
 * - Parallax depth layers
 * - "Facebook Dark" Palette Integration (#18191A bg, #1877F2 accents)
 */

interface Neuron {
    id: number;
    x: number;
    y: number;
    connections: number[];
}

export const NeuralField: React.FC = () => {
    const [neurons, setNeurons] = useState<Neuron[]>([]);
    
    // Initialize Neuron Grid
    useEffect(() => {
        const grid: Neuron[] = [];
        const count = 30; // Number of nodes
        
        for (let i = 0; i < count; i++) {
            grid.push({
                id: i,
                x: Math.random() * 100, // %
                y: Math.random() * 100, // %
                connections: [
                    Math.floor(Math.random() * count),
                    Math.floor(Math.random() * count)
                ]
            });
        }
        setNeurons(grid);
    }, []);

    return (
        <div className="fixed inset-0 z-0 overflow-hidden bg-[#18191A]">
            {/* 🌌 DEEP VOID LAYER */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#18191A] to-[#242526] opacity-90" />

            {/* 🕸️ SOLVER GRID (Base Layer) */}
            <div 
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(#1877F2 1px, transparent 1px), linear-gradient(90deg, #1877F2 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />

            {/* 🧠 SYNAPTIC CONNECTIONS */}
            <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
                {neurons.map((n, i) => (
                    n.connections.map((targetId, j) => {
                        const target = neurons[targetId];
                        return (
                            <motion.line
                                key={`${i}-${j}`}
                                x1={`${n.x}%`}
                                y1={`${n.y}%`}
                                x2={`${target?.x}%`}
                                y2={`${target?.y}%`}
                                stroke="#1877F2"
                                strokeWidth="1"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ 
                                    pathLength: [0, 1, 0],
                                    opacity: [0, 0.5, 0]
                                }}
                                transition={{
                                    duration: Math.random() * 5 + 3,
                                    repeat: Infinity,
                                    ease: "linear",
                                    delay: Math.random() * 5
                                }}
                            />
                        );
                    })
                ))}
            </svg>

            {/* ✨ FLOATING NEURONS */}
            {neurons.map((n) => (
                <motion.div
                    key={n.id}
                    className="absolute w-1 h-1 bg-[#1877F2] rounded-full blur-[1px]"
                    style={{ left: `${n.x}%`, top: `${n.y}%` }}
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.2, 0.6, 0.2]
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: Math.random() * 2
                    }}
                />
            ))}

            {/* 💡 LIVE EDGE GLOW (The "Facebook Blue" Aura) */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#1877F2] to-transparent opacity-50 shadow-[0_0_20px_#1877F2]" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#1877F2]/10 to-transparent pointer-events-none" />
        </div>
    );
};
