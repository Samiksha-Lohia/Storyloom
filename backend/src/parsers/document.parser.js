import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import zlib from 'zlib';
import { downloadFile } from '../services/storage.service.js';
import { BadRequestError } from '../utilities/custom-errors.js';

function decodeAscii85(input) {
  let cleanInput = input.trim();
  if (cleanInput.startsWith('<~')) cleanInput = cleanInput.slice(2);
  if (cleanInput.endsWith('~>')) cleanInput = cleanInput.slice(0, -2);
  cleanInput = cleanInput.replace(/\s/g, '');

  const out = [];
  let i = 0;
  while (i < cleanInput.length) {
    const c = cleanInput[i];
    if (c === 'z') {
      out.push(0, 0, 0, 0);
      i++;
      continue;
    }
    let count = 0;
    const chars = [];
    while (count < 5 && i < cleanInput.length) {
      const code = cleanInput.charCodeAt(i);
      if (code >= 33 && code <= 117) {
        chars.push(code - 33);
        count++;
      }
      i++;
    }
    if (count === 0) break;
    const padding = 5 - count;
    for (let p = 0; p < padding; p++) {
      chars.push(84);
    }
    let val = 0;
    for (let j = 0; j < 5; j++) {
      val = val * 85 + chars[j];
    }
    const bytesToWrite = 4 - padding;
    if (bytesToWrite >= 1) out.push((val >> 24) & 255);
    if (bytesToWrite >= 2) out.push((val >> 16) & 255);
    if (bytesToWrite >= 3) out.push((val >> 8) & 255);
    if (bytesToWrite >= 4) out.push(val & 255);
  }
  return Buffer.from(out);
}

function extractTextFromContentStream(streamBuffer) {
  const text = streamBuffer.toString('binary');
  const matches = [];
  let inString = false;
  let currentString = '';
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (char === '(' && !inString) {
      inString = true;
      currentString = '';
    } else if (char === ')' && inString) {
      let escapeCount = 0;
      let k = i - 1;
      while (k >= 0 && text[k] === '\\') {
        escapeCount++;
        k--;
      }
      if (escapeCount % 2 === 0) {
        inString = false;
        matches.push(currentString);
      } else {
        currentString += char;
      }
    } else if (inString) {
      currentString += char;
    }
    i++;
  }
  return matches.map(str => {
    let unescaped = str
      .replace(/\\([\(\)\\])/g, '$1')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\b/g, '\b')
      .replace(/\\f/g, '\f');
      
    unescaped = unescaped.replace(/\\([0-7]{1,3})/g, (match, octalStr) => {
      const code = parseInt(octalStr, 8);
      if (code === 147 || code === 0o223) return '“';
      if (code === 148 || code === 0o224) return '”';
      if (code === 145 || code === 0o221) return '‘';
      if (code === 146 || code === 0o222) return '’';
      return String.fromCharCode(code);
    });
    
    return unescaped;
  }).join(' ');
}

const parsePdfFallback = (buffer) => {
  const text = buffer.toString('binary');
  let extractedText = '';
  
  let streamIdx = 0;
  while ((streamIdx = text.indexOf('stream', streamIdx)) !== -1) {
    const postChar = text[streamIdx + 6];
    const postChar2 = text[streamIdx + 7];
    if (postChar !== '\n' && postChar !== '\r' && postChar2 !== '\n') {
      streamIdx += 6;
      continue;
    }
    
    const streamStart = text[streamIdx + 6] === '\r' ? streamIdx + 8 : streamIdx + 7;
    const dictEnd = text.lastIndexOf('>>', streamIdx);
    const dictStart = text.lastIndexOf('<<', dictEnd);
    if (dictStart === -1 || dictEnd === -1 || dictStart > dictEnd) {
      streamIdx += 6;
      continue;
    }
    
    const dictText = text.slice(dictStart, dictEnd + 2);
    
    if (
      dictText.includes('/Type /Metadata') ||
      dictText.includes('/Type/Metadata') ||
      dictText.includes('/Type /XRef') ||
      dictText.includes('/Type/XRef') ||
      dictText.includes('/Type /Font') ||
      dictText.includes('/Type/Font') ||
      dictText.includes('/Subtype /Image') ||
      dictText.includes('/Subtype/Image') ||
      dictText.includes('/Subtype /XML') ||
      dictText.includes('/Subtype/XML') ||
      dictText.includes('/Subtype /c2pa') ||
      dictText.includes('/Subtype/c2pa') ||
      dictText.includes('c2pa') ||
      dictText.includes('/Filter /DCTDecode') ||
      dictText.includes('/Filter/DCTDecode') ||
      dictText.includes('/Filter /JPXDecode') ||
      dictText.includes('/Filter/JPXDecode')
    ) {
      streamIdx = streamStart + length;
      continue;
    }

    const filterMatch = dictText.match(/\/Filter\s*(?:\[([^\]]+)\]|\/([A-Za-z0-9]+))/);
    const lengthMatch = dictText.match(/\/Length\s+(\d+)/);
    
    let length = lengthMatch ? parseInt(lengthMatch[1], 10) : null;
    let endstreamIdx = text.indexOf('endstream', streamStart);
    if (endstreamIdx === -1) {
      streamIdx += 6;
      continue;
    }
    
    if (length === null) {
      length = endstreamIdx - streamStart;
    }
    
    let streamBuffer = buffer.slice(streamStart, streamStart + length);
    let filters = [];
    if (filterMatch) {
      if (filterMatch[1]) {
        filters = filterMatch[1].split(/\s+/).filter(Boolean).map(f => f.replace(/^\//, ''));
      } else if (filterMatch[2]) {
        filters = [filterMatch[2]];
      }
    }
    
    try {
      for (const filter of filters) {
        if (filter === 'ASCII85Decode' || filter === 'ASCII85' || filter === 'A85') {
          streamBuffer = decodeAscii85(streamBuffer.toString('binary'));
        } else if (filter === 'FlateDecode' || filter === 'Fl') {
          streamBuffer = zlib.inflateSync(streamBuffer);
        }
      }
      
      const streamText = extractTextFromContentStream(streamBuffer);
      if (streamText.trim()) {
        extractedText += streamText + '\n';
      }
    } catch (err) {
    }
    
    streamIdx = streamStart + length;
  }
  
  const cleanExtracted = extractedText
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    .replace(/jumd(?:cbor|c2cl)[^\n]*\n?/gi, '')
    .trim();

  if (!cleanExtracted) {
    throw new Error('Fallback PDF parsing extracted no text.');
  }
  
  return cleanExtracted;
};

const parseTxt = async (source) => {
  if (Buffer.isBuffer(source)) {
    return source.toString('utf8');
  }
  return fs.readFile(source, 'utf8');
};

const parseDocx = async (source) => {
  if (Buffer.isBuffer(source)) {
    const result = await mammoth.extractRawText({ buffer: source });
    return result.value;
  }
  const result = await mammoth.extractRawText({ path: source });
  return result.value;
};

const parsePdf = async (source) => {
  const buffer = Buffer.isBuffer(source) ? source : await fs.readFile(source);
  try {
    const result = await pdfParse(buffer);
    return result.text;
  } catch (err) {
    try {
      return parsePdfFallback(buffer);
    } catch (fallbackErr) {
      throw err;
    }
  }
};

const parseDocumentFile = async (storageUrl, fileType) => {
  let source;

  if (storageUrl.startsWith('http://') || storageUrl.startsWith('https://')) {
    const url = new URL(storageUrl);
    const storageKey = decodeURIComponent(url.pathname.slice(1));
    source = await downloadFile(storageKey);
  } else {
    source = path.resolve(storageUrl);
  }

  if (fileType === 'txt') return parseTxt(source);
  if (fileType === 'docx') return parseDocx(source);
  if (fileType === 'pdf') return parsePdf(source);

  throw new BadRequestError(`Unsupported file type: ${fileType}`);
};

export { parseDocumentFile };
