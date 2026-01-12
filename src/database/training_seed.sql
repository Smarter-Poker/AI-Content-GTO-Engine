-- ═══════════════════════════════════════════════════════════════════════════════
-- 🎯 SAMPLE TRAINING QUESTIONS — GTO DRILL CONTENT
-- ═══════════════════════════════════════════════════════════════════════════════
-- Seed data for training_questions table
-- ═══════════════════════════════════════════════════════════════════════════════

-- Level 1: Fundamentals
INSERT INTO training_questions (level_id, concept_category, game_type, title, hero_cards, board_cards, pot_size, effective_stack, position, street, gto_line, alternate_lines, available_actions, correct_action, ev_correct, ev_suboptimal) VALUES
(1, 'Preflop Ranges', 'both', 'Premium Hand UTG', '["Ah", "Kh"]', '[]', 1.5, 100, 'UTG', 'preflop',
 '{"action": "raise", "size": "2.5bb", "ev": 2.1, "explanation": "AKs is a premium hand. Always raise from any position."}',
 ARRAY['{"action": "call", "ev": 0.8}', '{"action": "fold", "ev": 0}']::jsonb[],
 '["fold", "call", "raise"]', 'raise', 2.1, 0.8),

(1, 'Preflop Ranges', 'both', 'Pocket Pair Decision', '["8s", "8c"]', '[]', 1.5, 100, 'MP', 'preflop',
 '{"action": "raise", "size": "2.5bb", "ev": 1.5, "explanation": "Mid pocket pairs play well as opens from middle position."}',
 ARRAY['{"action": "call", "ev": 0.7}', '{"action": "fold", "ev": 0}']::jsonb[],
 '["fold", "call", "raise"]', 'raise', 1.5, 0.7),

(1, 'Hand Strength', 'both', 'Top Pair Top Kicker', '["As", "Kd"]', '["Ac", "7h", "2s"]', 8, 95, 'BTN', 'flop',
 '{"action": "bet", "size": "66%", "ev": 3.2, "explanation": "TPTK on a dry board. Value bet to build the pot."}',
 ARRAY['{"action": "check", "ev": 1.8}', '{"action": "bet", "size": "33%", "ev": 2.4}']::jsonb[],
 '["check", "bet"]', 'bet', 3.2, 1.8),

-- Level 2: Position Play
(2, 'Position Advantage', 'cash', 'Button vs Blinds', '["Ks", "Ts"]', '[]', 1.5, 100, 'BTN', 'preflop',
 '{"action": "raise", "size": "2.5bb", "ev": 1.2, "explanation": "Wide opening range from BTN. KTs is a strong steal hand."}',
 ARRAY['{"action": "fold", "ev": 0}', '{"action": "call", "ev": 0.3}']::jsonb[],
 '["fold", "call", "raise"]', 'raise', 1.2, 0.3),

(2, 'Position Advantage', 'cash', 'Out of Position Post-Flop', '["Qd", "Jd"]', '["Qh", "8c", "3s"]', 12, 88, 'SB', 'flop',
 '{"action": "check", "size": null, "ev": 2.1, "explanation": "Check to the aggressor when OOP with a medium-strength hand."}',
 ARRAY['{"action": "bet", "size": "50%", "ev": 1.4}']::jsonb[],
 '["check", "bet"]', 'check', 2.1, 1.4),

-- Level 3: Bet Sizing
(3, 'Bet Sizing', 'cash', 'Polarized River Sizing', '["Ad", "Ac"]', '["Ks", "7h", "2c", "5d", "9s"]', 45, 110, 'IP', 'river',
 '{"action": "bet", "size": "75%", "ev": 8.5, "explanation": "Large sizing on the river polarizes your range between value bets and bluffs."}',
 ARRAY['{"action": "bet", "size": "33%", "ev": 5.2}', '{"action": "check", "ev": 3.1}']::jsonb[],
 '["check", "bet"]', 'bet', 8.5, 5.2),

(3, 'Bet Sizing', 'cash', 'Small Bet with Range Advantage', '["Jh", "Jc"]', '["As", "8d", "3c"]', 15, 92, 'BTN', 'flop',
 '{"action": "bet", "size": "33%", "ev": 4.1, "explanation": "Small bet sizes work well when you have a range advantage and want to bet frequently."}',
 ARRAY['{"action": "bet", "size": "75%", "ev": 2.8}', '{"action": "check", "ev": 2.5}']::jsonb[],
 '["check", "bet"]', 'bet', 4.1, 2.8),

-- Level 4: C-Betting
(4, 'Continuation Betting', 'cash', 'Dry Board C-Bet', '["Kh", "Qh"]', '["8c", "3d", "2s"]', 10, 90, 'IP', 'flop',
 '{"action": "bet", "size": "50%", "ev": 2.8, "explanation": "C-bet dry boards frequently as the preflop aggressor."}',
 ARRAY['{"action": "check", "ev": 1.2}']::jsonb[],
 '["check", "bet"]', 'bet', 2.8, 1.2),

(4, 'Continuation Betting', 'cash', 'Wet Board Check', '["Ad", "Kd"]', '["Jh", "Tc", "9h"]', 12, 88, 'IP', 'flop',
 '{"action": "check", "size": null, "ev": 1.5, "explanation": "On connected, wet boards, checking back protects your checking range."}',
 ARRAY['{"action": "bet", "size": "66%", "ev": 0.8}']::jsonb[],
 '["check", "bet"]', 'check', 1.5, 0.8),

-- Level 5: Bluff Catching
(5, 'Bluff Catching', 'cash', 'River Call Decision', '["Kd", "Qd"]', '["Ks", "7h", "4c", "2d", "8s"]', 80, 60, 'BB', 'river',
 '{"action": "call", "size": null, "ev": 12.5, "explanation": "Top pair is a bluff catcher. Call if villain bluffs enough of the time."}',
 ARRAY['{"action": "fold", "ev": 0}', '{"action": "raise", "ev": -5.2}']::jsonb[],
 '["fold", "call", "raise"]', 'call', 12.5, 0),

-- Level 6: Range Construction
(6, 'Range Construction', 'cash', 'Balanced 3-Bet Range', '["Qc", "Jc"]', '[]', 4.5, 100, 'BTN', 'preflop',
 '{"action": "raise", "size": "9bb", "ev": 2.3, "explanation": "QJs is part of a balanced 3-bet bluffing range from position."}',
 ARRAY['{"action": "call", "ev": 1.1}', '{"action": "fold", "ev": 0}']::jsonb[],
 '["fold", "call", "raise"]', 'raise', 2.3, 1.1),

-- Level 7: Multi-Street Planning
(7, 'Multi-Street Planning', 'cash', 'Turn Barrel', '["As", "Qc"]', '["Kh", "9d", "5c", "2h"]', 25, 75, 'IP', 'turn',
 '{"action": "bet", "size": "75%", "ev": 8.2, "explanation": "Continue barreling with strong draws and blockers to top pair."}',
 ARRAY['{"action": "check", "ev": 3.5}']::jsonb[],
 '["check", "bet"]', 'bet', 8.2, 3.5),

-- Level 8: Exploitative Play
(8, 'Exploitative Adjustments', 'cash', 'Over-Bet vs Capped Range', '["Ac", "Ks"]', '["Ad", "7h", "3c", "8s", "2d"]', 40, 120, 'IP', 'river',
 '{"action": "bet", "size": "150%", "ev": 22.5, "explanation": "Over-bet when villain cannot have the nuts and you do."}',
 ARRAY['{"action": "bet", "size": "75%", "ev": 15.2}']::jsonb[],
 '["check", "bet"]', 'bet', 22.5, 15.2);

-- Add more questions for higher levels...
INSERT INTO training_questions (level_id, concept_category, game_type, title, hero_cards, board_cards, pot_size, effective_stack, position, street, gto_line, alternate_lines, available_actions, correct_action, ev_correct, ev_suboptimal) VALUES
(9, 'ICM Pressure', 'tournament', 'Bubble Spot Fold', '["Td", "Ts"]', '[]', 3.5, 15, 'CO', 'preflop',
 '{"action": "fold", "size": null, "ev": 0, "explanation": "On the bubble with medium stack, fold medium pairs vs all-in from short stack to preserve ICM equity."}',
 ARRAY['{"action": "call", "ev": -2.1}']::jsonb[],
 '["fold", "call"]', 'fold', 0, -2.1),

(10, 'Mixed Strategies', 'cash', 'Randomized Bluff Frequency', '["9s", "8s"]', '["Th", "6c", "2d", "4h", "Ks"]', 55, 80, 'IP', 'river',
 '{"action": "bet", "size": "75%", "ev": 5.5, "explanation": "This combo should bet as a bluff ~30% of the time in GTO to stay balanced."}',
 ARRAY['{"action": "check", "ev": 2.8}']::jsonb[],
 '["check", "bet"]', 'bet', 5.5, 2.8);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ SEED DATA COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════════
