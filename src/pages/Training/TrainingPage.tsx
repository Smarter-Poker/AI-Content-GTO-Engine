/**
 * 🎮 TRAINING PAGE — GTO DRILL INTERFACE
 * ═══════════════════════════════════════════════════════════════════════════
 * Main training page wrapper. 
 * Now delegates primarily to the TrainingHub for the dashboard view.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { TrainingHub } from '../../components/hub/TrainingHub';

export const TrainingPage: React.FC = () => {
    // Ideally, this page might become just a wrapper for TrainingHub if logic moves there.
    // For now, we simply render the Hub.
    return (
        <div className="training-page">
            <TrainingHub />
        </div>
    );
};

export default TrainingPage;
