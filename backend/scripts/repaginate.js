import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import { redis } from '../src/config/redis.js';
import Document from '../src/models/document.model.js';
import Book from '../src/models/book.model.js';
import { paginate } from '../src/services/paginator.service.js';
import logger from '../src/utilities/logger.js';

function generateSampleManuscript(book) {
  const genre = book.genre || 'Fiction';
  const title = book.title || 'Untitled';
  const blurb = book.blurb || '';

  return `CHAPTER 1: THE BEGINNING

${blurb}

The rain began just before dusk, washing the dust from the stone streets and turning the lanterns into blurred amber halos. Elena pulled her cloak tighter against the damp autumn chill, her fingers tracing the worn edge of the leather notebook in her pocket. Every entry inside was a fragment of a truth the Guild had spent decades trying to bury.

"You should not be here," a voice spoke from the shadow of the colonnade.

She didn't flinch. She had heard him approach three paces back—his boots had a distinctive rhythmic click against the cobblestones, the gait of someone trained in the high academies of the northern provinces.

"And you shouldn't be following me, Caelen," she replied without turning. "The council meets at dawn. If they find you outside the citadel walls, they will question your allegiance."

Caelen stepped into the dim light of the gas lantern. The silver insignia of the Vanguard gleamed against his dark wool tunic, half-concealed beneath his traveling coat. His expression was taut, etched with the strain of someone caught between two loyalties.

"The council already knows," he said quietly. "They found the vault empty two hours ago."

Silence settled between them, heavy and suffocating. The distance between the city gates and the northern ridge suddenly felt impossibly far.


CHAPTER 2: ECHOES IN THE SHADOWS

Elena turned to face him directly, her pulse drumming a quiet rhythm against her collarbone. She had anticipated suspicion, perhaps even a covert inquiry by dawn. But two hours? Someone within the inner circle had talked, and that meant the perimeter around the valley was already closing.

"Who told them?" she asked, keeping her voice level.

"Does it matter?" Caelen stepped closer, glancing over his shoulder toward the eastern boulevard where the watch towers stood like silent sentinels against the gathering night. "In twenty minutes the bell will toll for lockdown. The river barges are already halted. If you intend to reach the southern passage, you have to leave now, through the lower aqueducts."

"The aqueducts haven't been opened since the siege," Elena reminded him. "Half the arches are submerged in mud."

"Then you had better start wading," Caelen said. He reached into his coat and produced a heavy brass key, its shaft engraved with the three concentric rings of the archivist guild. "This opens the maintenance grille beneath the old mill. Beyond that, the tunnel drains directly into the marshlands outside the perimeter."

Elena stared at the key. In all the years they had trained together, Caelen had never once broken protocol. To hand her this key was treason punishable by exile or worse.

"Why are you doing this?" she whispered.

Caelen met her gaze, his gray eyes steady despite the tremor in his fingers. "Because you're right about what is coming. And if you perish in the dungeons, no one else will be left to speak the truth."


CHAPTER 3: THE DEEP REACHES

The air inside the aqueduct smelled of ancient silt and cold stone. Water sloshed around Elena's knees as she pressed forward, her free hand guiding her along the damp masonry of the curving tunnel. In her other hand, a shielded oil lantern cast a narrow beam across the dark surface of the current.

Every ten paces, the stone vaulting overhead was reinforced with iron ribs, rusted red with age. She counted them mechanically, a habit from her navigational training. At the fortieth rib, the tunnel branched.

To the left, the conduit sloped downward toward the subterranean cisterns that fed the palace fountains. To the right, a narrower passage rose gradually toward the southern bluff where the marsh gave way to the pine forests of the lower foothills.

She paused at the junction, listening.

Faint and hollow through the stonework, the low chime of the citadel lockdown bell echoed down the drainage shafts. One. Two. Three.

The city was sealed. The hunt had officially begun.

Taking a deep breath of the mineral-heavy air, Elena turned toward the right-hand passage and stepped forward into the dark, determined to see the journey through to the end.`;
}

async function repaginateBooks() {
  try {
    await connectDB();
    logger.info('Connected to database for repagination.');

    const forceAll = process.argv.includes('--force') || process.argv.includes('--all');

    const query = forceAll
      ? {}
      : {
          $or: [
            { pageOffsets: { $exists: false } },
            { pageOffsets: { $size: 0 } },
            { pageCount: 0 },
            { pageCount: { $exists: false } },
          ],
        };

    const books = await Book.find(query);
    logger.info(`Found ${books.length} book(s) needing pagination (mode: ${forceAll ? 'ALL' : 'UNPAGINATED'}).`);

    const results = [];

    for (const book of books) {
      const doc = await Document.findById(book.documentId).select('+parsedText');
      if (!doc) {
        logger.warn(`Document ${book.documentId} not found for book "${book.title}". Skipping.`);
        continue;
      }

      let text = doc.parsedText;
      if (!text || text.trim().length === 0) {
        // Populate sample text for stub documents
        text = generateSampleManuscript(book);
        doc.parsedText = text;
        doc.wordCount = text.trim().split(/\s+/).length;
        await doc.save();
      }

      const offsets = paginate(text, 1800);
      const count = offsets.length;

      book.pageOffsets = offsets;
      book.pageCount = count;
      await book.save();

      // Invalidate Redis cache
      try {
        await redis.del(`book:${book._id}:pages:text`);
      } catch (cacheErr) {
        // Redis optional in standalone script
      }

      results.push({
        id: book._id.toString(),
        title: book.title,
        genre: book.genre,
        pageCount: count,
        chars: text.length,
      });

      logger.info(`Paginated "${book.title}": ${count} page(s) (total ${text.length} chars).`);
    }

    console.log('\n=== REPAGINATION RESULTS ===');
    console.table(
      results.map((r) => ({
        Title: r.title.length > 32 ? r.title.slice(0, 32) + '...' : r.title,
        Genre: r.genre,
        Pages: r.pageCount,
        Characters: r.chars,
      }))
    );

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    try {
      redis.disconnect();
    } catch (_) {}

    logger.info('Repagination script finished successfully.');
    process.exit(0);
  } catch (err) {
    logger.error(`Repagination script failed: ${err.message}`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

repaginateBooks();
