import { describe, it, before, after, afterEach } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { setupTestDB } from './helper.js';
import createApp from '../src/app.js';
import * as authService from '../src/services/auth.service.js';
import User from '../src/models/user.model.js';
import { TERMS_VERSION } from '../src/constants/terms.js';
import { USER_ROLES, USER_STATUSES } from '../src/constants/user-roles.js';

describe('Auth Service & Sign-up Endpoint Tests (Spec §12.5)', () => {
  setupTestDB(before, after, afterEach);

  let server;
  let baseUrl;

  before(async () => {
    const app = createApp();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://localhost:${server.address().port}/api`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  const apiPost = async (path, body) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, headers: res.headers, body: data };
  };

  it('should register a new user successfully', async () => {
    const result = await authService.register(
      'Jane Doe',
      'jane@example.com',
      'password123'
    );

    assert.ok(result.user);
    assert.strictEqual(result.user.name, 'Jane Doe');
    assert.strictEqual(result.user.email, 'jane@example.com');
    assert.ok(result.tokens.accessToken);
    assert.ok(result.tokens.refreshToken);

    const userInDb = await User.findOne({ email: 'jane@example.com' });
    assert.ok(userInDb);
    assert.strictEqual(userInDb.name, 'Jane Doe');
    assert.ok(userInDb.termsAcceptedAt instanceof Date);
    assert.strictEqual(userInDb.termsVersion, TERMS_VERSION);
  });

  it('should log in an existing user', async () => {
    await authService.register('John Doe', 'john@example.com', 'securepass');

    const result = await authService.login('john@example.com', 'securepass');
    assert.ok(result.user);
    assert.strictEqual(result.user.email, 'john@example.com');
    assert.ok(result.tokens.accessToken);
  });

  it('should refresh tokens successfully using a valid refresh token', async () => {
    const reg = await authService.register('Alice', 'alice@example.com', 'password123');
    const refreshResult = await authService.refreshTokens(reg.tokens.refreshToken);

    assert.ok(refreshResult.accessToken);
    assert.ok(refreshResult.refreshToken);
  });

  it('should revoke refresh token upon logout', async () => {
    const reg = await authService.register('Bob', 'bob@example.com', 'password123');

    await authService.logout(reg.tokens.refreshToken);

    await assert.rejects(
      async () => {
        await authService.refreshTokens(reg.tokens.refreshToken);
      },
      /Invalid or expired refresh token/
    );
  });

  it('terms missing/false → 400', async () => {
    const resMissing = await apiPost('/auth/register', {
      name: 'Alice Reader',
      email: 'alice.missing@example.com',
      password: 'password123',
    });
    assert.strictEqual(resMissing.status, 400);

    const resFalse = await apiPost('/auth/register', {
      name: 'Alice Reader',
      email: 'alice.false@example.com',
      password: 'password123',
      termsAccepted: false,
    });
    assert.strictEqual(resFalse.status, 400);
  });

  it('terms true → timestamps stored', async () => {
    const res = await apiPost('/auth/register', {
      name: 'Bob Accepted',
      email: 'bob.accepted@example.com',
      password: 'password123',
      termsAccepted: true,
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);

    const userInDb = await User.findOne({ email: 'bob.accepted@example.com' });
    assert.ok(userInDb);
    assert.ok(userInDb.termsAcceptedAt instanceof Date);
    assert.strictEqual(userInDb.termsVersion, TERMS_VERSION);
  });

  it('publisher without website/company → 400 field errors', async () => {
    const res = await apiPost('/auth/register', {
      name: 'Pub Incomplete',
      email: 'pub.incomplete@example.com',
      password: 'password123',
      role: 'publisher',
      termsAccepted: true,
    });
    assert.strictEqual(res.status, 400);
    assert.ok(Array.isArray(res.body.errors), 'Expected res.body.errors array');
    const fields = res.body.errors.map((e) => e.field);
    assert.ok(fields.includes('company'), 'Expected field error for company');
    assert.ok(fields.includes('website'), 'Expected field error for website');
  });

  it('publisher with both company and website → status pending', async () => {
    const res = await apiPost('/auth/register', {
      name: 'Pub Complete',
      email: 'pub.complete@example.com',
      password: 'password123',
      role: 'publisher',
      company: 'Apex Literary Publishing',
      website: 'https://apexlit.example.com',
      termsAccepted: true,
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.user.role, USER_ROLES.PUBLISHER);
    assert.strictEqual(res.body.data.user.status, USER_STATUSES.PENDING);

    const userInDb = await User.findOne({ email: 'pub.complete@example.com' });
    assert.ok(userInDb);
    assert.strictEqual(userInDb.role, USER_ROLES.PUBLISHER);
    assert.strictEqual(userInDb.status, USER_STATUSES.PENDING);
    assert.strictEqual(userInDb.publisherProfile.company, 'Apex Literary Publishing');
    assert.strictEqual(userInDb.publisherProfile.website, 'https://apexlit.example.com');
  });

  it('role=admin rejected with 400', async () => {
    const res = await apiPost('/auth/register', {
      name: 'Wannabe Admin',
      email: 'admin.wannabe@example.com',
      password: 'password123',
      role: 'admin',
      termsAccepted: true,
    });
    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /admin/i);
  });

  it('whitespace name → 400', async () => {
    const res = await apiPost('/auth/register', {
      name: '    ',
      email: 'spaces.only@example.com',
      password: 'password123',
      termsAccepted: true,
    });
    assert.strictEqual(res.status, 400);
  });

  it('duplicate email → 409', async () => {
    const payload = {
      name: 'First User',
      email: 'first.duplicate@example.com',
      password: 'password123',
      termsAccepted: true,
    };

    const first = await apiPost('/auth/register', payload);
    assert.strictEqual(first.status, 201);

    const second = await apiPost('/auth/register', payload);
    assert.strictEqual(second.status, 409);
    assert.match(second.body.message, /already exists/i);
  });

  it('register limiter → 429 after 10 requests from same IP', async () => {
    for (let i = 1; i <= 10; i++) {
      const res = await apiPost('/auth/register', {
        name: `Flooder ${i}`,
        email: `flood.${i}@example.com`,
        password: 'password123',
        termsAccepted: true,
      });
      assert.strictEqual(res.status, 201, `Request ${i} should succeed with 201`);
    }

    const eleventh = await apiPost('/auth/register', {
      name: 'Flooder 11',
      email: 'flood.11@example.com',
      password: 'password123',
      termsAccepted: true,
    });
    assert.strictEqual(eleventh.status, 429, '11th request must return 429');
    assert.match(eleventh.body.message, /Too many accounts created from this IP address/);
  });
});
