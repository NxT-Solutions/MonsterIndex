import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const vitePort = Number(env.VITE_EXPOSED_PORT ?? env.VITE_PORT ?? 5151);
    const browserHost = env.VITE_BROWSER_HOST ?? 'localhost';
    const backendUrl = env.VITE_BACKEND_URL ?? 'http://www';

    return {
        plugins: [
            laravel({
                input: 'resources/js/app.tsx',
                refresh: true,
            }),
            react(),
        ],
        server: {
            host: '0.0.0.0',
            port: vitePort,
            strictPort: true,
            origin: `http://${browserHost}:${vitePort}`,
            hmr: {
                host: browserHost,
                port: vitePort,
            },
            proxy: {
                // Make the dev server usable as the app URL by forwarding page/API requests to Laravel.
                '^/(?!@vite|resources/|node_modules/|build/|__vite_ping)': {
                    target: backendUrl,
                    changeOrigin: false,
                    secure: false,
                    ws: false,
                },
            },
        },
    };
});
