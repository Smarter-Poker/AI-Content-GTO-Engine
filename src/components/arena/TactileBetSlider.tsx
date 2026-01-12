import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

/**
 * 🎚️ TACTILE BET SLIDER
 * 
 * A rich, physical input for bet sizing.
 * - Draggable progress bar
 * - Pot-relative shortcuts
 * - Haptic visual feedback
 */

interface TactileBetSliderProps {
    min: number;
    max: number;
    pot: number;
    value: number;
    onChange: (val: number) => void;
}

export const TactileBetSlider: React.FC<TactileBetSliderProps> = ({ min, max, pot, value, onChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Calculate percentage for width
    // Avoid division by zero
    const range = max - min;
    const progressPercent = range > 0 ? ((value - min) / range) * 100 : 0;

    const handleInteraction = (clientX: number) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = x / rect.width;

        // Map percentage back to value
        // Discrete steps of 0.1 BB
        let newValue = min + (percentage * range);
        newValue = Math.round(newValue * 10) / 10; // Round to 0.1

        onChange(Math.max(min, Math.min(newValue, max)));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        handleInteraction(e.clientX);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
            handleInteraction(e.clientX);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Global mouse listeners for drag
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // Shortcuts
    const setPotPct = (pct: number) => {
        const val = pot * pct;
        // Clamp between min/max logic would normally happen here, 
        // but for unlimited NLHE we usually just clamp min. 
        // Max is stack.
        let safeVal = Math.max(min, Math.min(val, max));
        safeVal = Math.round(safeVal * 10) / 10;
        onChange(safeVal);
    };

    return (
        <div className="relative h-14 bg-[#18191A] rounded-xl border border-[#3E4042] flex items-center overflow-hidden group select-none transition-colors hover:border-[#1877F2]/50">

            {/* 🖱️ INTERACTION LAYER */}
            <div
                ref={containerRef}
                className="absolute inset-0 z-20 cursor-ew-resize"
                onMouseDown={handleMouseDown}
            />

            {/* 📊 PROGRESS FILL */}
            <div
                className="absolute left-0 top-0 bottom-0 bg-[#1877F2]/10 border-r border-[#1877F2] transition-all duration-75 ease-out"
                style={{ width: `${Math.max(0, Math.min(progressPercent, 100))}%` }}
            />

            {/* 🏷️ VALUE LABEL */}
            <div className="relative z-10 px-4 flex flex-col justify-center pointer-events-none">
                <span className="font-mono font-bold text-[#1877F2] text-lg leading-none">
                    {value.toFixed(1)} <span className="text-xs opacity-50">BB</span>
                </span>
                <span className="text-[9px] text-[#B0B3B8] font-bold uppercase tracking-wider mt-0.5">
                    {(progressPercent).toFixed(0)}% RANGE
                </span>
            </div>

            {/* ⚡️ SHORTCUTS (Z-Index above interaction layer to be clickables? No, ideally separate)
                Actually, putting them inside creates a conflict with the slider drag.
                Ideally shortcuts are NEXT to the slider or on top if we manage z-index carefully.
                Let's put them on the right, active.
            */}
            <div className="absolute right-2 z-30 flex gap-1">
                {[0.33, 0.50, 0.75, 1.0].map(pct => (
                    <button
                        key={pct}
                        onClick={(e) => { e.stopPropagation(); setPotPct(pct); }}
                        className="text-[10px] bg-[#3A3B3C] hover:bg-[#1877F2] px-2 py-1 rounded text-[#B0B3B8] hover:text-white font-bold transition-colors min-w-[32px]"
                    >
                        {pct === 1 ? 'POT' : `${pct * 100}%`}
                    </button>
                ))}
            </div>
        </div>
    );
};
