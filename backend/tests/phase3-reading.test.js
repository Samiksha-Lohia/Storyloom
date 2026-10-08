import { describe, it, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { setupTestDB } from './helper.js';
import createApp from '../src/app.js';
import * as authService from '../src/services/auth.service.js';
import User from '../src/models/user.model.js';
import Book from '../src/models/book.model.js';
import Document from '../src/models/document.model.js';
import Scene from '../src/models/scene.model.js';
import ReadingList from '../src/models/reading-list.model.js';
import { paginate, pageForOffset } from '../src/services/paginator.service.js';
import { USER_ROLES, USER_STATUSES } from '../src/constants/user-roles.js';
import { BOOK_STATUSES, BOOK_ACCENTS } from '../src/constants/book.js';

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

describe('Phase 3: Pagination, Windowed Pages, Scene Markers & Library', () => {
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

  const createUser = async (role = 'reader', emailSuffix = 'user', overrides = {}) => {
    const email = `${role}_${emailSuffix}@example.com`;
    const password = 'password123';
    const regRole = role === 'admin' ? 'reader' : role;
    const regOptions = { role: regRole };
    if (role === 'publisher') {
      regOptions.company = 'Scout Press';
      regOptions.website = 'https://scoutpress.com';
    }

    const { user: userDto, tokens } = await authService.register(`User ${role}`, email, password, regOptions);

    const updateFields = {};
    if (role === 'admin') updateFields.role = USER_ROLES.ADMIN;
    if (overrides.status) updateFields.status = overrides.status;
    if (overrides.matureAckAt) updateFields.matureAckAt = overrides.matureAckAt;

    let userModel;
    if (Object.keys(updateFields).length > 0) {
      userModel = await User.findByIdAndUpdate(userDto.id, updateFields, { new: true });
      const freshTokens = await authService.generateTokenPair(userModel);
      return { user: userModel, token: freshTokens.accessToken };
    }

    userModel = await User.findById(userDto.id);
    return { user: userModel, token: tokens.accessToken };
  };

  const createTestBook = async (writerOrId, { status = BOOK_STATUSES.PUBLISHED, mature = false, pageCount = 6 } = {}) => {
    const writerId = writerOrId?._id || writerOrId?.id || writerOrId;

    let fullText = '';
    for (let p = 1; p <= pageCount; p++) {
      fullText += `Chapter ${p} Section. ` + 'The quick brown fox jumps over the lazy dog. '.repeat(35) + '\n\n';
    }

    const doc = await Document.create({
      userId: writerId,
      title: 'A Chronicle of Shadows',
      originalFilename: 'shadows.txt',
      fileType: 'txt',
      storageUrl: 'uploads/shadows.txt',
      status: 'ready',
      wordCount: fullText.split(/\s+/).length,
      parsedText: fullText,
    });

    const pageOffsets = paginate(fullText, 1800);

    const book = await Book.create({
      writerId,
      documentId: doc._id,
      title: 'A Chronicle of Shadows',
      blurb: 'An epic tale of mystery and ancient power.',
      genre: 'Fantasy',
      tags: ['fantasy', 'magic'],
      mature,
      status,
      accent: BOOK_ACCENTS[0],
      pageCount: pageOffsets.length,
      pageOffsets,
      stats: { reads: 10, ratingAvg: 4.7, ratingCount: 20 },
      acceptedTermsAt: new Date(),
    });

    doc.bookId = book._id;
    await doc.save();

    const scenesToCreate = [
      {
        documentId: doc._id,
        sceneNumber: 1,
        title: 'Prologue at Dawn',
        summary: 'Elena discovers the cipher in the library.',
        textRange: { start: 10, end: Math.min(500, fullText.length - 1) },
      },
    ];

    if (pageOffsets.length >= 3) {
      scenesToCreate.push({
        documentId: doc._id,
        sceneNumber: 2,
        title: 'Meeting at the River',
        summary: 'Caelen delivers the forged seals.',
        textRange: { start: pageOffsets[2] + 20, end: Math.min(pageOffsets[2] + 400, fullText.length - 1) },
      });
    }

    if (pageOffsets.length >= 5) {
      scenesToCreate.push({
        documentId: doc._id,
        sceneNumber: 3,
        title: 'The Catacombs Gate',
        summary: 'The vault is breached.',
        textRange: { start: pageOffsets[4] + 15, end: Math.min(pageOffsets[4] + 600, fullText.length - 1) },
      });
    }

    await Scene.create(scenesToCreate);

    return { book, doc, fullText, pageOffsets };
  };

  it('GET /books/:bookId/pages — role and status access matrix', async () => {
    const { user: writer, token: writerToken } = await createUser('writer', 'auth1');
    const { user: reader, token: readerToken } = await createUser('reader', 'auth2');
    const { user: admin, token: adminToken } = await createUser('admin', 'auth3');
    const { token: bannedToken } = await createUser('reader', 'auth4', { status: USER_STATUSES.BANNED });

    const { book: pubBook } = await createTestBook(writer._id, { status: BOOK_STATUSES.PUBLISHED });
    const { book: draftBook } = await createTestBook(writer._id, { status: BOOK_STATUSES.DRAFT });

    const guestRes = await req('GET', `/books/${pubBook._id}/pages?from=1&to=2`, null, null);
    assert.equal(guestRes.status, 401);

    const bannedRes = await req('GET', `/books/${pubBook._id}/pages?from=1&to=2`, null, bannedToken);
    assert.equal(bannedRes.status, 403);

    const readerPubRes = await req('GET', `/books/${pubBook._id}/pages?from=1&to=2`, null, readerToken);
    assert.equal(readerPubRes.status, 200);
    assert.equal(readerPubRes.body.success, true);
    assert.equal(readerPubRes.body.data.pages.length, 2);
    assert.equal(readerPubRes.body.data.pageCount, pubBook.pageCount);

    const readerDraftRes = await req('GET', `/books/${draftBook._id}/pages?from=1&to=2`, null, readerToken);
    assert.equal(readerDraftRes.status, 404);

    const ownerDraftRes = await req('GET', `/books/${draftBook._id}/pages?from=1&to=2`, null, writerToken);
    assert.equal(ownerDraftRes.status, 200);

    const adminDraftRes = await req('GET', `/books/${draftBook._id}/pages?from=1&to=2`, null, adminToken);
    assert.equal(adminDraftRes.status, 200);
  });

  it('Mature gate: enforces MATURE_ACK_REQUIRED and PUT /me/mature-ack exemption', async () => {
    const { user: writer, token: writerToken } = await createUser('writer', 'mat1');
    const { user: reader, token: readerToken } = await createUser('reader', 'mat2');
    const { token: adminToken } = await createUser('admin', 'mat3');

    const { book: matureBook } = await createTestBook(writer._id, {
      status: BOOK_STATUSES.PUBLISHED,
      mature: true,
    });

    const unackRes = await req('GET', `/books/${matureBook._id}/pages?from=1&to=2`, null, readerToken);
    assert.equal(unackRes.status, 403);
    assert.equal(unackRes.body.code, 'MATURE_ACK_REQUIRED');

    const ownerRes = await req('GET', `/books/${matureBook._id}/pages?from=1&to=2`, null, writerToken);
    assert.equal(ownerRes.status, 200);

    const adminRes = await req('GET', `/books/${matureBook._id}/pages?from=1&to=2`, null, adminToken);
    assert.equal(adminRes.status, 200);

    const ackRes = await req('PUT', '/me/mature-ack', {}, readerToken);
    assert.equal(ackRes.status, 200);
    assert.equal(ackRes.body.data.acknowledged, true);
    assert(ackRes.body.data.matureAckAt);

    const readerAfterAck = await req('GET', `/books/${matureBook._id}/pages?from=1&to=2`, null, readerToken);
    assert.equal(readerAfterAck.status, 200);
    assert.equal(readerAfterAck.body.data.pages.length, 2);
  });

  it('Pages window validation: caps at 5 pages and checks invalid bounds', async () => {
    const { user: writer } = await createUser('writer', 'win1');
    const { token: readerToken } = await createUser('reader', 'win2');
    const { book } = await createTestBook(writer._id, { pageCount: 8 });

    const win5Res = await req('GET', `/books/${book._id}/pages?from=1&to=5`, null, readerToken);
    assert.equal(win5Res.status, 200);
    assert.equal(win5Res.body.data.pages.length, 5);

    const win6Res = await req('GET', `/books/${book._id}/pages?from=1&to=6`, null, readerToken);
    assert.equal(win6Res.status, 400);
    assert(win6Res.body.message.includes('5 pages'));

    const invertRes = await req('GET', `/books/${book._id}/pages?from=4&to=2`, null, readerToken);
    assert.equal(invertRes.status, 400);

    const page2 = win5Res.body.data.pages.find((p) => p.page === 2);
    assert(page2.text.startsWith('Chapter 2') || page2.text.includes('fox jumps'));
  });

  it('GET /books/:bookId/scene-markers — returns only numbers (spoiler-free)', async () => {
    const { user: writer } = await createUser('writer', 'sc1');
    const { token: readerToken } = await createUser('reader', 'sc2');
    const { book } = await createTestBook(writer._id);

    const res = await req('GET', `/books/${book._id}/scene-markers`, null, readerToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const markers = res.body.data.markers;
    assert(Array.isArray(markers));
    assert.equal(markers.length, 3);

    for (const m of markers) {
      assert.equal(typeof m, 'number');
    }
    assert.deepEqual(markers, [1, 3, 5]);
  });

  it('Reading progress: auto-creation on page fetch, monotonicity, bookmarks, auto-finish', async () => {
    const { user: writer } = await createUser('writer', 'prog1');
    const { user: reader, token: readerToken } = await createUser('reader', 'prog2');
    const { book } = await createTestBook(writer._id, { pageCount: 3 });

    const initialReads = book.stats.reads;

    const fetchPageRes = await req('GET', `/books/${book._id}/pages?from=1&to=1`, null, readerToken);
    assert.equal(fetchPageRes.status, 200);

    const refreshedBook = await Book.findById(book._id);
    assert.equal(refreshedBook.stats.reads, initialReads + 1);

    const libRes = await req('GET', `/me/library/${book._id}`, null, readerToken);
    assert.equal(libRes.status, 200);
    assert.equal(libRes.body.data.currentPage, 1);
    assert.equal(libRes.body.data.furthestPage, 1);
    assert.equal(libRes.body.data.status, 'reading');

    const advanceRes = await req(
      'PUT',
      `/me/library/${book._id}`,
      { currentPage: 2 },
      readerToken
    );
    assert.equal(advanceRes.status, 200);
    assert.equal(advanceRes.body.data.currentPage, 2);
    assert.equal(advanceRes.body.data.furthestPage, 2);

    const backRes = await req(
      'PUT',
      `/me/library/${book._id}`,
      { currentPage: 1 },
      readerToken
    );
    assert.equal(backRes.status, 200);
    assert.equal(backRes.body.data.currentPage, 1);
    assert.equal(backRes.body.data.furthestPage, 2);

    const addBookmarkRes = await req(
      'PUT',
      `/me/library/${book._id}`,
      { addBookmark: { offset: 1250 } },
      readerToken
    );
    assert.equal(addBookmarkRes.status, 200);
    assert.equal(addBookmarkRes.body.data.bookmarks.length, 1);
    assert.equal(addBookmarkRes.body.data.bookmarks[0].offset, 1250);

    const removeBookmarkRes = await req(
      'PUT',
      `/me/library/${book._id}`,
      { removeBookmark: { offset: 1250 } },
      readerToken
    );
    assert.equal(removeBookmarkRes.status, 200);
    assert.equal(removeBookmarkRes.body.data.bookmarks.length, 0);

    const finishRes = await req(
      'PUT',
      `/me/library/${book._id}`,
      { currentPage: 3 },
      readerToken
    );
    assert.equal(finishRes.status, 200);
    assert.equal(finishRes.body.data.status, 'finished');
    assert.equal(finishRes.body.data.currentPage, 3);
    assert.equal(finishRes.body.data.furthestPage, 3);
  });

  it('Resume after repaginate: character offset keeps reader within one page', async () => {
    const { user: writer } = await createUser('writer', 're1');
    const { token: readerToken } = await createUser('reader', 're2');
    const { book, fullText } = await createTestBook(writer._id, { pageCount: 4 });

    const initialPage = pageForOffset(book.pageOffsets, 2100);

    const newOffsets = paginate(fullText, 1600);
    book.pageOffsets = newOffsets;
    book.pageCount = newOffsets.length;
    await book.save();

    const resumedPage = pageForOffset(book.pageOffsets, 2100);

    assert(
      Math.abs(resumedPage - initialPage) <= 1,
      `Resumed page (${resumedPage}) should be within 1 page of initial page (${initialPage})`
    );
  });

  it('Reader settings: PATCH /me/settings and /auth/me synchronization', async () => {
    const { token } = await createUser('reader', 'set1');

    const updateRes = await req(
      'PATCH',
      '/me/settings',
      {
        fontSize: 20,
        lineHeight: 1.8,
        fontFamily: 'sans',
        theme: 'sepia',
      },
      token
    );
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.readerSettings.fontSize, 20);
    assert.equal(updateRes.body.data.readerSettings.lineHeight, 1.8);
    assert.equal(updateRes.body.data.readerSettings.fontFamily, 'sans');
    assert.equal(updateRes.body.data.readerSettings.theme, 'sepia');

    const badRes = await req('PATCH', '/me/settings', { fontSize: 8 }, token);
    assert.equal(badRes.status, 400);

    const meRes = await req('GET', '/auth/me', null, token);
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.data.readerSettings.fontSize, 20);
    assert.equal(meRes.body.data.readerSettings.theme, 'sepia');
  });
});
