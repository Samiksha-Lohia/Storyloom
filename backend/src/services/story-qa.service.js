import Scene from '../models/scene.model.js';
import Document from '../models/document.model.js';
import Character from '../models/character.model.js';
import DialogueSummary from '../models/dialogue-summary.model.js';
import { generateJSON } from './ai-provider.service.js';
import { resolveStoryLanguage, getAnalysisLanguageInstruction } from '../utilities/language.helper.js';
import logger from '../utilities/logger.js';

const COMMON_STOPWORDS = new Set([
  // English stopwords
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'of', 'to', 'for', 'with', 'about',
  'by', 'what', 'who', 'whom', 'where', 'when', 'why', 'how', 'did', 'does', 'do', 'was', 'were',
  'are', 'been', 'being', 'have', 'has', 'had', 'that', 'this', 'these', 'those', 'there', 'their',
  'they', 'he', 'she', 'it', 'his', 'her', 'its', 'them', 'him', 'tell', 'me', 'us', 'you', 'your',
  'story', 'book', 'scene', 'chapter', 'author',
  // Hindi stopwords
  'का', 'के', 'की', 'को', 'ने', 'से', 'में', 'पर', 'है', 'हैं', 'था', 'थे', 'थी', 'थीं', 'हो', 'होगा',
  'होगी', 'होंगे', 'और', 'या', 'कि', 'तो', 'भी', 'ही', 'यह', 'वह', 'ये', 'वे', 'इस', 'उस', 'इन',
  'उन', 'कौन', 'क्या', 'कहाँ', 'कब', 'क्यों', 'कैसे', 'किसे', 'किसने', 'किस', 'मुझे', 'हमें', 'उसे',
  'उन्हें', 'कहानी', 'दृश्य', 'किताब'
]);

const extractSearchTokens = (text = '') => {
  const words = text
    .toLowerCase()
    .replace(/[^\w\u0900-\u097F\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !COMMON_STOPWORDS.has(w));
  return Array.from(new Set(words));
};

const scoreParagraphRelevance = (paragraph, tokens, characterNames, questionLower) => {
  if (!paragraph || paragraph.length < 5) return 0;
  const pLower = paragraph.toLowerCase();
  let score = 0;

  // Exact phrase match bonus
  if (questionLower.length > 5 && pLower.includes(questionLower)) {
    score += 20;
  }

  // Question token matches
  for (const token of tokens) {
    if (pLower.includes(token)) {
      score += 3;
    }
  }

  // Character name matches
  for (const name of characterNames) {
    if (pLower.includes(name.toLowerCase())) {
      score += 5;
    }
  }

  return score;
};

export async function answerStoryQuestion({
  documentId,
  question,
  history = [],
  maxVisibleSceneNumber = null,
  book = null,
  role = null,
}) {
  const trimmedQuestion = question?.trim() || '';
  if (!trimmedQuestion) {
    return { answer: 'Please provide a question about the story.' };
  }

  // 1. Fetch all raw data for the document with complete text
  const [allScenes, document, characters, dialogueSummaries] = await Promise.all([
    Scene.find({ documentId }).select('+rawText').sort({ sceneNumber: 1 }).lean(),
    Document.findById(documentId).select('+parsedText').lean().catch(() => null),
    Character.find({ documentId }).lean().catch(() => []),
    DialogueSummary.find({ documentId }).lean().catch(() => []),
  ]);

  // 2. Enforce spoiler boundary if reader has a viewing limit
  let visibleScenes = Array.isArray(allScenes) ? [...allScenes] : [];
  if (maxVisibleSceneNumber !== null && Number.isInteger(maxVisibleSceneNumber)) {
    visibleScenes = visibleScenes.filter((s) => s.sceneNumber <= maxVisibleSceneNumber);
  }

  // 3. Fallback text hydration: Ensure every scene has actual text
  const parsedText = document?.parsedText || '';
  for (const scene of visibleScenes) {
    if (!scene.rawText || scene.rawText.trim().length === 0) {
      if (parsedText && scene.textRange?.start !== undefined && typeof scene.textRange?.end === 'number') {
        scene.rawText = parsedText.slice(scene.textRange.start, scene.textRange.end).trim();
      } else {
        scene.rawText = scene.summary || '';
      }
    }
  }

  // 3b. Fallback for existing unsegmented stories: If visibleScenes is empty but document has parsedText, chunk it!
  if (visibleScenes.length === 0 && parsedText && parsedText.trim()) {
    const rawChunks = parsedText.split(/\n{2,}|\r?\n/);
    let currentChunk = '';
    let chunkIndex = 1;
    for (const chunk of rawChunks) {
      if ((currentChunk + '\n' + chunk).length > 2500) {
        if (currentChunk.trim()) {
          visibleScenes.push({
            sceneNumber: chunkIndex++,
            title: `Section ${chunkIndex - 1}`,
            rawText: currentChunk.trim(),
            summary: currentChunk.trim().slice(0, 200),
          });
        }
        currentChunk = chunk;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + chunk;
      }
    }
    if (currentChunk.trim()) {
      visibleScenes.push({
        sceneNumber: chunkIndex,
        title: `Section ${chunkIndex}`,
        rawText: currentChunk.trim(),
        summary: currentChunk.trim().slice(0, 200),
      });
    }
  }

  // 4. Line-by-line RAG scoring
  const tokens = extractSearchTokens(trimmedQuestion);
  const characterNames = characters.map((c) => c.name).filter(Boolean);
  const questionLower = trimmedQuestion.toLowerCase();

  const scoredParagraphs = [];
  const sceneRelevanceScores = new Map();

  for (const scene of visibleScenes) {
    const sceneText = scene.rawText || '';
    const paragraphs = sceneText
      .split(/\n{2,}|\r?\n|\.\s+(?=[A-Z\u0900-\u097F])/)
      .map((p) => p.trim())
      .filter((p) => p.length > 20);

    let sceneTotalScore = 0;

    for (const para of paragraphs) {
      const score = scoreParagraphRelevance(para, tokens, characterNames, questionLower);
      if (score > 0) {
        sceneTotalScore += score;
        scoredParagraphs.push({
          sceneNumber: scene.sceneNumber,
          sceneTitle: scene.title,
          text: para,
          score,
        });
      }
    }

    sceneRelevanceScores.set(scene.sceneNumber, sceneTotalScore);
  }

  // Sort paragraphs by relevance score descending
  scoredParagraphs.sort((a, b) => b.score - a.score);
  const topParagraphs = scoredParagraphs.slice(0, 10);

  // 5. Build scene-by-scene context with text
  // Calculate total raw text length of all visible scenes
  const totalRawLength = visibleScenes.reduce((sum, s) => sum + (s.rawText?.length || 0), 0);
  const canFitAllScenesVerbatim = totalRawLength <= 45000;

  const scenesTimeline = visibleScenes
    .map((s) => {
      const charNamesInScene = (s.characterIds || [])
        .map((id) => {
          const found = characters.find((c) => c._id?.toString() === id?.toString());
          return found ? found.name : null;
        })
        .filter(Boolean)
        .join(', ');

      const sceneScore = sceneRelevanceScores.get(s.sceneNumber) || 0;
      let textPortion = '';

      if (canFitAllScenesVerbatim) {
        textPortion = s.rawText ? `\n\nFull Scene Narrative:\n${s.rawText}` : '';
      } else if (sceneScore > 0 || topParagraphs.some((p) => p.sceneNumber === s.sceneNumber)) {
        // High-relevance scene: include full text up to 2500 chars
        textPortion = s.rawText ? `\n\nVerbatim Narrative (Relevance Score: ${sceneScore}):\n${s.rawText.slice(0, 2500)}` : '';
      } else {
        // Lower-relevance scene: include opening excerpt
        textPortion = s.rawText ? `\n\nExcerpt: ${s.rawText.slice(0, 450).replace(/\n+/g, ' ')}...` : '';
      }

      return `[Scene ${s.sceneNumber}: "${s.title}"]
Setting / Location: ${s.location || 'Unspecified'}
Characters Present: ${charNamesInScene || 'Not explicitly indexed'}
Summary: ${s.summary || 'No summary'} ${textPortion}`;
    })
    .join('\n\n========================================\n\n');

  // 6. Character Roster Context
  const charactersContext = characters
    .map((c) => `- ${c.name} (${c.role}): ${c.description || ''} | Traits: ${(c.traits || []).join(', ')} | Arc: ${c.arcSummary || ''}`)
    .join('\n');

  // 7. Dialogue Context
  const relevantDialogue = dialogueSummaries
    .filter((d) => {
      if (maxVisibleSceneNumber !== null && d.sceneNumber > maxVisibleSceneNumber) return false;
      return true;
    })
    .slice(0, 8)
    .map((d) => `[Scene ${d.sceneNumber} Dialogue]: ${d.summaryText} | Key Quotes: ${(d.keyQuotes || []).join(' | ')}`)
    .join('\n');

  // 8. Relevant Direct Verbatim Excerpts
  const excerptsSection = topParagraphs.length
    ? topParagraphs
        .map((p) => `[From Scene ${p.sceneNumber}: "${p.sceneTitle}"]:\n"${p.text}"`)
        .join('\n\n')
    : '';

  // 9. Language Resolution
  const detectedLang = await resolveStoryLanguage(documentId);
  const isDevanagari = /[\u0900-\u097F]/.test(trimmedQuestion) || /[\u0900-\u097F]/.test(parsedText);
  const language = isDevanagari || detectedLang === 'hi' ? 'hi' : 'en';
  const langInstruction = getAnalysisLanguageInstruction(language);

  // 10. History Formatting
  let historyBlock = '';
  if (Array.isArray(history) && history.length > 0) {
    const recentHistory = history
      .filter((h) => h && h.content && !h.isError)
      .slice(-4)
      .map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
      .join('\n');
    if (recentHistory) {
      historyBlock = `\nRecent Conversation History:\n${recentHistory}\n`;
    }
  }

  // 11. Spoiler Boundary Instruction
  const spoilerInstruction =
    maxVisibleSceneNumber !== null
      ? `CRITICAL SPOILER CONSTRAINT: The reader has only reached Scene ${maxVisibleSceneNumber}. You MUST NOT reveal or mention any plot twists, character deaths, reveals, or events that take place after Scene ${maxVisibleSceneNumber}. If the question asks about events beyond Scene ${maxVisibleSceneNumber}, explicitly inform the user that this occurs later in the story and cannot be revealed yet.`
      : '';

  // 12. Ironclad System Prompt
  const prompt = `You are the official Storyloom Narrative Analysis Engine. Your job is to answer the user's question with 100% FACTUAL FIDELITY based EXCLUSIVELY on the story manuscript text and scene progression provided below.

CRITICAL INSTRUCTIONS - ZERO ASSUMPTIONS:
1. ZERO HALLUCINATIONS / SPECULATION: Base your response ONLY on what is explicitly written and documented in the provided story text and scene details. Absolutely DO NOT speculate, assume, extrapolate, or invent character motives, backstories, or events that are not explicitly in the text.
2. THOROUGH LINE-BY-LINE EVALUATION: Carefully evaluate the narrative across all scenes. Cite the specific scenes (e.g., "In Scene 1...", "In Scene 3...") and refer directly to the actual actions, dialogues, and occurrences.
3. UNMENTIONED INFORMATION: If the question asks about something that is NOT mentioned, explained, or addressed in the provided story text, you MUST clearly state: "Based on the text of the story, this is not mentioned or specified." Never invent an answer to fill gaps.
4. SYNTHESIZE ACROSS SCENES: If a character or event appears across multiple scenes, trace their actions across the entire timeline to provide a comprehensive, accurate answer.
${spoilerInstruction ? `\n${spoilerInstruction}\n` : ''}
${langInstruction ? `\nLANGUAGE INSTRUCTION:\n${langInstruction}\n` : ''}

${historyBlock}
Characters in the Story:
${charactersContext || 'No character profiles recorded.'}

${relevantDialogue ? `Key Dialogue Records:\n${relevantDialogue}\n` : ''}
${excerptsSection ? `Key Verbatim Passages Matching Query (Line-by-Line Excerpts):\n${excerptsSection}\n` : ''}

Complete Story Breakdown & Narrative Text:
${scenesTimeline || 'No scene details recorded.'}

User Question:
${trimmedQuestion}

Return your response as a JSON object:
{
  "answer": "A factual, detailed, grounded answer based strictly on the text of the story, citing the relevant scenes and actions."
}`;

  try {
    const responseObj = await generateJSON(prompt, null, 'continuity');
    if (responseObj && responseObj.answer && responseObj.answer.trim()) {
      return { answer: responseObj.answer.trim() };
    }
  } catch (err) {
    logger.warn(`AI model call failed during story Q&A (${err.message}). Using grounded excerpt synthesis.`);
  }

  // 13. Deterministic Grounded Fallback if AI provider is temporarily unavailable
  if (topParagraphs.length > 0) {
    const bestPara = topParagraphs[0];
    const bestScene = visibleScenes.find((s) => s.sceneNumber === bestPara.sceneNumber);
    const sceneSummary = bestScene ? ` (Scene ${bestScene.sceneNumber}: "${bestScene.title}")` : '';

    const isHi = language === 'hi';
    const fallbackAnswer = isHi
      ? `कहानी के अनुसार${sceneSummary}:\n"${bestPara.text}"\n\n${bestScene?.summary ? `इस दृश्य में: ${bestScene.summary}` : ''}`
      : `According to the story${sceneSummary}:\n"${bestPara.text}"\n\n${bestScene?.summary ? `Context: ${bestScene.summary}` : ''}`;

    return { answer: fallbackAnswer.trim() };
  }

  const defaultMsg = language === 'hi'
    ? 'प्रदान की गई कहानी के आधार पर, यह जानकारी कहानी में स्पष्ट रूप से उल्लेखित नहीं है।'
    : 'Based on the provided story text, this information is not mentioned or specified.';

  return { answer: defaultMsg };
}

export default {
  answerStoryQuestion,
};
