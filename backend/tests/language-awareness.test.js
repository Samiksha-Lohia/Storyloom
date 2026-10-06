import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  isHindiLanguage,
  getAnalysisLanguageInstruction,
  buildWordBoundaryRegex,
} from '../src/utilities/language.helper.js';
import {
  splitIntoScenes,
  extractCandidateNames,
  moodForScene,
  relationTypeForPair,
  sentimentForText,
  traitsForName,
  classifyRole,
} from '../src/analysis/local-analyzer.js';

describe('Language-Aware Story Analysis Helper & Local Analyzer', () => {
  it('correctly identifies Hindi language codes', () => {
    assert.strictEqual(isHindiLanguage('hi'), true);
    assert.strictEqual(isHindiLanguage('HI'), true);
    assert.strictEqual(isHindiLanguage('hin'), true);
    assert.strictEqual(isHindiLanguage('Hindi'), true);
    assert.strictEqual(isHindiLanguage('en'), false);
    assert.strictEqual(isHindiLanguage('es'), false);
    assert.strictEqual(isHindiLanguage(null), false);
    assert.strictEqual(isHindiLanguage(undefined), false);
  });

  it('generates centralized prompt instructions for Hindi and preserves empty for English', () => {
    const hindiInst = getAnalysisLanguageInstruction('hi');
    assert.ok(hindiInst.includes('The source story is in Hindi'));
    assert.ok(hindiInst.includes('Generate all human-readable analysis content in Hindi'));
    assert.ok(hindiInst.includes('Preserve character names/proper nouns as they appear in the source story'));
    assert.ok(hindiInst.includes('Keep all machine-readable enum values and JSON structure unchanged'));

    const englishInst = getAnalysisLanguageInstruction('en');
    assert.strictEqual(englishInst, '');

    const defaultInst = getAnalysisLanguageInstruction();
    assert.strictEqual(defaultInst, '');
  });

  it('matches character names with proper Unicode word boundaries in both Hindi and English', () => {
    const hindiRegex = buildWordBoundaryRegex('राम');
    assert.strictEqual(hindiRegex.test('राम घर गया।'), true);
    assert.strictEqual(hindiRegex.test('श्रीराम घर गए।'), false);
    assert.strictEqual(hindiRegex.test('सीता और राम वन गए।'), true);

    const englishRegex = buildWordBoundaryRegex('John');
    assert.strictEqual(englishRegex.test('John walked into the room.'), true);
    assert.strictEqual(englishRegex.test('Johnny walked into the room.'), false);
    assert.strictEqual(englishRegex.test('Where is John?'), true);
  });

  it('splits Hindi texts into scenes and derives localized titles', () => {
    const hindiText = `
# अध्याय 1: पहला कदम

राम अयोध्या के मुख्य मार्ग पर चल रहा था। चारों ओर उत्सव का माहौल था।

# अध्याय 2: गहरा रहस्य

रात के सन्नाटे में सीता ने एक विचित्र आवाज़ सुनी। डर और खामोशी छा गई।
    `.trim();

    const scenes = splitIntoScenes(hindiText, 'hi');
    assert.ok(scenes.length >= 2, 'Should detect at least 2 scenes');
    assert.ok(scenes[0].title.includes('पहला कदम') || scenes[0].title.includes('दृश्य 1'));
    assert.strictEqual(typeof scenes[0].summary, 'string');
    assert.ok(scenes[0].summary.length > 0);
  });

  it('extracts both Hindi and English names in Hindi stories while ignoring stop words', () => {
    const mixedStory = `
राम अयोध्या के राजकुमार थे। राम ने सीता को देखा। सीता मुस्कुराई।
राम और सीता के साथ John भी उपस्थित था। John ने राम से बात की।
    `;

    const candidates = extractCandidateNames(mixedStory, 'hi');
    const names = candidates.map((c) => c.name);
    assert.ok(names.includes('राम'), 'Should extract राम');
    assert.ok(names.includes('सीता'), 'Should extract सीता');
    assert.ok(names.includes('John'), 'Should extract John');
    assert.ok(!names.includes('और'), 'Should not include stop word और');
    assert.ok(!names.includes('ने'), 'Should not include stop word ने');
  });

  it('detects moods in Hindi with localized primaryMood and preserves machine-readable emotion scores', () => {
    const tenseHindi = 'चारों तरफ बहुत बड़ा खतरा और आतंक था। खून और लड़ाई का खौफनाक मंज़र था।';
    const moodTense = moodForScene(tenseHindi, 'hi');
    assert.strictEqual(moodTense.primaryMood, 'तनावपूर्ण');
    assert.ok(moodTense.intensity > 0);
    assert.ok(moodTense.emotionScores.tension > 0);
    assert.strictEqual(typeof moodTense.emotionScores.joy, 'number');

    const compoundHindi = 'चारों तरफ गहरा दुख और उदास माहौल था, और अचानक भयानक खतरा और आतंक फैल गया।';
    const moodCompound = moodForScene(compoundHindi, 'hi');
    assert.strictEqual(moodCompound.primaryMood, 'उदास और तनावपूर्ण');

    const englishText = 'The dark clouds gathered and danger was everywhere.';
    const moodEng = moodForScene(englishText, 'en');
    assert.strictEqual(moodEng.primaryMood, 'tense');
  });

  it('detects relationship types in Hindi while retaining machine-readable enums', () => {
    assert.strictEqual(relationTypeForPair('राम और लक्ष्मण भाई थे।'), 'family');
    assert.strictEqual(relationTypeForPair('दशरथ राम के पिता थे।'), 'family');
    assert.strictEqual(relationTypeForPair('राम और सीता के बीच अटूट प्रेम था।'), 'romantic');
    assert.strictEqual(relationTypeForPair('रावण राम का सबसे बड़ा दुश्मन और शत्रु था।'), 'rival');
    assert.strictEqual(relationTypeForPair('वशिष्ठ उनके महान गुरु और शिक्षक थे।'), 'mentor');
    assert.strictEqual(relationTypeForPair('सुग्रीव राम के सच्चे मित्र और साथी थे।'), 'ally');
  });

  it('preserves existing English behavior identically', () => {
    assert.strictEqual(relationTypeForPair('They were brother and sister.'), 'family');
    assert.strictEqual(relationTypeForPair('They shared a deep love and kissed.'), 'romantic');
    assert.strictEqual(relationTypeForPair('He was his bitter rival and enemy.'), 'rival');
    assert.strictEqual(classifyRole(0, 3), 'protagonist');
    assert.strictEqual(classifyRole(1, 3), 'antagonist');
    assert.strictEqual(classifyRole(2, 3), 'supporting');
  });
});
