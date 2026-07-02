import { LandingPage } from "@/components/landing/LandingPage";
import { getLandingMarqueeVideos } from "@/components/landing/lib/landing-videos";

export const revalidate = 3600;

export default async function LandingRoutePage() {
  const marqueeVideos = await getLandingMarqueeVideos(30);

  return <LandingPage marqueeVideos={marqueeVideos} />;
}
