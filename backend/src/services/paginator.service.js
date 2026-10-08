const DEFAULT_TARGET_CHARS = 1800;

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

    const minTarget = Math.max(currentStart + 1, currentStart + Math.floor(targetChars * 0.5));
    const maxTarget = Math.min(length, currentStart + Math.floor(targetChars * 1.3));

    let splitPoint = -1;

    const paraRegex = /\r?\n[ \t]*\r?\n+/g;
    paraRegex.lastIndex = minTarget;
    let match;
    let bestParaDiff = Infinity;

    while ((match = paraRegex.exec(text)) !== null) {
      const breakEnd = match.index + match[0].length;
      if (breakEnd > maxTarget) {
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

    if (splitPoint === -1 || splitPoint <= currentStart) {
      const nextWsRegex = /\s+/g;
      nextWsRegex.lastIndex = idealEnd;
      const nextWs = nextWsRegex.exec(text);
      if (nextWs && nextWs.index + nextWs[0].length > currentStart) {
        splitPoint = nextWs.index + nextWs[0].length;
      } else {
        splitPoint = idealEnd;
      }
    }

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

  return resultIndex + 1;
}

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
