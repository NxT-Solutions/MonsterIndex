import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const vitePort = Number(env.VITE_EXPOSED_PORT ?? env.VITE_PORT ?? 5151);
    const browserHost = env.VITE_BROWSER_HOST ?? 'localhost';

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
        },
    };
});
