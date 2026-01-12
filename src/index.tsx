/**
 * 🚀 INDEX.TSX — APPLICATION ENTRY POINT
 * ═══════════════════════════════════════════════════════════════════════════
 * Renders the React application into the DOM.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 🎨 GLOBAL STYLES (Tailwind + Spatial)
import './styles/tailwind.css';
import './styles/spatial.css';

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 RENDER APPLICATION
// ═══════════════════════════════════════════════════════════════════════════════

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
