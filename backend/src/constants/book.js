export const BOOK_STATUSES = {
  DRAFT: 'draft',
  PROCESSING: 'processing',
  PUBLISHED: 'published',
  UNPUBLISHED: 'unpublished',
  REMOVED: 'removed',
  SUSPENDED: 'suspended',
  FLAGGED: 'flagged',
};

export const BOOK_STATUSES_LIST = Object.values(BOOK_STATUSES);

export const BOOK_TEMPLATES = {
  CLASSIC: 'classic',
  SHOWCASE: 'showcase',
  NOTEBOOK: 'notebook',
};

export const BOOK_TEMPLATES_LIST = Object.values(BOOK_TEMPLATES);

export const ACCESSIBLE_ORANGE = '#C2410C';

export const BOOK_ACCENTS = [
  '#FF500A', // Brand Orange (Wattpad-inspired; 3.28:1 contrast on white)
  '#C2410C', // Accessible Brand Orange (Darker variant; 5.18:1 contrast on white)
  '#1E3A8A', // Deep Blue (10.36:1)
  '#047857', // Emerald Green (5.48:1)
  '#7C3AED', // Purple (5.70:1)
  '#B91C1C', // Crimson Red (6.47:1)
  '#0F766E', // Deep Teal (5.47:1)
];

export default BOOK_STATUSES;
