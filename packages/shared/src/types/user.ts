import { z } from 'zod';
import type { XpTitle } from '../constants.js';

export const AuthProviderSchema = z.enum(['anonymous', 'github', 'google', 'sso']);
export type AuthProvider = z.infer<typeof AuthProviderSchema>;

export interface UserProfile {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  provider: AuthProvider;
  isAnonymous: boolean;
  country?: string;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalUserState {
  profile: UserProfile;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
}

export interface PublicPlayer {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  title: XpTitle;
  xp: number;
  streak: number;
}
