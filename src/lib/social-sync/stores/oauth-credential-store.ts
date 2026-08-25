import "server-only";

import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "../token-crypto";

export type OAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string[];
  providerUserId?: string;
};

export async function saveOAuthCredentials(
  socialAccountId: string,
  tokens: OAuthTokens,
): Promise<void> {
  await prisma.userSocialOAuthCredential.upsert({
    where: { socialAccountId },
    create: {
      socialAccountId,
      accessToken: encryptSecret(tokens.accessToken),
      refreshToken: encryptSecret(tokens.refreshToken ?? ""),
      tokenExpiresAt: tokens.expiresAt ?? null,
      scopes: tokens.scopes ?? [],
      providerUserId: tokens.providerUserId ?? "",
      lastValidatedAt: new Date(),
    },
    update: {
      accessToken: encryptSecret(tokens.accessToken),
      refreshToken: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : undefined,
      tokenExpiresAt: tokens.expiresAt ?? null,
      scopes: tokens.scopes ?? [],
      providerUserId: tokens.providerUserId ?? "",
      lastValidatedAt: new Date(),
    },
  });
}

export async function loadOAuthTokens(socialAccountId: string): Promise<OAuthTokens | null> {
  const row = await prisma.userSocialOAuthCredential.findUnique({ where: { socialAccountId } });
  if (!row?.accessToken) return null;
  try {
    return {
      accessToken: decryptSecret(row.accessToken),
      refreshToken: row.refreshToken ? decryptSecret(row.refreshToken) : undefined,
      expiresAt: row.tokenExpiresAt ?? undefined,
      scopes: row.scopes,
      providerUserId: row.providerUserId,
    };
  } catch {
    return null;
  }
}

export async function deleteOAuthCredentials(socialAccountId: string): Promise<void> {
  await prisma.userSocialOAuthCredential.deleteMany({ where: { socialAccountId } });
}
