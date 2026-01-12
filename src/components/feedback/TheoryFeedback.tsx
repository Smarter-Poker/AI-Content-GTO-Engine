import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 📚 THEORY FEEDBACK OVERLAY
 * ═══════════════════════════════════════════════════════════════════════════
 * The "Teacher" component. Shows WHY a decision was correct or incorrect.
 * 
 * Triple-Truth Display:
 * - GTO Line (What the solver says)
 * - Your Action (What you did)
 * - EV Comparison (How much value lost/gained)
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface ActionLine {
    action: string; // 'CALL', 'RAISE 5.5bb', 'FOLD'
    ev: number; // Expected value in BB
    frequency?: number; // 0-100 (how often this should be chosen)
    isGTO?: boolean;
    isSelected?: boolean;
}

interface TheoryFeedbackProps {
    isOpen: boolean;
    isCorrect: boolean;
    heroCards: [string, string];
    board: string[];
    pot: number;
    actions: ActionLine[];
    gtoExplanation?: string;
    onClose: () => void;
    onNextHand: () => void;
}

export const TheoryFeedback: React.FC<TheoryFeedbackProps> = ({
    isOpen,
    isCorrect,
    heroCards,
    board,
    pot,
    actions,
    gtoExplanation,
    onClose,
    onNextHand
}) => {
    const gtoAction = actions.find(a => a.isGTO);
    const selectedAction = actions.find(a => a.isSelected);
    const evLoss = selectedAction && gtoAction ? gtoAction.ev - selectedAction.ev : 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 50 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-[600px] bg-[#242526] border border-[#3E4042] rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* HEADER */}
                        <div className={`h-16 flex items-center justify-between px-6 border-b border-[#3E4042] ${isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'
                            }`}>
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">{isCorrect ? '✅' : '❌'}</span>
                                <div>
                                    <div className={`text-xl font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                        {isCorrect ? 'CORRECT PLAY' : 'MISTAKE DETECTED'}
                                    </div>
                                    {!isCorrect && evLoss > 0 && (
                                        <div className="text-xs text-red-300">
                                            EV Loss: -{evLoss.toFixed(2)} BB
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-[#3A3B3C] hover:bg-[#4E4F50] flex items-center justify-center text-[#B0B3B8]"
                            >
                                ✕
                            </button>
                        </div>

                        {/* SITUATION RECAP */}
                        <div className="p-6 border-b border-[#3E4042]">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex gap-2">
                                    {heroCards.map((card, i) => (
                                        <div key={i} className="w-12 h-16 bg-white rounded-lg flex items-center justify-center text-xl font-bold text-black shadow-lg">
                                            {card}
                                        </div>
                                    ))}
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-[#B0B3B8] uppercase">Pot</div>
                                    <div className="text-xl font-bold text-[#1877F2]">{pot.toFixed(1)} BB</div>
                                </div>
                            </div>
                            {board.length > 0 && (
                                <div className="flex gap-2 justify-center">
                                    {board.map((card, i) => (
                                        <div key={i} className="w-10 h-14 bg-[#3A3B3C] rounded flex items-center justify-center text-sm font-bold text-white border border-[#3E4042]">
                                            {card}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ACTION COMPARISON */}
                        <div className="p-6">
                            <div className="text-xs text-[#B0B3B8] uppercase tracking-wider mb-3">Action Analysis</div>
                            <div className="space-y-2">
                                {actions.sort((a, b) => b.ev - a.ev).map((action, i) => (
                                    <div
                                        key={i}
                                        className={`flex items-center justify-between p-3 rounded-lg border ${action.isGTO
                                                ? 'bg-green-500/10 border-green-500/30'
                                                : action.isSelected && !action.isGTO
                                                    ? 'bg-red-500/10 border-red-500/30'
                                                    : 'bg-[#18191A] border-[#3E4042]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {action.isGTO && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-bold">GTO</span>}
                                            {action.isSelected && <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${action.isGTO ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>YOU</span>}
                                            <span className="font-bold text-white">{action.action}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {action.frequency !== undefined && (
                                                <div className="text-xs text-[#B0B3B8]">
                                                    {action.frequency}% freq
                                                </div>
                                            )}
                                            <div className={`font-mono font-bold ${action.ev >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {action.ev >= 0 ? '+' : ''}{action.ev.toFixed(2)} EV
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* EXPLANATION */}
                        {gtoExplanation && (
                            <div className="px-6 pb-4">
                                <div className="p-4 bg-[#18191A] rounded-lg border border-[#3E4042]">
                                    <div className="text-xs text-[#B0B3B8] uppercase tracking-wider mb-2">💡 Insight</div>
                                    <p className="text-sm text-[#E4E6EB]">{gtoExplanation}</p>
                                </div>
                            </div>
                        )}

                        {/* FOOTER */}
                        <div className="p-4 bg-[#18191A] border-t border-[#3E4042] flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-6 py-2 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-white font-bold transition-colors"
                            >
                                Review
                            </button>
                            <button
                                onClick={onNextHand}
                                className="px-6 py-2 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold transition-colors"
                            >
                                Next Hand →
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
