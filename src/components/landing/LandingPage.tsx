import type { LandingMarqueeVideo } from "@/components/landing/lib/landing-videos";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { DataStatsSection } from "@/components/landing/DataStatsSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { FinalCTASection, FooterSection } from "@/components/landing/FinalCTASection";
import { HeroSection } from "@/components/landing/HeroSection";
import { LandingNav } from "@/components/landing/LandingNav";
import { PlatformPreviewSection } from "@/components/landing/PlatformPreviewSection";
import { PricingTeaserSection } from "@/components/landing/PricingTeaserSection";
import { SearchExamplesSection } from "@/components/landing/SearchExamplesSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { WorkflowSection } from "@/components/landing/WorkflowSection";

type LandingPageProps = {
  marqueeVideos: LandingMarqueeVideo[];
};

export function LandingPage({ marqueeVideos }: LandingPageProps) {
  return (
    <>
      <LandingNav />
      <main>
        <HeroSection marqueeVideos={marqueeVideos} />
        <FeaturesSection />
        <SearchExamplesSection />
        <PlatformPreviewSection />
        <WorkflowSection />
        <DataStatsSection />
        <BenefitsSection />
        <TestimonialsSection />
        <PricingTeaserSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <FooterSection />
    </>
  );
}
