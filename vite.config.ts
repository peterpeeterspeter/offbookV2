/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

// Document configuration decisions
/**
 * Vite Configuration Strategy:
 * 1. Network: Development server with API proxy
 * 2. Error Handling: Explicit error logging and handling
 * 3. Build: Optimized chunks for better caching
 * 4. Types: Path aliases for cleaner imports
 */
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  // Validate required environment variables
  const requiredEnvVars = ['VITE_DAILY_API_KEY', 'VITE_DAILY_DOMAIN'];
  const missingEnvVars = requiredEnvVars.filter(key => !env[key]);

  if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars.join(', '));
    process.exit(1);
  }

  return {
    plugins: [
      react({
        jsxRuntime: 'automatic',
        jsxImportSource: '@emotion/react',
        babel: {
          plugins: [
            ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
            '@emotion/babel-plugin'
          ]
        }
      }),
      tsconfigPaths()
    ],
    define: {
      'import.meta.env.VITE_DAILY_API_KEY': JSON.stringify(env.VITE_DAILY_API_KEY),
      'import.meta.env.VITE_DAILY_DOMAIN': JSON.stringify(env.VITE_DAILY_DOMAIN),
      'import.meta.env.MODE': JSON.stringify(mode),
      'import.meta.env.DEV': mode === 'development',
      'import.meta.env.PROD': mode === 'production',
      __DEV__: mode === 'development',
      __APP_ENV__: JSON.stringify(env.APP_ENV),
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
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
    },
    build: {
      target: 'esnext',
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        input: {
          main: resolve(process.cwd(), 'index.html'),
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
      port: 3000,
      strictPort: true,
      host: true,
      open: true,
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
      port: 3000,
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
