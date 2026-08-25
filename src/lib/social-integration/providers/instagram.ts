import type { SocialOAuthProvider } from "../social-integration.service";

/** Meta Instagram Graph — wire when META_* env vars are set. */
export const instagramOAuthProvider: SocialOAuthProvider = {
  platform: "instagram",
  buildAuthorizationUrl(_state) {
    return null;
  },
  async exchangeCodeForTokens(_code) {
    return null;
  },
  async fetchProfile(_accessToken) {
    return null;
  },
};
