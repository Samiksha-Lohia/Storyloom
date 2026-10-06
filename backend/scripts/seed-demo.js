import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import User from '../src/models/user.model.js';
import Book from '../src/models/book.model.js';
import Document from '../src/models/document.model.js';
import Review from '../src/models/review.model.js';
import Wishlist from '../src/models/wishlist.model.js';
import PublishRequest from '../src/models/publish-request.model.js';
import Conversation from '../src/models/conversation.model.js';
import Message from '../src/models/message.model.js';
import Report from '../src/models/report.model.js';
import ReadingList from '../src/models/reading-list.model.js';
import Scene from '../src/models/scene.model.js';
import Character from '../src/models/character.model.js';
import Relationship from '../src/models/relationship.model.js';
import TimelineEvent from '../src/models/timeline-event.model.js';
import DialogueSummary from '../src/models/dialogue-summary.model.js';
import MoodAnalysis from '../src/models/mood-analysis.model.js';
import StoryArc from '../src/models/story-arc.model.js';
import ContinuityIssue from '../src/models/continuity-issue.model.js';
import Embedding from '../src/models/embedding.model.js';
import ProcessingJob from '../src/models/processing-job.model.js';
import { processDocumentDirectly } from '../src/workers/pipeline.worker.js';
import { USER_ROLES, USER_STATUSES } from '../src/constants/user-roles.js';
import { BOOK_STATUSES, BOOK_TEMPLATES } from '../src/constants/book.js';
import bcrypt from 'bcryptjs';
import { paginate } from '../src/services/paginator.service.js';
import logger from '../src/utilities/logger.js';
import { BOOK_MANUSCRIPTS } from './seed-manuscripts.js';
import { buildFallbackPitchCard } from '../src/services/pitch.service.js';

const DEMO_PASSWORD = 'Password123!';

async function seedDemo() {
  console.log('🌱 Starting SceneCraft Comprehensive Demo Dataset Seeding...\n');
  await connectDB();
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ─── 1. Users ──────────────────────────────────────────────────────────────
  console.log('👤 Seeding Users (1 Admin, 3 Approved Publishers, 1 Pending, 5 Writers)...');

  // 1 Admin
  const admin = await User.findOneAndUpdate(
    { email: 'admin@scenecraft.com' },
    {
      name: 'Platform Administrator',
      email: 'admin@scenecraft.com',
      passwordHash: hashedPassword,
      role: USER_ROLES.ADMIN,
      status: USER_STATUSES.ACTIVE,
      username: 'admin',
      bio: 'SceneCraft platform administrator and trust & safety officer.',
    },
    { upsert: true, new: true }
  );

  // 3 Approved Publishers
  const pub1 = await User.findOneAndUpdate(
    { email: 'publisher@scenecraft.com' },
    {
      name: 'Sarah Jenkins',
      email: 'publisher@scenecraft.com',
      passwordHash: hashedPassword,
      role: USER_ROLES.PUBLISHER,
      status: USER_STATUSES.ACTIVE,
      username: 'sarah-apex',
      bio: 'Senior acquisitions editor scouting breakout sci-fi and speculative fiction.',
      publisherProfile: {
        company: 'Apex Literary Publishing',
        website: 'https://apexlit.example.com',
        note: 'Global distribution with focus on worldbuilding.',
        reviewStatus: 'approved',
        approvedAt: new Date('2026-08-15'),
      },
    },
    { upsert: true, new: true }
  );

  const pub2 = await User.findOneAndUpdate(
    { email: 'tor.editor@scenecraft.com' },
    {
      name: 'Julian Sterling',
      email: 'tor.editor@scenecraft.com',
      passwordHash: hashedPassword,
      role: USER_ROLES.PUBLISHER,
      status: USER_STATUSES.ACTIVE,
      username: 'julian-beacon',
      bio: 'Managing editor at Beacon Press. Passionate about literary thrillers.',
      publisherProfile: {
        company: 'Beacon Press London',
        website: 'https://beaconpress.example.com',
        note: 'Seeking international translation and audiobook rights.',
        reviewStatus: 'approved',
        approvedAt: new Date('2026-09-01'),
      },
    },
    { upsert: true, new: true }
  );

  const pub3 = await User.findOneAndUpdate(
    { email: 'orbit.acquisitions@scenecraft.com' },
    {
      name: 'Miranda Vance',
      email: 'orbit.acquisitions@scenecraft.com',
      passwordHash: hashedPassword,
      role: USER_ROLES.PUBLISHER,
      status: USER_STATUSES.ACTIVE,
      username: 'miranda-vanguard',
      bio: 'Head of content acquisition at Vanguard Media Group.',
      publisherProfile: {
        company: 'Vanguard Media Group',
        website: 'https://vanguardmedia.example.com',
        note: 'Acquiring film, television, and translation rights.',
        reviewStatus: 'approved',
        approvedAt: new Date('2026-09-10'),
      },
    },
    { upsert: true, new: true }
  );

  // 1 Pending Publisher
  const pubPending = await User.findOneAndUpdate(
    { email: 'pending.publisher@scenecraft.com' },
    {
      name: 'Marcus Pending',
      email: 'pending.publisher@scenecraft.com',
      passwordHash: hashedPassword,
      role: USER_ROLES.PUBLISHER,
      status: USER_STATUSES.PENDING,
      username: 'marcus-pending',
      bio: 'Independent publisher applicant.',
      publisherProfile: {
        company: 'Starlight Books',
        website: 'https://starlightbooks.example.com',
        note: 'Independent micro-press specializing in dark academia and fantasy.',
        reviewStatus: 'pending',
      },
    },
    { upsert: true, new: true }
  );

  // 5 Writers
  const writersData = [
    {
      name: 'Elena Vance',
      email: 'writer@scenecraft.com',
      username: 'elena-vance',
      bio: 'Bestselling speculative fiction author and worldbuilder. Writing stories where myth and memory collide.',
      defaultTemplate: BOOK_TEMPLATES.SHOWCASE,
    },
    {
      name: 'Kai Sterling',
      email: 'kai.sterling@scenecraft.com',
      username: 'kai-sterling',
      bio: 'Cyberpunk architect and hard sci-fi novelist exploring synthetic consciousness.',
      defaultTemplate: BOOK_TEMPLATES.CLASSIC,
    },
    {
      name: 'Amara Chen',
      email: 'amara.chen@scenecraft.com',
      username: 'amara-chen',
      bio: 'Historical fantasy and romantic intrigue storyteller. Obsessed with court drama.',
      defaultTemplate: BOOK_TEMPLATES.NOTEBOOK,
    },
    {
      name: 'Darian Cross',
      email: 'darian.cross@scenecraft.com',
      username: 'darian-cross',
      bio: 'Psychological thriller and gothic horror wordsmith.',
      defaultTemplate: BOOK_TEMPLATES.CLASSIC,
    },
    {
      name: 'Lyra Frost',
      email: 'lyra.frost@scenecraft.com',
      username: 'lyra-frost',
      bio: 'Epic fantasy worldweaver crafting sweeping sagas of fallen empires.',
      defaultTemplate: BOOK_TEMPLATES.SHOWCASE,
    },
  ];

  const writers = [];
  for (const w of writersData) {
    const writerDoc = await User.findOneAndUpdate(
      { email: w.email },
      {
        ...w,
        passwordHash: hashedPassword,
        role: USER_ROLES.WRITER,
        status: USER_STATUSES.ACTIVE,
      },
      { upsert: true, new: true }
    );
    writers.push(writerDoc);
  }

  // 2 Readers
  const readersData = [
    {
      name: 'Alex Reader',
      email: 'reader@scenecraft.com',
      username: 'alex-reader',
      bio: 'Voracious reader, fantasy world enthusiast, and active book reviewer.',
    },
    {
      name: 'Clara Page',
      email: 'clara.reader@scenecraft.com',
      username: 'clara-reader',
      bio: 'Sci-fi & speculative fiction aficionado. Always reading with a cup of tea.',
    },
  ];

  const readers = [];
  for (const r of readersData) {
    const readerDoc = await User.findOneAndUpdate(
      { email: r.email },
      {
        ...r,
        passwordHash: hashedPassword,
        role: USER_ROLES.READER,
        status: USER_STATUSES.ACTIVE,
      },
      { upsert: true, new: true }
    );
    readers.push(readerDoc);
  }

  // ─── 2. Books & Documents ──────────────────────────────────────────────────
  const BOOK_BLUEPRINTS = [
    {
      title: 'The Clockwork Sovereign',
      genre: 'Fantasy',
      blurb: 'In a kingdom powered by brass and celestial gears, an outlaw mechanic discovers the Emperor is a clockwork vessel winding down to its final hour.',
      tags: ['steampunk', 'rebellion', 'magic-system', 'intrigue'],
      writer: writers[0],
      reads: 14200,
      ratingAvg: 4.8,
      status: BOOK_STATUSES.PUBLISHED,
      coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: 'Echoes of the Obsidian Spire',
      genre: 'Science Fiction',
      blurb: 'Deep beneath the ice of Europa, deep-core miners unearth an alien structure that replays memories of human civilizations that never existed.',
      tags: ['hard-sci-fi', 'cosmic-horror', 'alien-ruins', 'europa'],
      writer: writers[0],
      reads: 9800,
      ratingAvg: 4.6,
      status: BOOK_STATUSES.PUBLISHED,
      coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: 'Neon Requiem',
      genre: 'Cyberpunk',
      blurb: 'A memory thief with a terminal bio-virus accepts one last heist: extract the soul backup of the city’s most corrupt oligarch.',
      tags: ['cyberpunk', 'heist', 'synthwave', 'noir'],
      writer: writers[1],
      reads: 11400,
      ratingAvg: 4.7,
      status: BOOK_STATUSES.PUBLISHED,
      coverUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: 'The Ghost in the Lattice',
      genre: 'Science Fiction',
      blurb: 'When the orbital planetary grid begins speaking in forgotten dialects, an engineer must decipher whether it is an AI awakening or an ancient god.',
      tags: ['ai', 'space-station', 'techno-thriller'],
      writer: writers[1],
      reads: 6500,
      ratingAvg: 4.4,
      status: BOOK_STATUSES.PUBLISHED,
      coverUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: 'The Silk and the Dagger',
      genre: 'Historical Fiction',
      blurb: 'In 18th-century Venice, a disgraced noblewoman infiltrates the city’s secret espionage council behind masks of velvet and poisoned lace.',
      tags: ['espionage', 'venice', 'court-intrigue', 'slow-burn'],
      writer: writers[2],
      reads: 8900,
      ratingAvg: 4.9,
      status: BOOK_STATUSES.PUBLISHED,
      coverUrl: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: 'Crimson Tide of Verona',
      genre: 'Romance',
      blurb: 'Two rival captains shipwrecked on an uncharted volcanic archipelago must forge an uneasy alliance against pirate armadas and rising tides.',
      tags: ['enemies-to-lovers', 'pirates', 'high-seas', 'adventure'],
      writer: writers[2],
      reads: 12500,
      ratingAvg: 4.8,
      status: BOOK_STATUSES.PUBLISHED,
      coverUrl: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: 'The Midnight Taxonomy',
      genre: 'Horror',
      blurb: 'An archivist hired to catalogue the private collection of an eccentric collector discovers the specimens in the jars are still breathing.',
      tags: ['gothic', 'body-horror', 'archives', 'mystery'],
      writer: writers[3],
      reads: 7800,
      ratingAvg: 4.5,
      status: BOOK_STATUSES.PUBLISHED,
      coverUrl: 'https://images.unsplash.com/photo-1507842229451-9f7506978e58?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: 'Whispers at Ravenwood Manor',
      genre: 'Mystery',
      blurb: 'A private detective arrives at a fog-drenched coastal estate to solve a murder that was predicted down to the second in the victim’s own diary.',
      tags: ['whodunit', 'gothic-noir', 'rainy-day', 'detective'],
      writer: writers[3],
      reads: 9100,
      ratingAvg: 4.7,
      status: BOOK_STATUSES.PUBLISHED,
      coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: 'Children of the Ash King',
      genre: 'Fantasy',
      blurb: 'Five nomadic tribes unite across an obsidian desert to awaken the dormant titan beneath the caldera before the winter sun sets forever.',
      tags: ['epic-fantasy', 'titans', 'desert', 'lore-heavy'],
      writer: writers[4],
      reads: 15600,
      ratingAvg: 4.9,
      status: BOOK_STATUSES.PUBLISHED,
      coverUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: 'Chronicles of the Shattered Moon',
      genre: 'Dystopian',
      blurb: 'Three centuries after the lunar catastrophe rained quartz shards upon the Earth, salvagers search the crystal canyons for solar relics.',
      tags: ['post-apocalyptic', 'survival', 'scavengers', 'found-family'],
      writer: writers[4],
      reads: 10200,
      ratingAvg: 4.6,
      status: BOOK_STATUSES.PUBLISHED,
      coverUrl: 'https://images.unsplash.com/photo-1532693322450-2cb5c511067d?w=600&auto=format&fit=crop&q=80',
    },
    // 2 Drafts
    {
      title: 'Project Chimera (WIP)',
      genre: 'Thriller',
      blurb: 'An undercover operative wakes up inside a black-site lab with cybernetic augmentations they have no memory of requesting.',
      tags: ['conspiracy', 'action', 'wip'],
      writer: writers[0],
      reads: 0,
      ratingAvg: 0,
      status: BOOK_STATUSES.DRAFT,
      coverUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: 'The Alchemist of Prague (Draft)',
      genre: 'Historical Fiction',
      blurb: 'In the shadow of the Astronomical Clock, an apprentice discovers an ink formula that alters the past when written on vellum.',
      tags: ['alchemy', 'prague', 'time-loop'],
      writer: writers[2],
      reads: 0,
      ratingAvg: 0,
      status: BOOK_STATUSES.DRAFT,
      coverUrl: 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd3?w=600&auto=format&fit=crop&q=80',
    },
  ];

  const COVERS = [
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1532012164546-f432f2e3edd3?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600&auto=format&fit=crop&q=80',
  ];

  console.log('🧹 Cleaning existing demo data for fresh seed...');
  const titles = BOOK_BLUEPRINTS.map((b) => b.title);
  const oldBooks = await Book.find({ title: { $in: titles } });
  if (oldBooks.length > 0) {
    const oldBookIds = oldBooks.map((b) => b._id);
    const oldDocIds = oldBooks.map((b) => b.documentId).filter(Boolean);
    await Document.deleteMany({ _id: { $in: oldDocIds } });
    await Scene.deleteMany({ documentId: { $in: oldDocIds } });
    await Character.deleteMany({ documentId: { $in: oldDocIds } });
    await Relationship.deleteMany({ documentId: { $in: oldDocIds } });
    await TimelineEvent.deleteMany({ documentId: { $in: oldDocIds } });
    await DialogueSummary.deleteMany({ documentId: { $in: oldDocIds } });
    await MoodAnalysis.deleteMany({ documentId: { $in: oldDocIds } });
    await StoryArc.deleteMany({ documentId: { $in: oldDocIds } });
    await ContinuityIssue.deleteMany({ documentId: { $in: oldDocIds } });
    await Embedding.deleteMany({ documentId: { $in: oldDocIds } });
    await ProcessingJob.deleteMany({ documentId: { $in: oldDocIds } });
    await Review.deleteMany({ bookId: { $in: oldBookIds } });
    await Wishlist.deleteMany({ bookId: { $in: oldBookIds } });
    const oldReqs = await PublishRequest.find({ bookId: { $in: oldBookIds } });
    const oldReqIds = oldReqs.map((r) => r._id);
    const oldConvs = await Conversation.find({ requestId: { $in: oldReqIds } });
    const oldConvIds = oldConvs.map((c) => c._id);
    await Message.deleteMany({ conversationId: { $in: oldConvIds } });
    await Conversation.deleteMany({ _id: { $in: oldConvIds } });
    await PublishRequest.deleteMany({ _id: { $in: oldReqIds } });
    await Report.deleteMany({ targetId: { $in: [...oldBookIds, ...oldConvIds] } });
    await Book.deleteMany({ _id: { $in: oldBookIds } });
  }

  console.log('📚 Seeding 10 Published Manuscripts and 2 Drafts...');

  const books = [];
  for (let i = 0; i < BOOK_BLUEPRINTS.length; i++) {
    const bp = BOOK_BLUEPRINTS[i];

    // Use story-specific manuscript text with unique characters and worldbuilding
    const chaptersText = BOOK_MANUSCRIPTS[bp.title]?.text || [
      `# Chapter 1: The Inciting Spark\n\n${bp.blurb}\n\nThe world stood at the precipice of change.`,
      `# Chapter 2: The Rising Tension\n\nAllies and adversaries converged as the stakes escalated.`,
      `# Chapter 3: The Climax\n\nA decisive confrontation determined the fate of everything.`,
    ].join('\n\n\n');

    // Create underlying Document
    const doc = await Document.create({
      userId: bp.writer._id,
      title: bp.title,
      originalFilename: `${bp.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`,
      fileType: 'txt',
      storageUrl: `uploads/demo-manuscripts/${bp.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`,
      status: 'ready',
      wordCount: chaptersText.split(/\s+/).length,
      parsedText: chaptersText,
    });

    const pages = paginate(chaptersText);

    // Create Book with dynamic pitch card tailored to each story
    const dynamicPitch = buildFallbackPitchCard(bp, `seed_${bp.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`);

    const book = await Book.create({
      writerId: bp.writer._id,
      documentId: doc._id,
      title: bp.title,
      blurb: bp.blurb,
      genre: bp.genre,
      tags: bp.tags,
      status: bp.status,
      coverUrl: bp.coverUrl || COVERS[i % COVERS.length],
      pageCount: pages.length,
      pageOffsets: pages.map((_, idx) => idx * 1500),
      pitchCard: dynamicPitch,
      acceptedTermsAt: new Date('2026-08-01'),
      acceptedTermsVersion: '1.0',
      stats: {
        reads: bp.reads,
        ratingAvg: bp.ratingAvg,
        ratingCount: bp.reads > 0 ? Math.floor(bp.reads / 250) + 12 : 0,
        completionRate: bp.reads > 0 ? 68 + (i % 25) : 0,
        readingListAdds: Math.floor(bp.reads / 100),
      },
      template: bp.writer.defaultTemplate || BOOK_TEMPLATES.CLASSIC,
    });

    doc.bookId = book._id;
    await doc.save();

    // Generate comprehensive story analysis suite for document
    console.log(`   ⚙️ Analyzing manuscript ${i + 1}/${BOOK_BLUEPRINTS.length}: "${bp.title}"...`);
    await processDocumentDirectly(doc._id);

    books.push(book);
  }

  // ─── 3. Reviews ────────────────────────────────────────────────────────────
  console.log('⭐ Seeding 20 Community Reviews...');
  const REVIEW_COMMENTS = [
    'An absolute masterpiece! The character depth and worldbuilding pulled me in from the very first page.',
    'Brilliant pacing and thrilling prose. Could not put it down!',
    'A fantastic blend of suspense, emotion, and intricate lore. Highly recommended.',
    'The plot twists kept me guessing until the last chapter. Five stars without question.',
    'Beautiful prose and a truly unique magic system. Elena Vance has outdone herself.',
    'A breathtaking journey. I found myself thinking about the ending for days afterward.',
    'Captivating dialogue and atmospheric scene-setting. Can’t wait for the sequel.',
    'One of the best indie books on SceneCraft. The interactive pacing features made reading it a joy.',
    'A bit slow in the second act, but the climax pays off every ounce of setup.',
    'Incredible aesthetic and flawless storytelling. A must-read for any fantasy lover!',
  ];

  for (let i = 0; i < 20; i++) {
    const targetBook = books[i % 10]; // Distribute across published books
    const reviewer = writers[(i + 1) % writers.length]; // Other writers as readers
    const rating = 4 + (i % 2); // 4 or 5 stars

    await Review.findOneAndUpdate(
      { bookId: targetBook._id, readerId: reviewer._id },
      {
        bookId: targetBook._id,
        readerId: reviewer._id,
        rating,
        text: REVIEW_COMMENTS[i % REVIEW_COMMENTS.length],
        status: 'visible',
      },
      { upsert: true }
    );
  }

  // ─── 4. Wishlists ──────────────────────────────────────────────────────────
  console.log('✨ Seeding 15 Publisher Acquisitions Wishlist Entries...');
  const publishers = [pub1, pub2, pub3];
  let wishlistCount = 0;

  for (const pub of publishers) {
    for (let b = 0; b < 5; b++) {
      const bookToWishlist = books[(wishlistCount * 2) % 10];
      await Wishlist.findOneAndUpdate(
        { publisherId: pub._id, bookId: bookToWishlist._id },
        { publisherId: pub._id, bookId: bookToWishlist._id },
        { upsert: true }
      );
      wishlistCount++;
    }
  }

  // ─── 5. Publish Requests & Chat ───────────────────────────────────────────
  console.log('🤝 Seeding 3 Publish Requests (1 Pending, 1 Accepted with Chat, 1 Declined)...');

  // Request 1: Pending Offer from pub1 to writers[0] on Book 0
  await PublishRequest.create({
    publisherId: pub1._id,
    bookId: books[0]._id,
    writerId: books[0].writerId,
    company: pub1.publisherProfile.company,
    contactName: pub1.name,
    contactEmail: pub1.email,
    rights: ['print', 'ebook', 'audiobook'],
    proposedTerms: '$15,000 advance against 15% royalties with worldwide English publication rights.',
    message: 'We adore the world of The Clockwork Sovereign and believe it is a breakout commercial hit.',
    status: 'pending',
  });

  // Request 2: Accepted Offer -> opens Conversation with 6 Chat Messages
  const acceptedRequest = await PublishRequest.create({
    publisherId: pub2._id,
    bookId: books[2]._id, // Neon Requiem by Kai Sterling
    writerId: books[2].writerId,
    company: pub2.publisherProfile.company,
    contactName: pub2.name,
    contactEmail: pub2.email,
    rights: ['print', 'ebook', 'film_tv_web'],
    proposedTerms: '$25,000 advance against 18% royalties plus media adaptation options.',
    message: 'Neon Requiem has outstanding cinematic pacing. We would love to discuss a multi-book deal.',
    status: 'accepted',
  });

  // Create Conversation for the accepted request
  const conversation = await Conversation.create({
    participants: [writers[1]._id, pub2._id],
    requestId: acceptedRequest._id,
    bookId: books[2]._id,
    status: 'open',
    contactSharingEnabled: false,
    lastMessageAt: new Date(),
  });

  acceptedRequest.conversationId = conversation._id;
  await acceptedRequest.save();

  // 6 Chat Messages
  const CHAT_EXCHANGE = [
    { sender: pub2, text: 'Hello Kai! Thrilled to connect. We are enormous fans of Neon Requiem.' },
    { sender: writers[1], text: 'Thank you Julian! Really excited about Beacon Press’s editorial vision.' },
    { sender: pub2, text: 'We are preparing the formal contract draft for standard North American English rights.' },
    { sender: writers[1], text: 'Understood. Is the proposed delivery timeline flexible for the final manuscript pass?' },
    { sender: pub2, text: 'Yes, absolutely. We typically allocate 4 to 6 months for substantive edits.' },
    { sender: writers[1], text: 'That sounds perfect. Looking forward to reviewing the memorandum of terms!' },
  ];

  for (let m = 0; m < CHAT_EXCHANGE.length; m++) {
    const msg = CHAT_EXCHANGE[m];
    await Message.create({
      conversationId: conversation._id,
      senderId: msg.sender._id,
      text: msg.text,
      createdAt: new Date(Date.now() - (6 - m) * 10 * 60 * 1000),
      readAt: new Date(),
    });
  }

  // Request 3: Declined Offer with 30-day cooldown
  await PublishRequest.create({
    publisherId: pub3._id,
    bookId: books[4]._id, // The Silk and the Dagger
    writerId: books[4].writerId,
    company: pub3.publisherProfile.company,
    contactName: pub3.name,
    contactEmail: pub3.email,
    rights: ['film_tv_web'],
    proposedTerms: 'Exclusive 2-year shopping agreement for streaming adaptation.',
    message: 'We would love to shop The Silk and the Dagger to major streaming networks.',
    status: 'declined',
    note: 'Author is currently in talks with another studio regarding media rights.',
    cooldownUntil: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days left in cooldown
  });

  // ─── 6. Moderation Reports ────────────────────────────────────────────────
  console.log('🚨 Seeding 2 Open Moderation Reports (1 Book, 1 Conversation)...');

  // Report 1: Book content report
  await Report.create({
    reporterId: writers[3]._id,
    targetType: 'book',
    targetId: books[6]._id,
    reason: 'abuse',
    details: 'Contains graphic descriptions of visceral medical experiments that may need a mature content flag.',
    status: 'open',
  });

  // Report 2: Conversation report
  await Report.create({
    reporterId: writers[1]._id,
    targetType: 'conversation',
    targetId: conversation._id,
    reason: 'spam',
    details: 'Automated inquiry verification check for compliance log audit.',
    status: 'open',
  });

  // ─── 7. Reader Reading Lists & Library ────────────────────────────────────
  console.log('📚 Seeding Reader Reading Lists for Demo Reader Accounts...');
  await ReadingList.deleteMany({ readerId: { $in: [readers[0]._id, readers[1]._id] } });

  // Alex Reader (reader@scenecraft.com)
  await ReadingList.create([
    {
      readerId: readers[0]._id,
      bookId: books[0]._id, // The Clockwork Sovereign (Fantasy)
      status: 'reading',
      currentOffset: 1250,
      furthestOffset: 1800,
      bookmarks: [{ offset: 450 }, { offset: 1200 }],
    },
    {
      readerId: readers[0]._id,
      bookId: books[1]._id, // Echoes of the Obsidian Spire (Science Fiction)
      status: 'reading',
      currentOffset: 2400,
      furthestOffset: 2400,
      bookmarks: [{ offset: 1100 }],
    },
    {
      readerId: readers[0]._id,
      bookId: books[2]._id, // Neon Requiem (Cyberpunk)
      status: 'want_to_read',
      currentOffset: 0,
      furthestOffset: 0,
    },
    {
      readerId: readers[0]._id,
      bookId: books[4]._id, // The Silk and the Dagger (Historical Fiction)
      status: 'finished',
      currentOffset: 4500,
      furthestOffset: 4500,
    },
  ]);

  // Clara Page (clara.reader@scenecraft.com)
  await ReadingList.create([
    {
      readerId: readers[1]._id,
      bookId: books[3]._id, // The Ghost in the Lattice (Science Fiction)
      status: 'reading',
      currentOffset: 800,
      furthestOffset: 800,
      bookmarks: [{ offset: 350 }],
    },
    {
      readerId: readers[1]._id,
      bookId: books[5]._id, // Crimson Tide of Verona (Romance)
      status: 'want_to_read',
      currentOffset: 0,
      furthestOffset: 0,
    },
    {
      readerId: readers[1]._id,
      bookId: books[1]._id, // Echoes of the Obsidian Spire (Science Fiction)
      status: 'finished',
      currentOffset: 3800,
      furthestOffset: 3800,
    },
  ]);

  // Platform Administrator (admin@scenecraft.com) - In-progress reading stories
  await ReadingList.deleteMany({ readerId: admin._id });
  await ReadingList.create([
    {
      readerId: admin._id,
      bookId: books[8]._id, // Children of the Ash King (Fantasy)
      status: 'reading',
      currentOffset: 650,
      furthestOffset: 650,
      bookmarks: [{ offset: 300 }],
    },
    {
      readerId: admin._id,
      bookId: books[0]._id, // The Clockwork Sovereign (Fantasy)
      status: 'reading',
      currentOffset: 900,
      furthestOffset: 900,
      bookmarks: [{ offset: 450 }],
    },
    {
      readerId: admin._id,
      bookId: books[2]._id, // Neon Requiem (Cyberpunk)
      status: 'reading',
      currentOffset: 400,
      furthestOffset: 400,
    },
  ]);

  console.log('\n================================================================');
  console.log('✨ SCENECRAFT DEMO SEEDING COMPLETED SUCCESSFULLY! ✨');
  console.log('================================================================');
  console.log('🔑 DEMO LOGIN CREDENTIALS:');
  console.log('----------------------------------------------------------------');
  console.log('👑 Admin:     admin@scenecraft.com          /  Password123!');
  console.log('🏢 Publisher: publisher@scenecraft.com      /  Password123!  (Approved: Apex Literary)');
  console.log('⏳ Publisher: pending.publisher@scenecraft.com / Password123! (Pending Review: Starlight)');
  console.log('✍️  Writer:    writer@scenecraft.com         /  Password123!  (Elena Vance - Author)');
  console.log('✍️  Writer:    kai.sterling@scenecraft.com   /  Password123!  (In Talks with Publisher)');
  console.log('📖 Reader:    reader@scenecraft.com         /  Password123!  (Alex Reader - Reader)');
  console.log('📖 Reader:    clara.reader@scenecraft.com   /  Password123!  (Clara Page - Reader)');
  console.log('================================================================\n');

  process.exit(0);
}

seedDemo().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
