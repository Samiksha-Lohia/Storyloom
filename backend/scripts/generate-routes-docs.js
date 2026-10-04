import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import createApp from '../src/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicit Public Routes Allowlist
export const PUBLIC_ROUTES = [
  { method: 'GET', path: '/' },
  { method: 'GET', path: '/health' },
  { method: 'POST', path: '/api/auth/register' },
  { method: 'POST', path: '/api/auth/login' },
  { method: 'POST', path: '/api/auth/refresh' },
  { method: 'POST', path: '/api/auth/forgot-password' },
  { method: 'POST', path: '/api/auth/reset-password' },
  { method: 'GET', path: '/api/books' },
  { method: 'GET', path: '/api/books/:bookId' },
  { method: 'GET', path: '/api/books/:bookId/pages' },
  { method: 'GET', path: '/api/books/:bookId/pitch' },
  { method: 'GET', path: '/api/books/:bookId/scene-markers' },
  { method: 'GET', path: '/api/books/:id/analysis/scenes' },
  { method: 'GET', path: '/api/books/:id/analysis/characters' },
  { method: 'GET', path: '/api/books/:id/analysis/characters/:characterId' },
  { method: 'GET', path: '/api/books/:id/analysis/relationships' },
  { method: 'GET', path: '/api/books/:id/analysis/timeline' },
  { method: 'GET', path: '/api/books/:id/analysis/mood' },
  { method: 'GET', path: '/api/books/:id/analysis/arc' },
  { method: 'GET', path: '/api/books/:id/analysis/continuity' },
  { method: 'GET', path: '/api/books/:id/analysis/pitch' },
  { method: 'GET', path: '/api/books/:id/analysis/search' },
  { method: 'POST', path: '/api/books/:id/analysis/ask' },
  { method: 'GET', path: '/api/books/:id/reviews' },
  { method: 'GET', path: '/api/writers/:username' },
  { method: 'GET', path: '/api/writers/:username/books' },
  { method: 'GET', path: '/api/writers/profile/:id' },
  { method: 'GET', path: '/api/writer/profile/:id' },
  { method: 'GET', path: '/api/writer/:username' },
  { method: 'GET', path: '/api/reviews/book/:bookId' },
  { method: 'POST', path: '/api/reports/public' },
  { method: 'POST', path: '/api/reports/public-notice' },
];

/**
 * Normalizes an express regex to a path string
 */
export function cleanRegexPath(layer) {
  if (!layer || !layer.regexp) return '';
  let str = layer.regexp.source || '';
  str = str.replace(/^\^/, '');
  str = str.replace(/\\\/\?\(\?=\\\/\|\$\)/g, '');
  str = str.replace(/\/\?\(\?=\/\|\$\)/g, '');
  str = str.replace(/\\\//g, '/');
  str = str.replace(/\(\?:\/\(\[\^\/\]\+\?\)\)/g, '/:id');
  str = str.replace(/\(\?:\(\[\^\/\]\+\?\)\)/g, ':id');
  str = str.replace(/\(\?:\\\/\(\[\^\/\]\+\?\)\)/g, '/:id');
  str = str.replace(/\\/g, '');
  str = str.replace(/\$$/, '');
  if (!str.startsWith('/')) str = '/' + str;
  return str.replace(/\/+/g, '/');
}

/**
 * Recursively walk Express router stack to collect routes
 */
export function extractRoutes(app) {
  const routes = [];

  function splitStack(stack, basePath = '', parentMiddlewares = []) {
    if (!stack) return;

    const currentRouterMiddlewares = [];
    stack.forEach((layer) => {
      if (!layer.route && layer.name && layer.name !== 'router' && layer.name !== 'bound dispatch') {
        currentRouterMiddlewares.push(layer.name);
      }
    });

    const activeMiddlewares = [...parentMiddlewares, ...currentRouterMiddlewares];

    stack.forEach((layer) => {
      if (layer.route) {
        const route = layer.route;
        const methods = Object.keys(route.methods).map((m) => m.toUpperCase());
        const fullPath = (basePath + (route.path === '/' ? '' : route.path)).replace(/\/+/g, '/');

        const routeHandlerNames = route.stack.map((s) => s.name || s.handle?.name || 'anonymous');
        const allHandlers = [...activeMiddlewares, ...routeHandlerNames];

        const hasAuth = allHandlers.some((n) => n === 'authenticate' || n === 'authMiddleware');
        const hasAuthorize = allHandlers.some((n) => n === 'authorize' || n === 'rbacMiddleware');

        let allowedRoles = 'All authenticated';
        if (fullPath.startsWith('/api/admin')) {
          allowedRoles = 'admin';
        } else if (fullPath.startsWith('/api/writer')) {
          allowedRoles = 'writer, admin';
        } else if (fullPath.startsWith('/api/me/wishlist')) {
          allowedRoles = 'publisher, admin';
        } else if (fullPath.startsWith('/api/publish-requests')) {
          allowedRoles = 'publisher, writer, admin';
        }

        methods.forEach((method) => {
          routes.push({
            method,
            path: fullPath || '/',
            hasAuth,
            hasAuthorize,
            allowedRoles,
            handlers: allHandlers,
          });
        });
      } else if (layer.name === 'router' && layer.handle?.stack) {
        let subPath = cleanRegexPath(layer);
        if (subPath === '/' || subPath === '/^') subPath = '';
        splitStack(layer.handle.stack, `${basePath}${subPath}`, activeMiddlewares);
      }
    });
  }

  splitStack(app._router?.stack || []);
  return routes;
}

export function generateRoutesDocs() {
  const app = createApp();
  const routes = extractRoutes(app);

  const uniqueRoutes = [];
  const seen = new Set();
  routes.forEach((r) => {
    const key = `${r.method} ${r.path}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRoutes.push(r);
    }
  });

  uniqueRoutes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

  let md = '# SceneCraft API Route Registry & Access Matrix\n\n';
  md += `Auto-generated route audit documentation. Total endpoints registered: **${uniqueRoutes.length}**.\n\n`;
  md += '| Method | Route Path | Auth Required | Allowed Roles | Description / Guard |\n';
  md += '| :--- | :--- | :---: | :--- | :--- |\n';

  uniqueRoutes.forEach((r) => {
    const isPublic = PUBLIC_ROUTES.some(
      (p) => p.method === r.method && (p.path === r.path || (p.path !== '/' && r.path === p.path))
    );
    const authReq = isPublic ? 'No (Public)' : 'Yes';
    const roles = isPublic ? 'Public' : r.allowedRoles;

    let desc = 'Standard route';
    if (r.path.startsWith('/api/admin')) desc = 'Admin governance & oversight';
    else if (r.path.startsWith('/api/auth')) desc = 'Authentication & token management';
    else if (r.path.startsWith('/api/publish-requests')) desc = 'Publishing offers & lifecycle';
    else if (r.path.startsWith('/api/conversations')) desc = 'Direct secure messaging';
    else if (r.path.startsWith('/api/writer')) desc = 'Author studio & analytics';
    else if (r.path.startsWith('/api/books')) desc = 'Manuscript catalogue & reader';
    else if (r.path.startsWith('/api/me')) desc = 'User library, profile & wishlist';
    else if (r.path.startsWith('/api/reports')) desc = 'Safety & copyright moderation';

    md += `| \`${r.method}\` | \`${r.path}\` | ${authReq} | ${roles} | ${desc} |\n`;
  });

  md += '\n## Public Routes Allowlist\n\n';
  PUBLIC_ROUTES.forEach((p) => {
    md += `- \`${p.method} ${p.path}\`\n`;
  });

  const docsDir = path.resolve(__dirname, '../../docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const outputPath = path.join(docsDir, 'ROUTES.md');
  fs.writeFileSync(outputPath, md, 'utf8');
  console.log(`Successfully generated route registry at: ${outputPath}`);
  return uniqueRoutes;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateRoutesDocs();
  process.exit(0);
}
