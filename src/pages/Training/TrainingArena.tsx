/**
 * 🎮 TRAINING ARENA — ADDICTIVE GTO DRILL INTERFACE
 * ═══════════════════════════════════════════════════════════════════════════
 * High-fidelity kinetic feedback with shatter/zoom animations.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerState } from '../../providers/PlayerStateProvider';
import TheoryFeedback from './TheoryFeedback';
import { PlayingCard, StreakPopup, ProgressBar, ActionButton } from './TrainingComponents';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Question {
    question_id: string;
    level_id: number;
    concept_category: string;
    title: string;
    description?: string;
    hero_cards: string[];
    board_cards: string[];
    pot_size: number;
    effective_stack: number;
    position: string;
    street: string;
    gto_line: Record<string, any>;
    alternate_lines: Record<string, any>[];
    available_actions: string[];
    correct_action: string;
}

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

interface TrainingArenaProps {
    levelId: number;
    sessionId: string;
    questions: Question[];
    onComplete: (results: any) => void;
    onExit: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎮 TRAINING ARENA
// ═══════════════════════════════════════════════════════════════════════════════

export const TrainingArena: React.FC<TrainingArenaProps> = ({
    levelId, sessionId, questions, onComplete, onExit
}) => {
    const playerState = usePlayerState();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [xpEarned, setXpEarned] = useState(0);
    const [diamondsEarned, setDiamondsEarned] = useState(0);
    const [leakSignals, setLeakSignals] = useState<string[]>([]);

    const [isAnswering, setIsAnswering] = useState(false);
    const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
    const [showStreakPopup, setShowStreakPopup] = useState(false);
    const [cardShatter, setCardShatter] = useState(false);

    const currentQuestion = questions[currentIndex];

    const handleAnswer = useCallback(async (action: string) => {
        if (isAnswering || !currentQuestion) return;
        setIsAnswering(true);
        setCardShatter(true);

        const isCorrect = action.toLowerCase() === currentQuestion.correct_action.toLowerCase();

        const result: AnswerResult = {
            is_correct: isCorrect,
            correct_action: currentQuestion.correct_action,
            gto_line: currentQuestion.gto_line,
            alternate_lines: currentQuestion.alternate_lines,
            ev_earned: isCorrect ? 1.5 : 0,
            ev_lost: isCorrect ? 0 : 0.75,
            xp_earned: isCorrect ? 50 : 10,
            diamonds_earned: isCorrect && Math.random() < 0.1 ? 5 : 0,
            is_leak_signal: false,
            concept_category: currentQuestion.concept_category
        };

        setAnswerResult(result);

        if (isCorrect) {
            setCorrectCount(prev => prev + 1);
            const newStreak = currentStreak + 1;
            setCurrentStreak(newStreak);
            setMaxStreak(prev => Math.max(prev, newStreak));
            if (newStreak >= 5 && newStreak % 5 === 0) {
                setShowStreakPopup(true);
                setTimeout(() => setShowStreakPopup(false), 2000);
            }
        } else {
            setCurrentStreak(0);
        }

        setXpEarned(prev => prev + result.xp_earned);
        setDiamondsEarned(prev => prev + result.diamonds_earned);
        playerState.addXP(result.xp_earned);
        if (result.diamonds_earned > 0) playerState.addDiamonds(result.diamonds_earned);
    }, [currentQuestion, currentStreak, isAnswering, playerState]);

    const handleContinue = useCallback(() => {
        setCardShatter(false);
        setAnswerResult(null);
        setIsAnswering(false);

        if (currentIndex + 1 >= questions.length) {
            onComplete({
                accuracy: correctCount / questions.length,
                totalQuestions: questions.length,
                correctAnswers: correctCount,
                xpEarned, diamondsEarned, maxStreak, leakSignals,
                masteryAchieved: (correctCount / questions.length) >= 0.85
            });
        } else {
            setCurrentIndex(prev => prev + 1);
        }
    }, [currentIndex, questions.length, correctCount, xpEarned, diamondsEarned, maxStreak, leakSignals, onComplete]);

    if (!currentQuestion) return <div>Loading...</div>;

    return (
        <div className="training-arena">
            <div className="arena-header">
                <div className="level-badge glass">Level {levelId}</div>
                <motion.button className="exit-btn glass" onClick={onExit} whileHover={{ scale: 1.05 }}>
                    ✕ Exit
                </motion.button>
            </div>

            <ProgressBar current={currentIndex + 1} total={questions.length} correct={correctCount} />

            <AnimatePresence>
                <StreakPopup streak={currentStreak} isVisible={showStreakPopup} />
            </AnimatePresence>

            <div className="question-container">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentQuestion.question_id}
                        className="question-card glass-heavy"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: cardShatter ? 0 : 1, scale: cardShatter ? 1.3 : 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                    >
                        <div className="scenario-tags">
                            <span className="tag position">{currentQuestion.position}</span>
                            <span className="tag street">{currentQuestion.street}</span>
                            <span className="tag category">{currentQuestion.concept_category}</span>
                        </div>

                        <h2 className="question-title">{currentQuestion.title}</h2>

                        <div className="cards-display">
                            <div className="card-group">
                                <span className="label">Your Hand</span>
                                <div className="cards">
                                    {currentQuestion.hero_cards.map((c, i) => (
                                        <PlayingCard key={c} card={c} delay={i * 0.1} />
                                    ))}
                                </div>
                            </div>
                            {currentQuestion.board_cards.length > 0 && (
                                <div className="card-group">
                                    <span className="label">Board</span>
                                    <div className="cards">
                                        {currentQuestion.board_cards.map((c, i) => (
                                            <PlayingCard key={c} card={c} delay={0.2 + i * 0.1} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="stack-info">
                            <div><span>Pot</span><strong>${currentQuestion.pot_size}</strong></div>
                            <div><span>Stack</span><strong>${currentQuestion.effective_stack}</strong></div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="actions">
                {!answerResult ? (
                    <div className="action-grid">
                        {currentQuestion.available_actions.map(action => (
                            <ActionButton key={action} action={action} onClick={() => handleAnswer(action)} disabled={isAnswering} />
                        ))}
                    </div>
                ) : (
                    <motion.button className="continue-btn neon-border-poker glass" onClick={handleContinue}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ scale: 1.03 }}>
                        {currentIndex + 1 >= questions.length ? '🏆 Complete' : '→ Next'}
                    </motion.button>
                )}
            </div>

            <AnimatePresence>
                {answerResult && <TheoryFeedback result={answerResult} onDismiss={handleContinue} />}
            </AnimatePresence>

            <style>{arenaStyles}</style>
        </div>
    );
};

const arenaStyles = `
.training-arena { min-height: 100vh; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.arena-header { display: flex; justify-content: space-between; align-items: center; }
.level-badge { padding: 8px 16px; border-radius: 10px; font-weight: 600; color: var(--color-poker-primary); }
.exit-btn { padding: 8px 16px; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; background: transparent; color: rgba(248,250,252,0.7); cursor: pointer; }
.question-container { flex: 1; display: flex; align-items: center; justify-content: center; }
.question-card { width: 100%; max-width: 600px; padding: 32px; border-radius: 20px; }
.scenario-tags { display: flex; gap: 8px; margin-bottom: 16px; }
.tag { padding: 6px 12px; background: rgba(255,255,255,0.05); border-radius: 8px; font-size: 0.75rem; }
.tag.position { color: var(--color-poker-primary); }
.tag.street { color: var(--color-diamond); }
.question-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 24px; color: #F8FAFC; }
.cards-display { display: flex; justify-content: center; gap: 40px; margin: 24px 0; }
.card-group { text-align: center; }
.card-group .label { display: block; font-size: 0.75rem; color: rgba(248,250,252,0.5); margin-bottom: 8px; }
.cards { display: flex; gap: 8px; }
.stack-info { display: flex; justify-content: center; gap: 32px; }
.stack-info div { text-align: center; }
.stack-info span { display: block; font-size: 0.75rem; color: rgba(248,250,252,0.5); }
.stack-info strong { font-size: 1.25rem; color: var(--color-poker-primary); }
.actions { display: flex; justify-content: center; padding: 24px 0; }
.action-grid { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
.continue-btn { padding: 16px 40px; border: none; border-radius: 14px; background: transparent; font-size: 1.1rem; font-weight: 700; color: var(--color-poker-primary); cursor: pointer; }
`;

export default TrainingArena;
