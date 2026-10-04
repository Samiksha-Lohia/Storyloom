export const USER_ROLES = {
  ADMIN: 'admin',
  WRITER: 'writer',
  READER: 'reader',
  PUBLISHER: 'publisher',
};

export const USER_ROLES_LIST = Object.values(USER_ROLES);

export const USER_STATUSES = {
  ACTIVE: 'active',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
};

export const USER_STATUSES_LIST = Object.values(USER_STATUSES);

export default USER_ROLES;
