/**
 * Returns the home route for a given user based on their role and approval status.
 *
 * @param {object|null} user - The user object containing role and status
 * @returns {string} - Target route path
 */
export const getRoleHomePath = (user) => {
  if (!user) return '/';

  switch (user.role) {
    case 'writer':
      return '/w/dashboard';
    case 'publisher':
      if (user.status === 'pending' || user.publisherProfile?.reviewStatus === 'pending') {
        return '/p/apply-status';
      }
      return '/p/discover';
    case 'admin':
      return '/a/overview';
    case 'reader':
    default:
      return '/';
  }
};
