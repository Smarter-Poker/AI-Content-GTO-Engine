import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@components': path.resolve(__dirname, './src/components'),
            '@providers': path.resolve(__dirname, './src/providers'),
            '@layouts': path.resolve(__dirname, './src/layouts'),
            '@pages': path.resolve(__dirname, './src/pages'),
            '@orbs': path.resolve(__dirname, './src/orbs'),
            '@styles': path.resolve(__dirname, './src/styles'),
        },
    },
    server: {
        port: 3000,
        open: true,
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
});
