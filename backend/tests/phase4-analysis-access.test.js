import { describe, it, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupTestDB } from './helper.js';
import createApp from '../src/app.js';
import * as authService from '../src/services/auth.service.js';
import User from '../src/models/user.model.js';
import Book from '../src/models/book.model.js';
import Document from '../src/models/document.model.js';
import Scene from '../src/models/scene.model.js';
import Character from '../src/models/character.model.js';
import Relationship from '../src/models/relationship.model.js';
import TimelineEvent from '../src/models/timeline-event.model.js';
import MoodAnalysis from '../src/models/mood-analysis.model.js';
import StoryArc from '../src/models/story-arc.model.js';
import Embedding from '../src/models/embedding.model.js';
import ContinuityIssue from '../src/models/continuity-issue.model.js';
import ProcessingJob from '../src/models/processing-job.model.js';
import ReadingList from '../src/models/reading-list.model.js';
import {
  FEATURE_ACCESS_MATRIX,
  FEATURE_ACCESS_MODES,
  FEATURE_LIST,
  FEATURES,
  getFeatureAccessMode,
} from '../src/constants/feature-access.js';
import { USER_ROLES } from '../src/constants/user-roles.js';
import { BOOK_STATUSES } from '../src/constants/book.js';
import STAGES from '../src/constants/stages.js';
import { buildTextEmbedding } from '../src/analysis/local-analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let server;
let baseUrl;

const req = async (method, pathUrl, body, token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${pathUrl}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
};

describe('Phase 4: Role-gated, Spoiler-Filtered Analysis Access', () => {
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

  // User creation helper
  const createUser = async (role = 'reader', emailSuffix = 'p4', overrides = {}) => {
    const email = `${role}_${emailSuffix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`;
    const password = 'password123';
    const regRole = role === 'admin' ? 'reader' : role;
    const regOptions = { role: regRole };
    if (role === 'publisher') {
      regOptions.company = 'Acme Publishing';
      regOptions.website = 'https://acme-pub.com';
    }

    const { user: userDto, tokens } = await authService.register(
      `User ${role}`,
      email,
      password,
      regOptions
    );

    const updateFields = {};
    if (role === 'admin') updateFields.role = USER_ROLES.ADMIN;
    if (role === 'publisher') updateFields.status = 'active'; // Approved publisher
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

  // Helper to build a 10-scene test fixture
  const setupTenSceneFixture = async (writerUser) => {
    // 1. Create Document
    const document = await Document.create({
      userId: writerUser._id,
      title: 'The Whispering Forest',
      originalFilename: 'manuscript.txt',
      fileType: 'txt',
      storageUrl: '/uploads/manuscript.txt',
      status: 'ready',
      wordCount: 10000,
      totalScenes: 10,
    });

    // 2. Create Book
    const pageOffsets = [0, 1800, 3600, 5400, 7200, 9000];
    const book = await Book.create({
      title: 'The Whispering Forest',
      writerId: writerUser._id,
      documentId: document._id,
      genre: 'Fantasy',
      blurb: 'An epic forest mystery.',
      pageCount: 6,
      pageOffsets,
      mature: false,
      status: BOOK_STATUSES.PUBLISHED,
    });

    // 3. Create 10 Scenes
    const sceneDocs = [];
    for (let i = 1; i <= 10; i++) {
      const start = (i - 1) * 100;
      const end = i * 100;
      const sc = await Scene.create({
        documentId: document._id,
        sceneNumber: i,
        title: `Scene ${i} of Ten`,
        summary: i === 2 ? 'Finding the emerald crystal.' : i === 7 ? 'The obsidian tower looms.' : `Summary of scene ${i}.`,
        location: i <= 5 ? 'Greenwood' : 'Dark Peak',
        textRange: { start, end },
        wordCount: 1000,
      });
      sceneDocs.push(sc);
    }

    // 4. Create Characters
    const alice = await Character.create({
      documentId: document._id,
      name: 'Alice Swift',
      role: 'protagonist',
      traits: ['brave', 'emerald seeker'],
      description: 'The chosen heroine of Greenwood.',
      arcSummary: 'Alice defeats the forest dark lord.',
      sceneIds: [sceneDocs[0]._id, sceneDocs[1]._id, sceneDocs[2]._id],
    });

    const bob = await Character.create({
      documentId: document._id,
      name: 'Bob Oak',
      role: 'supporting',
      traits: ['loyal', 'craftsman'],
      description: 'A friendly woodworker.',
      arcSummary: 'Bob builds the grand bridge.',
      sceneIds: [sceneDocs[2]._id, sceneDocs[3]._id],
    });

    const charlie = await Character.create({
      documentId: document._id,
      name: 'Charlie Shadow',
      role: 'antagonist',
      traits: ['cunning', 'traitor'],
      description: 'The secret traitor of the council.',
      arcSummary: 'Charlie is revealed as the traitor in scene 7.',
      sceneIds: [sceneDocs[4]._id, sceneDocs[5]._id, sceneDocs[6]._id],
    });

    const diana = await Character.create({
      documentId: document._id,
      name: 'Diana Star',
      role: 'supporting',
      traits: ['mystic'],
      description: 'An oracle of the highest mountain.',
      arcSummary: 'Diana foresee the sunrise.',
      sceneIds: [sceneDocs[7]._id, sceneDocs[8]._id, sceneDocs[9]._id],
    });

    // Link characters to scenes
    sceneDocs[0].characterIds = [alice._id];
    sceneDocs[1].characterIds = [alice._id];
    sceneDocs[2].characterIds = [alice._id, bob._id];
    sceneDocs[3].characterIds = [bob._id];
    sceneDocs[4].characterIds = [charlie._id];
    sceneDocs[5].characterIds = [charlie._id];
    sceneDocs[6].characterIds = [charlie._id];
    sceneDocs[7].characterIds = [diana._id];
    sceneDocs[8].characterIds = [diana._id];
    sceneDocs[9].characterIds = [diana._id];
    await Promise.all(sceneDocs.map((s) => s.save()));

    // 5. Create Relationships
    const relAliceBob = await Relationship.create({
      documentId: document._id,
      characterAId: alice._id,
      characterBId: bob._id,
      type: 'ally',
      sentimentScore: 0.8,
      sentimentBySceneId: new Map([
        [sceneDocs[2]._id.toString(), 0.7],
        [sceneDocs[3]._id.toString(), 0.9],
      ]),
      sceneIds: [sceneDocs[2]._id, sceneDocs[3]._id],
    });

    const relAliceCharlie = await Relationship.create({
      documentId: document._id,
      characterAId: alice._id,
      characterBId: charlie._id,
      type: 'rival',
      sentimentScore: -0.6,
      sentimentBySceneId: new Map([
        [sceneDocs[4]._id.toString(), -0.4],
        [sceneDocs[5]._id.toString(), -0.8],
      ]),
      sceneIds: [sceneDocs[4]._id, sceneDocs[5]._id],
    });

    const relCharlieDiana = await Relationship.create({
      documentId: document._id,
      characterAId: charlie._id,
      characterBId: diana._id,
      type: 'other',
      sentimentScore: 0.1,
      sentimentBySceneId: new Map([[sceneDocs[7]._id.toString(), 0.1]]),
      sceneIds: [sceneDocs[7]._id],
    });

    // 6. Timeline Events
    await TimelineEvent.create([
      {
        documentId: document._id,
        sceneId: sceneDocs[0]._id,
        chronologicalOrder: 1,
        timeLabel: 'Day 1 Morning',
        isFlashback: false,
      },
      {
        documentId: document._id,
        sceneId: sceneDocs[2]._id,
        chronologicalOrder: 2,
        timeLabel: 'Day 1 Evening',
        isFlashback: false,
      },
      {
        documentId: document._id,
        sceneId: sceneDocs[4]._id,
        chronologicalOrder: 3,
        timeLabel: 'Day 2 Morning',
        isFlashback: false,
      },
      {
        documentId: document._id,
        sceneId: sceneDocs[8]._id,
        chronologicalOrder: 4,
        timeLabel: 'Day 5 Night',
        isFlashback: false,
      },
    ]);

    // 7. Mood Analyses
    for (let i = 0; i < 10; i++) {
      await MoodAnalysis.create({
        documentId: document._id,
        sceneId: sceneDocs[i]._id,
        primaryMood: i < 4 ? 'Joy' : i === 7 ? 'Tension' : 'Mysterious',
        emotionScores: new Map([['joy', i < 4 ? 0.8 : 0.2], ['tension', i >= 4 ? 0.9 : 0.1]]),
        intensity: 0.5 + i * 0.04,
      });
    }

    // 8. Story Arc (Climax at Scene 8)
    const arcPoints = sceneDocs.map((s, idx) => ({
      sceneId: s._id,
      tensionScore: 20 + idx * 7,
      label: `Beat ${idx + 1}`,
    }));
    await StoryArc.create({
      documentId: document._id,
      arcPoints,
      climaxSceneId: sceneDocs[7]._id, // Scene 8
    });

    // 9. Continuity Issue
    await ContinuityIssue.create({
      documentId: document._id,
      sceneIds: [sceneDocs[1]._id],
      type: 'attribute-conflict',
      description: 'Alice was wearing her ring in scene 1 but not scene 2.',
      severity: 'low',
      status: 'open',
    });

    // 10. Processing Jobs (seed all stages as completed)
    const stageRecords = Object.values(STAGES).map((st) => ({
      documentId: document._id,
      stage: st,
      status: 'completed',
      progress: 100,
    }));
    await ProcessingJob.insertMany(stageRecords);

    // 11. Embeddings for search & ask
    const embeddings = [
      {
        documentId: document._id,
        sourceType: 'scene',
        sourceId: sceneDocs[1]._id,
        sceneId: sceneDocs[1]._id,
        vector: buildTextEmbedding('Finding the emerald crystal in Greenwood.'),
        model: 'local-hash-64',
      },
      {
        documentId: document._id,
        sourceType: 'scene',
        sourceId: sceneDocs[6]._id,
        sceneId: sceneDocs[6]._id,
        vector: buildTextEmbedding('The obsidian tower looms in Dark Peak.'),
        model: 'local-hash-64',
      },
      {
        documentId: document._id,
        sourceType: 'character',
        sourceId: charlie._id,
        sceneId: null,
        vector: buildTextEmbedding('Charlie Shadow is the cunning traitor.'),
        model: 'local-hash-64',
      },
    ];
    await Embedding.insertMany(embeddings);

    return {
      book,
      document,
      scenes: sceneDocs,
      characters: { alice, bob, charlie, diana },
      relationships: { relAliceBob, relAliceCharlie, relCharlieDiana },
    };
  };

  // 1. Architectural Guard Test
  it('Architectural Guard: verifies spoiler logic is centralized in spoiler.service.js and all analysis routes invoke it', async () => {
    // Assert spoiler service exports required methods
    const spoilerService = await import('../src/services/spoiler.service.js');
    assert.equal(typeof spoilerService.filterAnalysis, 'function');
    assert.equal(typeof spoilerService.searchWithSpoilerProtection, 'function');
    assert.equal(typeof spoilerService.askWithSpoilerProtection, 'function');
    assert.equal(typeof spoilerService.getEffectiveRole, 'function');

    // Inspect controller code to ensure no route bypasses spoiler.service.js
    const controllerPath = path.resolve(__dirname, '../src/controllers/analysis.controller.js');
    const controllerSource = fs.readFileSync(controllerPath, 'utf8');

    assert.ok(controllerSource.includes('spoilerService.filterAnalysis'));
    assert.ok(controllerSource.includes('spoilerService.searchWithSpoilerProtection'));
    assert.ok(controllerSource.includes('spoilerService.askWithSpoilerProtection'));

    const { default: AnalysisController } = await import('../src/controllers/analysis.controller.js');
    // Verify all 10 features have corresponding handlers on AnalysisController
    for (const feat of FEATURE_LIST) {
      const capitalized = feat.charAt(0).toUpperCase() + feat.slice(1);
      const hasHandler =
        typeof AnalysisController[`get${capitalized}`] === 'function' ||
        typeof AnalysisController[feat] === 'function';
      assert.ok(hasHandler, `AnalysisController must implement handler for feature: ${feat}`);
    }

    // Constraint: Spoiler logic exists only in spoiler.service.js.
    // Assert that every analysis handler strictly routes through spoilerService.
    const controllerHandlers = [
      AnalysisController.getScenes,
      AnalysisController.getCharacters,
      AnalysisController.getCharacterById,
      AnalysisController.getRelationships,
      AnalysisController.getTimeline,
      AnalysisController.getMood,
      AnalysisController.getArc,
      AnalysisController.getContinuity,
      AnalysisController.getPitch,
      AnalysisController.search,
      AnalysisController.ask,
    ];
    for (const handler of controllerHandlers) {
      const fnStr = handler.toString();
      assert.ok(
        fnStr.includes('spoilerService.'),
        `Analysis route handler ${handler.name} must route through spoilerService`
      );
    }
  });

  // 2. Table-driven test generated from the access constant
  it('Table-driven access matrix: verifies expected mode and status code across every feature and role', async () => {
    const { user: writer, token: writerToken } = await createUser('writer', 'owner');
    const { user: reader, token: readerToken } = await createUser('reader', 'reader_user');
    const { user: publisher, token: publisherToken } = await createUser('publisher', 'pub_user');
    const { user: admin, token: adminToken } = await createUser('admin', 'admin_user');

    const fixture = await setupTenSceneFixture(writer);
    const bookId = fixture.book._id.toString();

    const rolesMap = {
      writer: { user: writer, token: writerToken },
      reader: { user: reader, token: readerToken },
      publisher: { user: publisher, token: publisherToken },
      admin: { user: admin, token: adminToken },
    };

    // For every feature and role in FEATURE_ACCESS_MATRIX:
    for (const feature of FEATURE_LIST) {
      for (const [roleName, roleInfo] of Object.entries(rolesMap)) {
        const expectedMode = getFeatureAccessMode(feature, roleName);
        const expectedStatus = expectedMode === FEATURE_ACCESS_MODES.HIDDEN ? 403 : 200;

        let res;
        if (feature === 'search') {
          res = await req('GET', `/books/${bookId}/analysis/search?q=emerald`, null, roleInfo.token);
        } else if (feature === 'ask') {
          res = await req('POST', `/books/${bookId}/analysis/ask`, { question: 'Who found the emerald?' }, roleInfo.token);
        } else {
          res = await req('GET', `/books/${bookId}/analysis/${feature}`, null, roleInfo.token);
        }

        assert.equal(
          res.status,
          expectedStatus,
          `Failed on feature "${feature}" for role "${roleName}": expected HTTP ${expectedStatus} (mode: ${expectedMode}), got ${res.status} with msg: ${res.body?.message}`
        );

        // For successful 200 responses, ensure analysisStatus is returned
        if (res.status === 200) {
          assert.ok(res.body.analysisStatus, `Missing analysisStatus for feature "${feature}" on role "${roleName}"`);
          assert.ok(res.body.analysisStatus.stage, `Missing stage in analysisStatus for feature "${feature}"`);
          assert.ok(typeof res.body.analysisStatus.isComplete === 'boolean');
        }
      }
    }
  });

  // 3. Spoiler Protection Fixture Tests
  describe('Spoiler Protection Rules Fixture (10 Scenes)', () => {
    it('Reader at offset inside scene 4 sees strictly scenes 1-4 and no leaked future characters, edges, timeline, or climax', async () => {
      const { user: writer } = await createUser('writer', 'sp_writer');
      const { user: reader, token: readerToken } = await createUser('reader', 'sp_reader');
      const fixture = await setupTenSceneFixture(writer);
      const bookId = fixture.book._id.toString();

      // Set reader furthestOffset inside Scene 4 (Scene 4 spans offsets 300 to 400; pick 350)
      await ReadingList.create({
        readerId: reader._id,
        bookId: fixture.book._id,
        currentOffset: 350,
        furthestOffset: 350,
        status: 'reading',
      });

      // 1. Scenes: Exactly scenes 1, 2, 3, 4
      const scenesRes = await req('GET', `/books/${bookId}/analysis/scenes`, null, readerToken);
      assert.equal(scenesRes.status, 200);
      const scenes = scenesRes.body.data;
      assert.equal(scenes.length, 4, 'Reader must see exactly 4 scenes');
      const sceneNumbers = scenes.map((s) => s.sceneNumber).sort((a, b) => a - b);
      assert.deepEqual(sceneNumbers, [1, 2, 3, 4]);

      // 2. Characters: Alice & Bob visible; Charlie & Diana hidden; arcSummary omitted
      const charsRes = await req('GET', `/books/${bookId}/analysis/characters`, null, readerToken);
      assert.equal(charsRes.status, 200);
      const chars = charsRes.body.data;
      assert.equal(chars.length, 2, 'Reader must only see Alice and Bob');
      const charNames = chars.map((c) => c.name);
      assert.ok(charNames.includes('Alice Swift'));
      assert.ok(charNames.includes('Bob Oak'));
      assert.ok(!charNames.includes('Charlie Shadow'), 'Charlie must not be leaked');
      assert.ok(!charNames.includes('Diana Star'), 'Diana must not be leaked');

      // Verify arcSummary is stripped for reader
      for (const c of chars) {
        assert.equal(c.arcSummary, undefined, `arcSummary must be omitted for reader on ${c.name}`);
      }

      // 3. Relationships: Alice & Bob visible; Charlie relationships hidden
      const relsRes = await req('GET', `/books/${bookId}/analysis/relationships`, null, readerToken);
      assert.equal(relsRes.status, 200);
      const rels = relsRes.body.data;
      assert.equal(rels.length, 1, 'Only Alice-Bob relationship should be visible');
      assert.ok(rels[0].sceneIds.length > 0);
      // Ensure sentimentBySceneId is trimmed to visible scenes
      const visibleSceneIds = new Set(scenes.map((s) => s.id || s._id));
      for (const sId of rels[0].sceneIds) {
        assert.ok(visibleSceneIds.has(sId.toString()));
      }

      // 4. Timeline: only events in scenes 1 and 3 are visible (events in scenes 5, 8 hidden)
      const timeRes = await req('GET', `/books/${bookId}/analysis/timeline`, null, readerToken);
      assert.equal(timeRes.status, 200);
      const timeline = timeRes.body.data;
      assert.equal(timeline.length, 2, 'Only timeline events for scenes 1 and 3 should be visible');

      // 5. Mood: only moods for scenes 1-4 are visible
      const moodRes = await req('GET', `/books/${bookId}/analysis/mood`, null, readerToken);
      assert.equal(moodRes.status, 200);
      const moods = moodRes.body.data;
      assert.equal(moods.length, 4, 'Only mood records for scenes 1-4 should be visible');

      // 6. Arc: arcPoints only for scenes 1-4; climaxSceneId is null because scene 8 is hidden
      const arcRes = await req('GET', `/books/${bookId}/analysis/arc`, null, readerToken);
      assert.equal(arcRes.status, 200);
      const arc = arcRes.body.data;
      assert.equal(arc.arcPoints.length, 4);
      assert.equal(arc.climaxSceneId, null, 'Climax scene must be null when climax is past furthest offset');
    });

    it('Reader with ?showAll=true bypasses spoiler filtering (but keeps reader privacy like omitting arcSummary)', async () => {
      const { user: writer } = await createUser('writer', 'sa_writer');
      const { user: reader, token: readerToken } = await createUser('reader', 'sa_reader');
      const fixture = await setupTenSceneFixture(writer);
      const bookId = fixture.book._id.toString();

      await ReadingList.create({
        readerId: reader._id,
        bookId: fixture.book._id,
        currentOffset: 350,
        furthestOffset: 350,
        status: 'reading',
      });

      // With ?showAll=true, reader sees all 10 scenes
      const scenesRes = await req('GET', `/books/${bookId}/analysis/scenes?showAll=true`, null, readerToken);
      assert.equal(scenesRes.status, 200);
      assert.equal(scenesRes.body.data.length, 10, 'showAll=true reveals all 10 scenes to reader');

      // All characters visible, but arcSummary omitted for reader
      const charsRes = await req('GET', `/books/${bookId}/analysis/characters?showAll=true`, null, readerToken);
      assert.equal(charsRes.status, 200);
      assert.equal(charsRes.body.data.length, 4, 'showAll=true reveals all 4 characters to reader');
      for (const c of charsRes.body.data) {
        assert.equal(c.arcSummary, undefined, 'arcSummary is still omitted for reader');
      }

      // Climax scene is visible
      const arcRes = await req('GET', `/books/${bookId}/analysis/arc?showAll=true`, null, readerToken);
      assert.equal(arcRes.status, 200);
      assert.ok(arcRes.body.data.climaxSceneId !== null, 'Climax scene is visible with showAll=true');
    });

    it('Publisher ignores ?showAll=true and is strictly governed by publisher modes (main-cast, summary, spoilers-allowed, hidden)', async () => {
      const { user: writer } = await createUser('writer', 'pub_w');
      const { token: publisherToken } = await createUser('publisher', 'pub_check');
      const fixture = await setupTenSceneFixture(writer);
      const bookId = fixture.book._id.toString();

      // Publisher attempting to bypass hidden scenes with ?showAll=true gets 403 Forbidden
      const scenesRes = await req('GET', `/books/${bookId}/analysis/scenes?showAll=true`, null, publisherToken);
      assert.equal(scenesRes.status, 403, 'Publisher cannot bypass hidden mode with showAll=true');

      // Publisher characters returns ONLY main cast (protagonist Alice, antagonist Charlie)
      const charsRes = await req('GET', `/books/${bookId}/analysis/characters?showAll=true`, null, publisherToken);
      assert.equal(charsRes.status, 200);
      const chars = charsRes.body.data;
      assert.equal(chars.length, 2, 'Publisher gets main-cast mode only');
      const charRoles = chars.map((c) => c.role);
      assert.ok(charRoles.includes('protagonist'));
      assert.ok(charRoles.includes('antagonist'));
      assert.ok(!charRoles.includes('supporting'), 'Supporting cast must be excluded for publisher');

      // Publisher mood returns summary object, not per-scene breakdown
      const moodRes = await req('GET', `/books/${bookId}/analysis/mood?showAll=true`, null, publisherToken);
      assert.equal(moodRes.status, 200);
      assert.ok(moodRes.body.data.summary, 'Publisher mood returns summary object');
      assert.equal(moodRes.body.data.summary.totalScenesAnalyzed, 10);
      assert.equal(moodRes.body.data.results.length, 0, 'Publisher mood leaks no per-scene breakdown');

      // Publisher arc gets full spoilers-allowed
      const arcRes = await req('GET', `/books/${bookId}/analysis/arc?showAll=true`, null, publisherToken);
      assert.equal(arcRes.status, 200);
      assert.equal(arcRes.body.data.arcPoints.length, 10);
      assert.ok(arcRes.body.data.climaxSceneId !== null, 'Publisher arc has climax intact');
    });

    it('Semantic search never returns hits from hidden scenes beyond reader furthest offset', async () => {
      const { user: writer } = await createUser('writer', 'srch_w');
      const { user: reader, token: readerToken } = await createUser('reader', 'srch_r');
      const fixture = await setupTenSceneFixture(writer);
      const bookId = fixture.book._id.toString();

      // Reader at offset 350 (inside scene 4)
      await ReadingList.create({
        readerId: reader._id,
        bookId: fixture.book._id,
        currentOffset: 350,
        furthestOffset: 350,
        status: 'reading',
      });

      // 1. Search for keyword in scene 2 ("emerald") -> HIT returned
      const emeraldRes = await req('GET', `/books/${bookId}/analysis/search?q=emerald`, null, readerToken);
      assert.equal(emeraldRes.status, 200);
      assert.ok(emeraldRes.body.data.length > 0, 'Reader should find emerald in visible scene 2');

      // 2. Search for keyword in scene 7 ("obsidian") -> 0 hits returned
      const obsidianRes = await req('GET', `/books/${bookId}/analysis/search?q=obsidian`, null, readerToken);
      assert.equal(obsidianRes.status, 200);
      assert.equal(obsidianRes.body.data.length, 0, 'Reader must NOT find obsidian from hidden scene 7');

      // 3. Search for traitor Charlie (scenes 5-7) -> 0 hits returned
      const traitorRes = await req('GET', `/books/${bookId}/analysis/search?q=traitor`, null, readerToken);
      assert.equal(traitorRes.status, 200);
      assert.equal(traitorRes.body.data.length, 0, 'Reader must NOT find character Charlie from hidden scenes');

      // 4. With ?showAll=true, obsidian search returns hit
      const showAllObsidianRes = await req(
        'GET',
        `/books/${bookId}/analysis/search?q=obsidian&showAll=true`,
        null,
        readerToken
      );
      assert.equal(showAllObsidianRes.status, 200);
      assert.ok(showAllObsidianRes.body.data.length > 0, 'showAll=true reveals obsidian search hit');
    });
  });
});
