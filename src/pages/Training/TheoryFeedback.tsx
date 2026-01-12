/**
 * 🎯 THEORY FEEDBACK — GTO OVERLAY & LEAK DETECTION
 * ═══════════════════════════════════════════════════════════════════════════
 * 3D glassmorphism overlay showing GTO Line + Alternates.
 * Leak Signal detection with forced review.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnswerResult {
    is_correct: boolean;
    correct_action: string;
    gto_line: Record<string, any>;
    alternate_lines: Record<string, any>[];
    ev_earned: number;
    ev_lost: number;
    xp_earned: number;
    diamonds_earned: number;
    is_leak_signal: boolean;
    concept_category: string;
}

interface TheoryFeedbackProps {
    result: AnswerResult;
    onDismiss: () => void;
}

export const TheoryFeedback: React.FC<TheoryFeedbackProps> = ({ result, onDismiss }) => {
    const [showTheory, setShowTheory] = useState(!result.is_correct);
    const [leakAcknowledged, setLeakAcknowledged] = useState(false);

    const canDismiss = !result.is_leak_signal || leakAcknowledged;

    return (
        <motion.div
            className={`theory-overlay ${result.is_correct ? 'correct' : 'incorrect'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="theory-panel glass-heavy"
                initial={{ scale: 0.9, y: 50, rotateX: -10 }}
                animate={{ scale: 1, y: 0, rotateX: 0 }}
                exit={{ scale: 0.9, y: 50 }}
                style={{ transformPerspective: 1000 }}
            >
                {/* Result Header */}
                <div className={`result-header ${result.is_correct ? 'success' : 'failure'}`}>
                    <motion.span
                        className="result-icon"
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.3, 1] }}
                        transition={{ delay: 0.2 }}
                    >
                        {result.is_correct ? '✅' : '❌'}
                    </motion.span>
                    <div className="result-text">
                        <h2>{result.is_correct ? 'Correct!' : 'Incorrect'}</h2>
                        <p>GTO Action: <strong>{result.correct_action.toUpperCase()}</strong></p>
                    </div>
                </div>

                {/* EV Display */}
                <div className="ev-display">
                    {result.is_correct ? (
                        <div className="ev-earned">
                            <span className="ev-label">EV Earned</span>
                            <span className="ev-value positive">+{result.ev_earned.toFixed(2)} BB</span>
                        </div>
                    ) : (
                        <div className="ev-lost">
                            <span className="ev-label">EV Lost</span>
                            <span className="ev-value negative">-{result.ev_lost.toFixed(2)} BB</span>
                        </div>
                    )}
                </div>

                {/* Rewards */}
                <div className="rewards-row">
                    <div className="reward">
                        <span>⭐</span>
                        <span>+{result.xp_earned} XP</span>
                    </div>
                    {result.diamonds_earned > 0 && (
                        <motion.div
                            className="reward diamond"
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.5, 1] }}
                        >
                            <span>💎</span>
                            <span>+{result.diamonds_earned}</span>
                        </motion.div>
                    )}
                </div>

                {/* Theory Toggle (for correct answers) */}
                {result.is_correct && (
                    <button
                        className="theory-toggle"
                        onClick={() => setShowTheory(!showTheory)}
                    >
                        {showTheory ? '▼ Hide Theory' : '▶ Show Theory'}
                    </button>
                )}

                {/* GTO Theory Breakdown */}
                <AnimatePresence>
                    {showTheory && (
                        <motion.div
                            className="theory-breakdown"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                        >
                            <div className="gto-line">
                                <h3>📊 GTO Line</h3>
                                <div className="line-details">
                                    <span className="action">{result.gto_line.action}</span>
                                    {result.gto_line.size && (
                                        <span className="size">{result.gto_line.size}</span>
                                    )}
                                    <span className="ev">EV: {result.gto_line.ev?.toFixed(2) || '—'}</span>
                                </div>
                                {result.gto_line.explanation && (
                                    <p className="explanation">{result.gto_line.explanation}</p>
                                )}
                            </div>

                            {result.alternate_lines.length > 0 && (
                                <div className="alternate-lines">
                                    <h3>🔄 Alternate Lines</h3>
                                    {result.alternate_lines.map((line, i) => (
                                        <div key={i} className="alt-line">
                                            <span className="alt-action">{line.action}</span>
                                            <span className="alt-ev">EV: {line.ev?.toFixed(2) || '—'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Leak Signal Alert */}
                <AnimatePresence>
                    {result.is_leak_signal && !leakAcknowledged && (
                        <motion.div
                            className="leak-signal"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="leak-header">
                                <span className="leak-icon">🚨</span>
                                <h3>LEAK DETECTED</h3>
                            </div>
                            <p>You've missed <strong>{result.concept_category}</strong> twice this session.</p>
                            <p className="leak-instruction">Review the GTO strategy above before continuing.</p>
                            <motion.button
                                className="leak-acknowledge"
                                onClick={() => setLeakAcknowledged(true)}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                ✓ I've Reviewed the Strategy
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Continue Button */}
                {canDismiss && (
                    <motion.button
                        className="continue-btn glass neon-border-poker"
                        onClick={onDismiss}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                    >
                        Continue →
                    </motion.button>
                )}
            </motion.div>

            <style>{theoryStyles}</style>
        </motion.div>
    );
};

const theoryStyles = `
.theory-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
    padding: 24px;
}
.theory-overlay.correct { background: rgba(0, 255, 136, 0.1); }
.theory-overlay.incorrect { background: rgba(255, 68, 68, 0.15); }

.theory-panel {
    width: 100%;
    max-width: 500px;
    padding: 32px;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.result-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border-radius: 12px;
}
.result-header.success { background: rgba(0, 255, 136, 0.1); }
.result-header.failure { background: rgba(255, 68, 68, 0.1); }
.result-icon { font-size: 2.5rem; }
.result-text h2 { font-size: 1.5rem; font-weight: 700; color: #F8FAFC; margin-bottom: 4px; }
.result-text p { color: rgba(248, 250, 252, 0.7); }
.result-text strong { color: var(--color-poker-primary); }

.ev-display { text-align: center; }
.ev-label { display: block; font-size: 0.75rem; color: rgba(248, 250, 252, 0.5); margin-bottom: 4px; }
.ev-value { font-size: 1.5rem; font-weight: 700; }
.ev-value.positive { color: var(--color-poker-primary); }
.ev-value.negative { color: var(--color-xp-primary); }

.rewards-row { display: flex; justify-content: center; gap: 24px; }
.reward { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--color-poker-primary); }
.reward.diamond { color: var(--color-diamond); }

.theory-toggle {
    background: transparent;
    border: none;
    color: var(--color-diamond);
    cursor: pointer;
    padding: 8px;
    font-size: 0.875rem;
}

.theory-breakdown {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    padding: 20px;
    overflow: hidden;
}
.theory-breakdown h3 { font-size: 0.875rem; color: var(--color-poker-primary); margin-bottom: 12px; }
.line-details { display: flex; gap: 12px; margin-bottom: 8px; }
.line-details span { padding: 6px 12px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; font-size: 0.875rem; }
.action { color: var(--color-poker-primary); font-weight: 600; }
.explanation { font-size: 0.875rem; color: rgba(248, 250, 252, 0.7); line-height: 1.5; }
.alternate-lines { margin-top: 16px; }
.alt-line { display: flex; justify-content: space-between; padding: 8px 12px; background: rgba(255, 255, 255, 0.02); border-radius: 8px; margin-bottom: 8px; }
.alt-action { color: rgba(248, 250, 252, 0.8); }
.alt-ev { color: rgba(248, 250, 252, 0.5); font-size: 0.875rem; }

.leak-signal {
    background: rgba(255, 68, 68, 0.15);
    border: 2px solid var(--color-xp-primary);
    border-radius: 16px;
    padding: 24px;
    text-align: center;
}
.leak-header { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 12px; }
.leak-icon { font-size: 2rem; }
.leak-header h3 { color: var(--color-xp-primary); font-size: 1.25rem; }
.leak-signal p { color: rgba(248, 250, 252, 0.8); margin-bottom: 8px; }
.leak-instruction { font-style: italic; color: rgba(248, 250, 252, 0.6); }
.leak-acknowledge {
    margin-top: 16px;
    padding: 12px 24px;
    background: var(--color-xp-primary);
    border: none;
    border-radius: 10px;
    color: #FFF;
    font-weight: 600;
    cursor: pointer;
}

.continue-btn {
    padding: 16px 32px;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: var(--color-poker-primary);
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    align-self: center;
}
`;

export default TheoryFeedback;
