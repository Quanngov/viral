"use client";

import { useState } from "react";
import { LANDING_COPY } from "@/components/landing/copy";
import {
  formatLandingLimit,
  formatLandingPrice,
  getLandingPlanLimits,
  LANDING_COMPARISON_PLANS,
  LANDING_COMPARISON_ROWS,
  LANDING_PAID_PLANS,
  type LandingPricingPlanId,
} from "@/components/landing/lib/landing-pricing";
import { LandingButton } from "@/components/landing/ui/LandingButton";
import { Reveal } from "@/components/landing/ui/Reveal";
import { BILLING_PLANS } from "@/lib/billing/billing.config";

type BillingInterval = "MONTHLY" | "YEARLY";

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 text-[#059669]"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.333a1 1 0 0 1-1.435.02L3.29 9.78a1 1 0 1 1 1.42-1.404l3.51 3.59 6.54-6.617a1 1 0 0 1 1.444.02Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function formatComparisonCell(planId: LandingPricingPlanId, key: (typeof LANDING_COMPARISON_ROWS)[number]["key"]) {
  const limits = getLandingPlanLimits(planId);
  const value = limits[key];

  if (key === "tokens" && planId === "TRIAL") {
    return `${formatLandingLimit(value)} / 3 дня`;
  }

  if (key === "competitors" && value === 0) {
    return "—";
  }

  return formatLandingLimit(value);
}

type PlanCardProps = {
  planId: "PRO" | "BUSINESS";
  interval: BillingInterval;
  featured?: boolean;
};

function PlanCard({ planId, interval, featured = false }: PlanCardProps) {
  const { pricing } = LANDING_COPY;
  const plan = BILLING_PLANS[planId];
  const planCopy = pricing.plans[planId];
  const priceRub = interval === "MONTHLY" ? plan.priceMonthlyRub : plan.priceYearlyRub;
  const periodLabel = interval === "MONTHLY" ? pricing.perMonth : pricing.perYear;

  return (
    <article
      className={`landing-pricing-card flex h-full flex-col overflow-hidden rounded-[1.25rem] border bg-white ${
        featured
          ? "landing-pricing-card--featured border-[#a7f3d0] shadow-[var(--landing-shadow-lg)]"
          : "border-[#e4e4e7] shadow-[var(--landing-shadow)]"
      }`}
    >
      {featured ? (
        <div className="border-b border-[#d1fae5] bg-[#ecfdf5] px-6 py-3.5 text-center text-sm font-semibold text-[#047857]">
          {pricing.trialBanner}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-7 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-wide text-[#a1a1aa]">{plan.name}</p>
            <p className="mt-2 text-[clamp(2.25rem,4vw,2.75rem)] font-semibold leading-none tracking-[-0.04em] text-[#0a0a0b]">
              {formatLandingPrice(priceRub)}
              <span className="text-base font-medium text-[#71717a]">{periodLabel}</span>
            </p>
          </div>
          {featured ? (
            <p className="shrink-0 rounded-full border border-[#a7f3d0] bg-[#ecfdf5] px-3 py-1 text-xs font-semibold text-[#047857]">
              {pricing.payToday}
            </p>
          ) : null}
        </div>

        <p className="mt-3 text-sm text-[#71717a]">{pricing.cancelAnytime}</p>

        <ul className="mt-7 flex-1 space-y-3.5">
          {planCopy.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-[0.9375rem] text-[#3f3f46]">
              <CheckIcon />
              {feature}
            </li>
          ))}
        </ul>

        <LandingButton
          href="/"
          variant={featured ? "emerald" : "primary"}
          className="mt-8 w-full py-3.5"
        >
          {planCopy.cta}
        </LandingButton>

        {featured ? (
          <p className="mt-3 text-center text-xs text-[#a1a1aa]">{pricing.guarantee}</p>
        ) : (
          <p className="mt-3 text-center text-xs text-[#a1a1aa]">{pricing.cancelAnytime}</p>
        )}
      </div>
    </article>
  );
}

export function PricingTeaserSection() {
  const { pricing } = LANDING_COPY;
  const [interval, setInterval] = useState<BillingInterval>("MONTHLY");

  return (
    <section id="pricing" className="landing-pricing border-y border-[#f4f4f5] bg-[#fafafa] py-20 md:py-32">
      <div className="landing-container">
        <Reveal className="mx-auto max-w-[40rem] text-center">
          <h2 className="landing-section-title text-[#0a0a0b]">{pricing.title}</h2>
          <p className="landing-body-lg mt-4">{pricing.subtitle}</p>
        </Reveal>

        <Reveal className="mt-10 flex justify-center" delay={0.05}>
          <div
            className="landing-pricing-toggle inline-flex rounded-full border border-[#e4e4e7] bg-white p-1 shadow-[var(--landing-shadow)]"
            role="group"
            aria-label="Период оплаты"
          >
            <button
              type="button"
              className={`landing-pricing-toggle-btn rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                interval === "MONTHLY"
                  ? "bg-[#0a0a0b] text-white"
                  : "text-[#52525b] hover:text-[#0a0a0b]"
              }`}
              aria-pressed={interval === "MONTHLY"}
              onClick={() => setInterval("MONTHLY")}
            >
              {pricing.intervalMonthly}
            </button>
            <button
              type="button"
              className={`landing-pricing-toggle-btn rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                interval === "YEARLY"
                  ? "bg-[#0a0a0b] text-white"
                  : "text-[#52525b] hover:text-[#0a0a0b]"
              }`}
              aria-pressed={interval === "YEARLY"}
              onClick={() => setInterval("YEARLY")}
            >
              {pricing.intervalYearly}
              <span className="ml-1.5 text-xs font-medium text-[#059669]">{pricing.yearlyNote}</span>
            </button>
          </div>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-[52rem] gap-6 md:grid-cols-2 md:gap-8">
          {LANDING_PAID_PLANS.map((planId, index) => (
            <Reveal key={planId} delay={0.08 + index * 0.06}>
              <PlanCard planId={planId} interval={interval} featured={planId === "PRO"} />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-16 md:mt-20" delay={0.12}>
          <div className="mx-auto max-w-[56rem]">
            <div className="mb-6 text-center md:mb-8">
              <h3 className="text-xl font-semibold tracking-[-0.02em] text-[#0a0a0b] md:text-2xl">
                {pricing.comparisonTitle}
              </h3>
              <p className="mt-2 text-sm text-[#71717a]">{pricing.comparisonHint}</p>
            </div>

            <div className="landing-pricing-table-wrap overflow-x-auto rounded-[1.25rem] border border-[#e4e4e7] bg-white shadow-[var(--landing-shadow)]">
              <table className="landing-pricing-table w-full min-w-[40rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#f4f4f5]">
                    <th className="landing-pricing-table-feature px-5 py-4 text-sm font-semibold text-[#71717a]">
                      Возможность
                    </th>
                    {LANDING_COMPARISON_PLANS.map((planId) => (
                      <th
                        key={planId}
                        className={`px-4 py-4 text-center text-sm font-semibold ${
                          planId === "PRO" || planId === "BUSINESS"
                            ? "text-[#0a0a0b]"
                            : "text-[#71717a]"
                        }`}
                      >
                        {BILLING_PLANS[planId].name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LANDING_COMPARISON_ROWS.map((row) => (
                    <tr key={row.key} className="border-b border-[#f4f4f5] last:border-b-0">
                      <td className="landing-pricing-table-feature px-5 py-3.5">
                        <span className="text-sm font-medium text-[#3f3f46]">{row.label}</span>
                        {row.hint ? (
                          <span className="mt-0.5 block text-xs text-[#a1a1aa]">{row.hint}</span>
                        ) : null}
                      </td>
                      {LANDING_COMPARISON_PLANS.map((planId) => (
                        <td
                          key={`${row.key}-${planId}`}
                          className={`px-4 py-3.5 text-center text-sm tabular-nums ${
                            planId === "PRO" || planId === "BUSINESS"
                              ? "font-semibold text-[#0a0a0b]"
                              : "text-[#52525b]"
                          }`}
                        >
                          {formatComparisonCell(planId, row.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-6 text-center text-sm text-[#a1a1aa]">{pricing.freeNote}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
