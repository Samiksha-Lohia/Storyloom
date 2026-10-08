const SENTENCE_SPLIT = /(?<=[.!?\u0964\u0965])\s+/;

const HEADING_PATTERN = /(?:^|\r?\n)\s*(?:(#{1,3}\s+[^\r\n]+)|((?:chapter|scene|act|अध्याय|दृश्य|भाग)\s*[\d\w\u0900-\u097F]+[^\r\n]*)|(\*{3,}|-{3,}|_{3,}))(?=\r?\n|$)/gi;

const ENGLISH_TITLES = new Set([
  'mr', 'mrs', 'ms', 'miss', 'dr', 'lord', 'lady', 'sir', 'king', 'queen',
  'prince', 'princess', 'captain', 'detective', 'professor', 'father', 'mother',
  'brother', 'sister', 'uncle', 'aunt', 'officer', 'agent'
]);

const HINDI_TITLES = new Set([
  'श्री', 'श्रीमती', 'राजा', 'रानी', 'ठाकुर', 'पंडित', 'सेठ', 'बाबू', 'डॉक्टर',
  'स्वामी', 'साहब', 'जी', 'चौधरी', 'मुंशी', 'मास्टर', 'गुरु', 'महाराज'
]);

const HINDI_POSTPOSITIONS = new Set(['ने', 'को', 'से', 'का', 'की', 'के', 'में', 'पर']);
const HINDI_SPEECH_TAGS = new Set(['कहा', 'बोला', 'बोली', 'पूछा', 'चिल्लाया', 'बोले', 'सोचा', 'समझा', 'कहा था']);

const STOP_NAMES = new Set([
  'A', 'An', 'And', 'As', 'At', 'But', 'By', 'Chapter', 'He', 'Her', 'His', 'I',
  'In', 'It', 'On', 'Scene', 'She', 'The', 'They', 'This', 'We', 'When', 'You',
  'Suddenly', 'Meanwhile', 'Every', 'One', 'Two', 'Three', 'There', 'Here', 'Next',
  'Yesterday', 'Today', 'Tomorrow', 'After', 'Before', 'Because', 'Without', 'Instead',
  'Nothing', 'Something', 'Everything', 'Everyone', 'Nobody', 'Another', 'Finally',
  'However', 'Although', 'Sometimes', 'Never', 'Always', 'Perhaps', 'Maybe', 'Then',
  'Later', 'Soon', 'Morning', 'Evening', 'Night', 'Inside', 'Outside', 'Above', 'Below',
  'Together', 'Both', 'Each', 'All', 'Some', 'Many', 'Few', 'Now', 'Once', 'Just',
  'Even', 'Still', 'Almost', 'Only', 'Very', 'Too', 'Much', 'Such', 'Like', 'What',
  'Where', 'Why', 'How', 'Who', 'Whom', 'Which', 'Their', 'Them', 'Its', 'Our',
  'My', 'Mine', 'Your', 'Yours', 'Me', 'Us', 'Him', 'No', 'Yes', 'Not', 'First',
  'Second', 'Last', 'Long', 'Little', 'Great', 'Good', 'Bad', 'Old', 'Young', 'New',
  'Threat', 'Ambush', 'Citadel', 'Woods', 'Shadow', 'Gathering', 'Light', 'Darkness',
  'Exhausted', 'High', 'Low', 'Forest', 'Village', 'City', 'Castle', 'River', 'Sea'
]);

const HINDI_STOP_WORDS = new Set([
  'और', 'है', 'हैं', 'था', 'थी', 'थे', 'की', 'के', 'का', 'में', 'ने', 'से', 'को', 'पर', 'यह', 'वह',
  'तो', 'भी', 'ही', 'हो', 'रहे', 'रहा', 'रही', 'गए', 'गया', 'गई', 'हुए', 'हुआ', 'हुई', 'किया',
  'किए', 'दिए', 'दिया', 'लिए', 'अपने', 'अपनी', 'अपना', 'उसके', 'उसकी', 'उसका', 'इसके', 'इसकी',
  'इसका', 'उन्हें', 'उसे', 'इसे', 'इन्हें', 'जब', 'तब', 'अब', 'सब', 'कोई', 'कुछ', 'क्या', 'क्यों',
  'कैसे', 'कहाँ', 'यहाँ', 'वहाँ', 'लेकिन', 'मगर', 'किंतु', 'परंतु', 'अगर', 'यदि', 'अध्याय', 'दृश्य',
  'बात', 'समय', 'दिन', 'रात', 'एक', 'दो', 'तीन', 'चार', 'फिर', 'साथ', 'पास', 'दूर', 'आगे', 'पीछे',
  'ऊपर', 'नीचे', 'कहा', 'बोला', 'बोली', 'सुना', 'देखा', 'जा', 'कर', 'होना', 'होने', 'वाले', 'वाली',
  'वाला', 'तरह', 'काम', 'नाम', 'जगह', 'लोग', 'लोगों', 'बहुत', 'कम', 'ज्यादा', 'सिर्फ', 'केवल',
  'कारण', 'वजह', 'बारे', 'द्वारा', 'अंदर', 'बाहर', 'सामने', 'बीच', 'तरफ', 'ओर', 'सकता', 'सकती',
  'सकते', 'सका', 'सकी', 'सके', 'चाहिए', 'पाया', 'पायी', 'पाये', 'लगता', 'लगती', 'लगते', 'लगा',
  'लगी', 'लगे', 'आया', 'आयी', 'आये', 'गया', 'गयी', 'गये', 'बैठ', 'बैठा', 'बैठी', 'बैठे', 'खड़ा',
  'खड़ी', 'खड़े', 'चल', 'चला', 'चली', 'चले', 'ले', 'लेकर', 'दे', 'देकर', 'जाकर', 'आकर', 'कहकर',
  'पूछा', 'पूछी', 'पूछे', 'बताया', 'बताई', 'बताए', 'जानता', 'जानती', 'जानते', 'समझा', 'समझी',
  'समझे', 'देख', 'सुन', 'बोल', 'रह', 'जाना', 'आना', 'लेना', 'देना', 'करना', 'कहना', 'पूछना',
  'घर', 'कमरा', 'दरवाजा', 'खिड़की', 'रास्ता', 'सड़क', 'पेड़', 'पानी', 'हवा', 'धूप', 'छांव',
  'आंखें', 'आँखें', 'हाथ', 'पैर', 'सिर', 'चेहरा', 'मन', 'दिल', 'सोच', 'आवाज', 'आवाज़', 'शब्द',
  'सुबह', 'शाम', 'दोपहर', 'आज', 'कल', 'परसों', 'साल', 'महीना', 'पल', 'क्षण', 'वर्ष',
  'नफरत', 'हमले', 'हमला', 'तलवार', 'तलवारों', 'पत्र', 'संदेश', 'मुठभेड़', 'विजय', 'मुक्ति',
  'निकाला', 'निकाली', 'निकला', 'निकली', 'तोड़ा', 'तोड़ी', 'लौट', 'लौटे', 'लड़ाई', 'षड्यंत्र',
  'ताला', 'तहखाने', 'कदम', 'सावधानी', 'हवेली', 'वीरान', 'साथियों', 'ताजा', 'पुराने', 'अध्ययन'
]);

const MOODS = [
  {
    name: 'tense',
    hindiName: 'तनावपूर्ण',
    words: [
      'danger', 'fear', 'fight', 'blood', 'threat', 'panic', 'angry', 'storm', 'weapon',
      'shadow', 'dread', 'terror', 'anxiety', 'urgent', 'screamed', 'trapped', 'escape', 'blades',
      'डर', 'भय', 'खतरा', 'आतंक', 'लड़ाई', 'खून', 'क्रोध', 'गुस्सा', 'तूफान', 'हमला',
      'तनाव', 'चीख', 'दहशत', 'घबराहट', 'हथियार', 'साया', 'साजिश', 'चेतावनी', 'कांप', 'षड्यंत्र'
    ],
  },
  {
    name: 'hopeful',
    hindiName: 'आशावादी',
    words: [
      'hope', 'light', 'smile', 'safe', 'promise', 'future', 'relief', 'dawn', 'triumph',
      'faith', 'inspire', 'courage', 'heal', 'peace', 'victory', 'dream',
      'आशा', 'उम्मीद', 'रोशनी', 'प्रकाश', 'मुस्कान', 'सुरक्षित', 'राहत', 'विश्वास', 'जीत',
      'भरोसा', 'सवेरा', 'हिम्मत', 'साहस', 'शांति', 'सफलता', 'सपना', 'मुक्ति'
    ],
  },
  {
    name: 'melancholy',
    hindiName: 'उदास',
    words: [
      'alone', 'loss', 'silence', 'tears', 'gone', 'empty', 'grief', 'sorrow', 'weeping',
      'mourn', 'pain', 'broken', 'despair', 'lonely', 'abandoned', 'heartache',
      'उदास', 'अकेला', 'दुख', 'आंसू', 'शोक', 'खाली', 'विलाप', 'दर्द', 'रोना', 'निराशा',
      'तन्हाई', 'सन्नाटा', 'वेदना', 'टूटा', 'मायूसी', 'आह'
    ],
  },
  {
    name: 'romantic',
    hindiName: 'रोमांटिक',
    words: [
      'love', 'kiss', 'heart', 'touch', 'warm', 'tender', 'passion', 'embrace', 'blush',
      'whisper', 'affection', 'beloved', 'cherish', 'desire', 'gaze',
      'प्यार', 'प्रेम', 'दिल', 'स्पर्श', 'कोमल', 'स्नेह', 'चाहत', 'अनुराग', 'आकर्षण',
      'आलिंगन', 'धड़कन', 'नजरें', 'दीवाना', 'प्रिया', 'सांसें'
    ],
  },
  {
    name: 'mysterious',
    hindiName: 'रहस्यमय',
    words: [
      'secret', 'shadow', 'unknown', 'whisper', 'hidden', 'strange', 'clue', 'puzzle',
      'enigma', 'darkness', 'fog', 'cryptic', 'unseen', 'eerie', 'curious', 'mist',
      'रहस्य', 'साया', 'छाया', 'अनजान', 'फुसफुसाहट', 'गुप्त', 'अजीब', 'पहेली', 'अंधेरा',
      'अनसुलझा', 'धुंध', 'खोया', 'भेद', 'रहस्यमय'
    ],
  },
  {
    name: 'joyful',
    hindiName: 'आनंदमय',
    words: [
      'joy', 'happy', 'laugh', 'laughter', 'celebrate', 'delight', 'cheerful', 'bright',
      'pleasure', 'merry', 'fun', 'glee', 'smile', 'excited',
      'खुशी', 'आनंद', 'हंसी', 'खिलखिलाहट', 'उत्सव', 'जश्न', 'उल्लास', 'प्रसन्न',
      'हर्ष', 'मुस्कुराहट', 'उमंग'
    ],
  },
  {
    name: 'dramatic',
    hindiName: 'नाटकीय',
    words: [
      'confrontation', 'shock', 'truth', 'reveal', 'betrayal', 'decision', 'fate', 'clash',
      'shattered', 'accuse', 'sudden', 'gasp',
      'टकराव', 'धोखा', 'विश्वासघात', 'सच्चाई', 'खुलासा', 'फैसला', 'किस्मत', 'आघात',
      'स्तब्ध', 'मोड़'
    ],
  },
  {
    name: 'calm',
    hindiName: 'शांत',
    words: [
      'quiet', 'still', 'peaceful', 'gentle', 'serene', 'tranquil', 'rest', 'breeze',
      'soft', 'whispering', 'placid',
      'शांत', 'सुकून', 'धीमा', 'मद्धम', 'स्थिर', 'आराम', 'हवा', 'शीतल', 'सहज'
    ],
  },
];

const normalizeText = (text = '') => text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

const wordCount = (text = '') => (text.match(/[\w\u0900-\u097F'-]+/g) || []).length;

const summarize = (text = '', maxSentences = 2) => {
  const sentences = text
    .trim()
    .split(SENTENCE_SPLIT)
    .map((s) => s.replace(/^[#*_\-\s]+/, '').trim())
    .filter((s) => s.length > 15);

  if (!sentences.length) return 'No summary available.';
  if (sentences.length <= maxSentences) {
    return sentences.join(' ').slice(0, 450);
  }
  const first = sentences[0];
  const mid = sentences[Math.floor(sentences.length / 2)];
  const last = sentences[sentences.length - 1];
  const combined = `${first} ${mid !== first && mid !== last ? mid : last}`.trim();
  return combined.slice(0, 450);
};

const splitIntoScenes = (rawText = '', language = 'en') => {
  const text = normalizeText(rawText);
  if (!text) return [];

  const matches = [...text.matchAll(HEADING_PATTERN)];

  // If there's an overarching book title at the start followed by chapters, ignore the book title match
  let sceneHeadings = matches;
  if (
    matches.length >= 2 &&
    matches[0].index === 0 &&
    /^#\s+/i.test(matches[0][0]) &&
    /(?:chapter|scene|अध्याय|दृश्य)/i.test(matches[1][0])
  ) {
    sceneHeadings = matches.slice(1);
  }

  if (sceneHeadings.length >= 2) {
    const scenes = [];
    for (let i = 0; i < sceneHeadings.length; i += 1) {
      const cur = sceneHeadings[i];
      const next = sceneHeadings[i + 1];

      const start = cur.index + cur[0].length;
      const end = next ? next.index : text.length;
      const rawTextPart = text.slice(start, end).trim();

      const rawHeading = (cur[1] || cur[2] || cur[3] || '').replace(/^[#\s]+/, '').trim();
      const title = rawHeading.length >= 3 && rawHeading.length <= 80
        ? rawHeading
        : deriveSceneTitle(rawTextPart, i + 1, language);

      scenes.push({
        sceneNumber: i + 1,
        title,
        summary: summarize(rawTextPart, 2),
        location: deriveLocation(rawTextPart, language),
        textRange: { start: cur.index, end },
        wordCount: wordCount(rawTextPart),
        rawText: rawTextPart,
      });
    }
    return scenes;
  }

  const parts = chunkByParagraphs(text, 700);
  let cursor = 0;
  return parts.map((part, index) => {
    const start = text.indexOf(part, cursor);
    const safeStart = start >= 0 ? start : cursor;
    const end = safeStart + part.length;
    cursor = end;

    return {
      sceneNumber: index + 1,
      title: deriveSceneTitle(part, index + 1, language),
      summary: summarize(part, 2),
      location: deriveLocation(part, language),
      textRange: { start: safeStart, end },
      wordCount: wordCount(part),
      rawText: part,
    };
  });
};

const chunkByParagraphs = (text, targetWords) => {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
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
  const isHindi = language === 'hi' || /[\u0900-\u097F]/.test(text);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const cleanHeader = line.replace(/^[#*_\-\s]+/, '').replace(/[#*_\-\s]+$/, '').trim();
    if (
      cleanHeader.length >= 4 &&
      cleanHeader.length <= 60 &&
      !cleanHeader.endsWith('.') &&
      !cleanHeader.endsWith('।') &&
      /^(chapter|scene|act|अध्याय|दृश्य|भाग|[A-Z\u0900-\u097F])/i.test(cleanHeader)
    ) {
      return cleanHeader;
    }
  }

  const sentences = text.split(SENTENCE_SPLIT).map((s) => s.trim()).filter(Boolean);
  const firstSentence = sentences[0] || '';

  if (isHindi) {
    const actionMatch = firstSentence.match(/([\u0900-\u097F]{2,})\s+(?:ने|को|का|की|के)?\s*([\u0900-\u097F\s]{4,30})/);
    if (actionMatch && actionMatch[0].length <= 50) {
      return actionMatch[0].trim();
    }
    return `दृश्य ${sceneNumber}: मुख्य घटनाक्रम`;
  }

  const enActionMatch = firstSentence.match(/([A-Z][a-z]+(?:\s+[a-z]+){2,5})/);
  if (enActionMatch && enActionMatch[1].length <= 50) {
    return enActionMatch[1].trim();
  }

  return `Scene ${sceneNumber}: Narrative Beat`;
};

const deriveLocation = (text, language = 'en') => {
  const isHindi = language === 'hi' || /[\u0900-\u097F]/.test(text);
  if (isHindi) {
    const match = text.match(/(?:में|पर|के पास|के अंदर|के बाहर)\s+([\u0900-\u097F]{2,20})/);
    return match ? match[1].trim() : 'कहानी का परिवेश';
  }
  const match = text.match(/\b(?:in|at|inside|outside|near|into)\s+the\s+([A-Za-z][A-Za-z\s'-]{2,30})/i);
  return match ? match[1].trim().replace(/[,.!?].*$/, '') : 'Story Setting';
};

const extractCandidateNames = (text = '', language = 'en') => {
  const counts = new Map();
  const isHindi = language === 'hi' || /[\u0900-\u097F]/.test(text);

  if (isHindi) {
    const tokens = text.split(/[\s।॥!?.,;:—"'\(\)]+/).filter(Boolean);

    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (HINDI_STOP_WORDS.has(token) || token.length < 2) continue;

      const prevToken = i > 0 ? tokens[i - 1] : '';
      const nextToken = i < tokens.length - 1 ? tokens[i + 1] : '';

      let score = 0;
      if (HINDI_TITLES.has(prevToken)) score += 5;
      if (HINDI_POSTPOSITIONS.has(nextToken)) score += 3;
      if (HINDI_SPEECH_TAGS.has(nextToken)) score += 4;

      // Check 2-word name like "दुर्जन सिंह"
      if (i < tokens.length - 1) {
        const nextNextToken = i < tokens.length - 2 ? tokens[i + 2] : '';
        const twoWordCandidate = `${token} ${nextToken}`;
        if (
          !HINDI_STOP_WORDS.has(nextToken) &&
          (HINDI_POSTPOSITIONS.has(nextNextToken) || HINDI_SPEECH_TAGS.has(nextNextToken))
        ) {
          counts.set(twoWordCandidate, (counts.get(twoWordCandidate) || 0) + 5);
        }
      }

      if (score > 0) {
        counts.set(token, (counts.get(token) || 0) + score);
      }
    }

    // Merge single words that are already represented in multi-word names (e.g. "दुर्जन सिंह" vs "सिंह")
    const names = [...counts.keys()];
    const multiWordNames = names.filter((n) => n.includes(' '));
    for (const multi of multiWordNames) {
      const parts = multi.split(' ');
      for (const part of parts) {
        if (counts.has(part)) {
          counts.delete(part);
        }
      }
    }
  } else {
    const sentences = text.split(/(?<=[.!?])\s+/);

    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);
      for (let i = 0; i < words.length; i += 1) {
        const rawWord = words[i].replace(/[^A-Za-z]/g, '');
        if (!rawWord || STOP_NAMES.has(rawWord) || rawWord.length < 2) continue;

        const isSentenceStart = (i === 0);
        const prevWord = i > 0 ? words[i - 1].replace(/[^A-Za-z]/g, '').toLowerCase() : '';
        const hasTitle = ENGLISH_TITLES.has(prevWord);
        const nextWord = i < words.length - 1 ? words[i + 1].replace(/[^A-Za-z]/g, '').toLowerCase() : '';
        const followedBySpeech = ['said', 'replied', 'whispered', 'asked', 'shouted', 'thought', 'cried'].includes(nextWord);

        // Check two-word names like "Master Bryan" or "Commander Vane"
        if (hasTitle && /^[A-Z][a-z]+$/.test(rawWord)) {
          counts.set(rawWord, (counts.get(rawWord) || 0) + 5);
          continue;
        }

        if (/^[A-Z][a-z]+$/.test(rawWord)) {
          let score = 0;
          if (followedBySpeech) score += 4;
          if (!isSentenceStart) score += 3;
          else score += 1;

          if (score > 0) {
            counts.set(rawWord, (counts.get(rawWord) || 0) + score);
          }
        }
      }
    }
  }

  const sortedCandidates = [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, count]) => ({ name, count }));

  return sortedCandidates;
};

const classifyRole = (index, total, name = '', text = '') => {
  if (index === 0) return 'protagonist';

  // Check if character is portrayed with conflict/antagonist cues
  const lower = (text || '').toLowerCase();
  const charLower = (name || '').toLowerCase();
  const antagonistCues = [
    'enemy', 'rival', 'evil', 'villain', 'shadow', 'threat', 'ruthless', 'sneered', 'traitor', 'betray',
    'दुश्मन', 'शत्रु', 'षड्यंत्र', 'नफरत', 'आतंक', 'राक्षस', 'क्रूर'
  ];

  const hasAntagonistCue = antagonistCues.some((cue) => {
    return lower.includes(`${charLower} ${cue}`) || lower.includes(`${cue} ${charLower}`) || lower.includes(`${charLower} ने नफरत`);
  });

  if (hasAntagonistCue) return 'antagonist';
  if (total >= 2 && index === 1) return 'antagonist';
  return 'supporting';
};

const traitsForName = (name, text, language = 'en') => {
  const isHindi = language === 'hi' || /[\u0900-\u097F]/.test(name);
  if (isHindi) {
    const traits = [];
    if (text.includes(`${name} ने कहा`) || text.includes(`${name} बोला`) || text.includes(`${name} बोली`)) traits.push('मुखर');
    if (text.includes(`${name} भागा`) || text.includes(`${name} लड़ा`) || text.includes(`${name} दौड़ा`)) traits.push('साहसी');
    if (text.includes(`${name} ने सोचा`) || text.includes(`${name} समझा`)) traits.push('विचारशील');
    if (text.includes(`${name} मुस्कुराया`) || text.includes(`${name} हंसी`)) traits.push('दयालु');
    if (text.includes(`${name} रोया`) || text.includes(`${name} दुखी`)) traits.push('भावुक');
    if (text.includes(`${name} ने नफरत`) || text.includes(`${name} चिल्लाया`)) traits.push('आक्रामक');
    return traits.length ? traits : ['महत्वपूर्ण पात्र', 'सक्रिय'];
  }

  const lower = text.toLowerCase();
  const charLower = name.toLowerCase();
  const traits = [];
  if (lower.includes(`${charLower} said`) || lower.includes(`${charLower} replied`)) traits.push('articulate');
  if (lower.includes(`${charLower} ran`) || lower.includes(`${charLower} fought`)) traits.push('resilient');
  if (lower.includes(`${charLower} thought`) || lower.includes(`${charLower} wondered`)) traits.push('reflective');
  if (lower.includes(`${charLower} smiled`) || lower.includes(`${charLower} laughed`)) traits.push('compassionate');
  if (lower.includes(`${charLower} screamed`) || lower.includes(`${charLower} feared`)) traits.push('vulnerable');
  if (lower.includes(`${charLower} sneered`) || lower.includes(`${charLower} struck`)) traits.push('ruthless');
  return traits.length ? traits : ['key figure', 'active'];
};

const moodForScene = (text = '', language = 'en') => {
  const lower = text.toLowerCase();
  const isHindi = language === 'hi' || /[\u0900-\u097F]/.test(text);

  const scored = MOODS.map((mood) => {
    let score = 0;
    for (const word of mood.words) {
      if (lower.includes(word.toLowerCase())) {
        score += 1;
      }
    }
    return { mood, score };
  }).sort((a, b) => b.score - a.score);

  const winner = scored[0];
  const runnerUp = scored[1];
  const totalScore = scored.reduce((sum, s) => sum + s.score, 0);

  const exclamationCount = (text.match(/!/g) || []).length;
  const questionCount = (text.match(/\?/g) || []).length;
  const intensityBoost = Math.min(0.35, (exclamationCount * 0.05) + (questionCount * 0.03));
  const rawIntensity = totalScore > 0 ? (winner.score / Math.max(1, totalScore)) * 0.65 + 0.25 : 0.4;
  const intensity = Math.min(1.0, Math.max(0.2, Number((rawIntensity + intensityBoost).toFixed(2))));

  let primaryMood = winner.score > 0 ? (isHindi ? winner.mood.hindiName : winner.mood.name) : (isHindi ? 'शांत' : 'calm');

  if (winner.score > 0 && runnerUp.score >= 2) {
    if (isHindi) {
      primaryMood = `${winner.mood.hindiName} और ${runnerUp.mood.hindiName}`;
    } else {
      primaryMood = `${winner.mood.name} & ${runnerUp.mood.name}`;
    }
  }

  const getScore = (moodName) => {
    const item = scored.find((s) => s.mood.name === moodName);
    if (!item || item.score === 0) return 0.15;
    return Number(Math.min(1.0, Math.max(0.2, (item.score / Math.max(1, winner.score)) * intensity)).toFixed(2));
  };

  return {
    primaryMood,
    intensity,
    emotionScores: {
      joy: getScore('joyful') || getScore('hopeful'),
      tension: getScore('tense'),
      sadness: getScore('melancholy'),
      mystery: getScore('mysterious'),
      romantic: getScore('romantic'),
    },
  };
};

const relationTypeForPair = (text = '') => {
  const lower = text.toLowerCase();
  if (lower.includes('love') || lower.includes('kiss') || lower.includes('embrace') || lower.includes('प्यार') || lower.includes('प्रेम') || lower.includes('स्नेह') || lower.includes('चाहत')) return 'romantic';
  if (lower.includes('father') || lower.includes('mother') || lower.includes('brother') || lower.includes('sister') || lower.includes('son') || lower.includes('daughter') || lower.includes('पिता') || lower.includes('माता') || lower.includes('मां') || lower.includes('भाई') || lower.includes('बहन') || lower.includes('परिवार') || lower.includes('बेटा') || lower.includes('बेटी')) return 'family';
  if (lower.includes('enemy') || lower.includes('rival') || lower.includes('fight') || lower.includes('hate') || lower.includes('betray') || lower.includes('sneered') || lower.includes('दुश्मन') || lower.includes('शत्रु') || lower.includes('प्रतिद्वंद्वी') || lower.includes('लड़ाई') || lower.includes('नफरत') || lower.includes('धोखा') || lower.includes('षड्यंत्र')) return 'rival';
  if (lower.includes('teacher') || lower.includes('mentor') || lower.includes('guide') || lower.includes('master') || lower.includes('guru') || lower.includes('गुरु') || lower.includes('शिक्षक') || lower.includes('उस्ताद') || lower.includes('मार्गदर्शक')) return 'mentor';
  if (lower.includes('friend') || lower.includes('together') || lower.includes('partner') || lower.includes('trust') || lower.includes('दोस्त') || lower.includes('मित्र') || lower.includes('साथी') || lower.includes('सखा') || lower.includes('विश्वास')) return 'ally';
  return 'other';
};

const sentimentForText = (text = '') => {
  const lower = text.toLowerCase();
  const positiveWords = ['smile', 'hope', 'friend', 'love', 'safe', 'laugh', 'trust', 'help', 'warm', 'compassion', 'मुस्कान', 'आशा', 'उम्मीद', 'दोस्त', 'प्यार', 'प्रेम', 'सुरक्षित', 'हंसी', 'खुशी', 'मदद', 'विश्वास'];
  const negativeWords = ['fear', 'angry', 'enemy', 'fight', 'blood', 'hate', 'betray', 'kill', 'threat', 'sneered', 'poisoned', 'डर', 'भय', 'गुस्सा', 'क्रोध', 'दुश्मन', 'लड़ाई', 'खून', 'नफरत', 'उदास', 'दुख', 'धोखा', 'षड्यंत्र'];

  const positive = positiveWords.filter((word) => lower.includes(word)).length;
  const negative = negativeWords.filter((word) => lower.includes(word)).length;

  if (positive === 0 && negative === 0) return 0.1;
  const diff = positive - negative;
  return Number(Math.max(-1.0, Math.min(1.0, diff / Math.max(1, positive + negative))).toFixed(2));
};

const computeNarrativeDevelopment = (sceneIndex, totalScenes, scene, language = 'en') => {
  const isHindi = language === 'hi' || /[\u0900-\u097F]/.test(scene?.rawText || scene?.summary || '');
  const progress = totalScenes > 1 ? sceneIndex / (totalScenes - 1) : 0;

  if (progress <= 0.15) {
    return isHindi
      ? `प्रारंभिक परिस्थिति (Exposition) - पात्रों और कहानी के परिवेश का परिचय; सामान्य जीवन का चित्रण।`
      : `Exposition - Introduces key characters and the baseline status quo before the disruption.`;
  }
  if (progress <= 0.35) {
    return isHindi
      ? `प्रेरक प्रसंग (Inciting Incident) - एक नई चुनौती या घटना जो कहानी में हलचल और संघर्ष की शुरुआत करती है।`
      : `Inciting Incident - A catalyst sparks the narrative conflict and obligates characters to act.`;
  }
  if (progress <= 0.60) {
    return isHindi
      ? `बढ़ता तनाव (Rising Action) - बाधाओं और रहस्यों का गहराना; पात्रों के बीच टकराव और जटिलता बढ़ती है।`
      : `Rising Action - Complications multiply, stakes rise, and character relationships are tested.`;
  }
  if (progress <= 0.75) {
    return isHindi
      ? `निर्णायक मोड़ (Midpoint / Turning Point) - कहानी में नया मोड़ आता है जहां पुरानी योजनाएं बदल जाती हैं।`
      : `Turning Point - A critical revelation or setback permanently shifts the trajectory of the plot.`;
  }
  if (progress <= 0.90) {
    return isHindi
      ? `चरमोत्कर्ष (Climax) - कहानी का सबसे गहन और निर्णायक क्षण जहाँ अंतिम टकराव या मुख्य रहस्य सामने आता है।`
      : `Climax - The highest point of narrative tension and decisive confrontation between opposing forces.`;
  }
  return isHindi
    ? `समाधान (Resolution) - संघर्ष का समापन, रहस्यों का खुलासा और पात्रों की नई स्थिति का निर्धारण।`
    : `Resolution - The aftermath of the climax unfolds, settling unanswered questions and emotional arcs.`;
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
  computeNarrativeDevelopment,
  deriveSceneTitle,
  deriveLocation,
};
