"use client";

type HeroVideoMarqueeProps = {
  videos: Array<{ id: string; title: string; views: string }>;
};

function MarqueeItem({ title, views }: { title: string; views: string }) {
  return (
    <span className="landing-hero-marquee-item">
      <span className="landing-hero-marquee-eye" aria-hidden>
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      </span>
      <span className="landing-hero-marquee-title">{title}</span>
      <span className="landing-hero-marquee-dot" aria-hidden>
        •
      </span>
      <span className="landing-hero-marquee-views tabular-nums">{views}</span>
    </span>
  );
}

export function HeroVideoMarquee({ videos }: HeroVideoMarqueeProps) {
  if (videos.length === 0) return null;

  const loop = [...videos, ...videos];

  return (
    <div className="landing-hero-marquee" aria-hidden>
      <div className="landing-hero-marquee-mask">
        <div className="landing-hero-marquee-track">
          {loop.map((video, index) => (
            <MarqueeItem key={`${video.id}-${index}`} title={video.title} views={video.views} />
          ))}
        </div>
      </div>
    </div>
  );
}
