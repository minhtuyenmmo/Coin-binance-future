import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import vitePluginJavascriptObfuscator from 'vite-plugin-javascript-obfuscator';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    build: {
      sourcemap: false, // Tắt source map để ẩn code gốc
    },
    plugins: [
      react(), 
      tailwindcss(),
      vitePluginJavascriptObfuscator({
        include: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js', 'src/**/*.jsx'],
        exclude: [/node_modules/],
        apply: 'build', // Chỉ obfuscate khi build production
        debugger: false,
        options: {
          compact: true,
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 0.75,
          deadCodeInjection: true,
          deadCodeInjectionThreshold: 0.4,
          debugProtection: true, // Ngăn chặn mở DevTools
          debugProtectionInterval: 2000,
          disableConsoleOutput: true, // Tắt toàn bộ console.log
          identifierNamesGenerator: 'hexadecimal',
          log: false,
          numbersToExpressions: true,
          renameGlobals: false,
          selfDefending: true,
          simplify: true,
          splitStrings: true,
          splitStringsChunkLength: 10,
          stringArray: true,
          stringArrayCallsTransform: true,
          stringArrayCallsTransformThreshold: 0.5,
          stringArrayEncoding: ['base64'],
          stringArrayIndexShift: true,
          stringArrayRotate: true,
          stringArrayShuffle: true,
          stringArrayWrappersCount: 1,
          stringArrayWrappersChainedCalls: true,
          stringArrayWrappersParametersMaxCount: 2,
          stringArrayWrappersType: 'variable',
          stringArrayThreshold: 0.75,
          unicodeEscapeSequence: false
        }
      }),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'BinanceFuture AI',
          short_name: 'BFA AI',
          description: 'Công cụ tín hiệu Future Coin',
          theme_color: '#0f172a',
          background_color: '#020617',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'pwa-512x512.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
