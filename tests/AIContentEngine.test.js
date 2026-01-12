/**
 * 🧪 SMARTER.POKER — AI CONTENT GTO ENGINE TEST SUITE
 * Comprehensive tests for scenario generation and leak processing
 */

import { ScenarioGenerator } from '../src/core/ScenarioGenerator.js';
import { LeakSignalProcessor } from '../src/core/LeakSignalProcessor.js';
import { SKILL_LEVELS, LEAK_SIGNALS, EVALUATION_TIERS } from '../src/config/constants.js';

describe('AI_CONTENT_GTO_ENGINE', () => {

    // ═══════════════════════════════════════════════════════════
    // SCENARIO GENERATOR TESTS
    // ═══════════════════════════════════════════════════════════

    describe('ScenarioGenerator', () => {
        let generator;

        beforeEach(() => {
            generator = new ScenarioGenerator({ minDrillsPerLevel: 5 });
        });

        test('generateDailyDrills returns A+ GTO-compliant scenarios', async () => {
            const result = await generator.generateDailyDrills();

            expect(result.type).toBe('POKER_SCENARIO');
            expect(result.quality).toBe('A+');
            expect(result.output_format).toBe('GTO_COMPLIANT');
            expect(result.drills).toBeDefined();
            expect(result.metadata.totalScenarios).toBeGreaterThan(0);
        });

        test('generates minimum drills per level', async () => {
            const result = await generator.generateDailyDrills();

            for (const level of Object.keys(SKILL_LEVELS)) {
                expect(result.drills[level]).toBeDefined();
                expect(result.drills[level].length).toBeGreaterThanOrEqual(5);
            }
        });

        test('each scenario has required structure', async () => {
            const result = await generator.generateDailyDrills();
            const scenario = result.drills.BEGINNER[0];

            expect(scenario.id).toBeDefined();
            expect(scenario.type).toBeDefined();
            expect(scenario.level).toBe('BEGINNER');
            expect(scenario.heroHand).toBeDefined();
            expect(scenario.heroHand.length).toBe(2);
            expect(scenario.gtoSolution).toBeDefined();
            expect(scenario.gtoSolution.bestMove).toBeDefined();
            expect(scenario.gtoSolution.alternates).toBeDefined();
        });

        test('scenarios always include 2+ alternate lines', async () => {
            const result = await generator.generateDailyDrills();

            Object.values(result.drills).flat().forEach(scenario => {
                expect(scenario.gtoSolution.alternates.length).toBeGreaterThanOrEqual(2);
            });
        });

        test('caches drills and returns cached version', async () => {
            await generator.generateDailyDrills();
            const cached = generator.getCachedDrills();

            expect(cached).not.toBeNull();
            expect(cached.drills).toBeDefined();
            expect(cached.expiresAt).toBeDefined();
        });
    });

    // ═══════════════════════════════════════════════════════════
    // LEAK SIGNAL PROCESSOR TESTS
    // ═══════════════════════════════════════════════════════════

    describe('LeakSignalProcessor', () => {
        let processor;
        let mockGTOSolution;

        beforeEach(() => {
            processor = new LeakSignalProcessor();
            mockGTOSolution = {
                bestMove: { type: 'BET', sizing: { multiplier: 0.5 }, ev: 0.3 },
                rankedActions: [
                    { type: 'BET', sizing: { multiplier: 0.5 }, ev: 0.3 },
                    { type: 'CHECK', sizing: null, ev: 0.1 },
                    { type: 'FOLD', sizing: null, ev: -0.5 }
                ],
                alternates: [
                    { id: 'ALT_EXPLOIT', type: 'ALT_EXPLOIT', label: '🟠 Exploitative', action: { type: 'CHECK' }, reasoning: 'Test', points: 70 },
                    { id: 'ALT_SIMPLE', type: 'ALT_SIMPLE', label: '🟡 Simplified', action: { type: 'BET' }, reasoning: 'Test', points: 85 }
                ],
                strategicAnchors: ['Nut Advantage']
            };
        });

        // HARD LAW TESTS
        describe('HARD LAW: GTO + 2 Alternates on Wrong Answer', () => {

            test('correct answer does NOT show GTO', () => {
                const result = processor.processResponse('BET', mockGTOSolution, { userId: 'test' });

                expect(result.status).toBe('OPTIMAL');
                expect(result.showGTO).toBe(false);
                expect(result.leakDetected).toBe(false);
            });

            test('wrong answer ALWAYS shows GTO (Hard Law)', () => {
                const result = processor.processResponse('FOLD', mockGTOSolution, { userId: 'test' });

                expect(result.status).toBe('SUB_OPTIMAL');
                expect(result.showGTO).toBe(true); // HARD LAW
            });

            test('wrong answer ALWAYS shows 2 alternate lines (Hard Law)', () => {
                const result = processor.processResponse('FOLD', mockGTOSolution, { userId: 'test' });

                expect(result.alternates).toBeDefined();
                expect(result.alternates.length).toBeGreaterThanOrEqual(2); // HARD LAW
            });

            test('wrong answer provides Triple-Truth context', () => {
                const result = processor.processResponse('FOLD', mockGTOSolution, { userId: 'test' });

                expect(result.tripleTruth).toBeDefined();
                expect(result.tripleTruth.gtoLine).toBeDefined();
                expect(result.tripleTruth.altLine1).toBeDefined();
                expect(result.tripleTruth.altLine2).toBeDefined();
            });
        });

        // LEAK DETECTION TESTS
        describe('Leak Signal Detection', () => {

            test('detects OVER_FOLDING when folding vs bet recommendation', () => {
                const result = processor.processResponse('FOLD', mockGTOSolution, { userId: 'test' });

                expect(result.leakAnalysis.signals).toContain(LEAK_SIGNALS.OVER_FOLDING);
            });

            test('detects PASSIVE_PLAY when calling vs raise recommendation', () => {
                const result = processor.processResponse('CALL', mockGTOSolution, { userId: 'test' });

                expect(result.leakAnalysis.signals).toContain(LEAK_SIGNALS.PASSIVE_PLAY);
            });

            test('detects PANIC_CLICK for very fast decisions', () => {
                const result = processor.processResponse('FOLD', mockGTOSolution, {
                    userId: 'test',
                    decisionTimeMs: 300
                });

                expect(result.leakAnalysis.signals).toContain(LEAK_SIGNALS.PANIC_CLICK);
            });

            test('provides remediation suggestions for leaks', () => {
                const result = processor.processResponse('FOLD', mockGTOSolution, { userId: 'test' });

                expect(result.leakAnalysis.remediation).toBeDefined();
                expect(result.leakAnalysis.remediation.length).toBeGreaterThan(0);
                expect(result.leakAnalysis.remediation[0].clinic).toBeDefined();
            });
        });

        // EV LOSS CLASSIFICATION TESTS
        describe('Mistake Classification', () => {

            test('calculates EV loss correctly', () => {
                const result = processor.processResponse('FOLD', mockGTOSolution, { userId: 'test' });

                expect(result.evaluation.evLoss).toBeDefined();
                expect(typeof result.evaluation.evLoss).toBe('number');
            });

            test('classifies mistakes by severity', () => {
                const result = processor.processResponse('FOLD', mockGTOSolution, { userId: 'test' });

                expect(result.evaluation.mistakeCategory).toBeDefined();
                expect(result.evaluation.mistakeCategory.label).toBeDefined();
            });

            test('awards XP even for mistakes (never negative)', () => {
                const result = processor.processResponse('FOLD', mockGTOSolution, { userId: 'test' });

                expect(result.evaluation.xpAwarded).toBeGreaterThan(0);
            });
        });

        // PATTERN DETECTION TESTS
        describe('Pattern Detection', () => {

            test('tracks leak history per user', () => {
                for (let i = 0; i < 5; i++) {
                    processor.processResponse('FOLD', mockGTOSolution, { userId: 'pattern_user', sessionId: 's1' });
                }

                const profile = processor.getUserLeakProfile('pattern_user');

                expect(profile).not.toBeNull();
                expect(profile.totalHands).toBe(5);
                expect(profile.leaksBySignal[LEAK_SIGNALS.OVER_FOLDING]).toBe(5);
            });

            test('warns on repeated leak patterns', () => {
                // Create pattern history
                for (let i = 0; i < 4; i++) {
                    processor.processResponse('FOLD', mockGTOSolution, { userId: 'warn_user' });
                }

                // This should trigger warning
                const result = processor.processResponse('FOLD', mockGTOSolution, { userId: 'warn_user' });

                expect(result.leakAnalysis.patternWarning).not.toBeNull();
            });
        });

        // STATISTICS TESTS
        describe('Statistics Tracking', () => {

            test('tracks total evaluations', () => {
                processor.processResponse('BET', mockGTOSolution, {});
                processor.processResponse('FOLD', mockGTOSolution, {});

                const stats = processor.getStats();

                expect(stats.totalEvaluations).toBe(2);
                expect(stats.optimalCount).toBe(1);
                expect(stats.subOptimalCount).toBe(1);
            });
        });
    });
});
