import type { SocialOAuthProvider } from "../social-integration.service";

/** Google YouTube Data API v3 — wire when GOOGLE_* env vars are set. */
export const youtubeOAuthProvider: SocialOAuthProvider = {
  platform: "youtube",
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
