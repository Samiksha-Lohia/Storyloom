const SENTENCE_SPLIT = /(?<=[.!?\u0964\u0965])\s+/;
const SCENE_BREAK = /\n\s*(?:#{1,3}\s+.+|chapter\s+\w+|scene\s+\w+|अध्याय\s+[\w\u0900-\u097F]+|दृश्य\s+[\w\u0900-\u097F]+|\*{3,}|-{3,})\s*\n/gi;
const NAME_PATTERN = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g;
const HINDI_NAME_PATTERN = /[\u0900-\u097F]{2,}/g;

const STOP_NAMES = new Set([
  'A', 'An', 'And', 'As', 'At', 'But', 'By', 'Chapter', 'He', 'Her', 'His', 'I',
  'In', 'It', 'On', 'Scene', 'She', 'The', 'They', 'This', 'We', 'When', 'You',
]);

const HINDI_STOP_WORDS = new Set([
  'और', 'है', 'हैं', 'था', 'थी', 'थे', 'की', 'के', 'का', 'में', 'ने', 'से', 'को', 'पर', 'यह', 'वह',
  'तो', 'भी', 'ही', 'हो', 'रहे', 'रहा', 'रही', 'गए', 'गया', 'गई', 'हुए', 'हुआ', 'हुई', 'किया',
  'किए', 'दिए', 'दिया', 'लिए', 'अपने', 'अपनी', 'अपना', 'उसके', 'उसकी', 'उसका', 'इसके', 'इसकी',
  'इसका', 'उन्हें', 'उसे', 'इसे', 'इन्हें', 'जब', 'तब', 'अब', 'सब', 'कोई', 'कुछ', 'क्या', 'क्यों',
  'कैसे', 'कहाँ', 'यहाँ', 'वहाँ', 'लेकिन', 'मगर', 'किंतु', 'परंतु', 'अगर', 'यदि', 'अध्याय', 'दृश्य',
  'बात', 'समय', 'दिन', 'रात', 'एक', 'दो', 'तीन', 'चार', 'फिर', 'साथ', 'पास', 'दूर', 'आगे', 'पीछे',
  'ऊपर', 'नीचे', 'कहा', 'बोला', 'बोली', 'सुना', 'देखा', 'जा', 'कर', 'होना', 'होने'
]);

const MOODS = [
  {
    name: 'tense',
    hindiName: 'तनावपूर्ण',
    words: [
      'danger', 'fear', 'fight', 'blood', 'threat', 'panic', 'angry', 'storm',
      'डर', 'भय', 'खतरा', 'आतंक', 'लड़ाई', 'खून', 'क्रोध', 'गुस्सा', 'तूफान', 'हमला', 'तनाव', 'चीख'
    ],
  },
  {
    name: 'hopeful',
    hindiName: 'आशावादी',
    words: [
      'hope', 'light', 'smile', 'safe', 'promise', 'future', 'relief',
      'आशा', 'उम्मीद', 'रोशनी', 'प्रकाश', 'मुस्कान', 'सुरक्षित', 'राहत', 'विश्वास', 'जीत', 'भरोसा'
    ],
  },
  {
    name: 'melancholy',
    hindiName: 'उदास',
    words: [
      'alone', 'loss', 'silence', 'tears', 'gone', 'empty', 'grief',
      'उदास', 'अकेला', 'दुख', 'आंसू', 'शोक', 'खाली', 'विलाप', 'दर्द', 'रोना', 'निराशा'
    ],
  },
  {
    name: 'romantic',
    hindiName: 'रोमांटिक',
    words: [
      'love', 'kiss', 'heart', 'touch', 'warm', 'tender',
      'प्यार', 'प्रेम', 'दिल', 'स्पर्श', 'कोमल', 'स्नेह', 'चाहत'
    ],
  },
  {
    name: 'mysterious',
    hindiName: 'रहस्यमय',
    words: [
      'secret', 'shadow', 'unknown', 'whisper', 'hidden', 'strange',
      'रहस्य', 'साया', 'छाया', 'अनजान', 'फुसफुसाहट', 'गुप्त', 'अजीब', 'पहेली', 'अंधेरा'
    ],
  },
];

const normalizeText = (text = '') => text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

const wordCount = (text = '') => (text.match(/[\w\u0900-\u097F'-]+/g) || []).length;

const summarize = (text = '', maxSentences = 2) => {
  const sentences = text.trim().split(SENTENCE_SPLIT).filter(Boolean);
  return sentences.slice(0, maxSentences).join(' ').slice(0, 600) || 'No summary available.';
};

const splitIntoScenes = (rawText = '', language = 'en') => {
  const text = normalizeText(rawText);
  if (!text) return [];

  const explicitParts = text.split(SCENE_BREAK).map((part) => part.trim()).filter(Boolean);
  const parts = explicitParts.length > 1 ? explicitParts : chunkByParagraphs(text, 900);

  let cursor = 0;
  return parts.map((part, index) => {
    const start = text.indexOf(part, cursor);
    const safeStart = start >= 0 ? start : cursor;
    const end = safeStart + part.length;
    cursor = end;

    return {
      sceneNumber: index + 1,
      title: deriveSceneTitle(part, index + 1, language),
      summary: summarize(part),
      location: deriveLocation(part),
      textRange: { start: safeStart, end },
      wordCount: wordCount(part),
      rawText: part,
    };
  });
};

const chunkByParagraphs = (text, targetWords) => {
  const paragraphs = text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const chunks = [];
  let current = [];
  let currentWords = 0;

  for (const paragraph of paragraphs.length ? paragraphs : [text]) {
    current.push(paragraph);
    currentWords += wordCount(paragraph);
    if (currentWords >= targetWords) {
      chunks.push(current.join('\n\n'));
      current = [];
      currentWords = 0;
    }
  }

  if (current.length) chunks.push(current.join('\n\n'));
  return chunks;
};

const deriveSceneTitle = (text, sceneNumber, language = 'en') => {
  const firstLine = text.split('\n').find((line) => line.trim().length > 0) || '';
  const cleaned = firstLine.replace(/^#+\s*/, '').trim();
  if (cleaned.length > 8 && cleaned.length <= 80) return cleaned;
  const isHindi = language === 'hi' || /[\u0900-\u097F]/.test(text);
  return isHindi ? `दृश्य ${sceneNumber}` : `Scene ${sceneNumber}`;
};

const deriveLocation = (text) => {
  const match = text.match(/\b(?:in|at|inside|outside|near)\s+the\s+([A-Za-z][A-Za-z\s'-]{2,40})/i);
  return match ? match[1].trim().replace(/[,.!?].*$/, '') : '';
};

const extractCandidateNames = (text = '', language = 'en') => {
  const counts = new Map();
  const isHindi = language === 'hi' || /[\u0900-\u097F]/.test(text);

  for (const match of text.matchAll(NAME_PATTERN)) {
    const name = match[0].trim();
    if (STOP_NAMES.has(name) || /^\d/.test(name)) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }

  if (isHindi) {
    for (const match of text.matchAll(HINDI_NAME_PATTERN)) {
      const name = match[0].trim();
      if (HINDI_STOP_WORDS.has(name) || name.length < 2) continue;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([name, count]) => ({ name, count }));
};

const classifyRole = (index, total) => {
  if (index === 0) return 'protagonist';
  if (total > 2 && index === 1) return 'antagonist';
  return 'supporting';
};

const traitsForName = (name, text, language = 'en') => {
  const isHindi = language === 'hi' || /[\u0900-\u097F]/.test(name);
  if (isHindi) {
    const traits = [];
    if (text.includes(`${name} ने कहा`) || text.includes(`${name} बोला`) || text.includes(`${name} बोली`)) traits.push('मुखर');
    if (text.includes(`${name} भागा`) || text.includes(`${name} लड़ा`) || text.includes(`${name} दौड़ा`)) traits.push('सक्रिय');
    if (text.includes(`${name} ने सोचा`) || text.includes(`${name} समझा`)) traits.push('विचारशील');
    return traits.length ? traits : ['उपस्थित'];
  }

  const lower = text.toLowerCase();
  const traits = [];
  if (lower.includes(`${name.toLowerCase()} said`)) traits.push('vocal');
  if (lower.includes(`${name.toLowerCase()} ran`) || lower.includes(`${name.toLowerCase()} fought`)) traits.push('active');
  if (lower.includes(`${name.toLowerCase()} thought`) || lower.includes(`${name.toLowerCase()} wondered`)) traits.push('reflective');
  return traits.length ? traits : ['present'];
};

const moodForScene = (text = '', language = 'en') => {
  const lower = text.toLowerCase();
  const isHindi = language === 'hi' || /[\u0900-\u097F]/.test(text);

  const scored = MOODS.map((mood) => ({
    mood,
    score: mood.words.reduce((sum, word) => sum + (lower.includes(word) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score);

  const winner = scored[0];
  const runnerUp = scored[1];
  const intensity = Math.min(1, Math.max(0.15, winner.score / 5));

  let primaryMood = 'neutral';
  if (isHindi) {
    if (winner.score > 0) {
      if (
        runnerUp &&
        runnerUp.score > 0 &&
        ((winner.mood.name === 'melancholy' && runnerUp.mood.name === 'tense') ||
         (winner.mood.name === 'tense' && runnerUp.mood.name === 'melancholy'))
      ) {
        primaryMood = 'उदास और तनावपूर्ण';
      } else {
        primaryMood = winner.mood.hindiName;
      }
    } else {
      primaryMood = 'शांत';
    }
  } else {
    primaryMood = winner.score > 0 ? winner.mood.name : 'neutral';
  }

  return {
    primaryMood,
    emotionScores: {
      joy: winner.mood.name === 'hopeful' && winner.score > 0 ? intensity : 0.1,
      tension: winner.mood.name === 'tense' && winner.score > 0 ? intensity : 0.1,
      sadness: winner.mood.name === 'melancholy' && winner.score > 0 ? intensity : 0.1,
      mystery: winner.mood.name === 'mysterious' && winner.score > 0 ? intensity : 0.1,
      romantic: winner.mood.name === 'romantic' && winner.score > 0 ? intensity : 0.1,
    },
    intensity,
  };
};

const relationTypeForPair = (text = '') => {
  const lower = text.toLowerCase();
  if (lower.includes('love') || lower.includes('kiss') || lower.includes('प्यार') || lower.includes('प्रेम') || lower.includes('स्नेह')) return 'romantic';
  if (lower.includes('father') || lower.includes('mother') || lower.includes('brother') || lower.includes('sister') || lower.includes('पिता') || lower.includes('माता') || lower.includes('मां') || lower.includes('भाई') || lower.includes('बहन') || lower.includes('परिवार')) return 'family';
  if (lower.includes('enemy') || lower.includes('rival') || lower.includes('fight') || lower.includes('दुश्मन') || lower.includes('शत्रु') || lower.includes('प्रतिद्वंद्वी') || lower.includes('लड़ाई')) return 'rival';
  if (lower.includes('teacher') || lower.includes('mentor') || lower.includes('गुरु') || lower.includes('शिक्षक') || lower.includes('उस्ताद')) return 'mentor';
  if (lower.includes('friend') || lower.includes('together') || lower.includes('दोस्त') || lower.includes('मित्र') || lower.includes('साथी') || lower.includes('सखा')) return 'ally';
  return 'other';
};

const sentimentForText = (text = '') => {
  const lower = text.toLowerCase();
  const positive = ['smile', 'hope', 'friend', 'love', 'safe', 'laugh', 'मुस्कान', 'आशा', 'उम्मीद', 'दोस्त', 'प्यार', 'प्रेम', 'सुरक्षित', 'हंसी', 'खुशी'].filter((word) => lower.includes(word)).length;
  const negative = ['fear', 'angry', 'enemy', 'fight', 'blood', 'hate', 'डर', 'भय', 'गुस्सा', 'क्रोध', 'दुश्मन', 'लड़ाई', 'खून', 'नफरत', 'उदास', 'दुख'].filter((word) => lower.includes(word)).length;
  return Math.max(-1, Math.min(1, (positive - negative) / 4));
};

const hashToken = (token, dimensions) => {
  let hash = 0;
  for (let i = 0; i < token.length; i += 1) {
    hash = ((hash << 5) - hash) + token.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % dimensions;
};

const buildTextEmbedding = (text = '', dimensions = 64) => {
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = text.toLowerCase().match(/[\w\u0900-\u097F'-]{2,}/g) || [];
  for (const token of tokens) {
    vector[hashToken(token, dimensions)] += 1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
};

const cosineSimilarity = (a = [], b = []) => {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

export {
  buildTextEmbedding,
  cosineSimilarity,
  extractCandidateNames,
  moodForScene,
  relationTypeForPair,
  sentimentForText,
  splitIntoScenes,
  summarize,
  traitsForName,
  wordCount,
  classifyRole,
};
