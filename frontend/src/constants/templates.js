export const BOOK_TEMPLATES = {
  CLASSIC: 'classic',
  SHOWCASE: 'showcase',
  NOTEBOOK: 'notebook',
};

export const TEMPLATE_OPTIONS = [
  {
    id: BOOK_TEMPLATES.CLASSIC,
    name: 'Classic',
    badge: 'Editorial Standard',
    description: 'Familiar Wattpad-style layout. Cover on the left, story details on the right, and tabbed sections below.',
    bestFor: 'General Fiction, Romance, Mystery, Young Adult',
  },
  {
    id: BOOK_TEMPLATES.SHOWCASE,
    name: 'Showcase',
    badge: 'Cinematic Hero',
    description: 'Full-width atmospheric hero with the cover blurred as backdrop, centered artwork, stat chips, and author card.',
    bestFor: 'Fantasy, Sci-Fi, Thriller, Action',
  },
  {
    id: BOOK_TEMPLATES.NOTEBOOK,
    name: 'Notebook',
    badge: 'Paper & Ink',
    description: 'Parchment background with ruled lines, a pinned cover, sticker tags, and handwritten headings.',
    bestFor: 'Literary Fiction, Poetry, Memoir, Personal Essays',
  },
];

export const ACCENT_PRESETS = [
  {
    id: 'orange',
    name: 'Brand Orange',
    hex: '#C2410C', // Accessible darker variant of #FF500A (5.18:1 contrast on white)
    legacyHex: '#FF500A',
    description: 'Warm & Energetic (Accessible 5.2:1)',
  },
  {
    id: 'blue',
    name: 'Deep Blue',
    hex: '#1E3A8A',
    description: 'Midnight Navy (10.4:1)',
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    hex: '#047857',
    description: 'Forest Emerald (5.5:1)',
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    hex: '#7C3AED',
    description: 'Royal Violet (5.7:1)',
  },
  {
    id: 'crimson',
    name: 'Crimson Red',
    hex: '#B91C1C',
    description: 'Deep Crimson (6.5:1)',
  },
  {
    id: 'teal',
    name: 'Deep Teal',
    hex: '#0F766E',
    description: 'Ocean Teal (5.5:1)',
  },
];

export const DEFAULT_ACCENT = ACCENT_PRESETS[0].hex;

export default {
  BOOK_TEMPLATES,
  TEMPLATE_OPTIONS,
  ACCENT_PRESETS,
  DEFAULT_ACCENT,
};
