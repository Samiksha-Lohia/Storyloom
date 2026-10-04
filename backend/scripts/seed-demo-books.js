import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import User from '../src/models/user.model.js';
import Document from '../src/models/document.model.js';
import Book from '../src/models/book.model.js';
import { USER_ROLES, USER_STATUSES } from '../src/constants/user-roles.js';
import { BOOK_STATUSES, BOOK_ACCENTS, BOOK_TEMPLATES } from '../src/constants/book.js';
import logger from '../src/utilities/logger.js';

const DEMO_BOOKS_DATA = [
  {
    title: 'Echoes of the Obsidian Crown',
    genre: 'Fantasy',
    blurb: 'In a shattered realm where memories crystallize into raw arcane power, a banished mapmaker discovers the ruins of an ancient dynasty. To save her sister from the whispering plague, she must cross the Ashveil Sea and claim the Obsidian Crown before the inquisitors find her.',
    tags: ['high fantasy', 'magic systems', 'quest', 'dark academia'],
    mature: false,
    accent: BOOK_ACCENTS[0],
    template: BOOK_TEMPLATES.CLASSIC,
    pageCount: 342,
    reads: 48200,
    ratingAvg: 4.8,
    ratingCount: 1240,
  },
  {
    title: 'The Starlight Cartographer',
    genre: 'Sci-Fi',
    blurb: 'Deep on the mining moon of Kaelis-9, signals begin to pulse from an uncharted subterranean core. Sola, an orbital navigator stranded by an interstellar embargo, piecing together lost telemetry to chart a route through folding spacetime.',
    tags: ['space opera', 'cyberpunk', 'exploration', 'hard sci-fi'],
    mature: false,
    accent: BOOK_ACCENTS[1],
    template: BOOK_TEMPLATES.SHOWCASE,
    pageCount: 280,
    reads: 32400,
    ratingAvg: 4.6,
    ratingCount: 890,
  },
  {
    title: 'Letters from the Lavender Room',
    genre: 'Romance',
    blurb: 'An anonymous correspondence between two antiquarian bookbinders in 1920s Edinburgh turns into an unexpected romance. But as secrets from the past unravel with each dispatched wax seal, both must decide if love is worth shattering their carefully guarded worlds.',
    tags: ['historical romance', 'slow burn', 'epistolary', 'edinburgh'],
    mature: false,
    accent: BOOK_ACCENTS[3],
    template: BOOK_TEMPLATES.NOTEBOOK,
    pageCount: 215,
    reads: 65100,
    ratingAvg: 4.9,
    ratingCount: 2350,
  },
  {
    title: 'The Silent Whispers of Blackwood',
    genre: 'Mystery',
    blurb: 'When the eccentric clockmaker of Blackwood Manor is found locked inside his own vault without a key, detective Julian Graves is summoned. Every family member possesses an alibi, but the clocks in the manor are ticking backward.',
    tags: ['locked room', 'whodunit', 'gothic', 'detective'],
    mature: false,
    accent: BOOK_ACCENTS[4],
    template: BOOK_TEMPLATES.CLASSIC,
    pageCount: 290,
    reads: 27800,
    ratingAvg: 4.5,
    ratingCount: 710,
  },
  {
    title: 'Neon Veins and Copper Bones',
    genre: 'Sci-Fi',
    blurb: 'A rogue bio-engineer in the vertical slums of Neo-Veridia accepts a black-market contract that alters human consciousness into neural data. Hunted by corporate syndicates, she has only seventy-two hours to wipe her own memory.',
    tags: ['cyberpunk', 'dystopian', 'thriller', 'ai'],
    mature: true,
    accent: BOOK_ACCENTS[5],
    template: BOOK_TEMPLATES.SHOWCASE,
    pageCount: 310,
    reads: 19400,
    ratingAvg: 4.4,
    ratingCount: 520,
  },
  {
    title: 'Summer at Honeycomb Bay',
    genre: 'Romance',
    blurb: 'Fleeing a high-stakes corporate career in London, Clara retreats to her grandmother coastal cottage in Devon. An unexpected rivalry with the surly local boat builder soon sparks a warmth she never anticipated.',
    tags: ['contemporary', 'small town', 'enemies to lovers', 'cozy'],
    mature: false,
    accent: BOOK_ACCENTS[0],
    template: BOOK_TEMPLATES.CLASSIC,
    pageCount: 240,
    reads: 54300,
    ratingAvg: 4.7,
    ratingCount: 1890,
  },
  {
    title: 'The Alchemist of Solitude',
    genre: 'Historical Fiction',
    blurb: 'During the Venetian plague of 1630, a reclusive herbalist creates elixirs from forgotten Byzantine scrolls. When an orphaned child seeks sanctuary on his doorstep, his quiet life turns into a race against the city grand inquisitor.',
    tags: ['renaissance', 'venice', 'alchemy', 'historical'],
    mature: false,
    accent: BOOK_ACCENTS[2],
    template: BOOK_TEMPLATES.NOTEBOOK,
    pageCount: 375,
    reads: 18200,
    ratingAvg: 4.6,
    ratingCount: 430,
  },
  {
    title: 'Before the Tide Turns Red',
    genre: 'Thriller',
    blurb: 'A deep-sea salvage crew off the coast of Iceland retrieves an unidentifiable freight container. Inside, they do not find sunken gold, but a classified military prototype that is waking up.',
    tags: ['oceanic thriller', 'survival', 'conspiracy', 'action'],
    mature: true,
    accent: BOOK_ACCENTS[4],
    template: BOOK_TEMPLATES.SHOWCASE,
    pageCount: 320,
    reads: 38900,
    ratingAvg: 4.7,
    ratingCount: 960,
  },
  {
    title: 'The Clockwork Meadow',
    genre: 'Teen',
    blurb: 'Sixteen-year-old Maya discovered that the meadow behind her foster home is not living grass, but a vast clockwork mechanism buried centuries ago. When she winds the golden key at the centre, tomorrow arrives twice.',
    tags: ['young adult', 'steampunk', 'time loop', 'friendship'],
    mature: false,
    accent: BOOK_ACCENTS[1],
    template: BOOK_TEMPLATES.CLASSIC,
    pageCount: 260,
    reads: 42100,
    ratingAvg: 4.8,
    ratingCount: 1420,
  },
  {
    title: 'Shadows in the Cellar Door',
    genre: 'Horror',
    blurb: 'A young folklorist buys a desolate farmhouse in Maine to compile regional ghost legends. As autumn frost sets in, she realizes the cellar door was locked from the outside for a reason.',
    tags: ['psychological horror', 'haunted house', 'folklore', 'suspense'],
    mature: true,
    accent: BOOK_ACCENTS[4],
    template: BOOK_TEMPLATES.CLASSIC,
    pageCount: 275,
    reads: 22600,
    ratingAvg: 4.5,
    ratingCount: 680,
  },
  {
    title: 'Songs of the Nomad Wind',
    genre: 'Poetry',
    blurb: 'A luminous collection of free-verse and prose poetry tracing the migrations of mountain birds, forgotten childhood languages, and the architecture of grief across three continents.',
    tags: ['poetry', 'lyric', 'nature', 'reflections'],
    mature: false,
    accent: BOOK_ACCENTS[2],
    template: BOOK_TEMPLATES.NOTEBOOK,
    pageCount: 110,
    reads: 14700,
    ratingAvg: 4.9,
    ratingCount: 510,
  },
  {
    title: 'The Architect of Broken Worlds',
    genre: 'Fantasy',
    blurb: 'In the celestial city of Aethelgard, cities are dreamt into existence by master architects. When one architect begins seeing cracks in the firmament of reality, he discovers that the entire universe is merely a draft.',
    tags: ['epic fantasy', 'metaphysical', 'complex world', 'sorcery'],
    mature: false,
    accent: BOOK_ACCENTS[3],
    template: BOOK_TEMPLATES.SHOWCASE,
    pageCount: 410,
    reads: 59800,
    ratingAvg: 4.8,
    ratingCount: 1770,
  },
];

async function seedDemoBooks() {
  try {
    logger.info('Connecting to database for demo book seeding...');
    await connectDB();

    // 1. Find or create demo writer
    const writerEmail = 'writer@scenecraft.com';
    let writer = await User.findOne({ email: writerEmail });
    if (!writer) {
      writer = await User.create({
        name: 'Elena Vance',
        username: 'elena-vance',
        email: writerEmail,
        passwordHash: 'Password123!',
        role: USER_ROLES.WRITER,
        status: USER_STATUSES.ACTIVE,
        bio: 'Bestselling speculative fiction author and worldbuilder. Writing stories where myth and memory collide.',
      });
      logger.info('Created demo writer Elena Vance (elena-vance).');
    }

    // 2. Remove previously seeded books
    const oldBooks = await Book.find({ seeded: true });
    if (oldBooks.length > 0) {
      const docIds = oldBooks.map((b) => b.documentId);
      await Document.deleteMany({ _id: { $in: docIds } });
      await Book.deleteMany({ seeded: true });
      logger.info(`Removed ${oldBooks.length} existing demo book(s) and documents.`);
    }

    // 3. Insert demo books
    for (const data of DEMO_BOOKS_DATA) {
      const stubDocument = await Document.create({
        userId: writer._id,
        title: data.title,
        originalFilename: `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`,
        fileType: 'txt',
        storageUrl: 'uploads/demo-manuscripts/stub.txt',
        status: 'ready',
        wordCount: data.pageCount * 280,
        totalScenes: Math.round(data.pageCount / 12),
      });

      const book = await Book.create({
        writerId: writer._id,
        documentId: stubDocument._id,
        title: data.title,
        blurb: data.blurb,
        genre: data.genre,
        tags: data.tags,
        language: 'en',
        mature: data.mature,
        status: BOOK_STATUSES.PUBLISHED,
        template: data.template,
        accent: data.accent,
        pageCount: data.pageCount,
        pageOffsets: Array.from({ length: data.pageCount }, (_, i) => i * 1500),
        pitchCard: {
          logline: data.blurb.slice(0, 160),
          genre: data.genre,
          tone: data.tags.slice(0, 2).join(', '),
          targetAudience: 'Adult & New Adult fiction readers',
          forFansOf: ['Brandon Sanderson', 'N.K. Jemisin', 'Ursula K. Le Guin'],
          generatedAt: new Date(),
          inputHash: 'demo_seed_hash',
        },
        stats: {
          reads: data.reads,
          ratingAvg: data.ratingAvg,
          ratingCount: data.ratingCount,
          completionRate: Math.min(95, Math.max(45, Math.round((data.ratingAvg / 5) * 88))),
          readingListAdds: Math.round(data.reads * 0.08),
        },
        acceptedTermsAt: new Date('2026-09-01'),
        termsVersion: '1.0',
        seeded: true,
      });

      stubDocument.bookId = book._id;
      await stubDocument.save();
    }

    logger.info(`Successfully seeded ${DEMO_BOOKS_DATA.length} published demo books.`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    logger.error(`Demo book seeding failed: ${err.message}`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

seedDemoBooks();
