import "server-only";

import { prisma } from "@/lib/prisma";
import type { SyncJobStatus, SyncTrigger } from "../social-sync.types";
import { MAX_SYNC_ATTEMPTS } from "../social-sync.types";

export async function enqueueSyncJob(params: {
  socialAccountId: string;
  platform: string;
  trigger: SyncTrigger;
  priority?: number;
  scheduledFor?: Date;
  payload?: Record<string, unknown>;
}): Promise<string> {
  const existing = await prisma.socialSyncJob.findFirst({
    where: {
      socialAccountId: params.socialAccountId,
      status: { in: ["pending", "running"] },
    },
  });
  if (existing) return existing.id;

  const job = await prisma.socialSyncJob.create({
    data: {
      socialAccountId: params.socialAccountId,
      platform: params.platform,
      trigger: params.trigger,
      priority: params.priority ?? (params.trigger === "manual" ? 10 : 0),
      scheduledFor: params.scheduledFor ?? new Date(),
      maxAttempts: MAX_SYNC_ATTEMPTS,
      payloadJson: params.payload ?? undefined,
    },
  });
  return job.id;
}

export async function claimPendingJobs(limit = 10) {
  const now = new Date();
  const jobs = await prisma.socialSyncJob.findMany({
    where: { status: "pending", scheduledFor: { lte: now } },
    orderBy: [{ priority: "desc" }, { scheduledFor: "asc" }],
    take: limit,
  });

  const claimed = [];
  for (const job of jobs) {
    const updated = await prisma.socialSyncJob.updateMany({
      where: { id: job.id, status: "pending" },
      data: { status: "running", startedAt: now, attempts: { increment: 1 } },
    });
    if (updated.count === 1) claimed.push({ ...job, status: "running" as const, startedAt: now });
  }
  return claimed;
}

export async function completeJob(jobId: string, status: SyncJobStatus, error = ""): Promise<void> {
  await prisma.socialSyncJob.update({
    where: { id: jobId },
    data: {
      status,
      completedAt: new Date(),
      lastError: error.slice(0, 500),
    },
  });
}

export async function rescheduleJob(jobId: string, retryAt: Date, error: string): Promise<void> {
  const job = await prisma.socialSyncJob.findUnique({ where: { id: jobId } });
  if (!job) return;
  const dead = job.attempts >= job.maxAttempts;
  await prisma.socialSyncJob.update({
    where: { id: jobId },
    data: {
      status: dead ? "dead_letter" : "pending",
      scheduledFor: dead ? job.scheduledFor : retryAt,
      lastError: error.slice(0, 500),
      startedAt: null,
    },
  });
}

export async function listRecentJobs(limit = 50) {
  return prisma.socialSyncJob.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { socialAccount: { select: { username: true, platform: true, userId: true } } },
  });
}

export async function countJobsByStatus() {
  const rows = await prisma.socialSyncJob.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r: { status: string; _count: { _all: number } }) => [r.status, r._count._all]));
}

export async function recoverStuckJobs(staleMinutes = 15): Promise<number> {
  const cutoff = new Date(Date.now() - staleMinutes * 60_000);
  const res = await prisma.socialSyncJob.updateMany({
    where: { status: "running", startedAt: { lt: cutoff } },
    data: { status: "pending", startedAt: null },
  });
  return res.count;
}
