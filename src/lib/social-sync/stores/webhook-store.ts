import "server-only";

import { prisma } from "@/lib/prisma";
import type { WebhookEventStatus, WebhookSubscriptionStatus } from "../social-sync.types";

export async function upsertWebhookSubscription(params: {
  socialAccountId: string;
  platform: string;
  externalSubId: string;
  callbackUrl: string;
  topics: string[];
  status?: WebhookSubscriptionStatus;
}) {
  return prisma.socialWebhookSubscription.upsert({
    where: { socialAccountId: params.socialAccountId },
    create: {
      socialAccountId: params.socialAccountId,
      platform: params.platform,
      externalSubId: params.externalSubId,
      callbackUrl: params.callbackUrl,
      subscribedTopics: params.topics,
      status: params.status ?? "active",
    },
    update: {
      externalSubId: params.externalSubId,
      callbackUrl: params.callbackUrl,
      subscribedTopics: params.topics,
      status: params.status ?? "active",
      failureCount: 0,
    },
  });
}

export async function recordWebhookEvent(params: {
  subscriptionId: string;
  platform: string;
  eventType: string;
  externalEventId: string;
  payload: unknown;
}) {
  return prisma.socialWebhookEvent.create({
    data: {
      subscriptionId: params.subscriptionId,
      platform: params.platform,
      eventType: params.eventType,
      externalEventId: params.externalEventId,
      payloadJson: params.payload as object,
      status: "pending",
    },
  });
}

export async function markWebhookEvent(
  eventId: string,
  status: WebhookEventStatus,
  error = "",
): Promise<void> {
  await prisma.socialWebhookEvent.update({
    where: { id: eventId },
    data: {
      status,
      processedAt: status === "processed" ? new Date() : undefined,
      errorMessage: error.slice(0, 500),
      attempts: { increment: 1 },
    },
  });
}

export async function listPendingWebhookEvents(limit = 20) {
  const now = new Date();
  return prisma.socialWebhookEvent.findMany({
    where: {
      status: { in: ["pending", "failed"] },
      OR: [{ retryAfter: null }, { retryAfter: { lte: now } }],
    },
    orderBy: { receivedAt: "asc" },
    take: limit,
    include: { subscription: { include: { socialAccount: true } } },
  });
}

export async function listWebhookAdminSummary() {
  const [subs, events, failed] = await Promise.all([
    prisma.socialWebhookSubscription.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { socialAccount: { select: { username: true, platform: true } } },
    }),
    prisma.socialWebhookEvent.findMany({ orderBy: { receivedAt: "desc" }, take: 30 }),
    prisma.socialWebhookEvent.count({ where: { status: "failed" } }),
  ]);
  return { subscriptions: subs, recentEvents: events, failedCount: failed };
}

export async function touchWebhookSuccess(subscriptionId: string): Promise<void> {
  await prisma.socialWebhookSubscription.update({
    where: { id: subscriptionId },
    data: { lastEventAt: new Date(), lastSuccessAt: new Date(), failureCount: 0 },
  });
}

export async function touchWebhookFailure(subscriptionId: string): Promise<void> {
  await prisma.socialWebhookSubscription.update({
    where: { id: subscriptionId },
    data: { lastFailedAt: new Date(), failureCount: { increment: 1 } },
  });
}
