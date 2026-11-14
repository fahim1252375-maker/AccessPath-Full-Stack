import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
        manifest: {
          id: '/',
          name: 'AccessPath — Accessible Campus Navigation',
          short_name: 'AccessPath',
          description: 'Accessible Campus Navigation & AI-Powered Barrier Reporting System.',
          theme_color: '#123B56',
          background_color: '#F7F9FC',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
          runtimeCaching: [
            {
              urlPattern: /^\/api\/v1\/(auth|admin|operations\/schedule|reports|ai)/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^\/api\/v1\/campuses\/[^/]+\/(map|locations|edges|floors|trust)/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'accesspath-campus-graph-cache',
                networkTimeoutSeconds: 4,
                expiration: {
                  maxEntries: 25,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'frontend/src'),
        '@backend': path.resolve(import.meta.dirname, 'backend/src'),
        '@shared': path.resolve(import.meta.dirname, 'shared'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Keep the optional 3D engine isolated so it can be budgeted and
            // deferred independently from core navigation and accessibility UI.
            if (id.includes('node_modules/@react-three/') || id.includes('node_modules/three') || id.includes('node_modules/meshline') || id.includes('node_modules/postprocessing')) return 'vendor-3d';
            if (id.includes('node_modules/leaflet')) return 'vendor-leaflet';
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'vendor-charts';
            if (id.includes('node_modules/react')) return 'vendor-react';
            if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
