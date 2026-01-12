import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { gameLibrary, CATEGORIES, GameDefinition, GameCategory } from '../../core/GameLibrary';

/**
 * 🏛️ TRAINING HUB
 * The "Netflix/Facebook" style dashboard for browsing the 100-game library.
 */

export const TrainingHub: React.FC = () => {
    const navigate = useNavigate();
    const categories = Object.values(CATEGORIES);

    return (
        <div className="w-full min-h-screen bg-[#18191A] text-[#E4E6EB] pb-24 overflow-x-hidden">

            {/* 🎥 HERO SECTION (Featured Game) */}
            <header className="relative w-full h-[400px] flex items-end p-12 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-[#18191A] via-[#18191A]/50 to-transparent z-10" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511193311914-0346f16efe90?q=80&w=2673&auto=format&fit=crop')] bg-cover bg-center opacity-30 animate-pan" />

                <div className="relative z-20 max-w-4xl space-y-4">
                    <span className="px-3 py-1 bg-[#1877F2] text-white text-xs font-bold rounded-full uppercase tracking-wider">
                        Featured Operation
                    </span>
                    <h1 className="text-6xl font-black tracking-tighter text-white drop-shadow-2xl">
                        NODE LOCKER <span className="text-[#1877F2]">PRO</span>
                    </h1>
                    <p className="text-xl text-[#B0B3B8] max-w-2xl font-light">
                        Master the art of exploiting population imbalances. Learn exactly when to deviate from GTO based on villain tendencies.
                    </p>
                    <button
                        onClick={() => navigate('/app/arena/adv_12')}
                        className="mt-6 px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-[#E4E6EB] transition-colors flex items-center gap-2"
                    >
                        <span>▶</span> START OPERATION
                    </button>
                </div>
            </header>

            {/* 📚 CATEGORY ROWS */}
            <div className="relative z-20 -mt-10 px-8 space-y-12">
                {categories.map((category) => (
                    <CategoryRow
                        key={category.id}
                        category={category}
                        games={gameLibrary.getGamesByCategory(category.id)}
                        onGameClick={(id) => navigate(`/app/arena/${id}`)}
                    />
                ))}
            </div>
        </div>
    );
};

// 🎞️ HORIZONTAL SCROLL ROW
const CategoryRow: React.FC<{
    category: GameCategory;
    games: GameDefinition[];
    onGameClick: (id: string) => void;
}> = ({ category, games, onGameClick }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: category.color }} />
                <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    {category.emoji} {category.name} <span className="text-sm font-normal text-[#B0B3B8] opacity-50">({games.length})</span>
                </h2>
            </div>

            <div className="relative group">
                {/* Scroll Container */}
                <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x">
                    {games.map((game) => (
                        <GameCard key={game.id} game={game} color={category.color} onClick={() => onGameClick(game.id)} />
                    ))}
                </div>

                {/* Fade Edges */}
                <div className="absolute top-0 right-0 bottom-0 w-24 bg-gradient-to-l from-[#18191A] to-transparent pointer-events-none" />
            </div>
        </div>
    );
};

// 🃏 GAME CARD
const GameCard: React.FC<{
    game: GameDefinition;
    color: string;
    onClick: () => void;
}> = ({ game, color, onClick }) => {
    return (
        <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className="flex-none w-72 h-40 bg-[#242526] rounded-xl border border-[#3E4042] p-5 cursor-pointer relative overflow-hidden group hover:border-opacity-100 hover:shadow-xl transition-all shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5)]"
            style={{
                borderColor: `${color}40` // 25% opacity border default
            }}
        >
            {/* Hover Glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500" style={{ backgroundColor: color }} />

            <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-[#B0B3B8]">{game.id}</span>
                        {/* Difficulty Dots */}
                        <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={`w-1 h-3 rounded-full ${i <= game.difficulty ? 'bg-[#1877F2]' : 'bg-[#3E4042]'}`} />
                            ))}
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-white leading-tight mt-1 group-hover:text-[#1877F2] transition-colors">
                        {game.name}
                    </h3>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-[#B0B3B8] flex items-center gap-1">
                        🎯 {game.focus}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[#3A3B3C] group-hover:bg-[#1877F2] flex items-center justify-center transition-colors">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
