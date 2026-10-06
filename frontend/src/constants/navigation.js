export const ROLE_NAV_CONFIG = {
  guest: [
    { label: 'Browse', to: '/browse', hasDropdown: true },
    { label: 'Write', to: '/signup?role=writer' },
    { label: 'For publishers', to: '/signup?role=publisher' },
  ],
  reader: [],
  writer: [],
  publisher: [],
  admin: [],
};

export function getNavItemsForRole(role = null) {
  if (!role) return ROLE_NAV_CONFIG.guest;
  return ROLE_NAV_CONFIG[role] || [];
}
