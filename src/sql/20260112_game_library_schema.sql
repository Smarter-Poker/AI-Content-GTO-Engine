-- 🏛️ SOVEREIGN 100-GAME LIBRARY SCHEMA
-- Persists the "Video Game" structure to Supabase

-- 1. Create the Games Table
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- MTT, CASH, SPINS, PSYCHOLOGY, ADVANCED
    levels INTEGER DEFAULT 10,
    focus TEXT NOT NULL,
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
    emoji TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS (Read-only for users)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Games are viewable by everyone" 
ON games FOR SELECT 
USING (true);

-- 3. Populate the Library (The "Living" Manifest)

-- 🔵 MTT
INSERT INTO games (id, name, category, focus, difficulty, emoji, color) VALUES
('mtt_01', 'Nash Push/Fold', 'MTT', 'Short Stack', 1, '🔵', '#2196F3'),
('mtt_02', 'ICM Pressure', 'MTT', 'Bubble Play', 2, '🔵', '#2196F3'),
('mtt_03', 'Chip Accumulator', 'MTT', 'Middle Stages', 2, '🔵', '#2196F3'),
('mtt_04', 'PKO Bounty Hunt', 'MTT', 'Bounty Math', 3, '🔵', '#2196F3'),
('mtt_05', 'Satellite Bubble', 'MTT', 'Survival GTO', 3, '🔵', '#2196F3'),
('mtt_06', 'The Stop-and-Go', 'MTT', 'BB Shoving', 2, '🔵', '#2196F3'),
('mtt_07', 'Ladder Jump Pro', 'MTT', 'ROI Defense', 4, '🔵', '#2196F3'),
('mtt_08', 'BB Ante Defense', 'MTT', 'Dead Money', 2, '🔵', '#2196F3'),
('mtt_09', 'Re-Steal Shove', 'MTT', '20BB Fold Equity', 3, '🔵', '#2196F3'),
('mtt_10', 'Ring Mastery', 'MTT', 'Heads-Up Duel', 4, '🔵', '#2196F3'),
('mtt_11', 'Bubble Bully', 'MTT', 'Stack Pressure', 3, '🔵', '#2196F3'),
('mtt_12', 'Squeeze Play', 'MTT', 'Isolation', 3, '🔵', '#2196F3'),
('mtt_13', 'Stall Master', 'MTT', 'Clock Strategy', 2, '🔵', '#2196F3'),
('mtt_14', 'BvB Brawl', 'MTT', 'Blind Combat', 3, '🔵', '#2196F3'),
('mtt_15', 'Post-Flop ICM', 'MTT', 'Final Table', 5, '🔵', '#2196F3'),
('mtt_16', '3-Barrel Unblock', 'MTT', 'Bluff Selection', 4, '🔵', '#2196F3'),
('mtt_17', 'Hero Engine', 'MTT', 'Blocker Calling', 5, '🔵', '#2196F3'),
('mtt_18', 'Nut Overbet', 'MTT', 'Polarized Sizing', 4, '🔵', '#2196F3'),
('mtt_19', 'Check-Trap', 'MTT', 'Inducement', 3, '🔵', '#2196F3'),
('mtt_20', 'Range Nailer', 'MTT', 'Pot Control', 4, '🔵', '#2196F3'),
('mtt_21', 'Bounty Isolation', 'MTT', 'PKO Protect', 3, '🔵', '#2196F3'),
('mtt_22', 'SB Limp-Stab', 'MTT', 'Lead Strategy', 2, '🔵', '#2196F3'),
('mtt_23', 'Donk-Crusher', 'MTT', 'Weak Leads', 3, '🔵', '#2196F3'),
('mtt_24', 'Asymmetric Stack', 'MTT', 'Stack Gaps', 4, '🔵', '#2196F3'),
('mtt_25', 'FT Multi-Way', 'MTT', 'Survival Math', 5, '🔵', '#2196F3')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, focus = EXCLUDED.focus;

-- 🟢 CASH
INSERT INTO games (id, name, category, focus, difficulty, emoji, color) VALUES
('cash_01', '6-Max Blueprint', 'CASH', 'GTO Ranges', 1, '🟢', '#4CAF50'),
('cash_02', 'Rake-Proof Defense', 'CASH', 'High Rake Adj', 2, '🟢', '#4CAF50'),
('cash_03', '200BB Deep Diver', 'CASH', 'Deep Stack', 3, '🟢', '#4CAF50'),
('cash_04', 'Straddle Sniper', 'CASH', 'Bloated Pots', 3, '🟢', '#4CAF50'),
('cash_05', '3-Bet Factory', 'CASH', 'Linear Aggro', 2, '🟢', '#4CAF50'),
('cash_06', 'Check-Raise Clinic', 'CASH', 'Flop Defense', 3, '🟢', '#4CAF50'),
('cash_07', 'Value-Trap', 'CASH', 'River Sizing', 3, '🟢', '#4CAF50'),
('cash_08', 'Multi-Way Logic', 'CASH', '3+ Players', 4, '🟢', '#4CAF50'),
('cash_09', 'The Blind Thief', 'CASH', 'Stealing', 2, '🟢', '#4CAF50'),
('cash_10', '4-Bet War', 'CASH', 'Polarization', 4, '🟢', '#4CAF50'),
('cash_11', 'Turn Probing', 'CASH', 'Donking', 3, '🟢', '#4CAF50'),
('cash_12', 'Delay C-Bet', 'CASH', 'Balancing', 3, '🟢', '#4CAF50'),
('cash_13', 'Ace-High Hero', 'CASH', 'Blocker Defense', 4, '🟢', '#4CAF50'),
('cash_14', 'The Squeeze', 'CASH', 'Isolation', 3, '🟢', '#4CAF50'),
('cash_15', 'Monotone Board', 'CASH', 'Flush Texture', 4, '🟢', '#4CAF50'),
('cash_16', 'SB Limp-Range', 'CASH', 'Completion', 2, '🟢', '#4CAF50'),
('cash_17', 'Bluff-Catcher', 'CASH', 'MDF Compliance', 4, '🟢', '#4CAF50'),
('cash_18', 'Thin Value Hunter', 'CASH', 'EV Max', 4, '🟢', '#4CAF50'),
('cash_19', 'Board Coverage', 'CASH', 'Interaction', 5, '🟢', '#4CAF50'),
('cash_20', 'Cold 4-Bet', 'CASH', 'Elite Exploits', 5, '🟢', '#4CAF50'),
('cash_21', 'Texture Awareness', 'CASH', 'Sizing', 3, '🟢', '#4CAF50'),
('cash_22', 'Donk-Counter', 'CASH', 'Exploiting', 3, '🟢', '#4CAF50'),
('cash_23', 'Suited Connectors', 'CASH', 'Implied Odds', 2, '🟢', '#4CAF50'),
('cash_24', 'Triple Barrel', 'CASH', 'Max Pressure', 4, '🟢', '#4CAF50'),
('cash_25', 'Fish Exploiter', 'CASH', 'Deviations', 3, '🟢', '#4CAF50')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, focus = EXCLUDED.focus;

-- 🟡 SPINS
INSERT INTO games (id, name, category, focus, difficulty, emoji, color) VALUES
('spin_01', 'Hyper Opener', 'SPINS', '25BB 3-Max', 2, '🟡', '#FFC107'),
('spin_02', 'Button Limp', 'SPINS', 'Small-Ball', 2, '🟡', '#FFC107'),
('spin_03', 'Jackpot Stress', 'SPINS', 'High Stakes', 4, '🟡', '#FFC107'),
('spin_04', 'HU Finisher', 'SPINS', '10BB Duel', 3, '🟡', '#FFC107'),
('spin_05', 'Redline Pro', 'SPINS', 'Aggression', 3, '🟡', '#FFC107'),
('spin_06', 'Phase Shift', 'SPINS', 'Transitions', 3, '🟡', '#FFC107'),
('spin_07', '50/50 Survival', 'SPINS', 'SNG Bubble', 3, '🟡', '#FFC107'),
('spin_08', 'Poverty Drill', 'SPINS', 'Short Stack', 2, '🟡', '#FFC107'),
('spin_09', '3-Bet Shove', 'SPINS', 'Restreals', 3, '🟡', '#FFC107'),
('spin_10', 'Dealer Defense', 'SPINS', 'BB vs BTN', 2, '🟡', '#FFC107')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, focus = EXCLUDED.focus;

-- 🟣 PSYCHOLOGY
INSERT INTO games (id, name, category, focus, difficulty, emoji, color) VALUES
('psy_01', 'The Metronome', 'PSYCHOLOGY', 'Timing', 2, '🟣', '#9C27B0'),
('psy_02', 'The Cooler Cage', 'PSYCHOLOGY', 'Tilt', 4, '🟣', '#9C27B0'),
('psy_03', 'The Reviewer', 'PSYCHOLOGY', 'Bias', 3, '🟣', '#9C27B0'),
('psy_04', 'The Marathon', 'PSYCHOLOGY', 'Endurance', 4, '🟣', '#9C27B0'),
('psy_05', 'The Mucker', 'PSYCHOLOGY', 'Curiosity', 2, '🟣', '#9C27B0'),
('psy_06', 'Decision Speed', 'PSYCHOLOGY', 'Processing', 3, '🟣', '#9C27B0'),
('psy_07', 'The Zen Player', 'PSYCHOLOGY', 'Regulation', 4, '🟣', '#9C27B0'),
('psy_08', 'Winner''s Tilt', 'PSYCHOLOGY', 'Preservation', 3, '🟣', '#9C27B0'),
('psy_09', 'The Multitasker', 'PSYCHOLOGY', 'Attention', 3, '🟣', '#9C27B0'),
('psy_10', 'Self-Awareness', 'PSYCHOLOGY', 'Honesty', 4, '🟣', '#9C27B0'),
('psy_11', 'Ego Killer', 'PSYCHOLOGY', 'Folding', 3, '🟣', '#9C27B0'),
('psy_12', 'Patience Drill', 'PSYCHOLOGY', 'Control', 2, '🟣', '#9C27B0'),
('psy_13', 'Pressure Plate', 'PSYCHOLOGY', 'Simulation', 4, '🟣', '#9C27B0'),
('psy_14', 'The Chameleon', 'PSYCHOLOGY', 'Adaptation', 3, '🟣', '#9C27B0'),
('psy_15', 'Information Filter', 'PSYCHOLOGY', 'Noise', 3, '🟣', '#9C27B0'),
('psy_16', 'Intuition Test', 'PSYCHOLOGY', 'Gut vs GTO', 4, '🟣', '#9C27B0'),
('psy_17', 'Fortitude', 'PSYCHOLOGY', 'Downswing', 5, '🟣', '#9C27B0'),
('psy_18', 'Focus Lock', 'PSYCHOLOGY', 'Distraction', 3, '🟣', '#9C27B0'),
('psy_19', 'Aggro Dial', 'PSYCHOLOGY', 'Emotions', 3, '🟣', '#9C27B0'),
('psy_20', 'Process Focus', 'PSYCHOLOGY', 'Detachment', 4, '🟣', '#9C27B0')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, focus = EXCLUDED.focus;

-- 🔴 ADVANCED
INSERT INTO games (id, name, category, focus, difficulty, emoji, color) VALUES
('adv_01', 'Aggro Vampire', 'ADVANCED', 'Redline', 4, '🔴', '#F44336'),
('adv_02', 'Meta-Shifter', 'ADVANCED', '2026 Pools', 4, '🔴', '#F44336'),
('adv_03', 'Equity Guardian', 'ADVANCED', 'Realization', 4, '🔴', '#F44336'),
('adv_04', 'Invisible Nut', 'ADVANCED', 'Bluffs', 4, '🔴', '#F44336'),
('adv_05', 'Flow-State Fix', 'ADVANCED', 'Adrenaline', 5, '🔴', '#F44336'),
('adv_06', 'Context Switcher', 'ADVANCED', 'Structure', 3, '🔴', '#F44336'),
('adv_07', 'Blocker Matrix', 'ADVANCED', 'Combos', 5, '🔴', '#F44336'),
('adv_08', 'Range Architect', 'ADVANCED', 'Construction', 5, '🔴', '#F44336'),
('adv_09', 'Solver Mimicry', 'ADVANCED', 'Accuracy', 5, '🔴', '#F44336'),
('adv_10', 'The Exploiter', 'ADVANCED', 'Deviations', 4, '🔴', '#F44336'),
('adv_11', 'Geometry', 'ADVANCED', 'Sizing', 4, '🔴', '#F44336'),
('adv_12', 'Node Locker', 'ADVANCED', 'Strategy', 5, '🔴', '#F44336'),
('adv_13', 'Asymmetric Combat', 'ADVANCED', 'Gaps', 4, '🔴', '#F44336'),
('adv_14', 'Indifference', 'ADVANCED', 'Bluff-Catch', 4, '🔴', '#F44336'),
('adv_15', 'Balance', 'ADVANCED', 'Mixing', 5, '🔴', '#F44336'),
('adv_16', 'Texture Transpo', 'ADVANCED', 'Streets', 5, '🔴', '#F44336'),
('adv_17', 'Unexploitable', 'ADVANCED', 'Zero-Leak', 5, '🔴', '#F44336'),
('adv_18', 'HUD Hunter', 'ADVANCED', 'Stats', 3, '🔴', '#F44336'),
('adv_19', 'Algorithm', 'ADVANCED', 'Machine Prep', 5, '🔴', '#F44336'),
('adv_20', 'Final Solution', 'ADVANCED', 'Endgame', 5, '🔴', '#F44336')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, focus = EXCLUDED.focus;
