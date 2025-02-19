/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { loadEnv } from 'vite';

// Document configuration decisions
/**
 * Vite Configuration Strategy:
 * 1. Network: Development server with API proxy
 * 2. Error Handling: Explicit error logging and handling
 * 3. Build: Optimized chunks for better caching
 * 4. Types: Path aliases for cleaner imports
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Validate required environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_DAILY_API_KEY',
    'NEXT_PUBLIC_DAILY_DOMAIN',
    'NEXT_PUBLIC_DAILY_ROOM_URL',
    'NEXT_PUBLIC_DEEPSEEK_API_KEY',
    'NEXT_PUBLIC_ELEVENLABS_API_KEY'
  ];
  const missingEnvVars = requiredEnvVars.filter(key => !env[key]);

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'process.env': {
        ...env,
        MODE: JSON.stringify(mode),
        DEV: mode === 'development',
        PROD: mode === 'production',
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
        ]
      }
    },
    build: {
      target: 'esnext',
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        input: {
          main: path.resolve(process.cwd(), 'index.html'),
        },
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            utils: ['@/lib/utils'],
          },
        },
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'esnext',
      },
      include: ['react', 'react-dom', 'react-router-dom'],
      force: true,
    },
    server: {
      port: 5173,
      strictPort: true,
      host: true,
      open: false,
      cors: true,
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 24678,
        clientPort: 24678,
      },
      watch: {
        usePolling: true,
      }
    },
    preview: {
      port: 5174,
      strictPort: true,
      host: 'localhost',
    },
    esbuild: {
      jsxInject: `import React from 'react'`,
      logLevel: 'warning',
      supported: {
        'top-level-await': true,
      },
      target: 'esnext',
    }
  };
});
