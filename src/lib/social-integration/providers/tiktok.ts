import type { SocialOAuthProvider } from "../social-integration.service";

/** TikTok Login Kit + Research API — wire when TIKTOK_* env vars are set. */
export const tiktokOAuthProvider: SocialOAuthProvider = {
  platform: "tiktok",
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
