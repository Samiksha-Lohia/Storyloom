export class UserDto {
  constructor(user) {
    this.id = (user._id || user.id).toString();
    this.name = user.name;
    this.username = user.username;
    this.email = user.email;
    this.role = user.role;
    this.status = user.status;
    this.avatarPublicId = user.avatarPublicId || null;
    this.avatarUrl = user.avatarUrl || null;
    this.bio = user.bio || '';
    this.publisherProfile = user.publisherProfile || null;
    this.strikes = user.strikes || 0;
    this.defaultTemplate = user.defaultTemplate || 'classic';
    this.plan = user.plan || 'free';
    this.matureAckAt = user.matureAckAt || null;
    this.readerSettings = user.readerSettings || {
      fontSize: 16,
      lineHeight: 1.6,
      fontFamily: 'serif',
      theme: 'light',
    };
    this.termsAcceptedAt = user.termsAcceptedAt || null;
    this.termsVersion = user.termsVersion || null;
    this.createdAt = user.createdAt;
  }

  static toResponse(user) {
    if (!user) return null;
    return new UserDto(user);
  }

  static toResponseList(users) {
    if (!Array.isArray(users)) return [];
    return users.map((user) => new UserDto(user));
  }
}
