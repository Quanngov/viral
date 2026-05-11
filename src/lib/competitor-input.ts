import type { CompetitorAccount } from "@/lib/competitor-mock-data";

export type DetectCompetitorPlatformResult = {
  platform: "youtube" | "instagram" | null;
  normalizedInput: string;
  username?: string;
  profileUrl?: string;
  error?: string;
};

const UNSUPPORTED_HOST_MARKERS = [
  "tiktok.com",
  "vm.tiktok.com",
  "vk.com",
  "vkontakte",
];

function normalizeHost(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

function isUnsupportedHost(host: string): boolean {
  return UNSUPPORTED_HOST_MARKERS.some((marker) => host.includes(marker));
}

function buildYoutubeProfile(identifier: string): string {
  return identifier.startsWith("UC")
    ? `https://www.youtube.com/channel/${identifier}`
    : `https://www.youtube.com/@${identifier}`;
}

function parseYoutubeUrl(url: URL): { username: string; profileUrl: string } | null {
  const pathParts = url.pathname.split("/").filter(Boolean);
  if (pathParts.length === 0) return null;

  if (pathParts[0].startsWith("@")) {
    const handle = pathParts[0].slice(1).toLowerCase();
    if (!/^[a-z0-9._-]{1,60}$/i.test(handle)) return null;
    return { username: handle, profileUrl: `https://www.youtube.com/@${handle}` };
  }

  if (pathParts[0] === "channel" && pathParts[1]) {
    const channelId = pathParts[1];
    if (!/^UC[\w-]{8,}$/i.test(channelId)) return null;
    return { username: channelId, profileUrl: `https://www.youtube.com/channel/${channelId}` };
  }

  if ((pathParts[0] === "c" || pathParts[0] === "user") && pathParts[1]) {
    const name = pathParts[1].toLowerCase();
    if (!/^[a-z0-9._-]{1,60}$/i.test(name)) return null;
    return { username: name, profileUrl: `https://www.youtube.com/${pathParts[0]}/${name}` };
  }

  return null;
}

function parseInstagramUrl(url: URL): { username: string; profileUrl: string } | null {
  const pathParts = url.pathname.split("/").filter(Boolean);
  if (!pathParts[0]) return null;
  const username = pathParts[0].toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/i.test(username)) return null;
  return { username, profileUrl: `https://www.instagram.com/${username}/` };
}

export function detectCompetitorPlatform(input: string): DetectCompetitorPlatformResult {
  const raw = input.trim();
  if (!raw) {
    return { platform: null, normalizedInput: "", error: "Введите ссылку или username." };
  }

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    const host = normalizeHost(url.hostname);

    if (isUnsupportedHost(host)) {
      return {
        platform: null,
        normalizedInput: raw,
        error: "Сейчас можно добавить только YouTube-канал или Instagram-аккаунт",
      };
    }

    const isYouTubeHost = host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be";
    const isInstagramHost = host === "instagram.com" || host.endsWith(".instagram.com");

    if (isYouTubeHost) {
      if (host === "youtu.be") {
        const shortId = url.pathname.split("/").filter(Boolean)[0];
        if (!shortId) {
          return {
            platform: null,
            normalizedInput: raw,
            error: "Не удалось распознать YouTube-канал. Укажите ссылку на канал.",
          };
        }
        return {
          platform: "youtube",
          normalizedInput: shortId,
          username: shortId,
          profileUrl: buildYoutubeProfile(shortId),
        };
      }
      const parsed = parseYoutubeUrl(url);
      if (!parsed) {
        return {
          platform: null,
          normalizedInput: raw,
          error: "Не удалось распознать YouTube-канал. Укажите ссылку на канал.",
        };
      }
      return {
        platform: "youtube",
        normalizedInput: parsed.username,
        username: parsed.username,
        profileUrl: parsed.profileUrl,
      };
    }

    if (isInstagramHost) {
      const parsed = parseInstagramUrl(url);
      if (!parsed) {
        return {
          platform: null,
          normalizedInput: raw,
          error: "Не удалось распознать Instagram-аккаунт.",
        };
      }
      return {
        platform: "instagram",
        normalizedInput: parsed.username,
        username: parsed.username,
        profileUrl: parsed.profileUrl,
      };
    }

    // Looks like URL/host for unsupported platform.
    if (raw.includes(".") || raw.includes("/")) {
      return {
        platform: null,
        normalizedInput: raw,
        error: "Сейчас можно добавить только YouTube-канал или Instagram-аккаунт",
      };
    }
  } catch {
    // fall through to handle/username mode
  }

  // Handle @input and plain text.
  const bare = raw.startsWith("@") ? raw.slice(1) : raw;
  if (/^UC[\w-]{8,}$/i.test(bare)) {
    return {
      platform: "youtube",
      normalizedInput: bare,
      username: bare,
      profileUrl: `https://www.youtube.com/channel/${bare}`,
    };
  }
  if (/^[a-z0-9._-]{1,60}$/i.test(bare)) {
    const username = bare.toLowerCase();
    return {
      platform: "instagram",
      normalizedInput: username,
      username,
      profileUrl: `https://www.instagram.com/${username}/`,
    };
  }

  return {
    platform: null,
    normalizedInput: raw,
    error: "Сейчас можно добавить только YouTube-канал или Instagram-аккаунт",
  };
}

export function normalizeCompetitorForSave(input: string): {
  platform: CompetitorAccount["platform"];
  username: string;
  profileUrl: string;
} | null {
  const result = detectCompetitorPlatform(input);
  if (!result.platform || !result.username || !result.profileUrl) return null;
  return {
    platform: result.platform,
    username: result.username,
    profileUrl: result.profileUrl,
  };
}
