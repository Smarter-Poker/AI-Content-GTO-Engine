/**
 * 🧠 BRAIN PAGE — MEMORY & PATTERN TRAINING
 * ═══════════════════════════════════════════════════════════════════════════
 * Range memory drills, solver quizzes, and pattern recognition.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerState } from '../../providers/PlayerStateProvider';

type BrainMode = 'lobby' | 'range-memory' | 'solver-quiz' | 'pattern-match';

interface TrainingModule {
    id: string;
    title: string;
    icon: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    xpReward: number;
    mode: BrainMode;
    isLocked: boolean;
}

const MODULES: TrainingModule[] = [
    { id: 'rm1', title: 'Opening Ranges', icon: '🎯', description: 'Memorize GTO opening ranges from every position', difficulty: 'beginner', xpReward: 100, mode: 'range-memory', isLocked: false },
    { id: 'rm2', title: '3-Bet Ranges', icon: '📈', description: 'Master 3-bet and 3-bet defense ranges', difficulty: 'intermediate', xpReward: 150, mode: 'range-memory', isLocked: false },
    { id: 'rm3', title: '4-Bet Wars', icon: '⚔️', description: 'Navigate complex 4-bet scenarios', difficulty: 'advanced', xpReward: 200, mode: 'range-memory', isLocked: false },
    { id: 'sq1', title: 'Flop C-Bet Quiz', icon: '🧩', description: 'When to c-bet and when to check', difficulty: 'beginner', xpReward: 120, mode: 'solver-quiz', isLocked: false },
    { id: 'sq2', title: 'Turn Barrels', icon: '🎰', description: 'Second barrel or give up?', difficulty: 'intermediate', xpReward: 180, mode: 'solver-quiz', isLocked: false },
    { id: 'pm1', title: 'Board Textures', icon: '🔮', description: 'Identify board texture patterns instantly', difficulty: 'beginner', xpReward: 80, mode: 'pattern-match', isLocked: false },
    { id: 'pm2', title: 'Range vs Range', icon: '⚡', description: 'Visualize range advantages', difficulty: 'advanced', xpReward: 250, mode: 'pattern-match', isLocked: true },
];

export const BrainPage: React.FC = () => {
    const playerState = usePlayerState();
    const [selectedMode, setSelectedMode] = useState<BrainMode>('lobby');
    const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);

    const handleSelectModule = (module: TrainingModule) => {
        if (module.isLocked) {
            (window as any).__arenaToast?.('🔒 Complete previous modules to unlock');
            return;
        }
        setSelectedModule(module);
        setSelectedMode(module.mode);
    };

    if (selectedMode !== 'lobby' && selectedModule) {
        return (
            <TrainingSession
                module={selectedModule}
                onComplete={(xp) => {
                    playerState.addXP(xp);
                    setSelectedMode('lobby');
                    setSelectedModule(null);
                }}
                onExit={() => {
                    setSelectedMode('lobby');
                    setSelectedModule(null);
                }}
            />
        );
    }

    return (
        <div className="brain-page">
            <header className="brain-header">
                <h1 className="text-gradient">🧠 The Brain</h1>
                <p>Train your poker memory and pattern recognition</p>
            </header>

            <div className="module-categories">
                <ModuleCategory title="🎯 Range Memory" modules={MODULES.filter(m => m.mode === 'range-memory')} onSelect={handleSelectModule} />
                <ModuleCategory title="🧩 Solver Quizzes" modules={MODULES.filter(m => m.mode === 'solver-quiz')} onSelect={handleSelectModule} />
                <ModuleCategory title="🔮 Pattern Match" modules={MODULES.filter(m => m.mode === 'pattern-match')} onSelect={handleSelectModule} />
            </div>

            <style>{brainStyles}</style>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 MODULE CATEGORY
// ═══════════════════════════════════════════════════════════════════════════════

interface ModuleCategoryProps {
    title: string;
    modules: TrainingModule[];
    onSelect: (m: TrainingModule) => void;
}

const ModuleCategory: React.FC<ModuleCategoryProps> = ({ title, modules, onSelect }) => (
    <div className="module-category">
        <h2>{title}</h2>
        <div className="module-grid">
            {modules.map((mod, i) => (
                <motion.div
                    key={mod.id}
                    className={`module-card glass ${mod.isLocked ? 'locked' : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={!mod.isLocked ? { scale: 1.02, y: -4 } : {}}
                    onClick={() => onSelect(mod)}
                >
                    <span className="module-icon">{mod.icon}</span>
                    <div className="module-info">
                        <h3>{mod.title}</h3>
                        <p>{mod.description}</p>
                        <div className="module-meta">
                            <span className={`difficulty ${mod.difficulty}`}>{mod.difficulty}</span>
                            <span className="xp">⭐ {mod.xpReward} XP</span>
                        </div>
                    </div>
                    {mod.isLocked && <span className="lock-badge">🔒</span>}
                </motion.div>
            ))}
        </div>
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🎮 TRAINING SESSION
// ═══════════════════════════════════════════════════════════════════════════════

interface TrainingSessionProps {
    module: TrainingModule;
    onComplete: (xp: number) => void;
    onExit: () => void;
}

const TrainingSession: React.FC<TrainingSessionProps> = ({ module, onComplete, onExit }) => {
    const [progress, setProgress] = useState(0);
    const [correct, setCorrect] = useState(0);
    const total = 10;

    const handleAnswer = (isCorrect: boolean) => {
        if (isCorrect) setCorrect(c => c + 1);
        if (progress + 1 >= total) {
            setTimeout(() => onComplete(Math.floor((correct / total) * module.xpReward)), 500);
        } else {
            setProgress(p => p + 1);
        }
    };

    return (
        <div className="training-session">
            <div className="session-header">
                <span className="module-name">{module.icon} {module.title}</span>
                <motion.button className="exit-btn glass" onClick={onExit} whileHover={{ scale: 1.05 }}>✕</motion.button>
            </div>

            <div className="progress-bar">
                <motion.div className="fill" animate={{ width: `${((progress + 1) / total) * 100}%` }} />
            </div>

            <div className="question-area glass-heavy">
                <h2>Question {progress + 1} of {total}</h2>
                <p className="question-text">What is the correct action in this spot?</p>

                <div className="answer-grid">
                    <motion.button className="answer-btn" onClick={() => handleAnswer(true)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        Raise 3x
                    </motion.button>
                    <motion.button className="answer-btn" onClick={() => handleAnswer(false)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        Fold
                    </motion.button>
                    <motion.button className="answer-btn" onClick={() => handleAnswer(false)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        Call
                    </motion.button>
                    <motion.button className="answer-btn" onClick={() => handleAnswer(false)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        Check
                    </motion.button>
                </div>
            </div>

            <div className="session-stats">
                <span>✅ {correct} correct</span>
                <span>📊 {progress > 0 ? Math.round((correct / progress) * 100) : 0}% accuracy</span>
            </div>

            <style>{sessionStyles}</style>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const brainStyles = `
.brain-page { max-width: 1200px; margin: 0 auto; padding: 24px; }
.brain-header { text-align: center; margin-bottom: 40px; }
.brain-header h1 { font-size: 2.5rem; margin-bottom: 8px; }
.brain-header p { color: rgba(248, 250, 252, 0.6); }

.module-categories { display: flex; flex-direction: column; gap: 32px; }
.module-category h2 { font-size: 1.25rem; margin-bottom: 16px; color: #F8FAFC; }
.module-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }

.module-card { display: flex; align-items: flex-start; gap: 16px; padding: 20px; border-radius: 16px; cursor: pointer; position: relative; transition: all 0.2s; }
.module-card.locked { opacity: 0.5; cursor: not-allowed; }
.module-icon { font-size: 2.5rem; }
.module-info { flex: 1; }
.module-info h3 { font-size: 1.1rem; color: #F8FAFC; margin-bottom: 4px; }
.module-info p { font-size: 0.875rem; color: rgba(248,250,252,0.6); margin-bottom: 12px; }
.module-meta { display: flex; gap: 12px; }
.difficulty { font-size: 0.75rem; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; }
.difficulty.beginner { background: rgba(74, 222, 128, 0.2); color: #4ADE80; }
.difficulty.intermediate { background: rgba(250, 204, 21, 0.2); color: #FACC15; }
.difficulty.advanced { background: rgba(239, 68, 68, 0.2); color: #EF4444; }
.xp { font-size: 0.75rem; color: var(--color-poker-primary); }
.lock-badge { position: absolute; top: 12px; right: 12px; }
`;

const sessionStyles = `
.training-session { max-width: 700px; margin: 0 auto; padding: 24px; }
.session-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.module-name { font-size: 1.25rem; font-weight: 600; color: #F8FAFC; }
.exit-btn { padding: 8px 16px; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; background: transparent; color: rgba(248,250,252,0.7); cursor: pointer; }

.progress-bar { height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; margin-bottom: 32px; overflow: hidden; }
.progress-bar .fill { height: 100%; background: linear-gradient(90deg, var(--color-poker-primary), var(--color-diamond)); border-radius: 4px; }

.question-area { padding: 40px; border-radius: 20px; text-align: center; margin-bottom: 24px; }
.question-area h2 { font-size: 0.875rem; color: rgba(248,250,252,0.5); margin-bottom: 16px; }
.question-text { font-size: 1.5rem; font-weight: 600; color: #F8FAFC; margin-bottom: 32px; }
.answer-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.answer-btn { padding: 18px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #F8FAFC; font-size: 1rem; font-weight: 500; cursor: pointer; }
.answer-btn:hover { border-color: var(--color-poker-primary); background: var(--color-poker-surface); }

.session-stats { display: flex; justify-content: center; gap: 24px; font-size: 0.875rem; color: rgba(248,250,252,0.6); }
`;

export default BrainPage;
