/**
 * Paginator Service
 * Pure functions for manuscript pagination and page offset lookups.
 * No I/O, deterministic, UTF-16 code-unit consistent.
 */

const DEFAULT_TARGET_CHARS = 1800;

/**
 * Paginates text into an array of starting character offsets for each page.
 *
 * Rules:
 * 1. Offsets are UTF-16 string indices into text.
 * 2. First offset is always 0 (for non-empty text). Empty text returns [].
 * 3. Break preference order:
 *    a) Paragraph boundaries (\r?\n\s*\r?\n+)
 *    b) Sentence boundaries ([.!?]["'”’»)]?\s+)
 *    c) Whitespace boundaries (\s+)
 *    d) Hard boundary fallback only if no whitespace exists (never mid-word otherwise).
 * 4. Offsets are strictly increasing.
 * 5. Concatenating sliceForPage for all pages reproduces the original text identically.
 *
 * @param {string} text - The full parsed manuscript text
 * @param {number} [targetChars=1800] - Desired characters per page
 * @returns {number[]} Array of start character offsets (0-indexed)
 */
export function paginate(text, targetChars = DEFAULT_TARGET_CHARS) {
  if (!text || typeof text !== 'string' || text.length === 0) {
    return [];
  }

  const length = text.length;
  if (length <= targetChars) {
    return [0];
  }

  const pageOffsets = [0];
  let currentStart = 0;

  while (currentStart < length) {
    const idealEnd = currentStart + targetChars;

    if (idealEnd >= length) {
      break;
    }

    // Search window bounds
    const minTarget = Math.max(currentStart + 1, currentStart + Math.floor(targetChars * 0.5));
    const maxTarget = Math.min(length, currentStart + Math.floor(targetChars * 1.3));

    let splitPoint = -1;

    // 1. Check for Paragraph Breaks (\r?\n\s*\r?\n+)
    const paraRegex = /\r?\n[ \t]*\r?\n+/g;
    paraRegex.lastIndex = minTarget;
    let match;
    let bestParaDiff = Infinity;

    while ((match = paraRegex.exec(text)) !== null) {
      const breakEnd = match.index + match[0].length;
      if (breakEnd > maxTarget) {
        // If first match is beyond maxTarget and we haven't found any, check if it's reasonable
        if (splitPoint === -1 && breakEnd <= currentStart + Math.floor(targetChars * 1.5)) {
          splitPoint = breakEnd;
        }
        break;
      }
      if (breakEnd > currentStart) {
        const diff = Math.abs(breakEnd - idealEnd);
        if (diff < bestParaDiff) {
          bestParaDiff = diff;
          splitPoint = breakEnd;
        }
      }
    }

    // 2. If no paragraph break in window, look for Sentence Boundaries ([.!?]["'”’»)]?\s+)
    if (splitPoint === -1) {
      const sentenceRegex = /[.!?]["'”’»)]?\s+/g;
      sentenceRegex.lastIndex = minTarget;
      let bestSentDiff = Infinity;

      while ((match = sentenceRegex.exec(text)) !== null) {
        const breakEnd = match.index + match[0].length;
        if (breakEnd > maxTarget) {
          if (splitPoint === -1 && breakEnd <= currentStart + Math.floor(targetChars * 1.4)) {
            splitPoint = breakEnd;
          }
          break;
        }
        if (breakEnd > currentStart) {
          const diff = Math.abs(breakEnd - idealEnd);
          if (diff < bestSentDiff) {
            bestSentDiff = diff;
            splitPoint = breakEnd;
          }
        }
      }
    }

    // 3. If no sentence break, look for any whitespace boundary (\s+)
    if (splitPoint === -1) {
      const wsRegex = /\s+/g;
      wsRegex.lastIndex = minTarget;
      let bestWsDiff = Infinity;

      while ((match = wsRegex.exec(text)) !== null) {
        const breakEnd = match.index + match[0].length;
        if (breakEnd > maxTarget) {
          if (splitPoint === -1 && breakEnd <= currentStart + Math.floor(targetChars * 1.3)) {
            splitPoint = breakEnd;
          }
          break;
        }
        if (breakEnd > currentStart) {
          const diff = Math.abs(breakEnd - idealEnd);
          if (diff < bestWsDiff) {
            bestWsDiff = diff;
            splitPoint = breakEnd;
          }
        }
      }
    }

    // 4. Fallback if still no split point (e.g. unbroken token longer than window)
    if (splitPoint === -1 || splitPoint <= currentStart) {
      // Look forward from idealEnd for the next whitespace
      const nextWsRegex = /\s+/g;
      nextWsRegex.lastIndex = idealEnd;
      const nextWs = nextWsRegex.exec(text);
      if (nextWs && nextWs.index + nextWs[0].length > currentStart) {
        splitPoint = nextWs.index + nextWs[0].length;
      } else {
        // Last resort: hard split at idealEnd to avoid infinite loop
        splitPoint = idealEnd;
      }
    }

    // Ensure strictly advancing
    if (splitPoint <= currentStart) {
      splitPoint = currentStart + 1;
    }

    if (splitPoint >= length) {
      break;
    }

    pageOffsets.push(splitPoint);
    currentStart = splitPoint;
  }

  return pageOffsets;
}

/**
 * Returns the 1-indexed page number containing the given character offset.
 * Uses binary search over pageOffsets.
 *
 * @param {number[]} pageOffsets - Strictly increasing array of page starting offsets
 * @param {number} offset - Character offset in manuscript
 * @returns {number} 1-indexed page number (1 to pageOffsets.length)
 */
export function pageForOffset(pageOffsets, offset) {
  if (!pageOffsets || !Array.isArray(pageOffsets) || pageOffsets.length === 0) {
    return 1;
  }

  const normalizedOffset = typeof offset === 'number' && !isNaN(offset) ? offset : 0;
  if (normalizedOffset <= pageOffsets[0]) {
    return 1;
  }

  let low = 0;
  let high = pageOffsets.length - 1;
  let resultIndex = 0;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (pageOffsets[mid] <= normalizedOffset) {
      resultIndex = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return resultIndex + 1; // 1-indexed
}

/**
 * Slices the text corresponding to a 1-indexed page number.
 *
 * @param {string} text - The full manuscript text
 * @param {number[]} pageOffsets - Array of page starting offsets
 * @param {number} page - 1-indexed page number
 * @returns {string} Text of the requested page, or empty string if invalid
 */
export function sliceForPage(text, pageOffsets, page) {
  if (!text || typeof text !== 'string' || !pageOffsets || !Array.isArray(pageOffsets)) {
    return '';
  }

  if (page < 1 || page > pageOffsets.length) {
    return '';
  }

  const start = pageOffsets[page - 1];
  const end = page < pageOffsets.length ? pageOffsets[page] : text.length;

  return text.slice(start, end);
}
