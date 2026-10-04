import { describe, it, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { setupTestDB } from './helper.js';
import createApp from '../src/app.js';
import * as authService from '../src/services/auth.service.js';
import User from '../src/models/user.model.js';
import Book from '../src/models/book.model.js';
import Document from '../src/models/document.model.js';
import Review from '../src/models/review.model.js';
import Report from '../src/models/report.model.js';
import AuditLog from '../src/models/audit-log.model.js';
import Notification from '../src/models/notification.model.js';
import { USER_ROLES, USER_STATUSES } from '../src/constants/user-roles.js';
import { BOOK_STATUSES, BOOK_ACCENTS } from '../src/constants/book.js';
import { TERMS_VERSION } from '../src/constants/terms.js';

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

describe('Phase 5: Reviews, Reports, Admin Queue, AuditLog, and Notifications Tests', () => {
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

  // Helper to create users
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
    if (overrides.strikes !== undefined) updateFields.strikes = overrides.strikes;

    let userModel;
    if (Object.keys(updateFields).length > 0) {
      userModel = await User.findByIdAndUpdate(userDto.id, updateFields, { new: true });
      const freshTokens = await authService.generateTokenPair(userModel);
      return { user: userModel, token: freshTokens.accessToken };
    }

    userModel = await User.findById(userDto.id);
    return { user: userModel, token: tokens.accessToken };
  };

  // Helper to create a test book
  const createTestBook = async (writerOrId, { status = BOOK_STATUSES.PUBLISHED, title = 'Test Book' } = {}) => {
    const writerId = writerOrId?._id || writerOrId?.id || writerOrId;

    const doc = await Document.create({
      userId: writerId,
      title,
      originalFilename: 'book.txt',
      fileType: 'txt',
      storageUrl: 'uploads/book.txt',
      status: 'ready',
      wordCount: 100,
      parsedText: 'Sample book text for reading and testing.',
    });

    const book = await Book.create({
      writerId,
      documentId: doc._id,
      title,
      blurb: 'A test novel.',
      genre: 'Fantasy',
      tags: ['fantasy'],
      status,
      accent: BOOK_ACCENTS[0],
      pageCount: 1,
      pageOffsets: [0],
      stats: { reads: 0, ratingAvg: 0, ratingCount: 0 },
      acceptedTermsAt: new Date(),
      termsVersion: TERMS_VERSION,
    });

    return book;
  };

  describe('1. Review Creation and Role Restrictions', () => {
    it('allows an active reader to post a review and updates book stats', async () => {
      const { user: writer } = await createUser('writer', 'w1');
      const book = await createTestBook(writer);
      const { token: readerToken } = await createUser('reader', 'r1');

      const res = await req('POST', `/books/${book._id}/reviews`, { rating: 5, text: 'Fantastic read!' }, readerToken);
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.rating, 5);
      assert.equal(res.body.data.text, 'Fantastic read!');

      const updatedBook = await Book.findById(book._id);
      assert.equal(updatedBook.stats.ratingCount, 1);
      assert.equal(updatedBook.stats.ratingAvg, 5);
    });

    it('rejects duplicate reviews from the same reader on the same book with 409 Conflict', async () => {
      const { user: writer } = await createUser('writer', 'w2');
      const book = await createTestBook(writer);
      const { token: readerToken } = await createUser('reader', 'r2');

      const first = await req('POST', `/books/${book._id}/reviews`, { rating: 4, text: 'Good' }, readerToken);
      assert.equal(first.status, 201);

      const second = await req('POST', `/books/${book._id}/reviews`, { rating: 5, text: 'Trying again' }, readerToken);
      assert.equal(second.status, 409);
      assert.match(second.body.message, /already reviewed/i);
    });

    it('rejects reviews written by the book author with 403 Forbidden', async () => {
      const { user: writer, token: writerToken } = await createUser('writer', 'w3');
      const book = await createTestBook(writer);

      const res = await req('POST', `/books/${book._id}/reviews`, { rating: 5, text: 'My own masterpiece' }, writerToken);
      assert.equal(res.status, 403);
    });

    it('rejects reviews written by a publisher with 403 Forbidden', async () => {
      const { user: writer } = await createUser('writer', 'w4');
      const book = await createTestBook(writer);
      const { token: pubToken } = await createUser('publisher', 'pub1');

      const res = await req('POST', `/books/${book._id}/reviews`, { rating: 3, text: 'Publisher review' }, pubToken);
      assert.equal(res.status, 403);
      assert.match(res.body.message, /cannot post reviews/i);
    });

    it('allows book writer to mark a review as read, but rejects other readers', async () => {
      const { user: writer, token: writerToken } = await createUser('writer', 'w_markread');
      const book = await createTestBook(writer);
      const { token: readerToken } = await createUser('reader', 'r_markread');
      const { token: strangerToken } = await createUser('reader', 'r_stranger');

      const reviewRes = await req('POST', `/books/${book._id}/reviews`, { rating: 5, text: 'Great book' }, readerToken);
      assert.equal(reviewRes.status, 201);
      const reviewId = reviewRes.body.data._id;

      // Other reader cannot mark as read
      const forbiddenRes = await req('PATCH', `/books/${book._id}/reviews/${reviewId}/read`, {}, strangerToken);
      assert.equal(forbiddenRes.status, 403);

      // Book writer can mark as read
      const successRes = await req('PATCH', `/books/${book._id}/reviews/${reviewId}/read`, {}, writerToken);
      assert.equal(successRes.status, 200);
      assert.equal(successRes.body.success, true);
      assert.equal(successRes.body.data.readByWriter, true);

      const dbReview = await Review.findById(reviewId);
      assert.equal(dbReview.readByWriter, true);
    });
  });

  describe('2. Stats Recompute Under Concurrent and Sequential Writes', () => {
    it('accurately computes avg and count across multiple reviews, edits, and deletions', async () => {
      const { user: writer } = await createUser('writer', 'w_stats');
      const book = await createTestBook(writer);

      const { token: r1Token } = await createUser('reader', 's1');
      const { token: r2Token } = await createUser('reader', 's2');
      const { token: r3Token, user: r3User } = await createUser('reader', 's3');

      // Post 3 reviews: 5, 4, 3 -> avg = (5+4+3)/3 = 4.0
      await req('POST', `/books/${book._id}/reviews`, { rating: 5, text: 'Awesome' }, r1Token);
      await req('POST', `/books/${book._id}/reviews`, { rating: 4, text: 'Pretty good' }, r2Token);
      const r3Res = await req('POST', `/books/${book._id}/reviews`, { rating: 3, text: 'Average' }, r3Token);

      let currentBook = await Book.findById(book._id);
      assert.equal(currentBook.stats.ratingCount, 3);
      assert.equal(currentBook.stats.ratingAvg, 4.0);

      // Reader 3 updates from 3 to 5 -> avg = (5+4+5)/3 = 4.7
      const review3Id = r3Res.body.data._id;
      const updateRes = await req('PATCH', `/books/${book._id}/reviews/${review3Id}`, { rating: 5 }, r3Token);
      assert.equal(updateRes.status, 200);

      currentBook = await Book.findById(book._id);
      assert.equal(currentBook.stats.ratingCount, 3);
      assert.equal(currentBook.stats.ratingAvg, 4.7);

      // Reader 3 deletes their review -> avg = (5+4)/2 = 4.5, count = 2
      const deleteRes = await req('DELETE', `/books/${book._id}/reviews/${review3Id}`, null, r3Token);
      assert.equal(deleteRes.status, 200);

      currentBook = await Book.findById(book._id);
      assert.equal(currentBook.stats.ratingCount, 2);
      assert.equal(currentBook.stats.ratingAvg, 4.5);
    });

    it('correctly handles concurrent review creations using aggregation pipeline', async () => {
      const { user: writer } = await createUser('writer', 'w_concurrent');
      const book = await createTestBook(writer);

      const readers = await Promise.all([
        createUser('reader', 'c1'),
        createUser('reader', 'c2'),
        createUser('reader', 'c3'),
        createUser('reader', 'c4'),
      ]);

      const ratings = [5, 4, 3, 2]; // sum = 14 / 4 = 3.5
      await Promise.all(
        readers.map((r, i) =>
          req('POST', `/books/${book._id}/reviews`, { rating: ratings[i], text: `Review ${i}` }, r.token)
        )
      );

      const updatedBook = await Book.findById(book._id);
      assert.equal(updatedBook.stats.ratingCount, 4);
      assert.equal(updatedBook.stats.ratingAvg, 3.5);

      // Check histogram from GET /books/:bookId/reviews
      const getRes = await req('GET', `/books/${book._id}/reviews`);
      assert.equal(getRes.status, 200);
      assert.equal(getRes.body.data.stats.ratingAvg, 3.5);
      assert.equal(getRes.body.data.stats.ratingCount, 4);
      assert.equal(getRes.body.data.stats.histogram['5'], 1);
      assert.equal(getRes.body.data.stats.histogram['4'], 1);
      assert.equal(getRes.body.data.stats.histogram['3'], 1);
      assert.equal(getRes.body.data.stats.histogram['2'], 1);
      assert.equal(getRes.body.data.stats.histogram['1'], 0);
    });
  });

  describe('3. Reports: Duplicate Guard, Public Notice and Honeypot', () => {
    it('allows a user to report a book, and prevents duplicate active reports', async () => {
      const { user: writer } = await createUser('writer', 'w_rep');
      const book = await createTestBook(writer);
      const { token: readerToken } = await createUser('reader', 'r_rep');

      const firstReport = await req(
        'POST',
        '/reports',
        {
          targetType: 'book',
          targetId: book._id.toString(),
          reason: 'plagiarism',
          details: 'Matches an existing public domain manuscript.',
        },
        readerToken
      );
      assert.equal(firstReport.status, 201);
      assert.equal(firstReport.body.data.status, 'open');

      // Duplicate report on the same book while still open should be blocked
      const dupReport = await req(
        'POST',
        '/reports',
        {
          targetType: 'book',
          targetId: book._id.toString(),
          reason: 'spam',
          details: 'Second report.',
        },
        readerToken
      );
      assert.equal(dupReport.status, 409);
      assert.match(dupReport.body.message, /already submitted a pending report/i);
    });

    it('rejects public notice if the honeypot field is filled', async () => {
      const { user: writer } = await createUser('writer', 'w_hp');
      const book = await createTestBook(writer);

      const botRes = await req('POST', '/reports/public-notice', {
        targetType: 'book',
        targetId: book._id.toString(),
        reason: 'copyright',
        details: 'Copyright infringement statement',
        claimantName: 'John Doe',
        claimantContact: 'john@example.com',
        honeypot: 'i-am-a-bot',
      });
      assert.equal(botRes.status, 400);
      assert.match(botRes.body.message, /bot/i);
    });

    it('accepts valid public copyright notice without authentication', async () => {
      const { user: writer } = await createUser('writer', 'w_pub_valid');
      const book = await createTestBook(writer);

      const validRes = await req('POST', '/reports/public-notice', {
        targetType: 'book',
        targetId: book._id.toString(),
        reason: 'copyright',
        details: 'Formal copyright claim under penalty of perjury.',
        claimantName: 'Jane Author',
        claimantContact: 'jane@author.com',
        honeypot: '',
      });
      assert.equal(validRes.status, 201);
      assert.equal(validRes.body.data.source, 'public');
      assert.equal(validRes.body.data.claimantName, 'Jane Author');
    });
  });

  describe('4. Admin Reports Queue, Actions, AuditLog, and Strikes/Suspension', () => {
    it('restricts /admin/reports to admin users only', async () => {
      const { token: readerToken } = await createUser('reader', 'non_admin');
      const res = await req('GET', '/admin/reports', null, readerToken);
      assert.equal(res.status, 403);
    });

    it('allows admin to dismiss report and writes an AuditLog entry', async () => {
      const { user: writer } = await createUser('writer', 'w_adm1');
      const book = await createTestBook(writer);
      const { user: reporter, token: repToken } = await createUser('reader', 'r_adm1');
      const { user: admin, token: adminToken } = await createUser('admin', 'admin1');

      const repRes = await req(
        'POST',
        '/reports',
        { targetType: 'book', targetId: book._id.toString(), reason: 'spam', details: 'Seems spammy' },
        repToken
      );
      const reportId = repRes.body.data._id;

      const actionRes = await req(
        'PATCH',
        `/admin/reports/${reportId}`,
        { action: 'dismiss', notes: 'Checked and found compliant.' },
        adminToken
      );
      assert.equal(actionRes.status, 200);
      assert.equal(actionRes.body.data.status, 'closed');
      assert.equal(actionRes.body.data.outcome, 'dismissed');

      // Verify AuditLog entry
      const audit = await AuditLog.findOne({ action: 'report_dismiss', targetId: reportId.toString() });
      assert.ok(audit);
      assert.equal(audit.actor.toString(), admin._id.toString());
      assert.equal(audit.meta.notes, 'Checked and found compliant.');

    });

    it('allows admin to unpublish_book, setting book to removed and notifying writer', async () => {
      const { user: writer } = await createUser('writer', 'w_adm2');
      const book = await createTestBook(writer);
      const { token: repToken } = await createUser('reader', 'r_adm2');
      const { user: admin, token: adminToken } = await createUser('admin', 'admin2');

      const repRes = await req(
        'POST',
        '/reports',
        { targetType: 'book', targetId: book._id.toString(), reason: 'abuse', details: 'Contains hate speech' },
        repToken
      );
      const reportId = repRes.body.data._id;

      const actionRes = await req(
        'PATCH',
        `/admin/reports/${reportId}`,
        { action: 'unpublish_book', notes: 'Violates hate speech terms.' },
        adminToken
      );
      assert.equal(actionRes.status, 200);

      // Verify book status changed to removed
      const updatedBook = await Book.findById(book._id);
      assert.equal(updatedBook.status, BOOK_STATUSES.REMOVED);

      // Verify notification sent to writer
      const notif = await Notification.findOne({ recipientId: writer._id, type: 'book_removed' });
      assert.ok(notif);
      assert.match(notif.message, /removed/i);

      // Verify AuditLog entry
      const audit = await AuditLog.findOne({ action: 'book_unpublish', targetId: book._id });
      assert.ok(audit);
      assert.equal(audit.actor.toString(), admin._id.toString());
    });

    it('3rd strike suspends user, hides all published books, and logs audit', async () => {
      const { user: writer, token: writerToken } = await createUser('writer', 'strike_target', { strikes: 2 });
      const book1 = await createTestBook(writer, { title: 'First Work', status: BOOK_STATUSES.PUBLISHED });
      const book2 = await createTestBook(writer, { title: 'Second Work', status: BOOK_STATUSES.PUBLISHED });

      const { user: admin, token: adminToken } = await createUser('admin', 'admin3');
      const { token: repToken } = await createUser('reader', 'r_strike');

      const repRes = await req(
        'POST',
        '/reports',
        { targetType: 'book', targetId: book1._id.toString(), reason: 'copyright', claimantName: 'Claimant', claimantContact: 'c@c.com' },
        repToken
      );
      const reportId = repRes.body.data._id;

      // Strike user from the report
      const actionRes = await req(
        'PATCH',
        `/admin/reports/${reportId}`,
        { action: 'strike_user', notes: '3rd copyright strike' },
        adminToken
      );
      assert.equal(actionRes.status, 200);

      // Check writer is now suspended with 3 strikes
      const suspendedWriter = await User.findById(writer._id);
      assert.equal(suspendedWriter.strikes, 3);
      assert.equal(suspendedWriter.status, USER_STATUSES.SUSPENDED);

      // Check all published books were set to removed
      const b1 = await Book.findById(book1._id);
      const b2 = await Book.findById(book2._id);
      assert.equal(b1.status, BOOK_STATUSES.REMOVED);
      assert.equal(b2.status, BOOK_STATUSES.REMOVED);

      // Check account_suspended notification
      const notif = await Notification.findOne({ recipientId: writer._id, type: 'account_suspended' });
      assert.ok(notif);
      assert.match(notif.message, /appeal/i);

      // Check user_suspend audit entry
      const audit = await AuditLog.findOne({ action: 'user_suspend', targetId: writer._id });
      assert.ok(audit);
      assert.equal(audit.actor.toString(), admin._id.toString());
    });
  });

  describe('5. Notifications and Terms Re-acceptance', () => {
    it('provides user notifications list, unread count, and read status management', async () => {
      const { user, token } = await createUser('reader', 'notif_user');

      // Create 2 test notifications directly
      await Notification.create({
        recipientId: user._id,
        type: 'test_alert',
        title: 'Welcome',
        message: 'Welcome to SceneCraft',
        read: false,
      });
      const n2 = await Notification.create({
        recipientId: user._id,
        type: 'test_alert',
        title: 'Reminder',
        message: 'Check out new books',
        read: false,
      });

      // Unread count
      const countRes = await req('GET', '/notifications/unread-count', null, token);
      assert.equal(countRes.status, 200);
      assert.equal(countRes.body.data.unreadCount, 2);

      // Mark single notification read
      const markRes = await req('PATCH', `/notifications/${n2._id}/read`, null, token);
      assert.equal(markRes.status, 200);
      assert.equal(markRes.body.data.read, true);

      // Check list
      const listRes = await req('GET', '/notifications', null, token);
      assert.equal(listRes.status, 200);
      assert.equal(listRes.body.data.notifications.length, 2);
      assert.equal(listRes.body.data.unreadCount, 1);

      // Mark all read
      const allReadRes = await req('PATCH', '/notifications/read-all', null, token);
      assert.equal(allReadRes.status, 200);

      const afterCount = await req('GET', '/notifications/unread-count', null, token);
      assert.equal(afterCount.body.data.unreadCount, 0);
    });

    it('allows book owner to accept terms update via POST /books/:bookId/accept-terms', async () => {
      const { user: writer, token: writerToken } = await createUser('writer', 'w_terms');
      const book = await createTestBook(writer);

      // Manually set older terms version
      book.termsVersion = '0.9';
      await book.save();

      const res = await req('POST', `/books/${book._id}/accept-terms`, {}, writerToken);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.termsVersion, TERMS_VERSION);

      const updatedBook = await Book.findById(book._id);
      assert.equal(updatedBook.termsVersion, TERMS_VERSION);
    });
  });
});
