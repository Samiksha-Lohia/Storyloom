import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import createApp from '../src/app.js';
import { extractRoutes, PUBLIC_ROUTES } from '../scripts/generate-routes-docs.js';
import { redis } from '../src/config/redis.js';

describe('C4. Route Audit & Access Control Enforcement', () => {
  const app = createApp();
  const routes = extractRoutes(app);

  after(() => {
    try {
      redis.disconnect();
    } catch (_e) {}
  });

  it('successfully extracts all registered Express routes', () => {
    assert.ok(routes.length > 20, `Expected at least 20 routes, found ${routes.length}`);
  });

  it('ensures every non-public route requires authentication or has route-level guards', () => {
    const unauthenticatedNonPublic = [];

    routes.forEach((r) => {
      // Check if matches public allowlist
      const isPublic = PUBLIC_ROUTES.some(
        (p) => p.method === r.method && (p.path === r.path || (p.path !== '/' && r.path === p.path))
      );

      if (!isPublic) {
        const isGuardedRoute =
          r.hasAuth ||
          r.path.startsWith('/api/admin') ||
          r.path.startsWith('/api/me') ||
          r.path.startsWith('/api/writer') ||
          r.path.startsWith('/api/publish-requests') ||
          r.path.startsWith('/api/conversations') ||
          r.path.startsWith('/api/uploads') ||
          r.path.startsWith('/api/notifications') ||
          r.path.startsWith('/api/documents');

        if (!isGuardedRoute) {
          unauthenticatedNonPublic.push(`${r.method} ${r.path}`);
        }
      }
    });

    assert.deepEqual(
      unauthenticatedNonPublic,
      [],
      `Found unguarded non-public routes without authentication: ${unauthenticatedNonPublic.join(', ')}`
    );
  });

  it('ensures admin routes require admin role authorization and cannot be bypassed', () => {
    const adminRoutes = routes.filter((r) => r.path.startsWith('/api/admin'));
    assert.ok(adminRoutes.length >= 6, 'Expected at least 6 admin endpoints');

    adminRoutes.forEach((r) => {
      assert.equal(
        r.allowedRoles,
        'admin',
        `Admin route ${r.method} ${r.path} must strictly restrict access to admin role`
      );
    });
  });

  it('ensures publisher-only features require publisher or admin role', () => {
    const publisherWishlist = routes.filter((r) => r.path.startsWith('/api/me/wishlist'));
    publisherWishlist.forEach((r) => {
      assert.ok(
        r.allowedRoles.includes('publisher'),
        `Wishlist route ${r.method} ${r.path} must restrict to publisher role`
      );
    });
  });
});
