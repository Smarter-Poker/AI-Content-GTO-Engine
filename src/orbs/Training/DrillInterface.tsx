/**
 * ⚡️ ORB_04_TRAINING: DRILL INTERFACE
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎮 INTERACTIVE TRAINING UI WITH VIDEO GAME-LIKE FEEL
 * 
 * This component delivers:
 * - High-immersion poker training experience
 * - Physics-based animations and visual feedback
 * - Pressure mode with dynamic timer effects
 * - Streak tracking and combo bonuses
 * - Real-time EV loss visualization
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MasteryGate, getMasteryGate, MASTERY_THRESHOLD } from './MasteryGate';
import { LevelRegistry, getLevelRegistry, LevelDefinition, DrillConfiguration } from './LevelRegistry';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface Card {
    rank: string;
    suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
}

interface DrillScenario {
    id: string;
    heroCards: [Card, Card];
    boardCards: Card[];
    position: string;
    potSize: number;
    stackSize: number;
    villainAction: string;
    gtoSolution: {
        bestMove: string;
        bestMoveEv: number;
        alternatives: Array<{
            action: string;
            ev: number;
            evLoss: number;
        }>;
    };
}

interface DrillState {
    status: 'IDLE' | 'ACTIVE' | 'EVALUATING' | 'FEEDBACK' | 'COMPLETE';
    currentScenario: DrillScenario | null;
    scenarioIndex: number;
    totalScenarios: number;
    correctAnswers: number;
    streak: number;
    bestStreak: number;
    timeRemaining: number;
    isPressureMode: boolean;
}

interface ActionOption {
    action: string;
    label: string;
    size?: number;
    isGto?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const TIMER_PHASES = {
    SAFE: { color: '#4ADE80', glow: '0 0 20px #4ADE80', pulseSpeed: 0 },
    WARNING: { color: '#FBBF24', glow: '0 0 25px #FBBF24', pulseSpeed: 1.5 },
    DANGER: { color: '#F97316', glow: '0 0 30px #F97316', pulseSpeed: 1.0 },
    CRITICAL: { color: '#EF4444', glow: '0 0 40px #EF4444', pulseSpeed: 0.5 }
};

const STREAK_THRESHOLDS = {
    FIRE: 5,      // 🔥 Fire mode
    BLAZING: 10,  // 💥 Blazing mode  
    UNSTOPPABLE: 15 // ⚡ Unstoppable mode
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🃏 CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const CardDisplay: React.FC<{ card: Card; isRevealing?: boolean; index?: number }> = ({
    card,
    isRevealing = false,
    index = 0
}) => {
    const suitSymbols = {
        hearts: '♥',
        diamonds: '♦',
        clubs: '♣',
        spades: '♠'
    };

    const suitColors = {
        hearts: '#EF4444',
        diamonds: '#3B82F6',
        clubs: '#1F2937',
        spades: '#1F2937'
    };

    return (
        <div
            className={`card ${isRevealing ? 'card-reveal' : ''}`}
            style={{
                '--card-color': suitColors[card.suit],
                '--reveal-delay': `${index * 0.15}s`
            } as React.CSSProperties}
        >
            <span className="card-rank">{card.rank}</span>
            <span className="card-suit" style={{ color: suitColors[card.suit] }}>
                {suitSymbols[card.suit]}
            </span>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ⏱️ PRESSURE TIMER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const PressureTimer: React.FC<{
    timeRemaining: number;
    maxTime: number;
    isPressureMode: boolean;
}> = ({ timeRemaining, maxTime, isPressureMode }) => {
    const percentage = (timeRemaining / maxTime) * 100;

    let phase: keyof typeof TIMER_PHASES;
    if (percentage > 66) phase = 'SAFE';
    else if (percentage > 33) phase = 'WARNING';
    else if (percentage > 15) phase = 'DANGER';
    else phase = 'CRITICAL';

    const timerStyle = TIMER_PHASES[phase];

    return (
        <div className={`pressure-timer ${isPressureMode ? 'pressure-active' : ''}`}>
            <div className="timer-ring" style={{
                background: `conic-gradient(${timerStyle.color} ${percentage}%, #1F2937 0%)`,
                boxShadow: isPressureMode ? timerStyle.glow : 'none'
            }}>
                <div className="timer-inner">
                    <span
                        className="timer-value"
                        style={{
                            color: timerStyle.color,
                            animation: timerStyle.pulseSpeed > 0
                                ? `pulse ${timerStyle.pulseSpeed}s ease-in-out infinite`
                                : 'none'
                        }}
                    >
                        {timeRemaining}
                    </span>
                    <span className="timer-label">SEC</span>
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 STREAK INDICATOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const StreakIndicator: React.FC<{ streak: number; bestStreak: number }> = ({ streak, bestStreak }) => {
    let streakClass = 'streak-normal';
    let streakIcon = '✨';
    let streakLabel = 'STREAK';

    if (streak >= STREAK_THRESHOLDS.UNSTOPPABLE) {
        streakClass = 'streak-unstoppable';
        streakIcon = '⚡';
        streakLabel = 'UNSTOPPABLE!';
    } else if (streak >= STREAK_THRESHOLDS.BLAZING) {
        streakClass = 'streak-blazing';
        streakIcon = '💥';
        streakLabel = 'BLAZING!';
    } else if (streak >= STREAK_THRESHOLDS.FIRE) {
        streakClass = 'streak-fire';
        streakIcon = '🔥';
        streakLabel = 'ON FIRE!';
    }

    return (
        <div className={`streak-indicator ${streakClass}`}>
            <div className="streak-icon">{streakIcon}</div>
            <div className="streak-count">{streak}</div>
            <div className="streak-label">{streakLabel}</div>
            {streak > 0 && bestStreak > 0 && (
                <div className="streak-best">Best: {bestStreak}</div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 PROGRESS BAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const ProgressBar: React.FC<{
    current: number;
    total: number;
    correct: number;
    levelColor: string;
}> = ({ current, total, correct, levelColor }) => {
    const progressPercent = (current / total) * 100;
    const accuracyPercent = current > 0 ? (correct / current) * 100 : 0;
    const isOnTrack = accuracyPercent >= MASTERY_THRESHOLD * 100;

    return (
        <div className="progress-container">
            <div className="progress-bar-bg">
                <div
                    className="progress-bar-fill"
                    style={{
                        width: `${progressPercent}%`,
                        background: levelColor
                    }}
                />
                <div className="progress-markers">
                    {Array.from({ length: total }, (_, i) => (
                        <div
                            key={i}
                            className={`progress-marker ${i < correct ? 'marker-correct' : i < current ? 'marker-incorrect' : ''}`}
                        />
                    ))}
                </div>
            </div>
            <div className="progress-stats">
                <span className="progress-count">{current}/{total}</span>
                <span
                    className={`progress-accuracy ${isOnTrack ? 'on-track' : 'needs-work'}`}
                >
                    {accuracyPercent.toFixed(0)}% Accuracy
                </span>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 ACTION BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const ActionButton: React.FC<{
    option: ActionOption;
    onSelect: (action: string) => void;
    disabled?: boolean;
    levelColor: string;
}> = ({ option, onSelect, disabled = false, levelColor }) => {
    return (
        <button
            className={`action-button ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && onSelect(option.action)}
            disabled={disabled}
            style={{ '--level-color': levelColor } as React.CSSProperties}
        >
            <span className="action-label">{option.label}</span>
            {option.size && (
                <span className="action-size">{option.size} BB</span>
            )}
        </button>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 FEEDBACK OVERLAY COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const FeedbackOverlay: React.FC<{
    isCorrect: boolean;
    gtoMove: string;
    evLoss: number;
    alternatives: Array<{ action: string; ev: number; evLoss: number }>;
    onContinue: () => void;
}> = ({ isCorrect, gtoMove, evLoss, alternatives, onContinue }) => {
    return (
        <div className={`feedback-overlay ${isCorrect ? 'correct' : 'incorrect'}`}>
            <div className="feedback-card">
                <div className="feedback-header">
                    {isCorrect ? (
                        <>
                            <span className="feedback-icon">✅</span>
                            <span className="feedback-title">CORRECT!</span>
                        </>
                    ) : (
                        <>
                            <span className="feedback-icon">❌</span>
                            <span className="feedback-title">SUBOPTIMAL</span>
                        </>
                    )}
                </div>

                <div className="feedback-gto">
                    <span className="gto-label">GTO SOLUTION:</span>
                    <span className="gto-move">{gtoMove}</span>
                </div>

                {!isCorrect && (
                    <div className="feedback-ev-loss">
                        <span className="ev-loss-label">EV Loss:</span>
                        <span className="ev-loss-value">-{evLoss.toFixed(3)} BB</span>
                    </div>
                )}

                <div className="feedback-alternatives">
                    <span className="alternatives-label">Alternative Lines:</span>
                    {alternatives.slice(0, 2).map((alt, i) => (
                        <div key={i} className="alternative-row">
                            <span className="alt-action">{alt.action}</span>
                            <span className="alt-ev">
                                {alt.evLoss === 0 ? 'GTO' : `-${alt.evLoss.toFixed(3)} EV`}
                            </span>
                        </div>
                    ))}
                </div>

                <button className="feedback-continue" onClick={onContinue}>
                    Continue →
                </button>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🏆 COMPLETION SCREEN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const CompletionScreen: React.FC<{
    levelId: number;
    levelName: string;
    correct: number;
    total: number;
    bestStreak: number;
    masteryAchieved: boolean;
    nextLevelUnlocked: number | null;
    xpEarned: number;
    diamondsEarned: number;
    onRestart: () => void;
    onNextLevel: () => void;
}> = ({
    levelId,
    levelName,
    correct,
    total,
    bestStreak,
    masteryAchieved,
    nextLevelUnlocked,
    xpEarned,
    diamondsEarned,
    onRestart,
    onNextLevel
}) => {
        const accuracy = ((correct / total) * 100).toFixed(1);

        return (
            <div className={`completion-screen ${masteryAchieved ? 'mastery-achieved' : ''}`}>
                <div className="completion-card">
                    <div className="completion-header">
                        {masteryAchieved ? (
                            <div className="mastery-badge">
                                <span className="mastery-icon">🏆</span>
                                <span className="mastery-text">MASTERY ACHIEVED!</span>
                            </div>
                        ) : (
                            <div className="session-complete">
                                <span className="complete-icon">📊</span>
                                <span className="complete-text">SESSION COMPLETE</span>
                            </div>
                        )}
                    </div>

                    <div className="completion-level">
                        Level {levelId}: {levelName}
                    </div>

                    <div className="completion-stats">
                        <div className="stat-row">
                            <span className="stat-label">Accuracy</span>
                            <span className={`stat-value ${parseFloat(accuracy) >= 85 ? 'stat-success' : 'stat-warning'}`}>
                                {accuracy}%
                            </span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Correct</span>
                            <span className="stat-value">{correct}/{total}</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Best Streak</span>
                            <span className="stat-value">🔥 {bestStreak}</span>
                        </div>
                    </div>

                    <div className="completion-rewards">
                        <div className="reward-item xp-reward">
                            <span className="reward-icon">⭐</span>
                            <span className="reward-value">+{xpEarned} XP</span>
                        </div>
                        <div className="reward-item diamond-reward">
                            <span className="reward-icon">💎</span>
                            <span className="reward-value">+{diamondsEarned} Diamonds</span>
                        </div>
                    </div>

                    {masteryAchieved && nextLevelUnlocked && (
                        <div className="unlock-celebration">
                            <span className="unlock-icon">🔓</span>
                            <span className="unlock-text">Level {nextLevelUnlocked} Unlocked!</span>
                        </div>
                    )}

                    <div className="completion-actions">
                        <button className="action-btn restart-btn" onClick={onRestart}>
                            🔄 Retry Level
                        </button>
                        {masteryAchieved && nextLevelUnlocked && (
                            <button className="action-btn next-btn" onClick={onNextLevel}>
                                ➡️ Next Level
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

// ═══════════════════════════════════════════════════════════════════════════════
// 🎮 MAIN DRILL INTERFACE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface DrillInterfaceProps {
    userId: string;
    levelId: number;
    scenarios: DrillScenario[];
    onComplete?: (results: {
        levelId: number;
        correct: number;
        total: number;
        accuracy: number;
        masteryAchieved: boolean;
    }) => void;
}

export const DrillInterface: React.FC<DrillInterfaceProps> = ({
    userId,
    levelId,
    scenarios,
    onComplete
}) => {
    // ═══════════════════════════════════════════════════════════════════════
    // 🔧 HOOKS & STATE
    // ═══════════════════════════════════════════════════════════════════════

    const masteryGate = useRef(getMasteryGate()).current;
    const levelRegistry = useRef(getLevelRegistry()).current;

    const level = levelRegistry.getLevel(levelId);
    const drillConfig = levelRegistry.getDrillConfig(levelId);
    const visualTheme = levelRegistry.getVisualTheme(levelId);

    const [drillState, setDrillState] = useState<DrillState>({
        status: 'IDLE',
        currentScenario: null,
        scenarioIndex: 0,
        totalScenarios: scenarios.length,
        correctAnswers: 0,
        streak: 0,
        bestStreak: 0,
        timeRemaining: level?.timeLimitSeconds || 20,
        isPressureMode: false
    });

    const [feedbackData, setFeedbackData] = useState<{
        isCorrect: boolean;
        gtoMove: string;
        evLoss: number;
        alternatives: Array<{ action: string; ev: number; evLoss: number }>;
    } | null>(null);

    const [completionData, setCompletionData] = useState<{
        masteryAchieved: boolean;
        nextLevelUnlocked: number | null;
        xpEarned: number;
        diamondsEarned: number;
    } | null>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // ═══════════════════════════════════════════════════════════════════════
    // ⏱️ TIMER LOGIC
    // ═══════════════════════════════════════════════════════════════════════

    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            setDrillState(prev => {
                if (prev.timeRemaining <= 1) {
                    // Time's up — count as incorrect
                    clearInterval(timerRef.current!);
                    return {
                        ...prev,
                        timeRemaining: 0,
                        streak: 0
                    };
                }

                // Trigger pressure mode at low time
                const isPressure = prev.timeRemaining <= (level?.timeLimitSeconds || 20) * 0.33;

                return {
                    ...prev,
                    timeRemaining: prev.timeRemaining - 1,
                    isPressureMode: isPressure
                };
            });
        }, 1000);
    }, [level]);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setDrillState(prev => ({
            ...prev,
            timeRemaining: level?.timeLimitSeconds || 20,
            isPressureMode: false
        }));
    }, [level]);

    // ═══════════════════════════════════════════════════════════════════════
    // 🎯 DRILL FLOW CONTROL
    // ═══════════════════════════════════════════════════════════════════════

    const startDrill = useCallback(() => {
        if (scenarios.length === 0) return;

        setDrillState({
            status: 'ACTIVE',
            currentScenario: scenarios[0],
            scenarioIndex: 0,
            totalScenarios: scenarios.length,
            correctAnswers: 0,
            streak: 0,
            bestStreak: 0,
            timeRemaining: level?.timeLimitSeconds || 20,
            isPressureMode: false
        });

        startTimer();
    }, [scenarios, level, startTimer]);

    const handleActionSelect = useCallback((action: string) => {
        if (drillState.status !== 'ACTIVE' || !drillState.currentScenario) return;

        resetTimer();

        const scenario = drillState.currentScenario;
        const isCorrect = action === scenario.gtoSolution.bestMove;
        const evLoss = isCorrect ? 0 : (
            scenario.gtoSolution.alternatives.find(a => a.action === action)?.evLoss || 0.1
        );

        // Update state
        setDrillState(prev => ({
            ...prev,
            status: 'FEEDBACK',
            correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
            streak: isCorrect ? prev.streak + 1 : 0,
            bestStreak: isCorrect ? Math.max(prev.bestStreak, prev.streak + 1) : prev.bestStreak
        }));

        // Show feedback
        setFeedbackData({
            isCorrect,
            gtoMove: scenario.gtoSolution.bestMove,
            evLoss,
            alternatives: scenario.gtoSolution.alternatives
        });
    }, [drillState, resetTimer]);

    const handleContinue = useCallback(() => {
        const nextIndex = drillState.scenarioIndex + 1;

        if (nextIndex >= drillState.totalScenarios) {
            // Drill complete — evaluate mastery
            const correct = drillState.correctAnswers + (feedbackData?.isCorrect ? 0 : 0);
            const total = drillState.totalScenarios;

            const masteryResult = masteryGate.checkMastery(userId, levelId, correct, total);
            const rewards = levelRegistry.calculateXpReward(levelId, 100, correct / total);
            const diamondReward = levelRegistry.calculateDiamondReward(levelId, 50);

            setCompletionData({
                masteryAchieved: masteryResult.achieved,
                nextLevelUnlocked: masteryResult.nextLevelUnlocked || null,
                xpEarned: rewards.totalXp,
                diamondsEarned: diamondReward.totalDiamonds
            });

            setDrillState(prev => ({
                ...prev,
                status: 'COMPLETE'
            }));

            onComplete?.({
                levelId,
                correct,
                total,
                accuracy: correct / total,
                masteryAchieved: masteryResult.achieved
            });
        } else {
            // Next scenario
            setFeedbackData(null);
            setDrillState(prev => ({
                ...prev,
                status: 'ACTIVE',
                currentScenario: scenarios[nextIndex],
                scenarioIndex: nextIndex,
                timeRemaining: level?.timeLimitSeconds || 20
            }));
            startTimer();
        }
    }, [drillState, feedbackData, scenarios, userId, levelId, masteryGate, levelRegistry, level, startTimer, onComplete]);

    // ═══════════════════════════════════════════════════════════════════════
    // 🧹 CLEANUP
    // ═══════════════════════════════════════════════════════════════════════

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // ═══════════════════════════════════════════════════════════════════════
    // 🎨 RENDER
    // ═══════════════════════════════════════════════════════════════════════

    if (!level) {
        return <div className="drill-error">Level {levelId} not found</div>;
    }

    // Action options for current scenario
    const actionOptions: ActionOption[] = drillState.currentScenario ? [
        { action: 'FOLD', label: 'Fold' },
        { action: 'CHECK', label: 'Check' },
        { action: 'CALL', label: 'Call' },
        { action: 'BET_33', label: '33%', size: Math.floor(drillState.currentScenario.potSize * 0.33) },
        { action: 'BET_50', label: '50%', size: Math.floor(drillState.currentScenario.potSize * 0.5) },
        { action: 'BET_75', label: '75%', size: Math.floor(drillState.currentScenario.potSize * 0.75) },
        { action: 'ALL_IN', label: 'All-In', size: drillState.currentScenario.stackSize }
    ] : [];

    return (
        <div
            className="drill-interface"
            style={{
                '--level-accent': visualTheme.accentColor,
                '--glow-intensity': visualTheme.glowIntensity
            } as React.CSSProperties}
        >
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 🎮 HEADER */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <header className="drill-header">
                <div className="level-info">
                    <span className="level-tier" style={{ background: visualTheme.accentColor }}>
                        {level.tier}
                    </span>
                    <span className="level-name">Level {level.id}: {level.name}</span>
                </div>
                <StreakIndicator streak={drillState.streak} bestStreak={drillState.bestStreak} />
            </header>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 📊 PROGRESS BAR */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <ProgressBar
                current={drillState.scenarioIndex + (drillState.status === 'FEEDBACK' ? 1 : 0)}
                total={drillState.totalScenarios}
                correct={drillState.correctAnswers}
                levelColor={visualTheme.accentColor}
            />

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 🎮 MAIN CONTENT */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <main className="drill-main">
                {drillState.status === 'IDLE' && (
                    <div className="drill-start">
                        <h2>Ready to Train?</h2>
                        <p>{level.description}</p>
                        <button className="start-btn" onClick={startDrill}>
                            🎮 Start Drill
                        </button>
                    </div>
                )}

                {(drillState.status === 'ACTIVE' || drillState.status === 'FEEDBACK') && drillState.currentScenario && (
                    <div className="scenario-container">
                        {/* Timer */}
                        <PressureTimer
                            timeRemaining={drillState.timeRemaining}
                            maxTime={level.timeLimitSeconds}
                            isPressureMode={drillState.isPressureMode}
                        />

                        {/* Cards */}
                        <div className="cards-display">
                            <div className="hero-cards">
                                {drillState.currentScenario.heroCards.map((card, i) => (
                                    <CardDisplay key={i} card={card} isRevealing index={i} />
                                ))}
                            </div>

                            <div className="board-cards">
                                {drillState.currentScenario.boardCards.map((card, i) => (
                                    <CardDisplay key={i} card={card} isRevealing index={i + 2} />
                                ))}
                            </div>
                        </div>

                        {/* Scenario Info */}
                        <div className="scenario-info">
                            <span className="position">{drillState.currentScenario.position}</span>
                            <span className="pot">Pot: {drillState.currentScenario.potSize} BB</span>
                            <span className="stack">Stack: {drillState.currentScenario.stackSize} BB</span>
                            <span className="villain-action">{drillState.currentScenario.villainAction}</span>
                        </div>

                        {/* Action Buttons */}
                        {drillState.status === 'ACTIVE' && (
                            <div className="action-grid">
                                {actionOptions.map(option => (
                                    <ActionButton
                                        key={option.action}
                                        option={option}
                                        onSelect={handleActionSelect}
                                        levelColor={visualTheme.accentColor}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {drillState.status === 'COMPLETE' && completionData && (
                    <CompletionScreen
                        levelId={levelId}
                        levelName={level.name}
                        correct={drillState.correctAnswers}
                        total={drillState.totalScenarios}
                        bestStreak={drillState.bestStreak}
                        masteryAchieved={completionData.masteryAchieved}
                        nextLevelUnlocked={completionData.nextLevelUnlocked}
                        xpEarned={completionData.xpEarned}
                        diamondsEarned={completionData.diamondsEarned}
                        onRestart={startDrill}
                        onNextLevel={() => {
                            // Navigate to next level
                            console.log(`Navigating to Level ${completionData.nextLevelUnlocked}`);
                        }}
                    />
                )}
            </main>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 📋 FEEDBACK OVERLAY */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {feedbackData && (
                <FeedbackOverlay
                    isCorrect={feedbackData.isCorrect}
                    gtoMove={feedbackData.gtoMove}
                    evLoss={feedbackData.evLoss}
                    alternatives={feedbackData.alternatives}
                    onContinue={handleContinue}
                />
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 COMPONENT STYLES (inline for portability)
// ═══════════════════════════════════════════════════════════════════════════════

export const DrillInterfaceStyles = `
/* ═══════════════════════════════════════════════════════════════════════════ */
/* 🎮 DRILL INTERFACE STYLES                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

.drill-interface {
    --level-accent: #4ADE80;
    --glow-intensity: 0.3;
    
    min-height: 100vh;
    background: linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%);
    color: #F8FAFC;
    font-family: 'Inter', 'Segoe UI', sans-serif;
    padding: 1.5rem;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* HEADER                                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

.drill-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.level-info {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.level-tier {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #0F172A;
}

.level-name {
    font-size: 1.25rem;
    font-weight: 600;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* CARDS                                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

.card {
    width: 60px;
    height: 84px;
    background: linear-gradient(145deg, #FFFFFF 0%, #F1F5F9 100%);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transform-style: preserve-3d;
    transition: transform 0.3s ease;
}

.card-reveal {
    animation: cardFlip 0.5s ease-out backwards;
    animation-delay: var(--reveal-delay, 0s);
}

@keyframes cardFlip {
    from {
        transform: rotateY(180deg) translateY(-20px);
        opacity: 0;
    }
    to {
        transform: rotateY(0) translateY(0);
        opacity: 1;
    }
}

.card-rank {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--card-color, #1F2937);
}

.card-suit {
    font-size: 1.25rem;
}

.cards-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    margin: 2rem 0;
}

.hero-cards, .board-cards {
    display: flex;
    gap: 0.5rem;
}

.hero-cards .card {
    box-shadow: 0 0 20px rgba(var(--level-accent), calc(var(--glow-intensity) * 0.5));
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* TIMER                                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

.pressure-timer {
    position: absolute;
    top: 2rem;
    right: 2rem;
}

.timer-ring {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
}

.timer-inner {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #1E293B;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.timer-value {
    font-size: 1.5rem;
    font-weight: 700;
}

.timer-label {
    font-size: 0.625rem;
    opacity: 0.6;
}

@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* STREAK INDICATOR                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

.streak-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 9999px;
    backdrop-filter: blur(8px);
}

.streak-fire { background: linear-gradient(90deg, #F97316, #FBBF24); }
.streak-blazing { background: linear-gradient(90deg, #EF4444, #F97316); }
.streak-unstoppable { background: linear-gradient(90deg, #8B5CF6, #EC4899); }

.streak-icon { font-size: 1.25rem; }
.streak-count { font-size: 1.25rem; font-weight: 700; }
.streak-label { font-size: 0.75rem; text-transform: uppercase; font-weight: 600; }
.streak-best { font-size: 0.625rem; opacity: 0.7; }

/* ═══════════════════════════════════════════════════════════════════════════ */
/* PROGRESS BAR                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

.progress-container {
    margin-bottom: 1.5rem;
}

.progress-bar-bg {
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 9999px;
    position: relative;
    overflow: hidden;
}

.progress-bar-fill {
    height: 100%;
    border-radius: 9999px;
    transition: width 0.3s ease;
}

.progress-stats {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    font-size: 0.875rem;
}

.on-track { color: #4ADE80; }
.needs-work { color: #FBBF24; }

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ACTION BUTTONS                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

.action-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
    margin-top: 2rem;
}

.action-button {
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: #F8FAFC;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
}

.action-button:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--level-color, #4ADE80);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.action-button:active {
    transform: translateY(0);
}

.action-label { font-size: 0.875rem; }
.action-size { font-size: 0.75rem; opacity: 0.7; }

/* ═══════════════════════════════════════════════════════════════════════════ */
/* FEEDBACK OVERLAY                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

.feedback-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.feedback-card {
    background: #1E293B;
    border-radius: 16px;
    padding: 2rem;
    max-width: 400px;
    width: 90%;
    text-align: center;
}

.feedback-overlay.correct .feedback-card {
    border: 2px solid #4ADE80;
    box-shadow: 0 0 40px rgba(74, 222, 128, 0.3);
}

.feedback-overlay.incorrect .feedback-card {
    border: 2px solid #EF4444;
    box-shadow: 0 0 40px rgba(239, 68, 68, 0.3);
}

.feedback-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
}

.feedback-icon { font-size: 2rem; }
.feedback-title { font-size: 1.5rem; font-weight: 700; }

.feedback-gto {
    background: rgba(255, 255, 255, 0.05);
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
}

.gto-label { font-size: 0.75rem; opacity: 0.7; display: block; }
.gto-move { font-size: 1.25rem; font-weight: 700; color: #4ADE80; }

.feedback-ev-loss {
    color: #EF4444;
    font-size: 1rem;
    margin-bottom: 1rem;
}

.feedback-alternatives {
    text-align: left;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    margin-bottom: 1.5rem;
}

.alternatives-label {
    font-size: 0.75rem;
    opacity: 0.6;
    margin-bottom: 0.5rem;
    display: block;
}

.alternative-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.alt-action { font-weight: 500; }
.alt-ev { font-size: 0.875rem; opacity: 0.7; }

.feedback-continue {
    width: 100%;
    padding: 1rem;
    background: var(--level-accent, #4ADE80);
    color: #0F172A;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s ease;
}

.feedback-continue:hover {
    transform: scale(1.02);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* COMPLETION SCREEN                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

.completion-screen {
    text-align: center;
    padding: 2rem;
}

.completion-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 2rem;
    max-width: 500px;
    margin: 0 auto;
}

.mastery-achieved .completion-card {
    border: 2px solid #FFD700;
    box-shadow: 0 0 60px rgba(255, 215, 0, 0.3);
}

.mastery-badge, .session-complete {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.mastery-icon, .complete-icon { font-size: 3rem; }
.mastery-text { font-size: 1.5rem; font-weight: 700; color: #FFD700; }
.complete-text { font-size: 1.25rem; font-weight: 600; }

.completion-level {
    font-size: 1rem;
    opacity: 0.7;
    margin-bottom: 1.5rem;
}

.completion-stats {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1.5rem;
}

.stat-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
}

.stat-label { opacity: 0.7; }
.stat-value { font-weight: 600; }
.stat-success { color: #4ADE80; }
.stat-warning { color: #FBBF24; }

.completion-rewards {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin-bottom: 1.5rem;
}

.reward-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border-radius: 9999px;
}

.xp-reward { background: linear-gradient(90deg, #FBBF24, #F59E0B); color: #0F172A; }
.diamond-reward { background: linear-gradient(90deg, #3B82F6, #8B5CF6); color: #F8FAFC; }

.reward-icon { font-size: 1.25rem; }
.reward-value { font-weight: 700; }

.unlock-celebration {
    background: linear-gradient(90deg, #4ADE80, #22D3EE);
    color: #0F172A;
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    animation: celebratePulse 0.5s ease infinite alternate;
}

@keyframes celebratePulse {
    from { transform: scale(1); }
    to { transform: scale(1.02); }
}

.unlock-icon { font-size: 1.5rem; margin-right: 0.5rem; }
.unlock-text { font-weight: 700; }

.completion-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
}

.action-btn {
    padding: 1rem 2rem;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s ease;
}

.restart-btn {
    background: rgba(255, 255, 255, 0.1);
    color: #F8FAFC;
}

.next-btn {
    background: linear-gradient(90deg, #4ADE80, #22D3EE);
    color: #0F172A;
}

.action-btn:hover {
    transform: scale(1.05);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* START SCREEN                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

.drill-start {
    text-align: center;
    padding: 4rem 2rem;
}

.drill-start h2 {
    font-size: 2rem;
    margin-bottom: 1rem;
}

.drill-start p {
    opacity: 0.7;
    margin-bottom: 2rem;
}

.start-btn {
    padding: 1.25rem 3rem;
    background: linear-gradient(90deg, var(--level-accent, #4ADE80), #22D3EE);
    color: #0F172A;
    border: none;
    border-radius: 12px;
    font-size: 1.25rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.start-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 30px rgba(74, 222, 128, 0.4);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* SCENARIO INFO                                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */

.scenario-container {
    position: relative;
}

.scenario-info {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    margin: 1.5rem 0;
    flex-wrap: wrap;
}

.scenario-info span {
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    font-size: 0.875rem;
}

.position {
    border-left: 3px solid var(--level-accent, #4ADE80);
}

.villain-action {
    color: #FBBF24;
    font-weight: 600;
}
`;

export default DrillInterface;
