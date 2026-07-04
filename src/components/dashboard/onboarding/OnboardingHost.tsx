"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardInitialPayload } from "@/lib/dashboard-initial";
import {
  buildOnboardingPreviewData,
  type OnboardingPreviewData,
} from "@/lib/onboarding/onboarding-preview-data";
import {
  fetchCompetitorsBase,
  peekCompetitorsBaseCache,
  prefetchCompetitorsBase,
} from "@/lib/dashboard-fetch";
import { OnboardingModal } from "@/components/dashboard/onboarding/OnboardingModal";
import {
  maybeResetOnboardingFromQuery,
  shouldShowOnboarding,
} from "@/lib/onboarding/onboarding-storage";

type OnboardingHostProps = {
  initial: DashboardInitialPayload;
};

export function OnboardingHost({ initial }: OnboardingHostProps) {
  const [open, setOpen] = useState(false);
  const [competitorsLoaded, setCompetitorsLoaded] = useState(false);

  const basePreview = useMemo(
    () => buildOnboardingPreviewData(initial, peekCompetitorsBaseCache()),
    [initial],
  );
  const [previewData, setPreviewData] = useState<OnboardingPreviewData>(basePreview);

  useEffect(() => {
    maybeResetOnboardingFromQuery();
    if (shouldShowOnboarding()) {
      const t = window.setTimeout(() => setOpen(true), 320);
      return () => window.clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (!open || competitorsLoaded) return;
    let alive = true;
    void (async () => {
      try {
        const cached = peekCompetitorsBaseCache();
        const payload = cached ?? (await prefetchCompetitorsBase()).data ?? (await fetchCompetitorsBase());
        if (!alive) return;
        setPreviewData(buildOnboardingPreviewData(initial, payload));
      } catch {
        /* keep SSR-based preview */
      } finally {
        if (alive) setCompetitorsLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, competitorsLoaded, initial]);

  return <OnboardingModal open={open} onClose={() => setOpen(false)} previewData={previewData} />;
}
