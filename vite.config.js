import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { generatePages, sharedHtml } from './scripts/generate-pages.mjs';

function redirectCanonicalPages(request, response, next) {
  const match = request.url?.match(/^\/(parents|privacy|terms)(\?.*)?$/);
  if (!match) return next();
  response.writeHead(308, { Location: `/${match[1]}/${match[2] || ''}` });
  response.end();
}

export default defineConfig({
  build: { rollupOptions: { input: generatePages() } },
  plugins: [{
    name: 'static-content',
    transformIndexHtml: sharedHtml,
    configureServer(server) {
      server.middlewares.use(redirectCanonicalPages);
      const sources = ['content/news', 'content/legal', 'templates', 'src/partials'].map(path => resolve(path));
      server.watcher.add(sources);
      const refresh = (file) => {
        if (!sources.some(source => file.startsWith(`${source}/`))) return;
        try {
          generatePages();
          server.ws.send({ type: 'full-reload' });
        } catch (error) {
          server.config.logger.error(error.message);
          server.ws.send({ type: 'error', err: { message: error.message, stack: error.stack } });
        }
      };
      server.watcher.on('add', refresh).on('change', refresh).on('unlink', refresh);
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirectCanonicalPages);
    },
  }],
});
