import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { paginate, pageForOffset, sliceForPage } from '../src/services/paginator.service.js';

describe('Paginator Service', () => {
  it('handles empty and null text gracefully', () => {
    assert.deepEqual(paginate(''), []);
    assert.deepEqual(paginate(null), []);
    assert.deepEqual(paginate(undefined), []);
  });

  it('handles text shorter than targetChars as a single page starting at 0', () => {
    const text = 'A short sentence that fits comfortably on one page.';
    const offsets = paginate(text, 1800);
    assert.deepEqual(offsets, [0]);
    assert.equal(sliceForPage(text, offsets, 1), text);
  });

  it('breaks at paragraph boundaries when available', () => {
    const p1 = 'Paragraph one with some text. '.repeat(20); // ~600 chars
    const p2 = 'Paragraph two with more details. '.repeat(20);
    const p3 = 'Paragraph three to finish the chapter. '.repeat(20);
    const fullText = `${p1}\n\n${p2}\n\n${p3}`;

    const offsets = paginate(fullText, 700);

    // Property check: strictly increasing
    for (let i = 0; i < offsets.length - 1; i++) {
      assert(offsets[i] < offsets[i + 1], `Offset ${i} must be < offset ${i + 1}`);
    }

    // Property check: concatenated pages equal original text identically
    let reconstructed = '';
    for (let p = 1; p <= offsets.length; p++) {
      reconstructed += sliceForPage(fullText, offsets, p);
    }
    assert.equal(reconstructed, fullText);

    // The break should be right after \n\n (start of paragraph 2 and 3)
    assert.equal(fullText.slice(offsets[1], offsets[1] + 13), 'Paragraph two');
  });

  it('handles Windows CRLF line endings (\\r\\n\\r\\n) cleanly', () => {
    const p1 = 'First section text. '.repeat(30);
    const p2 = 'Second section text. '.repeat(30);
    const fullText = `${p1}\r\n\r\n${p2}`;

    const offsets = paginate(fullText, 700);
    assert(offsets.length >= 2);

    let reconstructed = '';
    for (let p = 1; p <= offsets.length; p++) {
      reconstructed += sliceForPage(fullText, offsets, p);
    }
    assert.equal(reconstructed, fullText);
    assert.equal(fullText.slice(offsets[1], offsets[1] + 14), 'Second section');
  });

  it('handles one huge paragraph without paragraph breaks (falls back to sentence/whitespace)', () => {
    const sentence = 'This is a continuous narrative sentence that flows across multiple pages without breaks. ';
    const hugeParagraph = sentence.repeat(60); // ~5300 chars, no \n\n

    const offsets = paginate(hugeParagraph, 1000);
    assert(offsets.length >= 4);

    let reconstructed = '';
    for (let p = 1; p <= offsets.length; p++) {
      const slice = sliceForPage(hugeParagraph, offsets, p);
      reconstructed += slice;
      // Never break mid-word: page start should not be in the middle of a word
      if (p > 1) {
        assert(slice.startsWith('This is a continuous') || !/^[a-z]/i.test(slice[0]) || slice.startsWith(' '));
      }
    }
    assert.equal(reconstructed, hugeParagraph);
  });

  it('handles trailing whitespace and preserves it in the final page', () => {
    const text = 'Page content here. '.repeat(40) + '   \n\n\t  ';
    const offsets = paginate(text, 500);

    let reconstructed = '';
    for (let p = 1; p <= offsets.length; p++) {
      reconstructed += sliceForPage(text, offsets, p);
    }
    assert.equal(reconstructed, text);
  });

  it('handles unbroken strings (no whitespace) without infinite loop', () => {
    const unbroken = 'A'.repeat(5000);
    const offsets = paginate(unbroken, 1000);
    assert(offsets.length >= 4);

    let reconstructed = '';
    for (let p = 1; p <= offsets.length; p++) {
      reconstructed += sliceForPage(unbroken, offsets, p);
    }
    assert.equal(reconstructed, unbroken);
  });

  it('pageForOffset correctly maps character offsets to 1-indexed pages via binary search', () => {
    const offsets = [0, 1000, 2500, 4200];

    assert.equal(pageForOffset(offsets, -5), 1);
    assert.equal(pageForOffset(offsets, 0), 1);
    assert.equal(pageForOffset(offsets, 500), 1);
    assert.equal(pageForOffset(offsets, 999), 1);
    assert.equal(pageForOffset(offsets, 1000), 2);
    assert.equal(pageForOffset(offsets, 1001), 2);
    assert.equal(pageForOffset(offsets, 2499), 2);
    assert.equal(pageForOffset(offsets, 2500), 3);
    assert.equal(pageForOffset(offsets, 4199), 3);
    assert.equal(pageForOffset(offsets, 4200), 4);
    assert.equal(pageForOffset(offsets, 99999), 4);
  });

  it('sliceForPage returns empty string for out-of-bounds page requests', () => {
    const text = 'Simple story content.';
    const offsets = [0];

    assert.equal(sliceForPage(text, offsets, 0), '');
    assert.equal(sliceForPage(text, offsets, -1), '');
    assert.equal(sliceForPage(text, offsets, 2), '');
    assert.equal(sliceForPage(text, offsets, 1), text);
  });

  it('property-style check: strictly increasing offsets and exact text reconstruction across multiple random lengths', () => {
    const sampleWords = ['The', 'quick', 'brown', 'fox', 'jumped', 'over', 'the', 'lazy', 'dog.', 'It', 'was', 'autumn.', 'Leaves', 'drifted.\n\n', 'Cold', 'winds', 'howled!', 'Why?'];
    
    // Generate 5 distinct synthetic texts
    for (let run = 0; run < 5; run++) {
      let doc = '';
      const totalWords = 400 + run * 300;
      for (let w = 0; w < totalWords; w++) {
        doc += sampleWords[w % sampleWords.length] + ' ';
      }

      const offsets = paginate(doc, 800 + run * 200);

      // 1. First offset is 0
      assert.equal(offsets[0], 0);

      // 2. Strictly increasing
      for (let i = 0; i < offsets.length - 1; i++) {
        assert(offsets[i] < offsets[i + 1]);
      }

      // 3. Concatenation invariant
      let reconstructed = '';
      for (let p = 1; p <= offsets.length; p++) {
        reconstructed += sliceForPage(doc, offsets, p);
      }
      assert.equal(reconstructed, doc);

      // 4. pageForOffset consistency
      for (let i = 0; i < offsets.length; i++) {
        const expectedPage = i + 1;
        assert.equal(pageForOffset(offsets, offsets[i]), expectedPage);
        if (i < offsets.length - 1) {
          assert.equal(pageForOffset(offsets, offsets[i + 1] - 1), expectedPage);
        }
      }
    }
  });
});
