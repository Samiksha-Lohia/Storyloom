import { describe, it, before, after, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { setupTestDB } from './helper.js';
import createApp from '../src/app.js';
import * as authService from '../src/services/auth.service.js';
import * as imageService from '../src/services/image.service.js';
import User from '../src/models/user.model.js';
import Book from '../src/models/book.model.js';
import Document from '../src/models/document.model.js';
import ProcessingJob from '../src/models/processing-job.model.js';
import { seedAdmin } from '../scripts/seed-admin.js';
import { USER_ROLES, USER_STATUSES } from '../src/constants/user-roles.js';
import { BOOK_STATUSES, BOOK_ACCENTS } from '../src/constants/book.js';
import STAGES from '../src/constants/stages.js';

let server;
let baseUrl;

const req = async (method, path, body, token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
};

describe('RBAC, Seed Admin, and Book Foundation Tests', () => {
  setupTestDB(before, after, afterEach);

  before(async () => {
    const app = createApp();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://localhost:${server.address().port}/api`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  // Helper to create user & return access token
  const createUserAndLogin = async (role = 'writer', status = 'active', emailSuffix = 'user') => {
    const email = `${role}_${emailSuffix}@example.com`;
    const password = 'password123';
    // If admin is requested, register as reader then promote in DB (since API rejects admin registration)
    const registerRole = role === 'admin' ? 'reader' : role;
    const regOptions = { role: registerRole };
    if (role === 'publisher') {
      regOptions.company = 'Acme Publishing';
      regOptions.website = 'https://acmepublishing.com';
    }

    const { user } = await authService.register(`User ${role}`, email, password, regOptions);

    if (role === 'admin' || status !== user.status) {
      await User.updateOne(
        { _id: user.id },
        {
          ...(role === 'admin' && { role: 'admin' }),
          ...(status !== user.status && { status }),
        }
      );
    }

    // Direct token login
    const dbUser = await User.findById(user.id);
    const { accessToken } = await authService.generateTokenPair(dbUser);
    return { user: dbUser, token: accessToken, email, password };
  };

  // ─── 1. Registration Role Rules ──────────────────────────────────────────
  it('Registration: rejects admin role with validation error', async () => {
    const { status, body } = await req('POST', '/auth/register', {
      name: 'Sneaky Admin',
      email: 'admin_try@example.com',
      password: 'password123',
      role: 'admin',
    });
    assert.equal(status, 400);
    assert.match(body.message, /Admin cannot be created/i);
  });

  it('Registration: publisher requires company and website', async () => {
    const { status, body } = await req('POST', '/auth/register', {
      name: 'Incomplete Publisher',
      email: 'pub_incomplete@example.com',
      password: 'password123',
      role: 'publisher',
    });
    assert.equal(status, 400);
    assert.match(body.message, /Company name is required/i);
  });

  it('Registration: publisher registration sets pending status', async () => {
    const { status, body } = await req('POST', '/auth/register', {
      name: 'Valid Publisher',
      email: 'pub_valid@example.com',
      password: 'password123',
      role: 'publisher',
      company: 'Penguin Books',
      website: 'https://penguin.com',
    });
    assert.equal(status, 201);
    assert.equal(body.data.user.role, 'publisher');
    assert.equal(body.data.user.status, 'pending');
    assert.equal(body.data.user.publisherProfile.reviewStatus, 'pending');
    assert.equal(body.data.user.publisherProfile.company, 'Penguin Books');
    assert.ok(body.data.user.username);
  });

  it('Registration: reader and writer start as active with auto-generated usernames', async () => {
    const readerRes = await req('POST', '/auth/register', {
      name: 'Reader One',
      email: 'reader1@example.com',
      password: 'password123',
      role: 'reader',
    });
    assert.equal(readerRes.status, 201);
    assert.equal(readerRes.body.data.user.role, 'reader');
    assert.equal(readerRes.body.data.user.status, 'active');
    assert.ok(readerRes.body.data.user.username.startsWith('reader-one-'));

    const writerRes = await req('POST', '/auth/register', {
      name: 'Writer One',
      email: 'writer1@example.com',
      password: 'password123',
      role: 'writer',
    });
    assert.equal(writerRes.status, 201);
    assert.equal(writerRes.body.data.user.role, 'writer');
    assert.equal(writerRes.body.data.user.status, 'active');
  });

  // ─── 2. Banned and Suspended Login ─────────────────────────────────────────
  it('Login: banned or suspended users get 403 Forbidden', async () => {
    const { email, password } = await createUserAndLogin('writer', 'banned', 'banned_test');

    const res = await req('POST', '/auth/login', { email, password });
    assert.equal(res.status, 403);
    assert.match(res.body.message, /banned/i);

    // Test suspended
    const suspended = await createUserAndLogin('writer', 'suspended', 'suspended_test');
    const resSuspended = await req('POST', '/auth/login', {
      email: suspended.email,
      password: suspended.password,
    });
    assert.equal(resSuspended.status, 403);
    assert.match(resSuspended.body.message, /suspended/i);
  });

  // ─── 3. GET /auth/me ───────────────────────────────────────────────────────
  it('GET /auth/me returns current user DTO without passwordHash', async () => {
    const { token, user } = await createUserAndLogin('writer', 'active', 'me_test');
    const { status, body } = await req('GET', '/auth/me', null, token);
    assert.equal(status, 200);
    assert.equal(body.data.id, user._id.toString());
    assert.equal(body.data.role, 'writer');
    assert.equal(body.data.status, 'active');
    assert.equal(body.data.passwordHash, undefined);
  });

  // ─── 4. Seed Admin Idempotency ─────────────────────────────────────────────
  it('scripts/seed-admin: creates admin and is idempotent', async () => {
    process.env.ADMIN_EMAIL = 'admin_seeded@scenecraft.com';
    process.env.ADMIN_PASSWORD = 'supersecureadminpass123!';

    const admin1 = await seedAdmin();
    assert.equal(admin1.role, USER_ROLES.ADMIN);
    assert.equal(admin1.email, 'admin_seeded@scenecraft.com');

    // Run a second time
    const admin2 = await seedAdmin();
    assert.equal(admin2.role, USER_ROLES.ADMIN);

    const count = await User.countDocuments({ email: 'admin_seeded@scenecraft.com' });
    assert.equal(count, 1);
  });

  it('scripts/seed-admin: rejects password shorter than 12 characters', async () => {
    process.env.ADMIN_EMAIL = 'admin_weak@scenecraft.com';
    process.env.ADMIN_PASSWORD = 'shortpass';

    await assert.rejects(
      async () => {
        await seedAdmin();
      },
      /at least 12 characters/
    );
  });

  // ─── 5. POST /books RBAC & Upload ──────────────────────────────────────────
  it('POST /books: guest gets 401, reader gets 403, publisher gets 403', async () => {
    const formData = new FormData();
    formData.append('title', 'Unauthorized Book');
    formData.append('acceptedRights', 'true');
    formData.append('manuscript', new Blob(['test content'], { type: 'text/plain' }), 'manuscript.txt');

    // Guest (no token)
    const guestRes = await fetch(`${baseUrl}/books`, { method: 'POST', body: formData });
    assert.equal(guestRes.status, 401);

    // Reader
    const { token: readerToken } = await createUserAndLogin('reader', 'active', 'reader_book');
    const readerRes = await fetch(`${baseUrl}/books`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${readerToken}` },
      body: formData,
    });
    assert.equal(readerRes.status, 403);

    // Publisher
    const { token: pubToken } = await createUserAndLogin('publisher', 'active', 'pub_book');
    const pubRes = await fetch(`${baseUrl}/books`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${pubToken}` },
      body: formData,
    });
    assert.equal(pubRes.status, 403);
  });

  it('POST /books: active writer successfully creates book and document in processing status', async () => {
    const { token: writerToken, user } = await createUserAndLogin('writer', 'active', 'writer_create');

    const formData = new FormData();
    formData.append('title', 'The Chronicles of SceneCraft');
    formData.append('blurb', 'An epic tale of storytelling and AI analysis.');
    formData.append('genre', 'Fantasy');
    formData.append('tags', 'magic,adventure,epic');
    formData.append('accent', BOOK_ACCENTS[0]);
    formData.append('template', 'showcase');
    formData.append('acceptedRights', 'true');
    formData.append(
      'manuscript',
      new Blob(['Chapter 1: The journey begins with words on a page.'], { type: 'text/plain' }),
      'chronicles.txt'
    );

    const res = await fetch(`${baseUrl}/books`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${writerToken}` },
      body: formData,
    });
    const json = await res.json();
    assert.equal(res.status, 201);
    assert.equal(json.data.title, 'The Chronicles of SceneCraft');
    assert.equal(json.data.status, BOOK_STATUSES.PROCESSING);
    assert.equal(json.data.template, 'showcase');
    assert.equal(json.data.writerId, user._id.toString());
    assert.ok(json.data.documentId);
    assert.ok(json.data.acceptedTermsAt);

    // Verify Document in DB
    const doc = await Document.findById(json.data.documentId);
    assert.ok(doc);
    assert.equal(doc.bookId.toString(), json.data.id);
  });

  // ─── 6. Rollback when cover upload fails ────────────────────────────────────
  it('POST /books: rolls back Document and files if cover upload fails', async () => {
    const { token: writerToken } = await createUserAndLogin('writer', 'active', 'rollback_test');

    process.env.MOCK_CLOUDINARY_FAIL = 'true';

    try {
      const formData = new FormData();
      formData.append('title', 'Failed Cover Book');
      formData.append('acceptedRights', 'true');
      formData.append(
        'manuscript',
        new Blob(['Some manuscript content to test rollback.'], { type: 'text/plain' }),
        'fail.txt'
      );
      formData.append(
        'cover',
        new Blob([Buffer.from([0xff, 0xd8, 0xff])], { type: 'image/jpeg' }),
        'cover.jpg'
      );

      const res = await fetch(`${baseUrl}/books`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${writerToken}` },
        body: formData,
      });
      assert.equal(res.status, 500);

      // Verify Document was rolled back (deleted)
      const doc = await Document.findOne({ title: 'Failed Cover Book' });
      assert.equal(doc, null);

      const book = await Book.findOne({ title: 'Failed Cover Book' });
      assert.equal(book, null);
    } finally {
      delete process.env.MOCK_CLOUDINARY_FAIL;
    }
  });

  // ─── 7. Catalogue Filtering & Mature Exclusion ──────────────────────────────
  it('GET /books: catalogue returns only published books and excludes mature by default', async () => {
    const { user: writer } = await createUserAndLogin('writer', 'active', 'catalogue_writer');

    // Create 3 books: 1 published general, 1 published mature, 1 unpublished
    const doc1 = await Document.create({
      userId: writer._id,
      title: 'Published Safe Book',
      originalFilename: 'safe.txt',
      fileType: 'txt',
      storageUrl: 'uploads/safe.txt',
      status: 'ready',
    });
    await Book.create({
      writerId: writer._id,
      documentId: doc1._id,
      title: 'Published Safe Book',
      status: BOOK_STATUSES.PUBLISHED,
      genre: 'Fantasy',
      mature: false,
    });

    const doc2 = await Document.create({
      userId: writer._id,
      title: 'Published Mature Book',
      originalFilename: 'mature.txt',
      fileType: 'txt',
      storageUrl: 'uploads/mature.txt',
      status: 'ready',
    });
    await Book.create({
      writerId: writer._id,
      documentId: doc2._id,
      title: 'Published Mature Book',
      status: BOOK_STATUSES.PUBLISHED,
      genre: 'Thriller',
      mature: true,
    });

    const doc3 = await Document.create({
      userId: writer._id,
      title: 'Draft Unpublished Book',
      originalFilename: 'draft.txt',
      fileType: 'txt',
      storageUrl: 'uploads/draft.txt',
      status: 'processing',
    });
    await Book.create({
      writerId: writer._id,
      documentId: doc3._id,
      title: 'Draft Unpublished Book',
      status: BOOK_STATUSES.DRAFT,
      genre: 'Fantasy',
      mature: false,
    });

    // Default catalogue query
    const resDefault = await req('GET', '/books');
    assert.equal(resDefault.status, 200);
    assert.equal(resDefault.body.data.length, 1);
    assert.equal(resDefault.body.data[0].title, 'Published Safe Book');

    // Query with mature=true
    const resMature = await req('GET', '/books?mature=true');
    assert.equal(resMature.status, 200);
    assert.equal(resMature.body.data.length, 2);

    // Query with genre filter
    const resGenre = await req('GET', '/books?genre=Fantasy');
    assert.equal(resGenre.status, 200);
    assert.equal(resGenre.body.data.length, 1);
    assert.equal(resGenre.body.data[0].genre, 'Fantasy');
  });

  // ─── 8. GET /books/:bookId 404 to Others for Unpublished ──────────────────
  it('GET /books/:bookId: returns 404 to non-owners for unpublished books', async () => {
    const { user: writer, token: writerToken } = await createUserAndLogin('writer', 'active', 'writer_unpub');
    const { token: otherToken } = await createUserAndLogin('reader', 'active', 'reader_unpub');

    const doc = await Document.create({
      userId: writer._id,
      title: 'Secret Draft',
      originalFilename: 'draft.txt',
      fileType: 'txt',
      storageUrl: 'uploads/draft.txt',
      status: 'uploaded',
    });
    const book = await Book.create({
      writerId: writer._id,
      documentId: doc._id,
      title: 'Secret Draft',
      status: BOOK_STATUSES.DRAFT,
    });

    // Other user gets 404
    const resOther = await req('GET', `/books/${book._id}`, null, otherToken);
    assert.equal(resOther.status, 404);

    // Guest gets 404
    const resGuest = await req('GET', `/books/${book._id}`);
    assert.equal(resGuest.status, 404);

    // Owner gets 200
    const resOwner = await req('GET', `/books/${book._id}`, null, writerToken);
    assert.equal(resOwner.status, 200);
    assert.equal(resOwner.body.data.title, 'Secret Draft');
  });

  // ─── 9. Owner-only PATCH and DELETE ────────────────────────────────────────
  it('PATCH and DELETE /books/:bookId: owner and admin permissions and publish gating', async () => {
    const { user: writer, token: writerToken } = await createUserAndLogin('writer', 'active', 'writer_patch');
    const { token: otherToken } = await createUserAndLogin('writer', 'active', 'other_writer_patch');
    const { token: adminToken } = await createUserAndLogin('admin', 'active', 'admin_patch');

    const doc = await Document.create({
      userId: writer._id,
      title: 'Book for Modification',
      originalFilename: 'mod.txt',
      fileType: 'txt',
      storageUrl: 'uploads/mod.txt',
      status: 'uploaded',
    });
    const book = await Book.create({
      writerId: writer._id,
      documentId: doc._id,
      title: 'Book for Modification',
      status: BOOK_STATUSES.DRAFT,
      pageCount: 5,
      pageOffsets: [0, 500, 1000, 1500, 2000],
      acceptedTermsAt: new Date(),
    });

    // Non-owner gets 404 (because book is draft and non-owner cannot see it)
    const patchOther = await req('PATCH', `/books/${book._id}`, { title: 'Hacked' }, otherToken);
    assert.equal(patchOther.status, 404);

    // Owner updates metadata
    const patchOwner = await req(
      'PATCH',
      `/books/${book._id}`,
      { title: 'Updated Title', template: 'notebook' },
      writerToken
    );
    assert.equal(patchOwner.status, 200);
    assert.equal(patchOwner.body.data.title, 'Updated Title');
    assert.equal(patchOwner.body.data.template, 'notebook');

    // Writer tries to publish before parsing is complete -> should fail (400)
    const publishFail = await req('PATCH', `/books/${book._id}`, { status: 'published' }, writerToken);
    assert.equal(publishFail.status, 400);
    assert.match(publishFail.body.message, /parsing must complete/i);

    // Mark parsing complete via ProcessingJob
    await ProcessingJob.create({
      documentId: doc._id,
      stage: STAGES.PARSING,
      status: 'completed',
    });

    // Now writer can publish
    const publishSuccess = await req('PATCH', `/books/${book._id}`, { status: 'published' }, writerToken);
    assert.equal(publishSuccess.status, 200);
    assert.equal(publishSuccess.body.data.status, BOOK_STATUSES.PUBLISHED);

    // Writer cannot set 'removed' (admin only)
    const writerRemove = await req('PATCH', `/books/${book._id}`, { status: 'removed' }, writerToken);
    assert.equal(writerRemove.status, 403);

    // Admin CAN set 'removed'
    const adminRemove = await req('PATCH', `/books/${book._id}`, { status: 'removed' }, adminToken);
    assert.equal(adminRemove.status, 200);
    assert.equal(adminRemove.body.data.status, BOOK_STATUSES.REMOVED);

    // Owner deletes book
    const deleteOwner = await req('DELETE', `/books/${book._id}`, null, writerToken);
    assert.equal(deleteOwner.status, 200);

    const deletedBook = await Book.findById(book._id);
    assert.equal(deletedBook, null);
    const deletedDoc = await Document.findById(doc._id);
    assert.equal(deletedDoc, null);
  });
});
