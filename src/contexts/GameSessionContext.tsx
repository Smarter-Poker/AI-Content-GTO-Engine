import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { eventBus, busEmit } from '../core/EventBus';
import { xpEngine, XPState } from '../core/XPEngine';
import { diamondEngine, DiamondState } from '../core/DiamondEngine';
import { drillQuestionService, DrillQuestion, ActionOption } from '../services/DrillQuestionService';
import { sessionService } from '../services/SessionService';
import { masteryService, LevelAdvancementResult } from '../services/MasteryService';

/**
 * 🎮 GAME SESSION CONTROLLER (REACT CONTEXT)
 * ═══════════════════════════════════════════════════════════════════════════
 * The "Video Game" state manager. Coordinates all systems for a cohesive
 * arcade-like experience.
 * 
 * Manages:
 * - Current question/scenario
 * - Timer and pressure state
 * - XP and Diamond sync
 * - Decision evaluation
 * - Session lifecycle
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface GameSessionState {
    // Session
    isActive: boolean;
    gameId: string | null;
    gameName: string | null;
    currentLevel: number;

    // Current Question
    currentQuestion: DrillQuestion | null;
    questionNumber: number;
    totalQuestions: number;

    // Timer
    timerActive: boolean;
    timerDuration: number;
    timeRemaining: number;

    // Pressure
    pressureLevel: 'low' | 'medium' | 'high' | 'critical';
    fastDecisionBonus: number;

    // Stats
    xpState: XPState;
    diamondState: DiamondState;

    // Decision State
    lastDecision: 'correct' | 'incorrect' | null;
    lastXPGained: number;
    showingFeedback: boolean;
}

interface GameSessionActions {
    startSession: (gameId: string, gameName: string, level: number) => Promise<void>;
    endSession: () => Promise<LevelAdvancementResult | null>;
    nextQuestion: () => Promise<void>;
    submitAnswer: (action: string) => void;
    pauseTimer: () => void;
    resumeTimer: () => void;
}

const initialState: GameSessionState = {
    isActive: false,
    gameId: null,
    gameName: null,
    currentLevel: 1,
    currentQuestion: null,
    questionNumber: 0,
    totalQuestions: 20,
    timerActive: false,
    timerDuration: 15,
    timeRemaining: 15,
    pressureLevel: 'low',
    fastDecisionBonus: 1.0,
    xpState: xpEngine.getState(),
    diamondState: diamondEngine.getState(),
    lastDecision: null,
    lastXPGained: 0,
    showingFeedback: false
};

const GameSessionContext = createContext<{
    state: GameSessionState;
    actions: GameSessionActions;
} | null>(null);

export const GameSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<GameSessionState>(initialState);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);

    // Sync XP state
    useEffect(() => {
        const unsub = xpEngine.subscribe((xpState) => {
            setState(prev => ({ ...prev, xpState }));
        });
        return unsub;
    }, []);

    // Sync Diamond state
    useEffect(() => {
        const unsub = diamondEngine.subscribe((diamondState) => {
            setState(prev => ({ ...prev, diamondState }));
        });
        return unsub;
    }, []);

    // Timer logic
    useEffect(() => {
        if (!state.timerActive || state.timeRemaining <= 0) {
            return;
        }

        timerRef.current = setInterval(() => {
            setState(prev => {
                const newTime = prev.timeRemaining - 0.1;

                // Update pressure level
                let pressureLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
                const percent = (newTime / prev.timerDuration) * 100;
                if (percent <= 15) pressureLevel = 'critical';
                else if (percent <= 30) pressureLevel = 'high';
                else if (percent <= 50) pressureLevel = 'medium';

                // Emit pressure events
                if (pressureLevel !== prev.pressureLevel) {
                    if (pressureLevel === 'critical') {
                        busEmit.timerCritical();
                        busEmit.screenShake('light');
                    } else if (pressureLevel === 'high') {
                        busEmit.timerWarning();
                    }
                    eventBus.emit('PRESSURE_INCREASED', { level: pressureLevel }, 'GameSession');
                }

                // Timer expired
                if (newTime <= 0) {
                    busEmit.timerExpired();
                    return {
                        ...prev,
                        timeRemaining: 0,
                        timerActive: false,
                        pressureLevel: 'critical'
                    };
                }

                return { ...prev, timeRemaining: newTime, pressureLevel };
            });
        }, 100);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [state.timerActive, state.timeRemaining]);

    // Calculate fast decision bonus based on time used
    const calculateFastBonus = useCallback(() => {
        const timeUsed = state.timerDuration - state.timeRemaining;
        const percentUsed = (timeUsed / state.timerDuration) * 100;

        if (percentUsed <= 15) return 2.0;  // Lightning fast
        if (percentUsed <= 30) return 1.5;  // Fast
        if (percentUsed <= 50) return 1.25; // Normal-fast
        if (percentUsed <= 70) return 1.1;  // Normal
        return 1.0; // Slow
    }, [state.timerDuration, state.timeRemaining]);

    // ACTIONS

    const startSession = useCallback(async (gameId: string, gameName: string, level: number) => {
        // Reset engines
        xpEngine.resetSession();
        drillQuestionService.resetSeen();

        // Start session service
        await sessionService.startSession('local_user', gameId, gameName);

        // Get first question
        const firstQuestion = await drillQuestionService.getNextQuestion(gameId, level);

        setState(prev => ({
            ...prev,
            isActive: true,
            gameId,
            gameName,
            currentLevel: level,
            currentQuestion: firstQuestion,
            questionNumber: 1,
            timerActive: true,
            timerDuration: 15, // Base 15 seconds
            timeRemaining: 15,
            pressureLevel: 'low',
            xpState: xpEngine.getState(),
            lastDecision: null,
            showingFeedback: false
        }));

        startTimeRef.current = Date.now();

        eventBus.emit('SESSION_START', { gameId, gameName, level }, 'GameSession');
    }, []);

    const nextQuestion = useCallback(async () => {
        if (!state.gameId) return;

        const question = await drillQuestionService.getNextQuestion(state.gameId, state.currentLevel);

        setState(prev => ({
            ...prev,
            currentQuestion: question,
            questionNumber: prev.questionNumber + 1,
            timerActive: true,
            timeRemaining: prev.timerDuration,
            pressureLevel: 'low',
            lastDecision: null,
            showingFeedback: false
        }));
    }, [state.gameId, state.currentLevel]);

    const submitAnswer = useCallback((action: string) => {
        if (!state.currentQuestion || state.showingFeedback) return;

        // Stop timer
        setState(prev => ({ ...prev, timerActive: false }));

        // Find the selected action and GTO action
        const gtoAction = state.currentQuestion.actions.find((a: ActionOption) => a.isGTO);
        const selectedAction = state.currentQuestion.actions.find((a: ActionOption) => a.action === action);
        const isCorrect = selectedAction?.isGTO || false;

        // Calculate fast bonus
        const fastBonus = calculateFastBonus();

        // Record to XP engine
        let xpGained = 0;
        if (isCorrect) {
            const event = xpEngine.recordCorrect();
            xpGained = Math.round(event.totalXP * fastBonus);

            // Emit with fast bonus
            if (fastBonus > 1) {
                eventBus.emit('XP_BONUS', {
                    amount: Math.round((fastBonus - 1) * event.totalXP),
                    reason: `⚡ ${fastBonus}x FAST BONUS!`
                }, 'GameSession');
            }
        } else {
            xpEngine.recordIncorrect();
        }

        // Record to session service
        sessionService.recordHand({
            hero_cards: state.currentQuestion.heroCards,
            board: state.currentQuestion.board,
            hero_action: action,
            gto_action: gtoAction?.action || 'UNKNOWN',
            is_correct: isCorrect,
            ev_loss: isCorrect ? 0 : Math.abs((selectedAction?.ev || 0) - (gtoAction?.ev || 0)),
            streak_at_time: xpEngine.getState().currentStreak,
            xp_earned: xpGained
        });

        setState(prev => ({
            ...prev,
            lastDecision: isCorrect ? 'correct' : 'incorrect',
            lastXPGained: xpGained,
            fastDecisionBonus: fastBonus,
            showingFeedback: true
        }));

        // Auto-advance after feedback
        setTimeout(() => {
            if (state.questionNumber < state.totalQuestions) {
                nextQuestion();
            }
        }, 2000);
    }, [state.currentQuestion, state.showingFeedback, state.questionNumber, state.totalQuestions, calculateFastBonus, nextQuestion]);

    const endSession = useCallback(async () => {
        xpEngine.endSession();
        const completedSession = await sessionService.endSession();

        // Check level advancement
        let result: LevelAdvancementResult | null = null;
        if (completedSession && state.gameId) {
            result = await masteryService.checkLevelAdvancement(
                'local_user',
                state.gameId,
                completedSession.accuracy,
                completedSession.total_hands
            );

            if (result.canAdvance) {
                eventBus.emit('LEVEL_UNLOCKED', {
                    level: result.newLevel,
                    tier: getTier(result.newLevel),
                    gameId: state.gameId
                }, 'GameSession');
            }
        }

        setState(initialState);

        return result;
    }, [state.gameId]);

    const pauseTimer = useCallback(() => {
        setState(prev => ({ ...prev, timerActive: false }));
    }, []);

    const resumeTimer = useCallback(() => {
        setState(prev => ({ ...prev, timerActive: true }));
    }, []);

    const actions: GameSessionActions = {
        startSession,
        endSession,
        nextQuestion,
        submitAnswer,
        pauseTimer,
        resumeTimer
    };

    return (
        <GameSessionContext.Provider value={{ state, actions }}>
            {children}
        </GameSessionContext.Provider>
    );
};

/**
 * Hook to access game session
 */
export const useGameSession = () => {
    const context = useContext(GameSessionContext);
    if (!context) {
        throw new Error('useGameSession must be used within GameSessionProvider');
    }
    return context;
};

/**
 * Get tier from level
 */
function getTier(level: number): string {
    if (level >= 11) return 'BOSS';
    if (level >= 9) return 'ELITE';
    if (level >= 7) return 'ADVANCED';
    if (level >= 5) return 'INTERMEDIATE';
    if (level >= 3) return 'STANDARD';
    return 'BEGINNER';
}
