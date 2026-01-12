/**
 * ⚡️ ORB_04_TRAINING: MASTERY GATE
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔐 HARD LAW: 85% SCORE REQUIREMENT TO UNLOCK NEXT LEVEL
 * 
 * This is the IMMUTABLE gatekeeper of the training system. Players CANNOT
 * progress to the next level without demonstrating mastery.
 * 
 * Laws Enforced:
 * - 85% accuracy threshold (HARD-CODED, IMMUTABLE)
 * - 20 question minimum before evaluation
 * - Cryptographically signed mastery tokens
 * - Level 1 is always accessible
 * ═══════════════════════════════════════════════════════════════════════════
 */

import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 HARD LAW CONSTANTS — NEVER MODIFY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 🔐 THE 85% MASTERY THRESHOLD — IMMUTABLE HARD LAW
 * This value is HARD-CODED and CANNOT be modified at runtime.
 */
export const MASTERY_THRESHOLD = 0.85 as const;

/**
 * Minimum questions required before mastery can be evaluated
 */
export const MIN_QUESTIONS_REQUIRED = 20 as const;

/**
 * Boss Mode (Level 12) requires elevated threshold
 */
export const BOSS_MODE_THRESHOLD = 0.90 as const;

/**
 * Token validity period (24 hours)
 */
export const TOKEN_VALIDITY_MS = 24 * 60 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type GateStatus =
    | 'GRANTED'
    | 'DENIED_LOW_ACCURACY'
    | 'DENIED_INSUFFICIENT_QUESTIONS'
    | 'DENIED_TOKEN_EXPIRED'
    | 'DENIED_INVALID_TOKEN'
    | 'DENIED_LEVEL_LOCKED'
    | 'DENIED_BOSS_MODE_THRESHOLD';

export interface MasteryCheckResult {
    achieved: boolean;
    status: GateStatus;
    accuracy: number;
    accuracyPercent: string;
    questionsAnswered: number;
    questionsRequired: number;
    message: string;
    masteryToken?: string;
    nextLevelUnlocked?: number;
}

export interface LevelAccessResult {
    allowed: boolean;
    level: number;
    status: GateStatus;
    message: string;
    requirement?: {
        levelToComplete: number;
        accuracyRequired: number;
        minQuestions: number;
    };
}

export interface MasteryTokenPayload {
    version: string;
    userId: string;
    levelCompleted: number;
    nextLevelUnlocked: number;
    accuracy: number;
    issuedAt: number;
    expiresAt: number;
    isBossMode: boolean;
}

export interface UserMasteryState {
    achieved: boolean;
    accuracy: number;
    achievedAt: string;
    token: string;
    levelId: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏛️ MASTERY GATE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export class MasteryGate {
    private readonly secretKey: string;
    private readonly tokenCache: Map<string, { payload: MasteryTokenPayload; expiresAt: number }>;
    private readonly userMasteryState: Map<string, UserMasteryState>;

    constructor(options: { secretKey?: string } = {}) {
        this.secretKey = options.secretKey || process.env.MASTERY_SEAL_SECRET || 'gto-mastery-gate-sovereign-2026';
        this.tokenCache = new Map();
        this.userMasteryState = new Map();

        console.log('🔐 MasteryGate initialized');
        console.log(`   ├─ Mastery Threshold: ${MASTERY_THRESHOLD * 100}% (HARD-CODED)`);
        console.log(`   ├─ Boss Mode Threshold: ${BOSS_MODE_THRESHOLD * 100}%`);
        console.log(`   └─ Min Questions: ${MIN_QUESTIONS_REQUIRED}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔐 CORE MASTERY CHECK — THE 85% GATE
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Check if user has achieved mastery for a level
     * 
     * 🔐 HARD LAW: 85% accuracy required (90% for Boss Mode)
     * 🔐 HARD LAW: Minimum 20 questions required
     */
    checkMastery(
        userId: string,
        levelId: number,
        correctAnswers: number,
        totalAnswers: number
    ): MasteryCheckResult {
        // Calculate accuracy
        const accuracy = totalAnswers > 0 ? correctAnswers / totalAnswers : 0;
        const isBossMode = levelId === 12;
        const threshold = isBossMode ? BOSS_MODE_THRESHOLD : MASTERY_THRESHOLD;

        // ═══════════════════════════════════════════════════════════════════
        // 🔐 HARD LAW CHECK 1: Minimum questions
        // ═══════════════════════════════════════════════════════════════════
        if (totalAnswers < MIN_QUESTIONS_REQUIRED) {
            const remaining = MIN_QUESTIONS_REQUIRED - totalAnswers;
            return {
                achieved: false,
                status: 'DENIED_INSUFFICIENT_QUESTIONS',
                accuracy,
                accuracyPercent: `${(accuracy * 100).toFixed(1)}%`,
                questionsAnswered: totalAnswers,
                questionsRequired: MIN_QUESTIONS_REQUIRED,
                message: `⏳ Complete ${remaining} more question${remaining !== 1 ? 's' : ''} to unlock mastery evaluation`
            };
        }

        // ═══════════════════════════════════════════════════════════════════
        // 🔐 HARD LAW CHECK 2: 85% accuracy threshold (90% for Boss Mode)
        // ═══════════════════════════════════════════════════════════════════
        if (accuracy < threshold) {
            const gap = ((threshold - accuracy) * 100).toFixed(1);
            const status: GateStatus = isBossMode ? 'DENIED_BOSS_MODE_THRESHOLD' : 'DENIED_LOW_ACCURACY';

            return {
                achieved: false,
                status,
                accuracy,
                accuracyPercent: `${(accuracy * 100).toFixed(1)}%`,
                questionsAnswered: totalAnswers,
                questionsRequired: MIN_QUESTIONS_REQUIRED,
                message: `🔒 Need ${gap}% more accuracy to unlock Level ${levelId + 1}${isBossMode ? ' (Boss Mode requires 90%)' : ''}`
            };
        }

        // ═══════════════════════════════════════════════════════════════════
        // ✅ MASTERY ACHIEVED — Generate signed token
        // ═══════════════════════════════════════════════════════════════════
        const token = this.generateMasteryToken(userId, levelId, accuracy, isBossMode);

        // Store mastery state
        const stateKey = `${userId}:${levelId}`;
        this.userMasteryState.set(stateKey, {
            achieved: true,
            accuracy,
            achievedAt: new Date().toISOString(),
            token,
            levelId
        });

        return {
            achieved: true,
            status: 'GRANTED',
            accuracy,
            accuracyPercent: `${(accuracy * 100).toFixed(1)}%`,
            questionsAnswered: totalAnswers,
            questionsRequired: MIN_QUESTIONS_REQUIRED,
            masteryToken: token,
            nextLevelUnlocked: levelId + 1,
            message: `🏆 MASTERY ACHIEVED! Level ${levelId + 1} is now unlocked!`
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔐 CRYPTOGRAPHIC TOKEN GENERATION
    // ═══════════════════════════════════════════════════════════════════════════

    private generateMasteryToken(
        userId: string,
        levelId: number,
        accuracy: number,
        isBossMode: boolean
    ): string {
        const timestamp = Date.now();
        const expiresAt = timestamp + TOKEN_VALIDITY_MS;

        const payload: MasteryTokenPayload = {
            version: 'v2',
            userId,
            levelCompleted: levelId,
            nextLevelUnlocked: levelId + 1,
            accuracy: Math.floor(accuracy * 10000), // 4 decimal precision
            issuedAt: timestamp,
            expiresAt,
            isBossMode
        };

        // Stringify and encode
        const payloadStr = JSON.stringify(payload);
        const payloadBase64 = Buffer.from(payloadStr).toString('base64url');

        // Generate HMAC signature
        const signature = this.signPayload(payloadBase64);

        // Full token: payload.signature
        const token = `${payloadBase64}.${signature}`;

        // Cache for validation
        this.tokenCache.set(token, { payload, expiresAt });

        return token;
    }

    private signPayload(payload: string): string {
        const hmac = crypto.createHmac('sha256', this.secretKey);
        hmac.update(payload);
        return hmac.digest('base64url');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔐 TOKEN VALIDATION
    // ═══════════════════════════════════════════════════════════════════════════

    validateToken(token: string): { valid: boolean; status: GateStatus; payload?: MasteryTokenPayload } {
        try {
            const [payloadBase64, signature] = token.split('.');

            if (!payloadBase64 || !signature) {
                return { valid: false, status: 'DENIED_INVALID_TOKEN' };
            }

            // Verify signature
            const expectedSignature = this.signPayload(payloadBase64);
            if (signature !== expectedSignature) {
                return { valid: false, status: 'DENIED_INVALID_TOKEN' };
            }

            // Decode payload
            const payloadStr = Buffer.from(payloadBase64, 'base64url').toString();
            const payload: MasteryTokenPayload = JSON.parse(payloadStr);

            // Check expiration
            if (Date.now() > payload.expiresAt) {
                return { valid: false, status: 'DENIED_TOKEN_EXPIRED' };
            }

            return { valid: true, status: 'GRANTED', payload };

        } catch {
            return { valid: false, status: 'DENIED_INVALID_TOKEN' };
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔐 LEVEL ACCESS CONTROL
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Check if user can access a specific level
     * 
     * 🔐 HARD LAW: Level 2+ requires valid mastery token from previous level
     */
    canAccessLevel(userId: string, targetLevel: number, masteryToken?: string): LevelAccessResult {
        // Level 1 is ALWAYS accessible — the starting point
        if (targetLevel <= 1) {
            return {
                allowed: true,
                level: targetLevel,
                status: 'GRANTED',
                message: '🎮 Level 1 is always accessible — Start your journey!'
            };
        }

        const previousLevel = targetLevel - 1;
        const isBossMode = targetLevel === 12;

        // Check cached mastery state first
        const stateKey = `${userId}:${previousLevel}`;
        const masteryState = this.userMasteryState.get(stateKey);

        if (masteryState?.achieved) {
            const validation = this.validateToken(masteryState.token);
            if (validation.valid) {
                return {
                    allowed: true,
                    level: targetLevel,
                    status: 'GRANTED',
                    message: `✅ Access granted to Level ${targetLevel}${isBossMode ? ' (BOSS MODE)' : ''}`
                };
            }
        }

        // Check provided token
        if (masteryToken) {
            const validation = this.validateToken(masteryToken);

            if (validation.valid && validation.payload && validation.payload.nextLevelUnlocked >= targetLevel) {
                return {
                    allowed: true,
                    level: targetLevel,
                    status: 'GRANTED',
                    message: `✅ Token verified — Access granted to Level ${targetLevel}`
                };
            }

            return {
                allowed: false,
                level: targetLevel,
                status: validation.status,
                message: `❌ Token validation failed: ${validation.status}`
            };
        }

        // ═══════════════════════════════════════════════════════════════════
        // 🚫 ACCESS DENIED — No valid mastery proof
        // ═══════════════════════════════════════════════════════════════════
        const threshold = isBossMode ? BOSS_MODE_THRESHOLD : MASTERY_THRESHOLD;

        return {
            allowed: false,
            level: targetLevel,
            status: 'DENIED_LEVEL_LOCKED',
            message: `🔐 Level ${targetLevel} is LOCKED. Complete Level ${previousLevel} with ${threshold * 100}%+ accuracy.`,
            requirement: {
                levelToComplete: previousLevel,
                accuracyRequired: threshold * 100,
                minQuestions: MIN_QUESTIONS_REQUIRED
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 📊 USER PROGRESS QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get all unlocked levels for a user
     */
    getUnlockedLevels(userId: string): {
        userId: string;
        unlockedLevels: number[];
        highestUnlocked: number;
        nextToUnlock: number;
        masteryStates: Record<string, { accuracy: string; achievedAt: string }>;
    } {
        const unlockedLevels = [1]; // Level 1 always unlocked

        for (let level = 1; level <= 12; level++) {
            const state = this.userMasteryState.get(`${userId}:${level}`);
            if (state?.achieved) {
                unlockedLevels.push(level + 1);
            }
        }

        const uniqueLevels = [...new Set(unlockedLevels)].sort((a, b) => a - b);
        const highest = Math.max(...uniqueLevels);

        return {
            userId,
            unlockedLevels: uniqueLevels,
            highestUnlocked: highest,
            nextToUnlock: Math.min(highest + 1, 12),
            masteryStates: Object.fromEntries(
                [...this.userMasteryState.entries()]
                    .filter(([key]) => key.startsWith(userId))
                    .map(([key, val]) => [key.split(':')[1], {
                        accuracy: `${(val.accuracy * 100).toFixed(1)}%`,
                        achievedAt: val.achievedAt
                    }])
            )
        };
    }

    /**
     * Get progress towards mastery for current level
     */
    getProgressToMastery(userId: string, levelId: number, currentAccuracy: number, questionsAnswered: number): {
        currentAccuracy: string;
        requiredAccuracy: string;
        progressPercent: number;
        questionsRemaining: number;
        status: 'ON_TRACK' | 'NEEDS_IMPROVEMENT' | 'MASTERED' | 'INSUFFICIENT_DATA';
    } {
        const isBossMode = levelId === 12;
        const threshold = isBossMode ? BOSS_MODE_THRESHOLD : MASTERY_THRESHOLD;

        const progressPercent = Math.min(100, (currentAccuracy / threshold) * 100);
        const questionsRemaining = Math.max(0, MIN_QUESTIONS_REQUIRED - questionsAnswered);

        // Check if already mastered
        const state = this.userMasteryState.get(`${userId}:${levelId}`);
        if (state?.achieved) {
            return {
                currentAccuracy: `${(currentAccuracy * 100).toFixed(1)}%`,
                requiredAccuracy: `${threshold * 100}%`,
                progressPercent: 100,
                questionsRemaining: 0,
                status: 'MASTERED'
            };
        }

        let status: 'ON_TRACK' | 'NEEDS_IMPROVEMENT' | 'MASTERED' | 'INSUFFICIENT_DATA';

        if (questionsAnswered < 5) {
            status = 'INSUFFICIENT_DATA';
        } else if (currentAccuracy >= threshold) {
            status = questionsAnswered >= MIN_QUESTIONS_REQUIRED ? 'MASTERED' : 'ON_TRACK';
        } else if (currentAccuracy >= threshold * 0.9) {
            status = 'ON_TRACK';
        } else {
            status = 'NEEDS_IMPROVEMENT';
        }

        return {
            currentAccuracy: `${(currentAccuracy * 100).toFixed(1)}%`,
            requiredAccuracy: `${threshold * 100}%`,
            progressPercent: Math.floor(progressPercent),
            questionsRemaining,
            status
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏭 FACTORY & SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

let masteryGateInstance: MasteryGate | null = null;

export function getMasteryGate(options?: { secretKey?: string }): MasteryGate {
    if (!masteryGateInstance) {
        masteryGateInstance = new MasteryGate(options);
    }
    return masteryGateInstance;
}

export function createMasteryGate(options?: { secretKey?: string }): MasteryGate {
    return new MasteryGate(options);
}

export default MasteryGate;
