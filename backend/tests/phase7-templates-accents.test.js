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
import stream from 'node:stream';
import { v2 as cloudinary } from 'cloudinary';
import config from '../src/config/env.js';
import imageService from '../src/services/image.service.js';
import { BOOK_STATUSES, BOOK_TEMPLATES_LIST, BOOK_ACCENTS, ACCESSIBLE_ORANGE } from '../src/constants/book.js';

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

function getRelativeLuminance(r, g, b) {
  const [sR, sG, sB] = [r, g, b].map((val) => {
    const s = val / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
}

function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function getContrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const l1 = getRelativeLuminance(...rgb1);
  const l2 = getRelativeLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Phase 7: Writer Templates, Accessible Accents, and Live Presentation', () => {
  setupTestDB(before, after, afterEach);

  before(async () => {
    const app = createApp();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}/api`;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  const createUser = async (role = 'writer', emailSuffix = 'user') => {
    const email = `${role}_${emailSuffix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`;
    const password = 'password123';
    const { user: userDto, tokens } = await authService.register(`Writer ${emailSuffix}`, email, password, { role });
    return { user: userDto, token: tokens.accessToken };
  };

  const createTestBook = async (writerOrId, { template = 'classic', accent = ACCESSIBLE_ORANGE, title = 'Test Story' } = {}) => {
    const writerId = writerOrId?._id || writerOrId?.id || writerOrId;
    const doc = await Document.create({
      userId: writerId,
      title,
      originalFilename: 'manuscript.txt',
      fileType: 'txt',
      storageUrl: 'uploads/manuscript.txt',
      status: 'ready',
      wordCount: 1000,
      parsedText: 'Sample text content for manuscript.',
    });

    const book = await Book.create({
      writerId,
      documentId: doc._id,
      title,
      template,
      accent,
      pageCount: 1,
      pageOffsets: [0],
      status: BOOK_STATUSES.PUBLISHED,
    });

    return { book, doc };
  };

  describe('1. WCAG 2.1 Accent Contrast Calculations', () => {
    it('audits original Phase 1 presets and flags #FF500A as failing 4.5:1 contrast', () => {
      const white = '#FFFFFF';

      const blueRatio = getContrastRatio('#1E3A8A', white);
      assert.ok(blueRatio >= 4.5, `Deep Blue ratio ${blueRatio} must meet 4.5:1`);

      const greenRatio = getContrastRatio('#047857', white);
      assert.ok(greenRatio >= 4.5, `Emerald Green ratio ${greenRatio} must meet 4.5:1`);

      const purpleRatio = getContrastRatio('#7C3AED', white);
      assert.ok(purpleRatio >= 4.5, `Purple ratio ${purpleRatio} must meet 4.5:1`);

      const redRatio = getContrastRatio('#B91C1C', white);
      assert.ok(redRatio >= 4.5, `Crimson Red ratio ${redRatio} must meet 4.5:1`);

      const tealRatio = getContrastRatio('#0F766E', white);
      assert.ok(tealRatio >= 4.5, `Deep Teal ratio ${tealRatio} must meet 4.5:1`);

      const orangeRatio = getContrastRatio('#FF500A', white);
      assert.ok(
        orangeRatio < 4.5,
        `Original Brand Orange #FF500A ratio ${orangeRatio.toFixed(2)} fails 4.5:1 contrast on white`
      );
    });

    it('proves proposed darker variant #C2410C meets 4.5:1 for text on white and white text on button', () => {
      const white = '#FFFFFF';
      const proposedDarkerOrange = ACCESSIBLE_ORANGE;

      const textOnWhite = getContrastRatio(proposedDarkerOrange, white);
      assert.ok(
        textOnWhite >= 4.5,
        `Proposed darker orange ${proposedDarkerOrange} ratio ${textOnWhite.toFixed(2)} must be >= 4.5:1`
      );
      assert.ok(
        textOnWhite >= 5.0,
        `Proposed darker orange achieves ${textOnWhite.toFixed(2)}:1 contrast`
      );

      const whiteOnButton = getContrastRatio(white, proposedDarkerOrange);
      assert.ok(
        whiteOnButton >= 4.5,
        `White text on ${proposedDarkerOrange} button must meet >= 4.5:1`
      );

      const activePresets = [
        ACCESSIBLE_ORANGE,
        '#1E3A8A',
        '#047857',
        '#7C3AED',
        '#B91C1C',
        '#0F766E',
      ];

      for (const hex of activePresets) {
        const ratio = getContrastRatio(hex, white);
        assert.ok(
          ratio >= 4.5,
          `Preset ${hex} contrast ${ratio.toFixed(2)}:1 must meet 4.5:1 threshold`
        );
      }
    });
  });

  describe('2. PATCH /books/:bookId Validation & Enum Rejection', () => {
    it('rejects invalid template enum with 400 Bad Request', async () => {
      const { user, token } = await createUser('writer', 'tpl1');
      const { book } = await createTestBook(user, { title: 'Story 1' });

      const res = await req(
        'PATCH',
        `/books/${book._id}`,
        { template: 'cyberpunk_neon' },
        token
      );

      assert.equal(res.status, 400);
      assert.ok(
        res.body?.message?.includes('template') || res.body?.message?.includes('valid'),
        `Error should mention invalid template: ${res.body?.message}`
      );
    });

    it('rejects invalid accent enum with 400 Bad Request', async () => {
      const { user, token } = await createUser('writer', 'tpl2');
      const { book } = await createTestBook(user, { title: 'Story 2' });

      const res = await req(
        'PATCH',
        `/books/${book._id}`,
        { accent: '#123456' },
        token
      );

      assert.equal(res.status, 400);
      assert.ok(
        res.body?.message?.includes('accent') || res.body?.message?.includes('valid'),
        `Error should mention invalid accent: ${res.body?.message}`
      );
    });

    it('allows changing template and accent without re-running analysis', async () => {
      const { user, token } = await createUser('writer', 'tpl3');
      const { book, doc } = await createTestBook(user, { title: 'Story 3' });

      const res1 = await req(
        'PATCH',
        `/books/${book._id}`,
        { template: 'showcase', accent: '#0F766E' },
        token
      );
      assert.equal(res1.status, 200);
      assert.equal(res1.body.data.template, 'showcase');
      assert.equal(res1.body.data.accent, '#0F766E');

      const res2 = await req(
        'PATCH',
        `/books/${book._id}`,
        { template: 'notebook', accent: ACCESSIBLE_ORANGE },
        token
      );
      assert.equal(res2.status, 200);
      assert.equal(res2.body.data.template, 'notebook');
      assert.equal(res2.body.data.accent, ACCESSIBLE_ORANGE);

      const updatedInDb = await Book.findById(book._id);
      assert.equal(updatedInDb.template, 'notebook');
      assert.equal(updatedInDb.accent, ACCESSIBLE_ORANGE);

      assert.equal(updatedInDb.documentId.toString(), doc._id.toString());
    });
  });

  describe('3. Cover Replacement and Server-side Destruction', () => {
    it('destroys previous cover on Cloudinary when a new cover is uploaded', async () => {
      const { user, token } = await createUser('writer', 'tpl4');
      const { book } = await createTestBook(user, { title: 'Story 4' });

      const oldPublicId = 'covers/old_cover_12345';
      book.coverPublicId = oldPublicId;
      book.coverUrl = 'https://cloudinary.com/demo/image/upload/covers/old_cover_12345.jpg';
      await book.save();

      const prevCloudName = config.cloudinary.cloudName;
      const prevApiKey = config.cloudinary.apiKey;
      const prevApiSecret = config.cloudinary.apiSecret;
      config.cloudinary.cloudName = 'test_cloud';
      config.cloudinary.apiKey = 'test_key';
      config.cloudinary.apiSecret = 'test_secret';

      const deletedIds = [];
      const origDestroy = cloudinary.uploader.destroy;
      const origUploadStream = cloudinary.uploader.upload_stream;

      cloudinary.uploader.destroy = async (publicId) => {
        deletedIds.push(publicId);
        return { result: 'ok' };
      };

      cloudinary.uploader.upload_stream = (options, callback) => {
        const pt = new stream.PassThrough();
        pt.on('finish', () => {
          callback(null, {
            public_id: 'covers/new_cover_67890',
            secure_url: 'https://cloudinary.com/demo/image/upload/covers/new_cover_67890.jpg',
          });
        });
        return pt;
      };

      try {
        const formData = new FormData();
        formData.append('title', 'Story 4 Updated');
        formData.append(
          'cover',
          new Blob(['fake-image-bytes'], { type: 'image/jpeg' }),
          'new_cover.jpg'
        );

        const res = await fetch(`${baseUrl}/books/${book._id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await res.json();
        assert.equal(res.status, 200, `Expected 200 but got ${res.status}: ${JSON.stringify(data)}`);
        assert.equal(data.data.coverUrl, 'https://cloudinary.com/demo/image/upload/covers/new_cover_67890.jpg');

        assert.ok(
          deletedIds.includes(oldPublicId),
          `Expected old publicId ${oldPublicId} to be destroyed on Cloudinary`
        );
      } finally {
        config.cloudinary.cloudName = prevCloudName;
        config.cloudinary.apiKey = prevApiKey;
        config.cloudinary.apiSecret = prevApiSecret;
        cloudinary.uploader.destroy = origDestroy;
        cloudinary.uploader.upload_stream = origUploadStream;
      }
    });
  });

  describe('4. Writer Profile and Default Template Control', () => {
    it('allows writer to set defaultTemplate via PATCH /api/me/profile and rejects invalid templates', async () => {
      const { user, token } = await createUser('writer', 'default');

      const res1 = await req(
        'PATCH',
        '/me/profile',
        { defaultTemplate: 'showcase' },
        token
      );
      assert.equal(res1.status, 200);
      assert.equal(res1.body.data.defaultTemplate, 'showcase');

      const meRes = await req('GET', '/auth/me', null, token);
      assert.equal(meRes.status, 200);
      assert.equal(meRes.body.data.defaultTemplate, 'showcase');

      const res2 = await req(
        'PATCH',
        '/me/profile',
        { defaultTemplate: 'notebook' },
        token
      );
      assert.equal(res2.status, 200);
      assert.equal(res2.body.data.defaultTemplate, 'notebook');

      const resBad = await req(
        'PATCH',
        '/me/profile',
        { defaultTemplate: 'holographic' },
        token
      );
      assert.equal(resBad.status, 400);
    });
  });
});
