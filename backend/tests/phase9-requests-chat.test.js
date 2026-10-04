import { describe, it, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import { setupTestDB } from './helper.js';
import createApp from '../src/app.js';
import { initSocket } from '../src/socket/index.js';
import * as authService from '../src/services/auth.service.js';
import User from '../src/models/user.model.js';
import Book from '../src/models/book.model.js';
import Document from '../src/models/document.model.js';
import PublishRequest from '../src/models/publish-request.model.js';
import Conversation from '../src/models/conversation.model.js';
import Message from '../src/models/message.model.js';
import Block from '../src/models/block.model.js';
import Report from '../src/models/report.model.js';
import AuditLog from '../src/models/audit-log.model.js';
import Wishlist from '../src/models/wishlist.model.js';
import { redis } from '../src/config/redis.js';
import { detectContactInfo } from '../src/utilities/contact-filter.js';
import { USER_ROLES, USER_STATUSES } from '../src/constants/user-roles.js';
import { BOOK_STATUSES } from '../src/constants/book.js';

let server;
let baseUrl;
let ioServer;
let serverPort;

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

describe('Phase 9: Publish Requests, Chat, and Safety Controls (Part A)', () => {
  setupTestDB(before, after, afterEach);

  before(async () => {
    const app = createApp();
    server = http.createServer(app);
    ioServer = new SocketIOServer(server, { cors: { origin: '*' } });
    initSocket(ioServer);
    app.set('io', ioServer);

    await new Promise((resolve) => server.listen(0, resolve));
    serverPort = server.address().port;
    baseUrl = `http://localhost:${serverPort}/api`;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  const MOCK_HASH = '$2b$10$Ep5j.7Z5Z7H6hJ5j.7Z5Z7H6hJ5j.7Z5Z7H6hJ5j.7Z5Z7H6hJ5j.';

  const createAdmin = async () => {
    const email = `admin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`;
    const user = await User.create({
      name: 'System Admin',
      username: `admin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      email,
      passwordHash: MOCK_HASH,
      role: USER_ROLES.ADMIN,
      status: USER_STATUSES.ACTIVE,
    });
    const tokens = await authService.generateTokenPair(user);
    return { user, token: tokens.accessToken };
  };

  const createApprovedPublisher = async (company = 'Apex Lit') => {
    const email = `pub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`;
    const user = await User.create({
      name: 'Publisher One',
      username: `pub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      email,
      passwordHash: MOCK_HASH,
      role: USER_ROLES.PUBLISHER,
      status: USER_STATUSES.ACTIVE,
      publisherProfile: {
        company,
        website: 'https://apexlit.example.com',
        reviewStatus: 'approved',
        approvedAt: new Date(),
      },
    });
    const tokens = await authService.generateTokenPair(user);
    return { user, token: tokens.accessToken };
  };

  const createPendingPublisher = async () => {
    const email = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`;
    const user = await User.create({
      name: 'Pending Publisher',
      username: `pending_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      email,
      passwordHash: MOCK_HASH,
      role: USER_ROLES.PUBLISHER,
      status: USER_STATUSES.PENDING,
      publisherProfile: {
        company: 'New Lit',
        reviewStatus: 'pending',
      },
    });
    const tokens = await authService.generateTokenPair(user);
    return { user, token: tokens.accessToken };
  };

  const createWriter = async () => {
    const email = `writer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`;
    const user = await User.create({
      name: 'Elena Vance',
      username: `writer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      email,
      passwordHash: MOCK_HASH,
      role: USER_ROLES.WRITER,
      status: USER_STATUSES.ACTIVE,
    });
    const tokens = await authService.generateTokenPair(user);
    return { user, token: tokens.accessToken };
  };

  const createBook = async (writerUser, status = BOOK_STATUSES.PUBLISHED) => {
    const doc = await Document.create({
      userId: writerUser._id,
      title: 'Echoes of the Crown',
      originalFilename: 'echoes.txt',
      fileType: 'txt',
      storageUrl: 'uploads/echoes.txt',
      status: 'ready',
      wordCount: 15000,
    });
    const book = await Book.create({
      writerId: writerUser._id,
      documentId: doc._id,
      title: 'Echoes of the Crown',
      genre: 'Fantasy',
      blurb: 'A gripping high fantasy tale.',
      status,
      pageCount: 120,
    });
    return book;
  };

  describe('1. Contact Filter Unit Tests (A7 & Spec 13)', () => {
    it('detects emails correctly', () => {
      const res1 = detectContactInfo('Email me at editor@publisher.com for details');
      assert.strictEqual(res1.containsContact, true);
      assert.strictEqual(res1.type, 'email');
    });

    it('detects URLs with protocols and common TLDs', () => {
      const res1 = detectContactInfo('Check out https://myagency.com/books');
      assert.strictEqual(res1.containsContact, true);
      assert.strictEqual(res1.type, 'url');

      const res2 = detectContactInfo('Visit our catalog at apexpublishing.co.uk today');
      assert.strictEqual(res2.containsContact, true);
      assert.strictEqual(res2.type, 'url');
    });

    it('detects formatted phone numbers', () => {
      const res1 = detectContactInfo('Call my cell at +1 (555) 234-5678 to discuss');
      assert.strictEqual(res1.containsContact, true);
      assert.strictEqual(res1.type, 'phone');

      const res2 = detectContactInfo('Ring me on 555-123-4567 any afternoon');
      assert.strictEqual(res2.containsContact, true);
      assert.strictEqual(res2.type, 'phone');
    });

    it('does NOT trigger false positives on normal literary prose', () => {
      const samples = [
        'He walked across the street. The night was cold.',
        'I read pages 120 to 145 and loved chapter 3.',
        'In the 1920s, there were 400 soldiers stationed here.',
        'We met around 3 or 4 in the afternoon.',
        'Sections 1.2.3 and 4.5 were fascinating.',
        'I would love to discuss a 3-book fantasy series with you.',
      ];

      for (const text of samples) {
        const res = detectContactInfo(text);
        assert.strictEqual(
          res.containsContact,
          false,
          `False positive detected on text: "${text}"`
        );
      }
    });
  });

  describe('2. PublishRequest Lifecycle and State Machine (A1, A2, A3)', () => {
    it('approved publisher can submit a request on a published book', async () => {
      const { user: writer } = await createWriter();
      const book = await createBook(writer);
      const { token: pubToken } = await createApprovedPublisher();

      const payload = {
        bookId: book._id.toString(),
        company: 'Apex Literary Publishing',
        contactName: 'Sarah Editor',
        contactEmail: 'sarah@apexlit.com',
        proposedTerms: 'Standard 3-book deal with advance and 15% royalties.',
        message: 'We were blown away by your worldbuilding and pacing.',
        rights: ['print', 'ebook', 'audiobook'],
      };

      const res = await req('POST', '/publish-requests', payload, pubToken);
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'pending');
      assert.strictEqual(res.body.data.company, payload.company);
      assert.deepStrictEqual(res.body.data.rights, payload.rights);
    });

    it('pending publisher receives 403 PUBLISHER_PENDING', async () => {
      const { user: writer } = await createWriter();
      const book = await createBook(writer);
      const { token: pendingToken } = await createPendingPublisher();

      const payload = {
        bookId: book._id.toString(),
        company: 'Pending Lit',
        contactName: 'John',
        contactEmail: 'john@pendinglit.com',
        proposedTerms: 'Terms',
        message: 'Message with enough length to pass Joi',
        rights: ['ebook'],
      };

      const res = await req('POST', '/publish-requests', payload, pendingToken);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.code, 'PUBLISHER_PENDING');
    });

    it('cannot send request on unpublished book', async () => {
      const { user: writer } = await createWriter();
      const book = await createBook(writer, BOOK_STATUSES.DRAFT);
      const { token: pubToken } = await createApprovedPublisher();

      const payload = {
        bookId: book._id.toString(),
        company: 'Apex Lit',
        contactName: 'Sarah',
        contactEmail: 'sarah@apexlit.com',
        proposedTerms: 'Terms proposal text',
        message: 'Message proposal text with length',
        rights: ['print'],
      };

      const res = await req('POST', '/publish-requests', payload, pubToken);
      assert.strictEqual(res.status, 400);
    });

    it('duplicate active request fails with 409 Conflict', async () => {
      const { user: writer } = await createWriter();
      const book = await createBook(writer);
      const { token: pubToken } = await createApprovedPublisher();

      const payload = {
        bookId: book._id.toString(),
        company: 'Apex Lit',
        contactName: 'Sarah',
        contactEmail: 'sarah@apexlit.com',
        proposedTerms: 'Terms proposal text',
        message: 'Message proposal text with length',
        rights: ['print'],
      };

      const res1 = await req('POST', '/publish-requests', payload, pubToken);
      assert.strictEqual(res1.status, 201);

      const res2 = await req('POST', '/publish-requests', payload, pubToken);
      assert.strictEqual(res2.status, 409);
      assert.strictEqual(res2.body.code, 'ACTIVE_REQUEST_EXISTS');
    });

    it('writer can accept request, creating Conversation and closing pending state', async () => {
      const { user: writer, token: writerToken } = await createWriter();
      const book = await createBook(writer);
      const { token: pubToken } = await createApprovedPublisher();

      const createRes = await req(
        'POST',
        '/publish-requests',
        {
          bookId: book._id.toString(),
          company: 'Apex Lit',
          contactName: 'Sarah',
          contactEmail: 'sarah@apexlit.com',
          proposedTerms: 'Advance plus royalties proposal',
          message: 'Looking forward to discussing publication.',
          rights: ['print', 'ebook'],
        },
        pubToken
      );

      const requestId = createRes.body.data._id;

      // Writer accepts
      const acceptRes = await req(
        'PATCH',
        `/publish-requests/${requestId}`,
        { action: 'accept', note: 'Thrilled to discuss this with you!' },
        writerToken
      );

      assert.strictEqual(acceptRes.status, 200);
      assert.strictEqual(acceptRes.body.data.request.status, 'accepted');
      assert.ok(acceptRes.body.data.conversation);
      assert.strictEqual(acceptRes.body.data.conversation.status, 'open');
      assert.strictEqual(acceptRes.body.data.conversation.contactSharingEnabled, false);

      // Verify conversation in DB
      const convoInDb = await Conversation.findOne({ requestId });
      assert.ok(convoInDb);
      assert.strictEqual(convoInDb.participants.length, 2);
    });

    it('writer can decline request, applying 30-day cooldown', async () => {
      const { user: writer, token: writerToken } = await createWriter();
      const book = await createBook(writer);
      const { token: pubToken } = await createApprovedPublisher();

      const createRes = await req(
        'POST',
        '/publish-requests',
        {
          bookId: book._id.toString(),
          company: 'Apex Lit',
          contactName: 'Sarah',
          contactEmail: 'sarah@apexlit.com',
          proposedTerms: 'Advance plus royalties proposal',
          message: 'Looking forward to discussing publication.',
          rights: ['print'],
        },
        pubToken
      );

      const requestId = createRes.body.data._id;

      // Writer declines
      const declineRes = await req(
        'PATCH',
        `/publish-requests/${requestId}`,
        { action: 'decline', note: 'Not a good fit at this time.' },
        writerToken
      );

      assert.strictEqual(declineRes.status, 200);
      assert.strictEqual(declineRes.body.data.request.status, 'declined');
      assert.ok(declineRes.body.data.request.cooldownUntil);

      // Attempting to re-apply while under cooldown returns 403
      const retryRes = await req(
        'POST',
        '/publish-requests',
        {
          bookId: book._id.toString(),
          company: 'Apex Lit',
          contactName: 'Sarah',
          contactEmail: 'sarah@apexlit.com',
          proposedTerms: 'Revised proposal',
          message: 'Can we reconsider our previous offer?',
          rights: ['print'],
        },
        pubToken
      );

      assert.strictEqual(retryRes.status, 403);
      assert.strictEqual(retryRes.body.code, 'REQUEST_COOLDOWN');
    });

    it('publisher can withdraw request while pending, but not after accepted', async () => {
      const { user: writer, token: writerToken } = await createWriter();
      const book = await createBook(writer);
      const { token: pubToken } = await createApprovedPublisher();

      const createRes = await req(
        'POST',
        '/publish-requests',
        {
          bookId: book._id.toString(),
          company: 'Apex Lit',
          contactName: 'Sarah',
          contactEmail: 'sarah@apexlit.com',
          proposedTerms: 'Proposed terms for withdrawal test',
          message: 'We are reaching out to inquire.',
          rights: ['ebook'],
        },
        pubToken
      );

      const requestId = createRes.body.data._id;

      // Publisher withdraws
      const withdrawRes = await req(
        'PATCH',
        `/publish-requests/${requestId}`,
        { action: 'withdraw' },
        pubToken
      );

      assert.strictEqual(withdrawRes.status, 200);
      assert.strictEqual(withdrawRes.body.data.request.status, 'withdrawn');

      // Writer cannot accept a withdrawn request
      const acceptFail = await req(
        'PATCH',
        `/publish-requests/${requestId}`,
        { action: 'accept' },
        writerToken
      );
      assert.strictEqual(acceptFail.status, 400);
    });

    it('blocked publisher cannot send new requests to that writer', async () => {
      const { user: writer, token: writerToken } = await createWriter();
      const book = await createBook(writer);
      const { user: pubUser, token: pubToken } = await createApprovedPublisher();

      // Writer blocks publisher
      const blockRes = await req(
        'PUT',
        `/publish-requests/blocks/${pubUser._id}`,
        { reason: 'Spamming predatory contracts' },
        writerToken
      );
      assert.strictEqual(blockRes.status, 200);

      // Blocked publisher attempts to request
      const createRes = await req(
        'POST',
        '/publish-requests',
        {
          bookId: book._id.toString(),
          company: 'Apex Lit',
          contactName: 'Sarah',
          contactEmail: 'sarah@apexlit.com',
          proposedTerms: 'Contract terms proposal',
          message: 'Trying to contact author.',
          rights: ['print'],
        },
        pubToken
      );

      assert.strictEqual(createRes.status, 403);

      // Unblock and try again
      await req('DELETE', `/publish-requests/blocks/${pubUser._id}`, null, writerToken);
      const retryRes = await req(
        'POST',
        '/publish-requests',
        {
          bookId: book._id.toString(),
          company: 'Apex Lit',
          contactName: 'Sarah',
          contactEmail: 'sarah@apexlit.com',
          proposedTerms: 'Contract terms proposal',
          message: 'Trying to contact author after unblock.',
          rights: ['print'],
        },
        pubToken
      );
      assert.strictEqual(retryRes.status, 201);
    });
  });

  describe('3. Conversation Messaging & Contact Sharing Controls (A4, A5, A7)', () => {
    it('rejects contact info when contactSharingEnabled is false, allows after enabled by writer', async () => {
      const { user: writer, token: writerToken } = await createWriter();
      const book = await createBook(writer);
      const { token: pubToken } = await createApprovedPublisher();

      const createRes = await req(
        'POST',
        '/publish-requests',
        {
          bookId: book._id.toString(),
          company: 'Apex Lit',
          contactName: 'Sarah',
          contactEmail: 'sarah@apexlit.com',
          proposedTerms: 'Proposed terms for chat test',
          message: 'Let us chat about your book.',
          rights: ['print'],
        },
        pubToken
      );

      const acceptRes = await req(
        'PATCH',
        `/publish-requests/${createRes.body.data._id}`,
        { action: 'accept' },
        writerToken
      );

      const convoId = acceptRes.body.data.conversation._id;

      // 1. Try sending email while sharing disabled -> fails
      const emailAttempt = await req(
        'POST',
        `/conversations/${convoId}/messages`,
        { text: 'Email me at editor@agency.com' },
        pubToken
      );
      assert.strictEqual(emailAttempt.status, 400);
      assert.strictEqual(emailAttempt.body.code, 'CONTACT_SHARING_NOT_ALLOWED');

      // 2. Normal prose without contact info passes
      const normalMsg = await req(
        'POST',
        `/conversations/${convoId}/messages`,
        { text: 'We are very excited about Chapter 4 in your manuscript.' },
        pubToken
      );
      assert.strictEqual(normalMsg.status, 201);

      // 3. Publisher attempts to enable contact sharing -> 403 (writer only!)
      const pubEnableFail = await req(
        'PATCH',
        `/conversations/${convoId}`,
        { contactSharingEnabled: true },
        pubToken
      );
      assert.strictEqual(pubEnableFail.status, 403);

      // 4. Writer enables contact sharing
      const writerEnable = await req(
        'PATCH',
        `/conversations/${convoId}`,
        { contactSharingEnabled: true },
        writerToken
      );
      assert.strictEqual(writerEnable.status, 200);
      assert.strictEqual(writerEnable.body.data.contactSharingEnabled, true);

      // 5. Publisher sends email now -> succeeds
      const emailSuccess = await req(
        'POST',
        `/conversations/${convoId}/messages`,
        { text: 'Great, you can reach our legal team at legal@agency.com or visit agency.com/submit' },
        pubToken
      );
      assert.strictEqual(emailSuccess.status, 201);
    });

    it('closed conversation rejects new messages', async () => {
      const { user: writer, token: writerToken } = await createWriter();
      const book = await createBook(writer);
      const { token: pubToken } = await createApprovedPublisher();

      const createRes = await req(
        'POST',
        '/publish-requests',
        {
          bookId: book._id.toString(),
          company: 'Apex Lit',
          contactName: 'Sarah',
          contactEmail: 'sarah@apexlit.com',
          proposedTerms: 'Proposed terms for closed convo test',
          message: 'Hello, we would like to discuss publishing your story!',
          rights: ['print'],
        },
        pubToken
      );

      const acceptRes = await req(
        'PATCH',
        `/publish-requests/${createRes.body.data._id}`,
        { action: 'accept' },
        writerToken
      );

      const convoId = acceptRes.body.data.conversation._id;

      // Close conversation
      await req('PATCH', `/conversations/${convoId}`, { status: 'closed' }, writerToken);

      // Attempt to send message
      const sendRes = await req(
        'POST',
        `/conversations/${convoId}/messages`,
        { text: 'Are you still there?' },
        pubToken
      );
      assert.strictEqual(sendRes.status, 400);
    });
  });

  describe('4. Socket.io Live Delivery, Room Guard & Rate Limiting (A6)', () => {
    it('enforces non-participant room rejection and rate limit of 20 msgs/min', async () => {
      const { user: writer, token: writerToken } = await createWriter();
      const { user: outsider, token: outsiderToken } = await createWriter();
      const book = await createBook(writer);
      const { token: pubToken } = await createApprovedPublisher();

      const createRes = await req(
        'POST',
        '/publish-requests',
        {
          bookId: book._id.toString(),
          company: 'Apex Lit',
          contactName: 'Sarah',
          contactEmail: 'sarah@apexlit.com',
          proposedTerms: 'Terms',
          message: 'Discussion proposal',
          rights: ['print'],
        },
        pubToken
      );

      const acceptRes = await req(
        'PATCH',
        `/publish-requests/${createRes.body.data._id}`,
        { action: 'accept' },
        writerToken
      );
      const convoId = acceptRes.body.data.conversation._id;

      // Connect outsider via socket
      const outsiderSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: `Bearer ${outsiderToken}` },
        transports: ['websocket'],
      });

      await new Promise((resolve) => outsiderSocket.on('connect', resolve));

      // Outsider attempts to join room
      const joinErr = await new Promise((resolve) => {
        outsiderSocket.emit('conversation:join', convoId, (err, res) => {
          resolve(err);
        });
      });
      assert.ok(joinErr);
      assert.strictEqual(joinErr.message, 'Conversation not found.');
      outsiderSocket.disconnect();

      // Connect publisher and test rate limit (20 msgs per min)
      const pubSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: `Bearer ${pubToken}` },
        transports: ['websocket'],
      });
      await new Promise((resolve) => pubSocket.on('connect', resolve));

      await new Promise((resolve) => {
        pubSocket.emit('conversation:join', convoId, () => resolve());
      });

      // Clear redis rate limit counter first
      const pubUser = await User.findOne({ email: { $regex: '^pub_' } });
      await redis.del(`ratelimit:chat:${pubUser._id}`);

      // Send 20 messages successfully
      for (let i = 1; i <= 20; i++) {
        const sendResult = await new Promise((resolve) => {
          pubSocket.emit('message:send', { conversationId: convoId, text: `Test message ${i}` }, (err, res) => {
            resolve({ err, res });
          });
        });
        assert.strictEqual(sendResult.err, null);
      }

      // 21st message must trigger rate limit
      const limitResult = await new Promise((resolve) => {
        pubSocket.emit('message:send', { conversationId: convoId, text: '21st message' }, (err, res) => {
          resolve({ err, res });
        });
      });

      assert.ok(limitResult.err);
      assert.strictEqual(limitResult.err.code, 'RATE_LIMIT_EXCEEDED');

      pubSocket.disconnect();
    });

    it('delivers live message from publisher to writer over socket', async () => {
      const { user: writer, token: writerToken } = await createWriter();
      const book = await createBook(writer);
      const { token: pubToken } = await createApprovedPublisher();

      const createRes = await req(
        'POST',
        '/publish-requests',
        {
          bookId: book._id.toString(),
          company: 'Apex Lit',
          contactName: 'Sarah',
          contactEmail: 'sarah@apexlit.com',
          proposedTerms: 'Terms',
          message: 'Discussion proposal',
          rights: ['print'],
        },
        pubToken
      );

      const acceptRes = await req(
        'PATCH',
        `/publish-requests/${createRes.body.data._id}`,
        { action: 'accept' },
        writerToken
      );
      const convoId = acceptRes.body.data.conversation._id;

      // Connect writer socket
      const writerSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: `Bearer ${writerToken}` },
        transports: ['websocket'],
      });
      await new Promise((resolve) => writerSocket.on('connect', resolve));
      await new Promise((resolve) => writerSocket.emit('conversation:join', convoId, () => resolve()));

      // Connect publisher socket
      const pubSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: `Bearer ${pubToken}` },
        transports: ['websocket'],
      });
      await new Promise((resolve) => pubSocket.on('connect', resolve));
      await new Promise((resolve) => pubSocket.emit('conversation:join', convoId, () => resolve()));

      // Writer listens for message:new
      const receivedPromise = new Promise((resolve) => {
        writerSocket.on('message:new', (msg) => {
          resolve(msg);
        });
      });

      // Publisher sends message
      pubSocket.emit('message:send', {
        conversationId: convoId,
        text: 'Live message delivery over WebSocket test.',
      });

      const receivedMsg = await receivedPromise;
      assert.strictEqual(receivedMsg.text, 'Live message delivery over WebSocket test.');
      assert.strictEqual(receivedMsg.conversationId.toString(), convoId.toString());

      writerSocket.disconnect();
      pubSocket.disconnect();
    });
  });

  describe('5. Audited Admin Conversation Access (A9)', () => {
    it('requires an open report targeting that conversation/user and writes AuditLog', async () => {
      const { user: writer, token: writerToken } = await createWriter();
      const book = await createBook(writer);
      const { user: pubUser, token: pubToken } = await createApprovedPublisher();
      const { token: adminToken } = await createAdmin();

      const createRes = await req(
        'POST',
        '/publish-requests',
        {
          bookId: book._id.toString(),
          company: 'Apex Lit',
          contactName: 'Sarah',
          contactEmail: 'sarah@apexlit.com',
          proposedTerms: 'Terms',
          message: 'Discussion proposal',
          rights: ['print'],
        },
        pubToken
      );

      const acceptRes = await req(
        'PATCH',
        `/publish-requests/${createRes.body.data._id}`,
        { action: 'accept' },
        writerToken
      );
      const convoId = acceptRes.body.data.conversation._id;

      // 1. Admin attempts without reportId -> 403
      const noReportRes = await req('GET', `/admin/conversations/${convoId}`, null, adminToken);
      assert.strictEqual(noReportRes.status, 403);
      assert.strictEqual(noReportRes.body.code, 'REPORT_REQUIRED');

      // 2. Create an open report targeting the publisher
      const report = await Report.create({
        reporterId: writer._id,
        targetType: 'user',
        targetId: pubUser._id,
        reason: 'abuse',
        details: 'Predatory contract terms and harassing language',
        status: 'open',
      });

      // 3. Admin accesses with valid reportId -> 200 & AuditLog created
      const adminRes = await req(
        'GET',
        `/admin/conversations/${convoId}?reportId=${report._id}`,
        null,
        adminToken
      );
      assert.strictEqual(adminRes.status, 200);
      assert.ok(adminRes.body.data.conversation);

      const auditEntry = await AuditLog.findOne({
        targetType: 'conversation',
        targetId: convoId.toString(),
      });
      assert.ok(auditEntry);
      assert.strictEqual(auditEntry.action, 'conversation_read');
      assert.strictEqual(auditEntry.meta.reportId, report._id.toString());
    });
  });

  describe('6. Writer Dashboard Real Counters (A10)', () => {
    it('returns real counts for publisher wishlists and open requests', async () => {
      const { user: writer, token: writerToken } = await createWriter();
      const book = await createBook(writer);
      const { user: pubUser, token: pubToken } = await createApprovedPublisher();

      // Add book to wishlist
      await Wishlist.create({ publisherId: pubUser._id, bookId: book._id });

      // Create a pending publish request
      await req(
        'POST',
        '/publish-requests',
        {
          bookId: book._id.toString(),
          company: 'Apex Lit',
          contactName: 'Sarah',
          contactEmail: 'sarah@apexlit.com',
          proposedTerms: 'Terms proposal',
          message: 'Author proposal',
          rights: ['print'],
        },
        pubToken
      );

      // Check writer dashboard analytics
      const dashRes = await req('GET', '/writer/analytics', null, writerToken);
      assert.strictEqual(dashRes.status, 200);
      assert.strictEqual(dashRes.body.data.kpis.publisherWishlists, 1);
      assert.strictEqual(dashRes.body.data.kpis.openRequests, 1);
    });
  });
});
