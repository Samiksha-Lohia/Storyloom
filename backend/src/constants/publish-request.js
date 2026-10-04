export const PUBLISH_REQUEST_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  WITHDRAWN: 'withdrawn',
  CLOSED: 'closed',
};

export const PUBLISH_REQUEST_STATUSES_LIST = Object.values(PUBLISH_REQUEST_STATUSES);

export const ALLOWED_RIGHTS = [
  'print',
  'ebook',
  'audiobook',
  'translation',
  'film_tv_web',
];

export const COOLDOWN_DAYS = 30;
export const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export const CONVERSATION_STATUSES = {
  OPEN: 'open',
  CLOSED: 'closed',
};

export const CONVERSATION_STATUSES_LIST = Object.values(CONVERSATION_STATUSES);
