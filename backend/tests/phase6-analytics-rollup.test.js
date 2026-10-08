import { describe, it, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import { setupTestDB } from './helper.js';
import createApp from '../src/app.js';
import * as authService from '../src/services/auth.service.js';
import User from '../src/models/user.model.js';
import Book from '../src/models/book.model.js';
import Document from '../src/models/document.model.js';
import Review from '../src/models/review.model.js';
import ReadingList from '../src/models/reading-list.model.js';
import ViewEvent from '../src/models/view-event.model.js';
import DailyStat from '../src/models/daily-stat.model.js';
import { BOOK_STATUSES, BOOK_ACCENTS } from '../src/constants/book.js';
import { TERMS_VERSION } from '../src/constants/terms.js';
import { getDayString } from '../src/utilities/viewer-key.js';
import { rollupStatsForDate, refreshAllBookStats } from '../src/services/stats-rollup.service.js';
import { explainDropOffAggregation } from '../src/services/writer.service.js';

let server;
let baseUrl;

const req = async (method, path, body, token, headers = {}) => {
  const reqHeaders = { 'Content-Type': 'application/json', ...headers };
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
};

describe('Phase 6: Analytics, ViewEvents, Nightly Rollup, and Writer Dashboard', () => {
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

  const createUser = async (role = 'reader', emailSuffix = 'user') => {
    const email = `${role}_${emailSuffix}_${Date.now()}@example.com`;
    const password = 'password123';
    const regRole = role === 'admin' ? 'reader' : role;
    const regOptions = { role: regRole };
    if (role === 'publisher') {
      regOptions.company = 'Scout Press';
      regOptions.website = 'https://scoutpress.com';
    }

    const { user: userDto, tokens } = await authService.register(`User ${role}`, email, password, regOptions);

    if (role === 'admin') {
      const userModel = await User.findByIdAndUpdate(userDto.id, { role: 'admin' }, { new: true });
      const freshTokens = await authService.generateTokenPair(userModel);
      return { user: userModel, token: freshTokens.accessToken };
    }

    return { user: userDto, token: tokens.accessToken };
  };

  const createTestBook = async (writerOrId, { status = BOOK_STATUSES.PUBLISHED, title = 'Test Book', textLength = 2000 } = {}) => {
    const writerId = writerOrId?._id || writerOrId?.id || writerOrId;

    const sampleText = 'A'.repeat(textLength);
    const doc = await Document.create({
      userId: writerId,
      title,
      originalFilename: 'book.txt',
      fileType: 'txt',
      storageUrl: 'uploads/book.txt',
      status: 'ready',
      wordCount: Math.round(textLength / 5),
      parsedText: sampleText,
    });

    const book = await Book.create({
      writerId,
      documentId: doc._id,
      title,
      blurb: 'A test novel for analytics.',
      genre: 'Sci-Fi',
      tags: ['analytics', 'scifi'],
      status,
      accent: BOOK_ACCENTS[0],
      pageCount: 2,
      pageOffsets: [0, 1000],
      stats: { reads: 0, ratingAvg: 0, ratingCount: 0, completionRate: 0, readingListAdds: 0 },
      acceptedTermsAt: new Date(),
      termsVersion: TERMS_VERSION,
    });

    return book;
  };

  describe('1. Once-Per-Viewer-Per-Day Deduplication & Privacy', () => {
    it('deduplicates book views: multiple GET /books/:id requests from same viewer on same day record exactly 1 ViewEvent', async () => {
      const { user: writer } = await createUser('writer', 'v1');
      const book = await createTestBook(writer);
      const { token: readerToken, user: reader } = await createUser('reader', 'r_view1');

      const res1 = await req('GET', `/books/${book._id}`, null, readerToken);
      assert.equal(res1.status, 200);

      const res2 = await req('GET', `/books/${book._id}`, null, readerToken);
      assert.equal(res2.status, 200);

      const res3 = await req('GET', `/books/${book._id}`, null, readerToken);
      assert.equal(res3.status, 200);

      const today = getDayString();
      const events = await ViewEvent.find({
        type: 'book_view',
        targetId: book._id,
        viewerKey: reader.id,
        day: today,
      });

      assert.equal(events.length, 1);
    });

    it('deduplicates guest book views and never stores raw IP addresses', async () => {
      const { user: writer } = await createUser('writer', 'v2');
      const book = await createTestBook(writer);

      const customAnonId = 'anon-device-unique-98765';
      const guestHeaders = { 'x-anonymous-id': customAnonId };

      await req('GET', `/books/${book._id}`, null, null, guestHeaders);
      await req('GET', `/books/${book._id}`, null, null, guestHeaders);

      const today = getDayString();
      const events = await ViewEvent.find({
        type: 'book_view',
        targetId: book._id,
        day: today,
      });

      assert.equal(events.length, 1);
      assert.ok(events[0].viewerKey.startsWith('anon_'));
      assert.doesNotMatch(events[0].viewerKey, /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
    });

    it('deduplicates writer profile views and skips writer self-views', async () => {
      const { user: writer, token: writerToken } = await createUser('writer', 'v_prof');
      const { user: reader, token: readerToken } = await createUser('reader', 'r_prof');

      await req('GET', `/writer/profile/${writer.id}`, null, readerToken);
      await req('GET', `/writer/profile/${writer.id}`, null, readerToken);
      await req('GET', `/writer/profile/${writer.id}`, null, readerToken);

      const readerEvents = await ViewEvent.find({
        type: 'profile_view',
        targetId: writer.id,
        viewerKey: reader.id,
      });
      assert.equal(readerEvents.length, 1);

      await req('GET', `/writer/profile/${writer.id}`, null, writerToken);
      const selfEvents = await ViewEvent.find({
        type: 'profile_view',
        targetId: writer.id,
        viewerKey: writer.id,
      });
      assert.equal(selfEvents.length, 0);
    });

    it('records active event at most once per user per day from authenticate', async () => {
      const { user: reader, token: readerToken } = await createUser('reader', 'r_act');

      await req('GET', '/auth/me', null, readerToken);
      await req('GET', '/auth/me', null, readerToken);
      await req('GET', '/notifications', null, readerToken);
      await req('GET', '/auth/me', null, readerToken);

      const today = getDayString();
      const activeEvents = await ViewEvent.find({
        type: 'active',
        targetId: reader.id,
        day: today,
      });

      assert.equal(activeEvents.length, 1);
    });
  });

  describe('2. Rollup Idempotency and Book.stats Refresh', () => {
    it('is idempotent: running rollup multiple times for the same date yields identical stats without duplicates', async () => {
      const { user: writer } = await createUser('writer', 'w_roll');
      const book = await createTestBook(writer, { textLength: 1000 });
      const { user: reader1, token: r1Token } = await createUser('reader', 'r_roll1');
      const { user: reader2, token: r2Token } = await createUser('reader', 'r_roll2');

      const today = getDayString();

      await req('GET', `/books/${book._id}`, null, r1Token);

      await ReadingList.create({
        readerId: reader1.id,
        bookId: book._id,
        status: 'reading',
        currentOffset: 100,
        furthestOffset: 200,
      });
      await ReadingList.create({
        readerId: reader2.id,
        bookId: book._id,
        status: 'finished',
        currentOffset: 1000,
        furthestOffset: 1000,
      });

      await Review.create({
        readerId: reader1.id,
        bookId: book._id,
        rating: 5,
        text: 'Masterpiece',
        status: 'visible',
      });

      await rollupStatsForDate(today);

      const firstBookStat = await DailyStat.findOne({ date: today, scope: 'book', targetId: book._id });
      assert.ok(firstBookStat);
      assert.equal(firstBookStat.views, 1);
      assert.equal(firstBookStat.reads, 2);
      assert.equal(firstBookStat.reviews, 1);
      assert.equal(firstBookStat.completions, 1);

      const firstBook = await Book.findById(book._id);
      assert.equal(firstBook.stats.reads, 2);
      assert.equal(firstBook.stats.ratingCount, 1);
      assert.equal(firstBook.stats.ratingAvg, 5);
      assert.equal(firstBook.stats.completionRate, 50);

      const totalStatsCount1 = await DailyStat.countDocuments({ date: today });

      await rollupStatsForDate(today);

      const totalStatsCount2 = await DailyStat.countDocuments({ date: today });
      assert.equal(totalStatsCount2, totalStatsCount1, 'Rollup must not create duplicate DailyStat documents');

      const secondBookStat = await DailyStat.findOne({ date: today, scope: 'book', targetId: book._id });
      assert.equal(secondBookStat.views, 1);
      assert.equal(secondBookStat.reads, 2);
      assert.equal(secondBookStat.reviews, 1);
      assert.equal(secondBookStat.completions, 1);
    });
  });

  describe('3. Consistency across KPI Cards, Chart Series, and Rollup Aggregations', () => {
    it('ensures dashboard KPIs, readsOverTime, and perBookComparison match stored data exactly', async () => {
      const { user: writer, token: writerToken } = await createUser('writer', 'w_dash');
      const bookA = await createTestBook(writer, { title: 'Book Alpha', textLength: 1000 });
      const bookB = await createTestBook(writer, { title: 'Book Beta', textLength: 1000 });

      const today = getDayString();

      await ViewEvent.create({ type: 'book_view', targetId: bookA._id, viewerKey: 'v1', day: today });
      await ViewEvent.create({ type: 'book_view', targetId: bookB._id, viewerKey: 'v2', day: today });
      await ViewEvent.create({ type: 'profile_view', targetId: writer.id, viewerKey: 'v3', day: today });

      const { user: r1 } = await createUser('reader', 'd_r1');
      const { user: r2 } = await createUser('reader', 'd_r2');
      const { user: r3 } = await createUser('reader', 'd_r3');

      await ReadingList.create({ readerId: r1.id, bookId: bookA._id, status: 'reading', furthestOffset: 300 });
      await ReadingList.create({ readerId: r2.id, bookId: bookA._id, status: 'finished', furthestOffset: 1000 });
      await ReadingList.create({ readerId: r3.id, bookId: bookB._id, status: 'reading', furthestOffset: 600 });

      await Review.create({ readerId: r1.id, bookId: bookA._id, rating: 5, text: 'Great', status: 'visible' });
      await Review.create({ readerId: r2.id, bookId: bookA._id, rating: 4, text: 'Good', status: 'visible' });
      await Review.create({ readerId: r3.id, bookId: bookB._id, rating: 3, text: 'Okay', status: 'visible' });

      await rollupStatsForDate(today);

      const res = await req('GET', '/writer/analytics?range=30', null, writerToken);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      const data = res.body.data;

      assert.equal(data.kpis.totalReads, 3);
      assert.equal(data.kpis.profileViews, 1);
      assert.equal(data.kpis.readingListAdds, 3);
      assert.equal(data.kpis.newReviews, 3);
      assert.equal(data.kpis.avgRating, 4.0);
      assert.equal(data.kpis.publisherWishlists, 0);
      assert.equal(data.kpis.openRequests, 0);

      assert.equal(data.readsOverTime.length, 30);
      const todaySeries = data.readsOverTime.find((entry) => entry.date === today);
      assert.ok(todaySeries);
      assert.equal(todaySeries.reads, 3);
      assert.equal(todaySeries.views, 2);

      assert.equal(data.perBookComparison.length, 2);
      const alphaComp = data.perBookComparison.find((b) => b.title === 'Book Alpha');
      assert.equal(alphaComp.reads, 2);
      assert.equal(alphaComp.ratingCount, 2);
      assert.equal(alphaComp.ratingAvg, 4.5);
      assert.equal(alphaComp.completionRate, 50);

      const betaComp = data.perBookComparison.find((b) => b.title === 'Book Beta');
      assert.equal(betaComp.reads, 1);
      assert.equal(betaComp.ratingCount, 1);
      assert.equal(betaComp.ratingAvg, 3.0);
      assert.equal(betaComp.completionRate, 0);

      assert.equal(data.ratingDistribution[5], 1);
      assert.equal(data.ratingDistribution[4], 1);
      assert.equal(data.ratingDistribution[3], 1);
      assert.equal(data.ratingDistribution[2], 0);
      assert.equal(data.ratingDistribution[1], 0);
    });
  });

  describe('4. Drop-off Bucket Math & Explain Analysis', () => {
    it('correctly maps furthestOffset to percentage buckets and runs explain() on execution plan', async () => {
      const { user: writer, token: writerToken } = await createUser('writer', 'w_drop');
      const book = await createTestBook(writer, { title: 'Dropoff Novel', textLength: 1000 });

      const { user: u1 } = await createUser('reader', 'drop_u1');
      const { user: u2 } = await createUser('reader', 'drop_u2');
      const { user: u3 } = await createUser('reader', 'drop_u3');
      const { user: u4 } = await createUser('reader', 'drop_u4');

      await ReadingList.create({ readerId: u1.id, bookId: book._id, furthestOffset: 50 });
      await ReadingList.create({ readerId: u2.id, bookId: book._id, furthestOffset: 250 });
      await ReadingList.create({ readerId: u3.id, bookId: book._id, furthestOffset: 550 });
      await ReadingList.create({ readerId: u4.id, bookId: book._id, furthestOffset: 950 });

      const res = await req('GET', `/writer/analytics?bookId=${book._id}`, null, writerToken);
      assert.equal(res.status, 200);

      const dropOff = res.body.data.dropOff;
      assert.equal(dropOff.length, 10);

      const b0_10 = dropOff.find((b) => b.bucket === '0-10%');
      assert.equal(b0_10.count, 1);
      assert.equal(b0_10.percentage, 25);

      const b20_30 = dropOff.find((b) => b.bucket === '20-30%');
      assert.equal(b20_30.count, 1);
      assert.equal(b20_30.percentage, 25);

      const b50_60 = dropOff.find((b) => b.bucket === '50-60%');
      assert.equal(b50_60.count, 1);
      assert.equal(b50_60.percentage, 25);

      const b90_100 = dropOff.find((b) => b.bucket === '90-100%');
      assert.equal(b90_100.count, 1);
      assert.equal(b90_100.percentage, 25);

      const explainRes = await explainDropOffAggregation({ writerId: writer.id, bookId: book._id });
      assert.ok(explainRes, 'Explain result must exist');
      const hasStages = Array.isArray(explainRes.stages) || explainRes.executionStats !== undefined || explainRes[0] !== undefined;
      assert.ok(hasStages, 'Aggregation explain must include stages or executionStats');
    });
  });

  describe('5. Role Gating on Analytics and Reviews', () => {
    it('restricts /writer/analytics to writers and admins; rejects guests, readers, and publishers', async () => {
      const { user: writer, token: writerToken } = await createUser('writer', 'w_gate');
      const { token: readerToken } = await createUser('reader', 'r_gate');
      const { token: pubToken } = await createUser('publisher', 'p_gate');
      const { token: adminToken } = await createUser('admin', 'a_gate');

      const guestRes = await req('GET', '/writer/analytics', null, null);
      assert.equal(guestRes.status, 401);

      const readerRes = await req('GET', '/writer/analytics', null, readerToken);
      assert.equal(readerRes.status, 403);

      const pubRes = await req('GET', '/writer/analytics', null, pubToken);
      assert.equal(pubRes.status, 403);

      const writerRes = await req('GET', '/writer/analytics', null, writerToken);
      assert.equal(writerRes.status, 200);

      const adminRes = await req('GET', '/writer/analytics', null, adminToken);
      assert.equal(adminRes.status, 200);
    });

    it('forbids a writer from filtering by another writer bookId', async () => {
      const { user: writer1, token: w1Token } = await createUser('writer', 'w1_iso');
      const { user: writer2, token: w2Token } = await createUser('writer', 'w2_iso');
      const book2 = await createTestBook(writer2, { title: 'Writer 2 Book' });

      const res = await req('GET', `/writer/analytics?bookId=${book2._id}`, null, w1Token);
      assert.equal(res.status, 403);

      const okRes = await req('GET', `/writer/analytics?bookId=${book2._id}`, null, w2Token);
      assert.equal(okRes.status, 200);
    });
  });

  describe('6. Direct PATCH /reviews/:id/read endpoint', () => {
    it('allows book writer to mark review as read via direct /reviews/:id/read route and rejects non-owners', async () => {
      const { user: writer, token: writerToken } = await createUser('writer', 'w_patchrev');
      const book = await createTestBook(writer);
      const { token: readerToken } = await createUser('reader', 'r_patchrev');
      const { token: otherToken } = await createUser('reader', 'r_other');

      const revRes = await req('POST', `/books/${book._id}/reviews`, { rating: 5, text: 'Awesome novel' }, readerToken);
      assert.equal(revRes.status, 201);
      const reviewId = revRes.body.data._id;

      const forbiddenRes = await req('PATCH', `/reviews/${reviewId}/read`, {}, otherToken);
      assert.equal(forbiddenRes.status, 403);

      const successRes = await req('PATCH', `/reviews/${reviewId}/read`, {}, writerToken);
      assert.equal(successRes.status, 200);
      assert.equal(successRes.body.data.readByWriter, true);

      const dbReview = await Review.findById(reviewId);
      assert.equal(dbReview.readByWriter, true);
    });
  });
});
