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
  '#FF500A',
  '#C2410C',
  '#1E3A8A',
  '#047857',
  '#7C3AED',
  '#B91C1C',
  '#0F766E',
  '#9B2D20',
];

export default BOOK_STATUSES;
