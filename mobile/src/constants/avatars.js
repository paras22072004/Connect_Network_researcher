// GeoConnect Built-in Profile Avatars
// Curated high-resolution academic and researcher personas matching GeoConnect's forest green design system

export const AVATAR_OPTIONS = [
  {
    id: 'avatar-1',
    label: 'Scholar Emerald',
    subtitle: 'Classic Researcher',
    uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
    accentColor: '#24563B',
    bgColor: '#EBF4EE'
  },
  {
    id: 'avatar-2',
    label: 'Scholar Sage',
    subtitle: 'Data & AI Fellow',
    uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
    accentColor: '#5A7D69',
    bgColor: '#F0F5F1'
  },
  {
    id: 'avatar-3',
    label: 'Scholar Forest',
    subtitle: 'Innovator & Scientist',
    uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300',
    accentColor: '#1A3F2B',
    bgColor: '#E5EFE9'
  }
];

export const DEFAULT_AVATAR_ID = 'avatar-1';
export const DEFAULT_AVATAR = AVATAR_OPTIONS[0];

/**
 * Resolves an avatar URI safely from avatarId or profileImage.
 * Falls back gracefully to default avatar if neither is valid.
 */
export const getAvatarUri = (profileImage, avatarId) => {
  if (avatarId) {
    const match = AVATAR_OPTIONS.find((a) => a.id === avatarId);
    if (match) return match.uri;
  }
  if (profileImage && typeof profileImage === 'string' && profileImage.trim().startsWith('http')) {
    return profileImage.trim();
  }
  return DEFAULT_AVATAR.uri;
};

/**
 * Returns metadata object for a given avatarId.
 */
export const getAvatarMeta = (avatarId) => {
  return AVATAR_OPTIONS.find((a) => a.id === avatarId) || DEFAULT_AVATAR;
};
