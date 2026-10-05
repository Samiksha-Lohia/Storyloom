/**
 * Integration tests for the Document REST endpoints.
 * Spins up a real HTTP server on a random port — no mocking of Express middleware.
 * Mocks the Gemini SDK so no real AI API calls are made.
 */

import { describe, it, before, after, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

// ─── Mock Gemini SDK before anything imports it ──────────────────────────────
// We monkey-patch the prototype so ai-provider.service.js picks up the mock
// when it calls  new GoogleGenerativeAI(...)  and then  .getGenerativeModel(...)
const fakeModel = {
  generateContent: async () => ({
    response: { text: () => JSON.stringify({ scenes: [], characters: [] }) },
  }),
  embedContent: async () => ({
    embedding: { values: new Array(768).fill(0.01) },
  }),
};
mock.module('@google/generative-ai', {
  namedExports: {
    GoogleGenerativeAI: class {
      getGenerativeModel() { return fakeModel; }
    },
  },
});

// ─── Now import app & DB helpers ─────────────────────────────────────────────
import { setupTestDB } from './helper.js';
import createApp from '../src/app.js';
import * as authService from '../src/services/auth.service.js';

let server;
let baseUrl;

// Helper: issue a request to the test server
const req = async (method, path, body, token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, body: json };
};

describe('Document API Integration Tests', () => {
  setupTestDB(before, after, afterEach);

  before(async () => {
    const app = createApp();
    server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    baseUrl = `http://localhost:${server.address().port}/api`;
  });

  after(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  // ─── Auth helper ─────────────────────────────────────────────────────────
  const registerAndLogin = async (email = 'test@example.com', password = 'password123') => {
    await authService.register('Test User', email, password);
    const { tokens } = await authService.login(email, password);
    return tokens.accessToken;
  };

  // ─── Tests ───────────────────────────────────────────────────────────────
  it('GET /api/documents — should return empty list for new user', async () => {
    const token = await registerAndLogin();
    const { status, body } = await req('GET', '/documents', null, token);
    assert.equal(status, 200);
    assert.ok(body.success);
    assert.ok(Array.isArray(body.data));
    assert.equal(body.data.length, 0);
  });

  it('GET /api/documents — should return 401 without token', async () => {
    const { status } = await req('GET', '/documents');
    assert.equal(status, 401);
  });

  it('GET /api/documents — paginated request returns pagination metadata', async () => {
    const token = await registerAndLogin('pag@example.com');
    const { status, body } = await req('GET', '/documents?page=1&limit=5', null, token);
    assert.equal(status, 200);
    assert.ok(body.pagination);
    assert.equal(body.pagination.page, 1);
    assert.equal(body.pagination.limit, 5);
    assert.ok(typeof body.pagination.total === 'number');
  });

  it('POST /api/auth/register — should create a new user', async () => {
    const { status, body } = await req('POST', '/auth/register', {
      name: 'New User',
      email: 'newuser@example.com',
      password: 'password123',
      termsAccepted: true,
    });
    assert.equal(status, 201);
    assert.ok(body.data.user);
    assert.ok(body.data.tokens.accessToken);
  });

  it('POST /api/auth/login — should return tokens', async () => {
    await req('POST', '/auth/register', {
      name: 'Login Test',
      email: 'logintest@example.com',
      password: 'password123',
      termsAccepted: true,
    });
    const { status, body } = await req('POST', '/auth/login', {
      email: 'logintest@example.com',
      password: 'password123',
    });
    assert.equal(status, 200);
    assert.ok(body.data.tokens.accessToken);
    assert.ok(body.data.tokens.refreshToken);
  });

  it('POST /api/auth/logout — should revoke refresh token', async () => {
    // Register and get tokens
    const reg = await req('POST', '/auth/register', {
      name: 'Logout Test',
      email: 'logouttest@example.com',
      password: 'password123',
      termsAccepted: true,
    });
    const { accessToken, refreshToken } = reg.body.data.tokens;

    // Logout
    const { status } = await req('POST', '/auth/logout', { refreshToken }, accessToken);
    assert.equal(status, 200);

    // Refresh should now fail
    const { status: refreshStatus } = await req('POST', '/auth/refresh', { refreshToken });
    assert.equal(refreshStatus, 401);
  });

  it('PATCH /api/documents/:id — should return 404 for non-existent document', async () => {
    const token = await registerAndLogin('patch@example.com');
    const fakeId = '000000000000000000000001';
    const { status } = await req('PATCH', `/documents/${fakeId}`, { title: 'New Title' }, token);
    assert.equal(status, 404);
  });

  it('POST /api/auth/login — should return 401 on wrong password', async () => {
    await req('POST', '/auth/register', {
      name: 'Wrong Pass',
      email: 'wrongpass@example.com',
      password: 'correctpassword',
      termsAccepted: true,
    });
    const { status } = await req('POST', '/auth/login', {
      email: 'wrongpass@example.com',
      password: 'incorrectpassword',
    });
    assert.equal(status, 401);
  });
});
