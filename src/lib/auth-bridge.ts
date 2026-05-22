import "server-only";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "viral_session_id";
const DEFAULT_BALANCE = 12_400;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidSessionKey(raw: string | undefined): raw is string {
  return Boolean(raw && UUID_RE.test(raw.trim()));
}

/** Links Auth.js user to app SessionUser (migrates anonymous session data when possible). */
export async function linkAuthUserToSessionUser(authUserId: string): Promise<string> {
  const existing = await prisma.sessionUser.findUnique({
    where: { authUserId },
    select: { id: true },
  });
  if (existing) return existing.id;

  const jar = await cookies();
  const anonKey = jar.get(SESSION_COOKIE)?.value?.trim();

  if (isValidSessionKey(anonKey)) {
    const anon = await prisma.sessionUser.findUnique({
      where: { sessionKey: anonKey },
      select: { id: true, authUserId: true },
    });
    if (anon && !anon.authUserId) {
      const linked = await prisma.sessionUser.update({
        where: { id: anon.id },
        data: { authUserId },
        select: { id: true },
      });
      return linked.id;
    }
  }

  const created = await prisma.sessionUser.create({
    data: {
      sessionKey: randomUUID(),
      authUserId,
      userTokenBalance: { create: { balance: DEFAULT_BALANCE } },
    },
    select: { id: true },
  });
  return created.id;
}
