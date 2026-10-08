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
