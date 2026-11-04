import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { fileURLToPath, URL } from 'node:url';

// Relative assets + hash routing work at any portfolio / GitHub Pages subdirectory.
export default defineConfig({
  plugins: [react(), {
    name: 'demo-dev-hmr-csp',
    transformIndexHtml(html, ctx) {
      return ctx.server ? html.replace("connect-src 'none'", "connect-src 'self' ws: wss:").replace("script-src 'self'", "script-src 'self' 'unsafe-inline'") : html;
    },
  }],
  base: './',
  envDir: '.demo-config',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173, host: '127.0.0.1' },
  build: {
    outDir: '../../demos/task-agent',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: { output: { manualChunks: { charts: ['echarts', 'echarts-for-react'], ui: ['antd', '@ant-design/icons'] } } },
  },
});
