"use client";

type PlatformIconProps = {
  platform: "youtube" | "instagram" | "tiktok";
  size?: number;
  className?: string;
};

export function PlatformIcon({ platform, size = 14, className = "" }: PlatformIconProps) {
  if (platform === "youtube") {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <rect x="2.5" y="6" width="19" height="12" rx="4" fill="#FF0000" />
        <path d="M10 9.5v5l5-2.5-5-2.5Z" fill="white" />
      </svg>
    );
  }

  if (platform === "tiktok") {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M13 4c.6 1.6 1.8 3 3.8 3.5v2.8a7 7 0 0 1-3.8-1.2v5.2a4.8 4.8 0 1 1-4.8-4.8c.3 0 .6 0 .9.1v3a2 2 0 1 0 1.9 2V4h2Z"
          fill="#111827"
        />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="ig-g" x1="4" y1="20" x2="20" y2="4" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F58529" />
          <stop offset="0.5" stopColor="#DD2A7B" />
          <stop offset="1" stopColor="#515BD4" />
        </linearGradient>
      </defs>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="url(#ig-g)" />
      <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.8" />
      <circle cx="17" cy="7" r="1.1" fill="white" />
    </svg>
  );
}
